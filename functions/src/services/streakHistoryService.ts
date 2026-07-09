import { getFirestore } from 'firebase-admin/firestore';
import { determineVineStage } from '../utils/vine';
import type { StreakHistoryEntry } from '../types/StreakHistory';
import pino from 'pino';

const logger = pino();

export const writeStreakResetShadow = async (
  userId: string,
  previousStreak: number,
  previousVineStage: string,
): Promise<string> => {
  const db = getFirestore();
  const docRef = db
    .collection('users')
    .doc(userId.replace('+', ''))
    .collection('streakHistory')
    .doc();

  const entry: StreakHistoryEntry = {
    previousStreak,
    previousVineStage,
    resetAt: new Date(),
    reason: 'grace_exhausted',
    restoredAt: null,
  };

  await docRef.set(entry);
  logger.info({ userId, historyId: docRef.id, previousStreak }, 'Streak reset shadow recorded');
  return docRef.id;
};

export const restoreStreakFromHistory = async (
  userId: string,
  historyId?: string,
): Promise<{ restoredStreak: number; restoredVineStage: string; historyId: string }> => {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId.replace('+', ''));
  const historyCollection = userRef.collection('streakHistory');

  let historyDoc;
  if (historyId) {
    historyDoc = await historyCollection.doc(historyId).get();
    if (!historyDoc.exists) {
      throw new Error(`Streak history entry ${historyId} not found`);
    }
  } else {
    const snapshot = await historyCollection.orderBy('resetAt', 'desc').limit(10).get();
    const candidate = snapshot.docs.find((doc) => !doc.data().restoredAt);
    if (!candidate) {
      throw new Error('No restorable streak history entry found');
    }
    historyDoc = candidate;
  }

  const entry = historyDoc.data() as StreakHistoryEntry;
  if (entry.restoredAt) {
    throw new Error('This streak history entry has already been restored');
  }

  const restoredStreak = entry.previousStreak;
  const restoredVineStage = entry.previousVineStage || determineVineStage(restoredStreak);

  await userRef.update({
    streak: restoredStreak,
    vineStage: restoredVineStage,
    updatedAt: new Date(),
  });

  await historyDoc.ref.update({
    restoredAt: new Date(),
  });

  logger.info({ userId, historyId: historyDoc.id, restoredStreak }, 'Streak restored from shadow history');
  return {
    restoredStreak,
    restoredVineStage,
    historyId: historyDoc.id,
  };
};

export const listStreakHistory = async (userId: string): Promise<Array<StreakHistoryEntry & { historyId: string }>> => {
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(userId.replace('+', ''))
    .collection('streakHistory')
    .orderBy('resetAt', 'desc')
    .limit(20)
    .get();

  return snapshot.docs.map((doc) => ({
    historyId: doc.id,
    ...(doc.data() as StreakHistoryEntry),
  }));
};
