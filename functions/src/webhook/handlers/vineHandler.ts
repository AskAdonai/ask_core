import { sendWhatsAppMessage } from '../../services/twilioService';
import { getFirestore } from 'firebase-admin/firestore';
import type { User } from '../../types/schemas';
import { DateTime } from 'luxon';
import pino from 'pino';

const logger = pino();

const getDaysToNextStage = (streak: number): number | null => {
  if (streak < 7) return 7 - streak;
  if (streak < 14) return 14 - streak;
  if (streak < 21) return 21 - streak;
  if (streak < 30) return 30 - streak;
  return null; // Fruitful is the final stage
};

const getDeclarationsThisWeek = async (phone: string, timezone: string): Promise<number> => {
  const db = getFirestore();
  const localNow = DateTime.now().setZone(timezone);
  // Luxon weekday: 1 = Monday ... 7 = Sunday
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

  const stage = user.vineStage || 'Grafted';
  const streak = user.streak || 0;
  const timezone = user.timezone || 'UTC';
  
  const daysToNext = getDaysToNextStage(streak);
  const declarationsThisWeek = await getDeclarationsThisWeek(phone, timezone);

  let msg = `🌱 *Your Vine: ${stage}*\n\n`;
  msg += `🔥 *Streak:* ${streak} day${streak === 1 ? '' : 's'}\n`;
  msg += `🗣️ *Declarations this week:* ${declarationsThisWeek}\n`;
  
  if (daysToNext !== null) {
    msg += `⏳ *Days to next stage:* ${daysToNext}\n`;
  } else {
    msg += `✨ You have reached *Fruitful*, the deepest stage of growth. Keep remaining in the Vine.`;
  }

  await sendWhatsAppMessage(phone, msg);
  logger.info({ phone, stage, streak }, 'Sent VINE status');
};
