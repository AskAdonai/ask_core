import { Router, Response } from 'express';
import pino from 'pino';
import type { AuthedRequest } from '../middleware/authMiddleware';
import { requireAuth, requireSuperAdmin } from '../middleware/authMiddleware';
import {
  createStaffMember,
  listStaff,
  resetStaffPassword,
  revokeStaffMember,
  serializeStaffForApi,
  updateStaffMember,
} from '../../services/staffService';
import type { StaffRole, StaffStatus } from '../../types/Staff';
import {
  isValidStaffEmail,
  respondWithStaffAuthError,
} from '../utils/staffAuthErrors';

const logger = pino();
const staffRoutes = Router();

staffRoutes.use(requireAuth);

// Allow any active staff member to change their own password.
staffRoutes.put('/me/password', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authUid;
    const { password } = req.body ?? {};

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!password || typeof password !== 'string' || password.trim().length < 8) {
      res.status(400).json({ error: 'password must be at least 8 characters' });
      return;
    }

    await resetStaffPassword(uid, password);
    res.status(200).json({ status: 'success', uid });
  } catch (error) {
    logger.error({ error }, 'Error resetting own password');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Superadmin-only staff management.
staffRoutes.use(requireSuperAdmin);

staffRoutes.get('/', async (_req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const staff = await listStaff();
    res.status(200).json({ staff: staff.map(serializeStaffForApi) });
  } catch (error) {
    logger.error({ error }, 'Error listing staff');
    res.status(500).json({ error: 'Internal server error' });
  }
});

staffRoutes.post('/', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const { email, name, role, password, status } = req.body ?? {};

    if (!email || !name || !role) {
      res.status(400).json({ error: 'email, name, and role are required' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();
    const normalizedPassword =
      typeof password === 'string' && password.trim() ? password.trim() : undefined;

    if (!normalizedName) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    if (!isValidStaffEmail(normalizedEmail)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    if (normalizedPassword && normalizedPassword.length < 8) {
      res.status(400).json({ error: 'password must be at least 8 characters' });
      return;
    }

    const staff = await createStaffMember({
      email: normalizedEmail,
      name: normalizedName,
      role: role as StaffRole,
      password: normalizedPassword,
      status: status as StaffStatus | undefined,
      invitedBy: req.authUid,
    });

    res.status(201).json({ staff: serializeStaffForApi(staff) });
  } catch (error) {
    if (respondWithStaffAuthError(res, error, 'Error creating staff')) {
      return;
    }
    logger.error({ error }, 'Error creating staff');
    res.status(500).json({ error: 'Internal server error' });
  }
});

staffRoutes.put('/:uid', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.params.uid as string;
    const { name, role, status } = req.body ?? {};

    const staff = await updateStaffMember(uid, {
      name: name !== undefined ? String(name) : undefined,
      role: role as StaffRole | undefined,
      status: status as StaffStatus | undefined,
    });

    res.status(200).json({ staff: serializeStaffForApi(staff) });
  } catch (error) {
    if (respondWithStaffAuthError(res, error, 'Error updating staff')) {
      return;
    }
    logger.error({ error }, 'Error updating staff');
    res.status(500).json({ error: 'Internal server error' });
  }
});

staffRoutes.delete('/:uid', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.params.uid as string;
    await revokeStaffMember(uid);
    res.status(200).json({ status: 'success', uid });
  } catch (error) {
    if (respondWithStaffAuthError(res, error, 'Error revoking staff')) {
      return;
    }
    logger.error({ error }, 'Error revoking staff');
    res.status(500).json({ error: 'Internal server error' });
  }
});

staffRoutes.put('/:uid/password', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.params.uid as string;
    const { password } = req.body ?? {};

    if (!password || typeof password !== 'string' || password.trim().length < 8) {
      res.status(400).json({ error: 'password must be at least 8 characters' });
      return;
    }

    await resetStaffPassword(uid, password.trim());
    res.status(200).json({ status: 'success', uid });
  } catch (error) {
    if (respondWithStaffAuthError(res, error, 'Error resetting staff password')) {
      return;
    }
    logger.error({ error }, 'Error resetting staff password');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default staffRoutes;
