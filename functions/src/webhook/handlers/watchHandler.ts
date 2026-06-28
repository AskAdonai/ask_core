import { sendWhatsAppMessage } from '../../services/twilioService';
import {
  getQuestProgress,
  advanceQuestVideo,
  syncQuestWeekToCalendar,
} from '../../services/questProgressService';
import { getFirestore } from 'firebase-admin/firestore';
import type { User, QuestContent } from '../../types/schemas';
import pino from 'pino';

const logger = pino();

export const deliverNextVideoEarly = async (
  phone: string,
  user: Partial<User> | null
): Promise<void> => {
  if (!user || !user.questActive) {
    await sendWhatsAppMessage(
      phone,
      `You haven't started a Quest yet! Type *QUEST* to begin your journey through the Bible.`
    );
    return;
  }

  const timezone = user.timezone || 'UTC';
  await syncQuestWeekToCalendar(phone, timezone);

  const existing = await getQuestProgress(phone);
  if (!existing || !existing.active) {
    await sendWhatsAppMessage(
      phone,
      `You haven't started a Quest yet! Type *QUEST* to begin your journey through the Bible.`
    );
    return;
  }

  const week = existing.week;
  const currentVideoIndex = existing.videoIndex;

  if (currentVideoIndex >= 3) {
    await sendWhatsAppMessage(
      phone,
      `You have watched all the videos for Week ${week}! Your next video arrives on Monday.`
    );
    return;
  }

  const db = getFirestore();
  const contentDoc = await db.collection('questContent').doc(String(week)).get();
  if (!contentDoc.exists) {
    await sendWhatsAppMessage(phone, `Week ${week} content is not available yet.`);
    return;
  }

  const content = contentDoc.data() as QuestContent;

  // Build ordered video sequence from the structured days object (Mon, Wed, Fri)
  const VIDEO_DAYS = ['monday', 'wednesday', 'friday'] as const;
  const videoDays = VIDEO_DAYS
    .map(day => ({ day, videoLink: content.days?.[day]?.videoLink }))
    .filter(d => !!d.videoLink);

  if (currentVideoIndex >= videoDays.length) {
    await sendWhatsAppMessage(
      phone,
      `You have watched all the videos for Week ${week}! Your next video arrives next week.`
    );
    return;
  }

  const targetDay = videoDays[currentVideoIndex];
  const bookTitle = content.weeklyChapterSpan || `Week ${week}`;
  const dayLabel = targetDay.day.charAt(0).toUpperCase() + targetDay.day.slice(1);
  const dayContent = content.days?.[targetDay.day];
  const readingPortion = dayContent?.readingPortion?.trim();

  let msg =
    `📺 *Week ${week} — ${bookTitle}*\n\n` +
    `Here is your early video for ${dayLabel}.`;

  if (readingPortion) {
    msg += `\n\n*Reading:* ${readingPortion}`;
  }

  if (targetDay.videoLink) {
    // YouTube/page links must be in the body — WhatsApp mediaUrl only accepts direct media files.
    msg += `\n\n👉 Watch here: ${targetDay.videoLink}`;
  }

  try {
    await sendWhatsAppMessage(phone, msg);
    await advanceQuestVideo(phone);
    logger.info({ phone, week, videoIndex: currentVideoIndex, day: targetDay.day }, 'Early Quest video delivered');
  } catch (error) {
    logger.error({ error, phone, week, videoIndex: currentVideoIndex }, 'Failed to send early Quest video');
    await sendWhatsAppMessage(
      phone,
      `Sorry, I couldn't send that video right now. Please try *WATCH* again in a moment.`,
    );
  }
};
