import { Router, Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import pino from 'pino';

import userRoutes from './routes/userRoutes';
import themeRoutes from './routes/themeRoutes';
import configRoutes from './routes/configRoutes';
import mediaRoutes from './routes/mediaRoutes';
import dailyDeclarationRoutes from './routes/dailyDeclarationRoutes';
import questRoutes from './routes/questRoutes';
import prayerCardRoutes from './routes/prayerCardRoutes';

const logger = pino();
const adminRouter = Router();

// Middleware to verify Firebase Auth JWT
const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // === DEV OVERRIDE: Auth disabled for now ===
  (req as any).user = { uid: 'dev-bypass-admin', email: 'dev@bypass.com' };
  next();
  return;
  // ===========================================
};

// Apply auth middleware to all admin routes
adminRouter.use(requireAuth);

// Mount feature routers
adminRouter.use('/users', userRoutes);
adminRouter.use('/themes', themeRoutes);
adminRouter.use('/config', configRoutes);
adminRouter.use('/daily-declarations', dailyDeclarationRoutes);
adminRouter.use('/quests', questRoutes);
adminRouter.use('/prayer-cards', prayerCardRoutes);
adminRouter.use('/', mediaRoutes); // handles /media and /media-categories

export default adminRouter;
