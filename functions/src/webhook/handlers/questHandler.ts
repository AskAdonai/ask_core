import { sendWhatsAppMessage } from '../../services/twilioService';
import { startQuest, getQuestProgress } from '../../services/questProgressService';
import { updateUserFields } from '../../services/userService';
import type { User } from '../../types/schemas';
import pino from 'pino';

const logger = pino();

// ─────────────────────────────────────────────────────────────────────────────
// Utility — next weekday date string (Monday for video delivery)
// ─────────────────────────────────────────────────────────────────────────────
const nextWeekday = (targetDay: 1 | 3 | 5): string => {
  const now = new Date();
  const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  return next.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 — User texts "QUEST"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles the QUEST keyword.
 * - If user is already enrolled: returns their current progress.
 * - If not enrolled: sends the Quest welcome message and sets awaitingQuestConfirm.
 */
export const handleQuestOnboarding = async (
  phone: string,
  user: Partial<User> | null
): Promise<void> => {
  // Guard: must be an ASK user first
  if (!user || !user.name) {
    await sendWhatsAppMessage(
      phone,
      `Please join ASK first by typing *ASK* — then you can begin your Quest. 🙏`
    );
    return;
  }

  // Already enrolled — return progress
  const existing = await getQuestProgress(phone);
  if (existing && existing.active) {
    const videosThisWeek = existing.videoIndex;
    const chaptersRead = existing.chaptersLogged;
    await sendWhatsAppMessage(
      phone,
      `📖 *Your Quest — Week ${existing.week}*\n\nVideos watched this week: ${videosThisWeek}/3\nChapters logged independently: ${chaptersRead}\n\nType *WATCH* to get your next video early.\nType *LOG* to log a chapter you read independently.\nType *PROGRESS* for your full journey summary.`
    );
    logger.info({ phone, week: existing.week }, 'Quest status returned');
    return;
  }

  // New enrolment — send welcome and await confirmation
  await updateUserFields(phone, { awaitingQuestConfirm: true } as Partial<User>);

  await sendWhatsAppMessage(
    phone,
    `📖 *Welcome to The Quest — Bible in a Year.*\n\n52 weeks. The whole Word. At your own pace.\n\nEvery Monday, Wednesday and Friday I will bring you a video reading. Each week there is a short quiz to help you reflect on what you have read. And you can log any chapters you read independently.\n\nAre you ready to begin?\n\n_Reply *YES* to start your Quest, or *MORE* to find out more._`
  );

  logger.info({ phone }, 'Quest welcome sent — awaiting confirmation');
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — User replies "Yes" or "More"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles the user's response to the Quest confirmation prompt.
 * Accepts: "yes", "yes — start my quest", "start", "y"
 * Declines: "more", "not yet", "no", "tell me more"
 */
export const handleQuestConfirmReply = async (
  phone: string,
  rawText: string,
  user: Partial<User>
): Promise<void> => {
  const normalized = rawText.trim().toLowerCase();

  const isYes = /^(yes|y|start|yeah|yep|go|ok|okay)/.test(normalized);
  const isMore = /^(more|not yet|no|nope|tell|later|wait)/.test(normalized);

  if (isYes) {
    // Enroll the user
    await startQuest(phone);
    await updateUserFields(phone, { awaitingQuestConfirm: false } as Partial<User>);

    const reminderTime = user.reminderTimeLocal || '06:00';
    const nextMonday = nextWeekday(1); // 1 = Monday

    await sendWhatsAppMessage(
      phone,
      `✅ *Your Quest begins. Week 1, Day 1.*\n\nThis week you are in *Genesis* — the beginning of everything.\n\nYour first video arrives this Monday at *${reminderTime}*. If you ever want to check your progress, type *PROGRESS*. To log a chapter you have read independently, type *LOG*.\n\nThe Word is alive. Let's read it together. 📖\n\n_(Next video: ${nextMonday})_`
    );

    logger.info({ phone }, 'User enrolled in Quest — Week 1 started');
    return;
  }

  if (isMore) {
    // "Not yet" — send more info without enrolling, reset flag
    await updateUserFields(phone, { awaitingQuestConfirm: false } as Partial<User>);

    await sendWhatsAppMessage(
      phone,
      `📖 *About The Quest*\n\nThe Quest takes you through the entire Bible in 52 weeks — Old and New Testament.\n\n*How it works:*\n• 3 short videos per week (Monday, Wednesday, Friday)\n• Videos are pre-recorded by an avatar guide, with audio versions on Spotify\n• Each week ends with a short reflection quiz\n• Log chapters you read independently with *LOG*\n• Every user starts at Week 1, Day 1 regardless of when they join\n\nWhen you are ready to begin, type *QUEST* again. The Word will be waiting. 🙏`
    );

    logger.info({ phone }, 'Quest "more info" sent — not yet enrolled');
    return;
  }

  // Unrecognised reply — re-prompt
  await sendWhatsAppMessage(
    phone,
    `I didn't quite catch that. Reply *YES* to begin your Quest, or *MORE* to learn more first.`
  );
};
