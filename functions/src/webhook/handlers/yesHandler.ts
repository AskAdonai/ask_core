import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendWhatsAppMessage, sendMultiplyDeclarationAck } from '../../services/twilioService';
import { incrementStreak, recordMultiplyDeclaration } from '../../services/streakService';
import { DEFAULT_GRACE_DAYS } from '../../services/effectiveStreakService';
import { buildMilestoneCelebration } from '../../services/streakMilestoneService';
import {
  buildJourneyCompletionMessage,
  getJourneyStage,
  getMaxStageNumber,
} from '../../services/journeyStageService';
import { getJourneyPrayerContent } from '../../services/prayerCardService';
import type { User } from '../../types/schemas';
import pino from 'pino';

const logger = pino();

/**
 * Handles the YES declaration.
 *
 * First YES of the local day → streak, vineStage, journey advance, confirmation message.
 * Subsequent YES while awaitingDeclarationYes → increments declarationsToday only,
 * sends multiply ack with quick-reply buttons. Window closes via 5-minute stale TTL.
 *
 * Race-condition protection: incrementStreak / recordMultiplyDeclaration use Firestore
 * transactions so concurrent webhook retries cannot corrupt counters.
 */
export const handleYesDeclaration = async (
  phone: string,
  _keyword: string,
  user: Partial<User> | null
): Promise<void> => {
  if (!user) return;

  const db = getFirestore();
  const userId = phone.replace('+', '');
  const timezone = user.timezone ?? 'UTC';
  const name = user.name || 'Friend';

  const { incremented, streak, vineStage, alreadyDeclaredToday, streakReset } =
    await incrementStreak(phone, timezone);

  // ── Multiply declaration (same day, after first YES) ─────────────────────
  if (alreadyDeclaredToday) {
    const { declarationsToday } = await recordMultiplyDeclaration(phone, timezone);

    await db.collection('users').doc(userId).update({
      awaitingDeclarationYes: true,
      updatedAt: new Date(),
    });

    await sendMultiplyDeclarationAck(phone, name, declarationsToday);
    logger.info({ phone, declarationsToday }, 'Multiply YES declaration processed');
    return;
  }

  // ── Journey advancement (first YES of the day only) ───────────────────────
  const journeyUpdates: Record<string, unknown> = {
    awaitingDeclarationYes: true,
    updatedAt: new Date(),
  };

  const lastCelebrated = user.lastMilestoneStreakDays ?? 0;
  const { text: milestoneText, highestReached } = await buildMilestoneCelebration(
    name,
    lastCelebrated,
    streak,
  );
  if (highestReached > lastCelebrated) {
    journeyUpdates.lastMilestoneStreakDays = highestReached;
    journeyUpdates.graceDaysRemaining = DEFAULT_GRACE_DAYS;
  }

  const currentStage = user.journeyStage || 1;
  const currentDay = user.journeyDayIndex || 1;
  let journeyCompletionMsg = '';

  const stageConfig = await getJourneyStage(currentStage);
  const maxStage = await getMaxStageNumber();
  const currentDayContent = await getJourneyPrayerContent(currentStage, currentDay);
  const canAdvanceJourney = !!currentDayContent;

  if (stageConfig && canAdvanceJourney) {
    const atFinalDayOfFinalStage =
      currentStage === maxStage && currentDay >= stageConfig.dayCount;

    if (atFinalDayOfFinalStage) {
      journeyCompletionMsg = buildJourneyCompletionMessage(stageConfig.title);
      logger.info({ userId, currentStage }, 'User completed final available journey stage — holding');
    } else if (currentDay < stageConfig.dayCount) {
      journeyUpdates.journeyDayIndex = FieldValue.increment(1);
      logger.info({ userId, currentDay, dayCount: stageConfig.dayCount }, 'Advanced journeyDayIndex');
    } else if (currentStage < maxStage) {
      journeyUpdates.journeyStage = currentStage + 1;
      journeyUpdates.journeyDayIndex = 1;
      logger.info({ userId, oldStage: currentStage, newStage: currentStage + 1 }, 'Advanced journeyStage');
    }
  } else if (stageConfig && !canAdvanceJourney) {
    logger.info(
      { userId, currentStage, currentDay },
      'No deliverable devotion for current day — holding journey position',
    );
  } else {
    logger.warn({ userId, currentStage }, 'No journey stage config — skipping journey advance');
  }

  await db.collection('users').doc(userId).update(journeyUpdates);

  // ── First-YES confirmation ─────────────────────────────────────────────────
  let msg = `Declaration received. Well done, ${name}. Your vine grows stronger today. 🌿\n\n• *JOURNAL* — reflect in writing\n• *VINE* — check my growth`;
  if (streakReset) {
    msg += `\n\nYour previous streak has ended after the grace window. Today marks day 1 of a new streak — well done for returning. 🌱`;
  }
  msg += milestoneText;
  if (journeyCompletionMsg) {
    msg += `\n\n${journeyCompletionMsg}`;
  }

  await sendWhatsAppMessage(phone, msg);
  logger.info({ phone, streak, vineStage, incremented }, 'First YES declaration processed');
};
