import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '../../services/twilioService';
import { incrementStreak } from '../../services/streakService';
import { JourneyStage, JOURNEY_STAGE_CONFIG } from '../../types/JourneyStage';
import type { User } from '../../types/schemas';
import pino from 'pino';

const logger = pino();

/**
 * Handles the YES declaration.
 *
 * Design: one YES per day = declaration complete.
 *   - First YES of the day → increments streak, advances journey, clears awaiting flag.
 *   - Subsequent YES on the same day → silently acks (idempotent, zero writes).
 *
 * Race-condition protection: incrementStreak uses a Firestore transaction that
 * checks lastActiveDate atomically, so concurrent webhook retries cannot corrupt
 * the streak or trigger duplicate messages.
 */
export const handleYesDeclaration = async (
  phone: string,
  _keyword: string,
  user: Partial<User> | null
): Promise<void> => {
  if (!user) return;

  const db = getFirestore();
  const userId = phone.replace('+', '');

  // ── Atomic streak increment ────────────────────────────────────────────────
  const { incremented, streak, vineStage, alreadyDeclaredToday } =
    await incrementStreak(phone, user.timezone ?? 'UTC');

  // Duplicate / spam guard — already declared today
  if (alreadyDeclaredToday) {
    logger.info({ phone }, 'Duplicate YES ignored — already declared today');
    await sendWhatsAppMessage(
      phone,
      `You've already made today's declaration, ${user.name || 'Friend'}. Your streak stands. Reply *HELP* to see what else you can do. 🙏`
    );
    return;
  }

  // ── Journey advancement (runs only on the first YES of the day) ───────────
  const journeyUpdates: Record<string, unknown> = {
    awaitingDeclarationYes: false,
    updatedAt: new Date(),
  };

  const currentStage = user.journeyStage || JourneyStage.BELIEVE;
  const config =
    JOURNEY_STAGE_CONFIG[currentStage as JourneyStage] ||
    JOURNEY_STAGE_CONFIG[JourneyStage.BELIEVE];
  const currentDay = user.journeyDayIndex || 1;

  if (currentDay < config.requiredDays) {
    journeyUpdates.journeyDayIndex = FieldValue.increment(1);
    logger.info({ userId, currentDay, requiredDays: config.requiredDays }, 'Advanced journeyDayIndex');
  } else if (currentStage < JourneyStage.REIGN) {
    journeyUpdates.journeyStage = currentStage + 1;
    journeyUpdates.journeyDayIndex = 1;
    logger.info({ userId, oldStage: currentStage, newStage: currentStage + 1 }, 'Advanced journeyStage');
  }

  await db.collection('users').doc(userId).update(journeyUpdates);

  // ── Build confirmation message ─────────────────────────────────────────────
  const name = user.name || 'Friend';
  let msg = `Declaration received. Well done, ${name}. Your vine grows stronger today. 🌿\n\n• *JOURNAL* — reflect in writing\n• *VINE* — check my growth`;

  // ── Milestone celebrations (spec: streaks 7, 14, 21, 30, 60, 100) ─────────
  if (incremented) {
    if (streak === 7) {
      msg += `\n\nSeven days. Your vine has taken root, ${name}. You are *Rooted*.\nThe roots you cannot see are what hold you when the wind comes. In consistency lies the power.`;
    } else if (streak === 14) {
      msg += `\n\nFourteen days. Something is growing, ${name}. You are *Growing* now.\nKeep going — fruit does not appear overnight, but it always comes to the vine that stays.`;
    } else if (streak === 21) {
      msg += `\n\nTwenty-one days. You are blooming, ${name}. A habit has formed.\nA vine is flourishing. Do not stop now — you are beginning to become.`;
    } else if (streak === 30) {
      msg += `\n\nThirty days. Thirty. You are *Fruitful*, ${name}. This is not discipline — this is devotion. In consistency lies the power. Well done.`;
    } else if (streak === 60) {
      msg += `\n\nSixty days of showing up. ${name}, your vine is deep-rooted now.\nYou have built something that belongs to you and God alone.\nKeep going.`;
    } else if (streak === 100) {
      msg += `\n\nOne hundred days, ${name}. One hundred. This is rare. This is what it looks like when someone decides and does not undecide.\nWe are honoured to walk with you.`;
    }
  }

  await sendWhatsAppMessage(phone, msg);
  logger.info({ phone, streak, vineStage, incremented }, 'YES declaration processed');
};
