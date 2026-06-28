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

export const requireAuth = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (process.env.ADMIN_AUTH_BYPASS === 'true') {
    req.authUid = 'dev-bypass';
    req.staff = {
      uid: 'dev-bypass',
      email: 'dev@local.test',
      name: 'Dev Admin',
      role: 'superadmin',
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
