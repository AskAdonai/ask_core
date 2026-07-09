import { getFirestore } from 'firebase-admin/firestore';
import { rescheduleAfterSend } from './schedulingService';
import { writeDeliveryLog } from './deliveryLogService';
import { formatDeliveryError } from '../utils/resolveReminderSchedule';
import pino from 'pino';

const logger = pino();

export const MAX_MORNING_DELIVERY_ATTEMPTS = 5;

export async function resetMorningDeliveryFailures(userId: string): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('users').doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const count = snap.data()?.morningDeliveryFailureCount;
  if (count === undefined || count === 0) return;

  await ref.update({
    morningDeliveryFailureCount: 0,
    updatedAt: new Date(),
  });
}

export async function recordMorningDeliveryFailure(params: {
  userId: string;
  timezone: string;
  reminderHour: number;
  reminderMinute: number;
  deliveryId?: string;
  error: unknown;
  journeyStage?: number;
  journeyDayIndex?: number;
}): Promise<{ attempts: number; permanent: boolean }> {
  const db = getFirestore();
  const userRef = db.collection('users').doc(params.userId);
  const snap = await userRef.get();
  const previousAttempts = Number(snap.data()?.morningDeliveryFailureCount ?? 0);
  const attempts = previousAttempts + 1;
  const permanent = attempts >= MAX_MORNING_DELIVERY_ATTEMPTS;
  const message = formatDeliveryError(params.error);

  if (permanent) {
    await rescheduleAfterSend(
      params.userId,
      params.timezone,
      params.reminderHour,
      params.reminderMinute,
    );

    await userRef.update({
      morningDeliveryFailureCount: 0,
      lastMorningDeliveryPermanentFailureAt: new Date(),
      updatedAt: new Date(),
    });

    await writeDeliveryLog({
      userId: params.userId,
      type: 'MORNING_CARD',
      status: 'permanently_failed',
      stage: 'worker',
      deliveryId: params.deliveryId,
      error: message,
      pinned: true,
      metadata: {
        attempts,
        journeyStage: params.journeyStage,
        journeyDayIndex: params.journeyDayIndex,
      },
    });

    logger.error(
      { userId: params.userId, attempts, deliveryId: params.deliveryId },
      'Morning delivery permanently failed after max retries — rescheduled to next slot',
    );
  } else {
    await userRef.update({
      morningDeliveryFailureCount: attempts,
      lastMorningDeliveryFailureAt: new Date(),
      updatedAt: new Date(),
    });

    await writeDeliveryLog({
      userId: params.userId,
      type: 'MORNING_CARD',
      status: 'failed',
      stage: 'worker',
      deliveryId: params.deliveryId,
      error: message,
      metadata: {
        attempts,
        maxAttempts: MAX_MORNING_DELIVERY_ATTEMPTS,
        journeyStage: params.journeyStage,
        journeyDayIndex: params.journeyDayIndex,
      },
    });

    logger.warn(
      { userId: params.userId, attempts, maxAttempts: MAX_MORNING_DELIVERY_ATTEMPTS },
      'Morning delivery attempt failed — will retry on next dispatch tick',
    );
  }

  return { attempts, permanent };
}
