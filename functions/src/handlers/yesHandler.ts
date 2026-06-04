import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '../services/twilioService';
import { incrementStreak } from '../services/streakService';
import { JourneyStage, JOURNEY_STAGE_CONFIG } from '../types/JourneyStage';
import type { User } from '../types/schemas';
import pino from 'pino';

const logger = pino();

const MILESTONES = [7, 14, 21, 30, 60, 100];

/**
 * Handles the iterative YES declaration loop.
 */
export const handleYesDeclaration = async (phone: string, keyword: string, user: Partial<User> | null) => {
  if (!user) return;

  const db = getFirestore();
  const userId = phone.replace('+', '');

  // Determine count (handles "yes x10", "yes 10", "yes - i declare it", etc)
  const count = (keyword.includes('10') || keyword.includes('x10')) ? 10 : 1;

  // Increment streak (handles declarationsToday internally)
  const { incremented, streak, vineStage, declarationsToday } = await incrementStreak(phone, user.timezone ?? 'UTC', count);
  const currentCount = declarationsToday ?? count;

  let msg = '';

  if (currentCount < 10) {
    msg = `${currentCount} of 10. Keep going.\n\n• *YES* — declare again\n• *JOURNAL* — reflect\n• *VINE* — my growth`;
  } else {
    if (count === 10) {
      msg = `10 declarations received. Well done. Your vine grows stronger today.`;
    } else {
      msg = `You have declared it 10 times. Well done. Your vine grows stronger today.`;
    }
    const updates: any = {
      awaitingDeclarationYes: false,
      updatedAt: new Date(),
    };

    if (currentCount - count < 10) {
      const currentStage = user.journeyStage || JourneyStage.BELIEVE;
      const config = JOURNEY_STAGE_CONFIG[currentStage as JourneyStage] || JOURNEY_STAGE_CONFIG[JourneyStage.BELIEVE];
      const currentDay = user.journeyDayIndex || 1;

      if (currentDay < config.requiredDays) {
        updates.journeyDayIndex = FieldValue.increment(1);
        logger.info({ userId, currentDay, requiredDays: config.requiredDays }, 'Advanced journeyDayIndex upon completing 10 declarations');
      } else {
        // Advance stage, reset day, UNLESS they are on the final stage
        if (currentStage < JourneyStage.REIGN) {
          updates.journeyStage = currentStage + 1;
          updates.journeyDayIndex = 1;
          logger.info({ userId, oldStage: currentStage, newStage: currentStage + 1 }, 'Advanced journeyStage upon completing required days');
        } else {
          logger.info({ userId, currentStage, currentDay }, 'journeyDayIndex maxed out on final stage. Keeping user at max.');
        }
      }
    }

    // Clear the awaiting state since they finished (and advance journey if applicable)
    await db.collection('users').doc(userId).update(updates);
  }

  // If this was the first YES of the day and it hit a milestone, append celebration
  if (incremented) {
    const name = user.name || 'Friend';
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
    } else if (streak === 70) {
      msg += `\n\nSeventy days of showing up. ${name}, your vine is deep-rooted now.\nYou have built something that belongs to you and God alone.\nKeep going.`;
    } else if (streak === 100) {
      msg += `\n\nOne hundred days, ${name}. One hundred. This is rare. This is what it looks like when someone decides and does not undecide.\nWe are honoured to walk with you.`;
    }
  }

  await sendWhatsAppMessage(phone, msg);
  logger.info({ phone, streak, vineStage, currentCount, incremented }, 'Processed YES declaration');
};
