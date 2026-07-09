import { sendWhatsAppMessage } from '../../services/twilioService';
import { getFirestore } from 'firebase-admin/firestore';
import type { User } from '../../types/schemas';
import { DateTime } from 'luxon';
import { getDaysToNextVineStage } from '../../utils/vine';
import { getEffectiveStreakState } from '../../services/effectiveStreakService';
import pino from 'pino';

const logger = pino();

const getDeclarationsThisWeek = async (phone: string, timezone: string): Promise<number> => {
  const db = getFirestore();
  const localNow = DateTime.now().setZone(timezone);
  const monday = localNow.minus({ days: localNow.weekday - 1 }).toISODate();

  const snapshot = await db
    .collection('users')
    .doc(phone.replace('+', ''))
    .collection('declarations')
    .where('__name__', '>=', monday!)
    .get();

  let total = 0;
  snapshot.forEach((doc) => {
    total += doc.data().count || 0;
  });

  return total;
};

export const sendVineStatus = async (phone: string, user: Partial<User> | null): Promise<void> => {
  if (!user || !user.name) {
    await sendWhatsAppMessage(phone, 'You need to register with ASK first. Type *ASK* to begin.');
    return;
  }

  const timezone = user.timezone || 'UTC';
  const state = getEffectiveStreakState(user, timezone);
  const streak = state.effectiveStreak;
  const stage = state.effectiveVineStage;
  const daysToNext = getDaysToNextVineStage(streak);
  const declarationsThisWeek = await getDeclarationsThisWeek(phone, timezone);

  let msg = `🌱 *Your Vine: ${stage}*\n\n`;
  msg += `🔥 *Streak:* ${streak} day${streak === 1 ? '' : 's'}\n`;
  msg += `🗣️ *Declarations this week:* ${declarationsThisWeek}\n`;

  if (state.inactiveDays > 0 && !state.declaredToday && !state.graceExhausted) {
    msg += `🛡️ *Grace days remaining:* ${state.graceDaysRemaining}\n`;
  }

  if (state.graceExhausted && !state.declaredToday) {
    msg += `\nYour previous streak has lapsed after the grace window. Reply *SEEK* today to begin a fresh streak.\n`;
  }

  if (daysToNext !== null) {
    msg += `⏳ *Days to next stage:* ${daysToNext}\n`;
  } else if (!state.graceExhausted || state.declaredToday) {
    msg += `✨ You have reached *Fruitful*, the deepest stage of growth. Keep remaining in the Vine.`;
  }

  await sendWhatsAppMessage(phone, msg);
  logger.info({ phone, stage, streak, continuity: state.continuity }, 'Sent VINE status');
};
