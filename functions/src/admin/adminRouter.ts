import { Router } from 'express';

import userRoutes from './routes/userRoutes';
import themeRoutes from './routes/themeRoutes';
import configRoutes from './routes/configRoutes';
import mediaRoutes from './routes/mediaRoutes';
import dailyDeclarationRoutes from './routes/dailyDeclarationRoutes';
import questRoutes from './routes/questRoutes';
import prayerCardRoutes from './routes/prayerCardRoutes';
import knockMenuRoutes from './routes/knockMenuRoutes';
import morningDevotionRoutes from './routes/morningDevotionRoutes';
import deliveryLogRoutes from './routes/deliveryLogRoutes';
import statsRoutes from './routes/statsRoutes';
import authRoutes from './routes/authRoutes';
import staffRoutes from './routes/staffRoutes';
import { requireAuth } from './middleware/authMiddleware';

const adminRouter = Router();

adminRouter.use('/auth', authRoutes);

adminRouter.use(requireAuth);

adminRouter.use('/staff', staffRoutes);
adminRouter.use('/users', userRoutes);
adminRouter.use('/themes', themeRoutes);
adminRouter.use('/config', configRoutes);
adminRouter.use('/daily-declarations', dailyDeclarationRoutes);
adminRouter.use('/quests', questRoutes);
adminRouter.use('/prayer-cards', prayerCardRoutes);
adminRouter.use('/knock-menu', knockMenuRoutes);
adminRouter.use('/morning-devotion', morningDevotionRoutes);
adminRouter.use('/delivery-logs', deliveryLogRoutes);
adminRouter.use('/stats', statsRoutes);
adminRouter.use('/', mediaRoutes);

export default adminRouter;
