import { getFirestore } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { sendWhatsAppMessage } from './twilioService';
import { clearPendingStates, setPauseState, updateUserFields } from './userService';
import type { User } from '../types/schemas';
import pino from 'pino';

const logger = pino();

export const OPT_OUT_GRACE_DAYS = 7;

const graceDeletionDate = (timezone: string): string =>
  DateTime.now()
    .setZone(timezone || 'UTC')
    .plus({ days: OPT_OUT_GRACE_DAYS })
    .toFormat('cccc, d LLLL yyyy');

export const isOptedOut = (user: Partial<User>): boolean =>
  Boolean(user.optOutRequestedAt);

export const requestOptOut = async (phone: string, user: Partial<User>): Promise<void> => {
  const timezone = user.timezone || 'UTC';
  const now = new Date();
  const deletionAt = DateTime.now().setZone(timezone).plus({ days: OPT_OUT_GRACE_DAYS }).toJSDate();
  const deletionLabel = graceDeletionDate(timezone);

  await clearPendingStates(phone);
  await updateUserFields(phone, {
    paused: true,
    questActive: false,
    optOutRequestedAt: now,
    dataDeletionScheduledAt: deletionAt,
  });

  const name = user.name || 'Friend';
  await sendWhatsAppMessage(
    phone,
    `${name}, you have been unsubscribed from ASK. You will no longer receive daily messages.\n\n` +
    `Your account data will be permanently deleted on *${deletionLabel}*.\n\n` +
    `Changed your mind? Reply *RESUME* within ${OPT_OUT_GRACE_DAYS} days to keep your account and pick up where you left off.`
  );

  logger.info({ phone, deletionAt }, 'User opted out — deletion scheduled');
};

export const sendOptOutGraceReminder = async (phone: string, user: Partial<User>): Promise<void> => {
  const timezone = user.timezone || 'UTC';
  const deletionLabel = user.dataDeletionScheduledAt
    ? DateTime.fromJSDate(
        user.dataDeletionScheduledAt instanceof Date
          ? user.dataDeletionScheduledAt
          : (user.dataDeletionScheduledAt as { toDate: () => Date }).toDate()
      ).setZone(timezone).toFormat('cccc, d LLLL yyyy')
    : graceDeletionDate(timezone);

  await sendWhatsAppMessage(
    phone,
    `You are unsubscribed from ASK. Your data will be deleted on *${deletionLabel}*.\n\nReply *RESUME* to stay, or *HELP* for other options.`
  );
};

/** Cancels an opt-out during the grace window and resumes messaging. */
export const cancelOptOut = async (phone: string, user: Partial<User>): Promise<boolean> => {
  if (!isOptedOut(user)) return false;

  await updateUserFields(phone, {
    paused: false,
    optOutRequestedAt: null,
    dataDeletionScheduledAt: null,
  });

  logger.info({ phone }, 'Opt-out cancelled — user resumed');
  return true;
};

/** Permanently deletes a user document and all sub-collections. */
export const deleteUserAccount = async (phone: string): Promise<void> => {
  const db = getFirestore();
  const userId = phone.replace('+', '');
  const docRef = db.collection('users').doc(userId);
  const doc = await docRef.get();

  if (!doc.exists) return;

  await db.recursiveDelete(docRef);
  logger.info({ userId }, 'User account recursively deleted');
};

/** Deletes all users whose opt-out grace period has expired. */
export const purgeExpiredOptOuts = async (): Promise<number> => {
  const db = getFirestore();
  const now = new Date();

  const snapshot = await db.collection('users')
    .where('dataDeletionScheduledAt', '<=', now)
    .select()
    .get();

  let deleted = 0;
  for (const doc of snapshot.docs) {
    try {
      await db.recursiveDelete(doc.ref);
      deleted++;
      logger.info({ userId: doc.id }, 'Purged opted-out user after grace period');
    } catch (error) {
      logger.error({ userId: doc.id, error }, 'Failed to purge opted-out user');
    }
  }

  if (deleted > 0) {
    logger.info({ deleted }, 'Opt-out purge cycle complete');
  }

  return deleted;
};
