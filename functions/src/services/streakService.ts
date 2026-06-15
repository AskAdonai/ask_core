import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { determineVineStage } from '../utils/vine';
import { DateTime } from 'luxon';
import pino from 'pino';

const logger = pino();

export interface StreakResult {
  /** True if the streak counter was incremented (first declaration of the day). */
  incremented: boolean;
  /** The current streak after this call. */
  streak: number;
  vineStage: string;
  /**
   * True when this YES was a duplicate (user already declared today).
   * The caller should silently ack without re-sending any confirmation message.
   */
  alreadyDeclaredToday: boolean;
}

/**
 * Records a single declaration and, if it is the first of the day, increments
 * the user's streak. Everything runs inside a Firestore transaction so
 * concurrent webhook retries or rapid YES taps cannot corrupt the counter.
 *
 * Design: one YES per day = declaration complete. The caller is responsible for
 * clearing awaitingDeclarationYes after this returns incremented = true.
 */
export const incrementStreak = async (
  userId: string,
  timezone: string
): Promise<StreakResult> => {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId.replace('+', ''));

  return await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    if (!doc.exists) throw new Error('User not found');

    const data = doc.data()!;
    const nowLocal = DateTime.now().setZone(timezone);
    const todayStr = nowLocal.toISODate()!;

    // ── Idempotency guard ──────────────────────────────────────────────────────
    // If lastActiveDate is already today, the user has already declared.
    // We return early without any write — the transaction still commits cleanly.
    const lastActive = data.lastActiveDate
      ? DateTime.fromJSDate(data.lastActiveDate.toDate()).setZone(timezone)
      : null;
    const alreadyDeclaredToday = lastActive?.hasSame(nowLocal, 'day') === true;

    if (alreadyDeclaredToday) {
      logger.info({ userId }, 'YES received but user already declared today — no-op');
      return {
        incremented: false,
        streak: data.streak as number,
        vineStage: data.vineStage as string,
        alreadyDeclaredToday: true,
      };
    }

    // ── First declaration of the day ───────────────────────────────────────────
    const newStreak = (data.streak as number || 0) + 1;
    const newVineStage = determineVineStage(newStreak);
    const declRef = userRef.collection('declarations').doc(todayStr);

    transaction.update(userRef, {
      streak: newStreak,
      vineStage: newVineStage,
      declarationsToday: 1,
      lastActiveDate: new Date(),
      updatedAt: new Date(),
    });

    // Write a dated declaration log entry for the VINE weekly query
    transaction.set(declRef, {
      count: 1,
      timestamps: FieldValue.arrayUnion(new Date()),
    }, { merge: true });

    logger.info({ userId, newStreak, newVineStage }, 'Streak incremented');
    return {
      incremented: true,
      streak: newStreak,
      vineStage: newVineStage,
      alreadyDeclaredToday: false,
    };
  });
};
