import { Router, Request, Response } from 'express';
import pino from 'pino';
import {
  createStaffMember,
  getStaffByUid,
  serializeStaffForApi,
  staffCount,
} from '../../services/staffService';
import type { AuthedRequest } from '../middleware/authMiddleware';
import { requireAuth } from '../middleware/authMiddleware';

const logger = pino();
const authRoutes = Router();

authRoutes.get('/me', requireAuth, async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    if (!req.authUid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const staff = req.staff ?? await getStaffByUid(req.authUid);
    if (!staff) {
      res.status(404).json({ error: 'Staff profile not found' });
      return;
    }

    res.status(200).json({ staff: serializeStaffForApi(staff) });
  } catch (error) {
    logger.error({ error }, 'Error fetching auth profile');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * One-time bootstrap: create the first superadmin when staff collection is empty.
 * Requires ADMIN_BOOTSTRAP_SECRET in env and matching bootstrapSecret in body.
 */
authRoutes.post('/bootstrap', async (req: Request, res: Response): Promise<void> => {
  try {
    const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET?.trim();
    const { bootstrapSecret, email, name, password } = req.body ?? {};

    if (!configuredSecret) {
      res.status(503).json({ error: 'Bootstrap is not configured' });
      return;
    }

    if (bootstrapSecret !== configuredSecret) {
      res.status(403).json({ error: 'Invalid bootstrap secret' });
      return;
    }

    const count = await staffCount();
    if (count > 0) {
      res.status(409).json({ error: 'Staff already bootstrapped' });
      return;
    }

    if (!email || !name || !password) {
      res.status(400).json({ error: 'email, name, and password are required' });
      return;
    }

    const staff = await createStaffMember({
      email: String(email),
      name: String(name),
      password: String(password),
      role: 'superadmin',
      status: 'active',
    });

    res.status(201).json({ staff: serializeStaffForApi(staff) });
  } catch (error) {
    logger.error({ error }, 'Error bootstrapping admin');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default authRoutes;
