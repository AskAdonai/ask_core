import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pino from 'pino';
import { getCurrentCalendarWeek } from '../utils/calendarWeek';
import type { User } from '../types/schemas';

const logger = pino();

/**
 * Quest progress is inlined on the User document.
 * Week number follows the global calendar cohort — not per-user join date.
 */

export const resolveQuestWeekForUser = (
  user: Partial<Pick<User, 'timezone' | 'questWeek' | 'questActive'>> | null | undefined,
): number => {
  if (!user?.questActive) {
    return user?.questWeek ?? 1;
  }
  return getCurrentCalendarWeek(user.timezone || 'UTC');
};

export const resolveQuestVideoIndexForUser = (
  user: Partial<Pick<User, 'timezone' | 'questWeek' | 'questVideoIndex' | 'questActive'>>,
): number => {
  const activeWeek = resolveQuestWeekForUser(user);
  const storedWeek = user.questWeek ?? 1;
  if (storedWeek !== activeWeek) {
    return 0;
  }
  return user.questVideoIndex ?? 0;
};

export const syncQuestWeekToCalendar = async (
  phone: string,
  timezone: string = 'UTC',
): Promise<number> => {
  const db = getFirestore();
  const userRef = db.collection('users').doc(phone.replace('+', ''));
  const doc = await userRef.get();
  if (!doc.exists) return getCurrentCalendarWeek(timezone);

  const data = doc.data()!;
  if (!data.questActive) {
    return data.questWeek as number;
  }

  const activeWeek = getCurrentCalendarWeek(timezone);
  const storedWeek = data.questWeek as number;

  if (storedWeek !== activeWeek) {
    await userRef.update({
      questWeek: activeWeek,
      questVideoIndex: 0,
      updatedAt: new Date(),
    });
    logger.info({ phone, fromWeek: storedWeek, toWeek: activeWeek }, 'Quest week synced to calendar');
  }

  return activeWeek;
};

export const getQuestProgress = async (phone: string) => {
  const db = getFirestore();
  const doc = await db.collection('users').doc(phone.replace('+', '')).get();
  if (!doc.exists) return null;
  const data = doc.data()!;

  const timezone = (data.timezone as string) || 'UTC';
  const active = data.questActive as boolean;
  const week = active ? getCurrentCalendarWeek(timezone) : (data.questWeek as number);
  const storedWeek = data.questWeek as number;
  const videoIndex =
    active && storedWeek !== week ? 0 : (data.questVideoIndex as number);

  return {
    active,
    week,
    videoIndex,
    chaptersLogged: data.questChaptersLogged as number,
  };
};

export const startQuest = async (phone: string, timezone: string = 'UTC'): Promise<void> => {
  const db = getFirestore();
  const activeWeek = getCurrentCalendarWeek(timezone);
  await db.collection('users').doc(phone.replace('+', '')).update({
    questActive: true,
    questWeek: activeWeek,
    questVideoIndex: 0,
    questChaptersLogged: 0,
    awaitingQuestConfirm: false,
    updatedAt: new Date(),
  });
  logger.info({ phone, week: activeWeek }, 'Quest started on global calendar week');
};

export const stopQuest = async (phone: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(phone.replace('+', '')).update({
    questActive: false,
    awaitingQuestConfirm: false,
    updatedAt: new Date(),
  });
  logger.info({ phone }, 'User left the Quest');
};

export const advanceQuestVideo = async (phone: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(phone.replace('+', '')).update({
    questVideoIndex: FieldValue.increment(1),
    updatedAt: new Date(),
  });
};

/** @deprecated Global cohort uses calendar week — prefer syncQuestWeekToCalendar. */
export const advanceQuestWeek = async (phone: string, timezone: string = 'UTC'): Promise<void> => {
  await syncQuestWeekToCalendar(phone, timezone);
};

export const logIndependentChapter = async (phone: string, chapterName: string): Promise<{ totalChapters: number }> => {
  const db = getFirestore();
  const today = new Date().toISOString().split('T')[0];
  const userRef = db.collection('users').doc(phone.replace('+', ''));
  const logRef = userRef.collection('questLog').doc(today);

  const batch = db.batch();

  batch.update(userRef, {
    questChaptersLogged: FieldValue.increment(1),
    updatedAt: new Date(),
  });

  batch.set(logRef, {
    chaptersLogged: FieldValue.arrayUnion(chapterName)
  }, { merge: true });

  await batch.commit();

  const doc = await userRef.get();
  return { totalChapters: doc.data()?.questChaptersLogged as number ?? 1 };
};

export const recordQuizScore = async (
  phone: string,
  week: number,
  score: number,
  total: number
): Promise<void> => {
  const db = getFirestore();
  const today = new Date().toISOString().split('T')[0];
  await db
    .collection('users')
    .doc(phone)
    .collection('questLog')
    .doc(today)
    .set({ quizScore: score, quizTotal: total, quizWeek: week }, { merge: true });
  logger.info({ phone, week, score, total }, 'Quiz score recorded to questLog');
};
