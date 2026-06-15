import { sendWhatsAppMessage } from '../../services/twilioService';
import { getQuestProgress, advanceQuestVideo } from '../../services/questProgressService';
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

  const msg = `📺 *Week ${week} — ${bookTitle}*\n\nHere is your early video for ${dayLabel}.`;

  await sendWhatsAppMessage(phone, msg, targetDay.videoLink ? [targetDay.videoLink] : undefined);

  // Increment video index
  await advanceQuestVideo(phone);

  logger.info({ phone, week, videoIndex: currentVideoIndex }, 'Early Quest video delivered');
};
