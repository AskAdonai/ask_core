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

const logger = pino();
const staffRoutes = Router();

staffRoutes.use(requireAuth);
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

    const staff = await createStaffMember({
      email: String(email),
      name: String(name),
      role: role as StaffRole,
      password: password ? String(password) : undefined,
      status: status as StaffStatus | undefined,
      invitedBy: req.authUid,
    });

    res.status(201).json({ staff: serializeStaffForApi(staff) });
  } catch (error) {
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
    logger.error({ error }, 'Error revoking staff');
    res.status(500).json({ error: 'Internal server error' });
  }
});

staffRoutes.put('/:uid/password', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.params.uid as string;
    const { password } = req.body ?? {};

    if (!password) {
      res.status(400).json({ error: 'password is required' });
      return;
    }

    await resetStaffPassword(uid, String(password));
    res.status(200).json({ status: 'success', uid });
  } catch (error) {
    logger.error({ error }, 'Error resetting staff password');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default staffRoutes;
