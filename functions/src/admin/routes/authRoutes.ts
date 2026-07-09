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
import {
  isValidStaffEmail,
  respondWithStaffAuthError,
} from '../utils/staffAuthErrors';
import {
  PasswordResetValidationError,
  requestStaffPasswordReset,
} from '../../services/staffPasswordResetService';
import { ResendEmailError } from '../../services/email/resendEmailService';

const logger = pino();

/** Public routes — no Bearer token required. */
export const publicAuthRoutes = Router();

publicAuthRoutes.get('/bootstrap/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const configured = Boolean(process.env.ADMIN_BOOTSTRAP_SECRET?.trim());
    const count = await staffCount();

    res.status(200).json({
      configured,
      needsBootstrap: count === 0,
    });
  } catch (error) {
    logger.error({ error }, 'Error checking bootstrap status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

publicAuthRoutes.post('/bootstrap', async (req: Request, res: Response): Promise<void> => {
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

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidStaffEmail(normalizedEmail)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    if (String(password).trim().length < 8) {
      res.status(400).json({ error: 'password must be at least 8 characters' });
      return;
    }

    const staff = await createStaffMember({
      email: normalizedEmail,
      name: String(name).trim(),
      password: String(password),
      role: 'superadmin',
      status: 'active',
    });

    res.status(201).json({ staff: serializeStaffForApi(staff) });
  } catch (error) {
    if (respondWithStaffAuthError(res, error, 'Error bootstrapping admin')) {
      return;
    }
    logger.error({ error }, 'Error bootstrapping admin');
    res.status(500).json({ error: 'Internal server error' });
  }
});

publicAuthRoutes.post('/password-reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = req.body?.email;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const result = await requestStaffPasswordReset(email);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof PasswordResetValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof ResendEmailError) {
      logger.error({ error, statusCode: error.statusCode }, 'Resend password reset failed');
      const message =
        error.statusCode === 401 || error.statusCode === 403
          ? 'Email service is not authorized. Check RESEND_API_KEY and sender domain.'
          : 'Unable to send reset email. Please try again later.';
      res.status(error.statusCode >= 500 ? 503 : 400).json({ error: message });
      return;
    }

    logger.error({ error }, 'Error requesting password reset');
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

export default authRoutes;
