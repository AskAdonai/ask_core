import { Router, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import pino from 'pino';
import type { AuthedRequest } from '../middleware/authMiddleware';
import { requireAuth } from '../middleware/authMiddleware';
import type { User } from '../../types/User';

const logger = pino();
const statsRoutes = Router();

type MonthBucket = {
  key: string; // YYYY-MM
  label: string; // e.g. Jul
  ask: number;
  mobile: number;
};

function monthKey(date: DateTime): string {
  return date.toFormat('yyyy-LL');
}

statsRoutes.get('/', requireAuth, async (_req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('users').get();
    const todayUtc = DateTime.utc().toISODate() ?? '';
    const weekAgo = DateTime.utc().minus({ days: 7 }).toMillis();
    const monthStart = DateTime.utc().startOf('month').toMillis();
    const startMonth = DateTime.utc().startOf('month').minus({ months: 5 });

    let totalUsers = 0;
    let activeUsers = 0;
    let pausedUsers = 0;
    let onboardingUsers = 0;
    let declarationsToday = 0;
    let journalsToday = 0;
    let questActiveUsers = 0;
    let streakSum = 0;
    let newUsersLast7Days = 0;
    let newUsersThisMonth = 0;

    const journeyCounts = new Map<string, number>();
    const monthBuckets = new Map<string, MonthBucket>();

    for (let i = 0; i < 6; i += 1) {
      const dt = startMonth.plus({ months: i });
      const key = monthKey(dt);
      monthBuckets.set(key, { key, label: dt.toFormat('LLL'), ask: 0, mobile: 0 });
    }

    for (const doc of snap.docs) {
      const user = doc.data() as User;
      totalUsers += 1;

      if (user.paused) pausedUsers += 1;
      else activeUsers += 1;

      if (user.awaitingOnboardingStep) onboardingUsers += 1;
      if (user.questActive) questActiveUsers += 1;

      streakSum += user.streak ?? 0;

      if ((user.declarationsToday ?? 0) > 0) declarationsToday += 1;
      if (user.journaledToday) journalsToday += 1;

      const stageKey = String(user.journeyStage ?? 'unknown');
      journeyCounts.set(stageKey, (journeyCounts.get(stageKey) ?? 0) + 1);

      const createdAt = user.createdAt instanceof Date
        ? user.createdAt.getTime()
        : (user.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime?.() ?? 0;

      if (createdAt >= weekAgo) newUsersLast7Days += 1;
      if (createdAt >= monthStart) newUsersThisMonth += 1;

      if (createdAt) {
        const dt = DateTime.fromMillis(createdAt).toUTC();
        const key = monthKey(dt);
        const bucket = monthBuckets.get(key);
        if (bucket) {
          // We only have one source of truth: user createdAt. Track as "ask" sign-ups.
          bucket.ask += 1;
        }
      }
    }

    const averageStreak = totalUsers > 0 ? Math.round((streakSum / totalUsers) * 10) / 10 : 0;
    const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 1000) / 10 : 0;
    const pauseRate = totalUsers > 0 ? Math.round((pausedUsers / totalUsers) * 1000) / 10 : 0;

    res.status(200).json({
      metricGroups: [
        {
          category: 'Users',
          stats: [
            { label: 'Total users', value: String(totalUsers) },
            { label: 'Active', value: String(activeUsers) },
            { label: 'Paused', value: String(pausedUsers) },
            { label: 'Onboarding', value: String(onboardingUsers) },
          ],
        },
        {
          category: 'Engagement today',
          stats: [
            { label: 'Declarations', value: String(declarationsToday) },
            { label: 'Journals', value: String(journalsToday) },
            { label: 'Quest active', value: String(questActiveUsers) },
          ],
        },
      ],
      platformGrowthData: Array.from(monthBuckets.values()).map((bucket) => ({
        month: bucket.label,
        ask: bucket.ask,
        mobile: bucket.mobile,
      })),
      userSourceData: [
        { name: 'Active', value: activeUsers },
        { name: 'Paused', value: pausedUsers },
        { name: 'Onboarding', value: onboardingUsers },
      ],
      journeyDistribution: Array.from(journeyCounts.entries()).map(([name, value]) => ({
        name: `Stage ${name}`,
        value,
      })),
      recentActivities: [
        `${declarationsToday} users declared today (${todayUtc})`,
        `${newUsersLast7Days} new users in the last 7 days`,
      ],
      totals: {
        totalUsers,
        activeUsers,
        pausedUsers,
        onboardingUsers,
        declarationsToday,
        journalsToday,
        questActiveUsers,
        averageStreak,
        newUsersLast7Days,
        newUsersThisMonth,
        activeRate,
        pauseRate,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching dashboard stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default statsRoutes;
