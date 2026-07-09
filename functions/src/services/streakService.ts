import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { determineVineStage } from '../utils/vine';
import { DateTime } from 'luxon';
import {
  computeStreakOnFirstYes,
  getEffectiveStreakState,
} from './effectiveStreakService';
import pino from 'pino';

const logger = pino();

export interface StreakResult {
  /** True if the streak counter was incremented (first declaration of the day). */
  incremented: boolean;
  /** The current streak after this call. */
  streak: number;
  vineStage: string;
  /**
   * True when the user already completed their first declaration today.
   * The caller should route to the multiply-declaration path (no streak change).
   */
  alreadyDeclaredToday: boolean;
  /** True when grace was exhausted and the streak was reset to 1. */
  streakReset: boolean;
}

export interface MultiplyDeclarationResult {
  declarationsToday: number;
}

/**
 * Records the first declaration of the local day using consecutive-day and grace
 * rules from getEffectiveStreakState. Runs inside a Firestore transaction.
 */
export const incrementStreak = async (
  userId: string,
  timezone: string
): Promise<StreakResult> => {
  const db = getFirestore();
  const normalizedId = userId.replace('+', '');
  const userRef = db.collection('users').doc(normalizedId);

  return await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    if (!doc.exists) throw new Error('User not found');

    const data = doc.data()!;
    const nowLocal = DateTime.now().setZone(timezone);
    const todayStr = nowLocal.toISODate()!;
    const effectiveState = getEffectiveStreakState(data, timezone, nowLocal);

    if (effectiveState.declaredToday) {
      logger.info({ userId }, 'YES received after first declaration today — multiply path');
      return {
        incremented: false,
        streak: data.streak as number,
        vineStage: data.vineStage as string,
        alreadyDeclaredToday: true,
        streakReset: false,
      };
    }

    const storedStreak = (data.streak as number) || 0;
    const storedVineStage = (data.vineStage as string) || determineVineStage(storedStreak);
    const { newStreak, streakReset } = computeStreakOnFirstYes(effectiveState, storedStreak);
    const newVineStage = determineVineStage(newStreak);
    const declRef = userRef.collection('declarations').doc(todayStr);

    if (streakReset) {
      const historyRef = userRef.collection('streakHistory').doc();
      transaction.set(historyRef, {
        previousStreak: storedStreak,
        previousVineStage: storedVineStage,
        resetAt: new Date(),
        reason: 'grace_exhausted',
        restoredAt: null,
      });
      logger.info(
        { userId, previousStreak: storedStreak, historyId: historyRef.id },
        'Streak reset after grace exhaustion — shadow recorded',
      );
    }

    transaction.update(userRef, {
      streak: newStreak,
      vineStage: newVineStage,
      declarationsToday: 1,
      lastActiveDate: new Date(),
      updatedAt: new Date(),
    });

    transaction.set(
      declRef,
      {
        count: 1,
        timestamps: FieldValue.arrayUnion(new Date()),
      },
      { merge: true },
    );

    logger.info({ userId, newStreak, newVineStage, streakReset }, 'Streak updated on first YES');
    return {
      incremented: true,
      streak: newStreak,
      vineStage: newVineStage,
      alreadyDeclaredToday: false,
      streakReset,
    };
  });
};

/**
 * Increments declarationsToday for an additional same-day declaration.
 * Does not touch streak, vineStage, lastActiveDate, or journey pointers.
 */
export const recordMultiplyDeclaration = async (
  userId: string,
  timezone: string,
): Promise<MultiplyDeclarationResult> => {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId.replace('+', ''));

  return await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    if (!doc.exists) throw new Error('User not found');

    const data = doc.data()!;
    const nowLocal = DateTime.now().setZone(timezone);
    const todayStr = nowLocal.toISODate()!;
    const effectiveState = getEffectiveStreakState(data, timezone, nowLocal);

    if (!effectiveState.declaredToday) {
      throw new Error('Cannot record multiply declaration before first declaration of the day');
    }

    const newCount = (data.declarationsToday as number || 1) + 1;
    const declRef = userRef.collection('declarations').doc(todayStr);

    transaction.update(userRef, {
      declarationsToday: newCount,
      updatedAt: new Date(),
    });

    transaction.set(
      declRef,
      {
        count: FieldValue.increment(1),
        timestamps: FieldValue.arrayUnion(new Date()),
      },
      { merge: true },
    );

    logger.info({ userId, declarationsToday: newCount }, 'Multiply declaration recorded');
    return { declarationsToday: newCount };
  });
};
