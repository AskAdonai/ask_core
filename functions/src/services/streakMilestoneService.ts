import { getFirestore } from 'firebase-admin/firestore';
import { determineVineStage } from '../utils/vine';
import {
  STREAK_MILESTONES_COLLECTION,
  type StreakMilestone,
} from '../types/StreakMilestone';
import pino from 'pino';

const logger = pino();

/** Built-in defaults used when the Firestore collection has not been seeded yet. */
export const DEFAULT_STREAK_MILESTONES: StreakMilestone[] = [
  {
    milestoneId: 'streak-7',
    streakDays: 7,
    label: 'Rooted',
    message:
      "🌱 You've taken root! 7 days of faithful declarations — your roots are going deep.",
    active: true,
  },
  {
    milestoneId: 'streak-14',
    streakDays: 14,
    label: 'Growing',
    message:
      "🌿 You're growing! 14 days in — your consistency is bearing fruit.",
    active: true,
  },
  {
    milestoneId: 'streak-21',
    streakDays: 21,
    label: 'Blooming',
    message:
      "🌸 You're blooming! 21 days of faithfulness — beauty is unfolding in your walk with God.",
    active: true,
  },
  {
    milestoneId: 'streak-30',
    streakDays: 30,
    label: 'Fruitful',
    message:
      '🍇 You are Fruitful! 30 days of unwavering devotion — this is a harvest season.',
    active: true,
  },
  {
    milestoneId: 'streak-70',
    streakDays: 70,
    label: 'Fruitful (continued)',
    message:
      '🍇 70 days strong — your fruitfulness continues to multiply!',
    active: true,
  },
  {
    milestoneId: 'streak-100',
    streakDays: 100,
    label: 'Fruitful (continued)',
    message:
      '🍇 100 days! A century of faithfulness — truly fruitful and unwavering.',
    active: true,
  },
];

const sortMilestones = (milestones: StreakMilestone[]): StreakMilestone[] =>
  [...milestones].sort((a, b) => a.streakDays - b.streakDays);

export const listActiveStreakMilestones = async (): Promise<StreakMilestone[]> => {
  const db = getFirestore();
  const snapshot = await db
    .collection(STREAK_MILESTONES_COLLECTION)
    .where('active', '==', true)
    .get();

  if (snapshot.empty) {
    return sortMilestones(DEFAULT_STREAK_MILESTONES);
  }

  return sortMilestones(
    snapshot.docs.map((doc) => ({ ...(doc.data() as StreakMilestone), milestoneId: doc.id })),
  );
};

/**
 * Returns milestones newly crossed between lastCelebratedStreakDays and newStreak.
 * Each milestone fires at most once per user (caller persists lastMilestoneStreakDays).
 */
export const getNewlyReachedMilestones = async (
  lastCelebratedStreakDays: number,
  newStreak: number,
): Promise<StreakMilestone[]> => {
  const milestones = await listActiveStreakMilestones();
  return milestones.filter(
    (milestone) =>
      milestone.streakDays > lastCelebratedStreakDays && milestone.streakDays <= newStreak,
  );
};

export const formatMilestoneMessage = (
  milestone: StreakMilestone,
  name: string,
): string => {
  const stageAtMilestone = determineVineStage(milestone.streakDays);
  const label = milestone.label || stageAtMilestone;
  const body = milestone.message.replace(/\{name\}/g, name).replace(/\{label\}/g, label);
  return `\n\n${body}\n\nYou are now *${label}*.`;
};

export const buildMilestoneCelebration = async (
  name: string,
  lastCelebratedStreakDays: number,
  newStreak: number,
): Promise<{ text: string; highestReached: number }> => {
  const reached = await getNewlyReachedMilestones(lastCelebratedStreakDays, newStreak);
  if (reached.length === 0) {
    return { text: '', highestReached: lastCelebratedStreakDays };
  }

  const text = reached.map((milestone) => formatMilestoneMessage(milestone, name)).join('');
  const highestReached = Math.max(...reached.map((m) => m.streakDays));

  logger.info({ name, newStreak, highestReached, count: reached.length }, 'Milestone celebrations queued');
  return { text, highestReached };
};
