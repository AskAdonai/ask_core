import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import pino from 'pino';
import type { Staff } from '../../types/Staff';
import { getStaffByUid, touchStaffLastSeen } from '../../services/staffService';

const logger = pino();

export interface AuthedRequest extends Request {
  authUid?: string;
  staff?: Staff;
}

const ROLE_RANK: Record<Staff['role'], number> = {
  editor: 1,
  superEditor: 2,
  superadmin: 3,
};

function hasAtLeastRole(actual: Staff['role'] | undefined, required: Staff['role']): boolean {
  if (!actual) return false;
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export const requireAuth = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (process.env.ADMIN_AUTH_BYPASS === 'true') {
    const bypassRole = (process.env.ADMIN_AUTH_BYPASS_ROLE || 'superadmin') as Staff['role'];
    const bypassUid = process.env.ADMIN_AUTH_BYPASS_UID || 'dev-bypass';
    req.authUid = bypassUid;
    req.staff = {
      uid: bypassUid,
      email: process.env.ADMIN_AUTH_BYPASS_EMAIL || 'dev@local.test',
      name: process.env.ADMIN_AUTH_BYPASS_NAME || 'Dev Admin',
      role: bypassRole,
      status: 'active',
      authProvider: 'email',
      googleLinked: false,
    };
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const staff = await getStaffByUid(decoded.uid);

    if (!staff || staff.status !== 'active') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    req.authUid = decoded.uid;
    req.staff = staff;
    touchStaffLastSeen(decoded.uid).catch(err => {
      logger.warn({ err, uid: decoded.uid }, 'Failed to update staff lastSeenAt');
    });
    next();
  } catch (error) {
    logger.warn({ error }, 'Admin auth failed');
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireSuperAdmin = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (req.staff?.role !== 'superadmin') {
    res.status(403).json({ error: 'Super admin required' });
    return;
  }
  next();
};

export const requireAtLeastRole = (required: Staff['role']) => {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!hasAtLeastRole(req.staff?.role, required)) {
      res.status(403).json({ error: `${required} role required` });
      return;
    }
    next();
  };
};
