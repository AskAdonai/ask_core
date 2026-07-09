import { Router } from 'express';
import authRoutes, { publicAuthRoutes } from './routes/authRoutes';
import { requireAuth } from './middleware/authMiddleware';

import userRoutes from './routes/userRoutes';
import themeRoutes from './routes/themeRoutes';
import configRoutes from './routes/configRoutes';
import mediaRoutes from './routes/mediaRoutes';
import dailyDeclarationRoutes from './routes/dailyDeclarationRoutes';
import questRoutes from './routes/questRoutes';
import prayerCardRoutes from './routes/prayerCardRoutes';
import knockMenuRoutes from './routes/knockMenuRoutes';
import streakMilestoneRoutes from './routes/streakMilestoneRoutes';
import journeyStageRoutes from './routes/journeyStageRoutes';
import curriculumRoutes from './routes/curriculumRoutes';
import morningDevotionRoutes from './routes/morningDevotionRoutes';
import devotionCategoryRoutes from './routes/devotionCategoryRoutes';
import deliveryLogRoutes from './routes/deliveryLogRoutes';
import statsRoutes from './routes/statsRoutes';
import staffRoutes from './routes/staffRoutes';

const adminRouter = Router();

// Public auth endpoints — mounted before requireAuth so they never fall through.
adminRouter.use('/auth', publicAuthRoutes);
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
adminRouter.use('/streak-milestones', streakMilestoneRoutes);
adminRouter.use('/journey-stages', journeyStageRoutes);
adminRouter.use('/curriculum', curriculumRoutes);
adminRouter.use('/morning-devotion', morningDevotionRoutes);
adminRouter.use('/devotion-categories', devotionCategoryRoutes);
adminRouter.use('/delivery-logs', deliveryLogRoutes);
adminRouter.use('/stats', statsRoutes);
adminRouter.use('/', mediaRoutes);

export default adminRouter;
