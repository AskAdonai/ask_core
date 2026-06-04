import * as functions from '@google-cloud/functions-framework';
import { getFirestore } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '../services/twilioService';
import { rescheduleAfterSend, rescheduleAfterReminder } from '../services/schedulingService';
import { releaseExecutionLease } from '../utils/executionLease';
import pino from 'pino';

const logger = pino();

functions.cloudEvent('processSendWorker', async (cloudEvent: any) => {
  if (!cloudEvent.data || !cloudEvent.data.message || !cloudEvent.data.message.data) return;
  const dataString = Buffer.from(cloudEvent.data.message.data, 'base64').toString('utf8');
  const data = JSON.parse(dataString);
  const userId = data.userId;
  const db = getFirestore();

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    const user = userDoc.data()!;

    // Morning ASK always follows the Journey, even during an active NEED session.
    const { getJourneyPrayerContent } = await import('../services/prayerCardService');
    const content = await getJourneyPrayerContent(user.journeyStage ?? 1, user.journeyDayIndex ?? 1);
    const card = content?.card;
    let msgBody = content
      ? `🌅 Good morning, ${user.name}!\n\n_${content.prayer.verse}_\n— ${content.prayer.reference}\n\n${content.prayer.prayerText}`
      : `Good morning! It's time for your daily devotional. Send *SEEK* to read today's word. 🙏`;

    const mediaUrls: string[] = [];
    if (content && card) {
      if (card.imageUrl) mediaUrls.push(card.imageUrl);
      if (card.morningVoiceNoteUrl) mediaUrls.push(card.morningVoiceNoteUrl);
    }

    await sendWhatsAppMessage(user.phone, msgBody, mediaUrls.length > 0 ? mediaUrls : undefined);

    // ── Quest Scheduled Delivery ──────────────────────────────────────────────
    if (user.questActive) {
      const { DateTime } = await import('luxon');
      const localNow = DateTime.now().setZone(user.timezone || 'UTC');
      const weekday = localNow.weekday; // 1=Mon, 3=Wed, 5=Fri

      let targetVideoIndex = -1;
      if (weekday === 1) targetVideoIndex = 0;
      else if (weekday === 3) targetVideoIndex = 1;
      else if (weekday === 5) targetVideoIndex = 2;

      if (targetVideoIndex !== -1) {
        const currentVideoIndex = user.questVideoIndex || 0;
        // Guard: only send if they haven't watched this video yet via early WATCH
        if (currentVideoIndex <= targetVideoIndex) {
          const contentDoc = await db.collection('questContent').doc(String(user.questWeek || 1)).get();
          if (contentDoc.exists) {
            const content = contentDoc.data() as any;
            const videoUrl = content.videoLinks?.[targetVideoIndex];
            if (videoUrl) {
              const bookTitle = content.books || content.weekTitle;
              const qMsg = `📺 *Your Quest Video: Week ${user.questWeek} — ${bookTitle}*\n\nHere is your scheduled reading video for today.`;
              await sendWhatsAppMessage(user.phone, qMsg, [videoUrl]);

              await db.collection('users').doc(userId).update({
                questVideoIndex: targetVideoIndex + 1,
                updatedAt: new Date()
              });
              logger.info({ userId, week: user.questWeek, videoIndex: targetVideoIndex }, 'Scheduled Quest video delivered');
            }
          }
        } else {
          logger.info({ userId, targetVideoIndex, currentVideoIndex }, 'Skipped Quest video delivery (already watched via WATCH)');
        }
      }
    }

    // Reschedule
    await rescheduleAfterSend(userId, user.timezone, user.reminderHour, user.reminderMinute);

  } catch (error) {
    logger.error({ userId, error }, 'Failed to process send worker');
    await releaseExecutionLease('users', userId);
  }
});

functions.cloudEvent('processReminderWorker', async (cloudEvent: any) => {
  if (!cloudEvent.data || !cloudEvent.data.message || !cloudEvent.data.message.data) return;
  const dataString = Buffer.from(cloudEvent.data.message.data, 'base64').toString('utf8');
  const data = JSON.parse(dataString);
  const userId = data.userId;
  const db = getFirestore();

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    const user = userDoc.data()!;

    if (user.declarationsToday === 0) {
      const { DateTime } = await import('luxon');
      const nowLocal = DateTime.now().setZone(user.timezone || 'UTC');
      const lastActive = user.lastActiveDate ? DateTime.fromISO(user.lastActiveDate, { zone: user.timezone }) : null;
      const lastCheckin = user.lastCheckinSent ? DateTime.fromISO(user.lastCheckinSent, { zone: user.timezone }) : null;

      const daysSinceActive = lastActive ? Math.floor(nowLocal.diff(lastActive, 'days').days) : 0;
      const daysSinceCheckin = lastCheckin ? Math.floor(nowLocal.diff(lastCheckin, 'days').days) : Infinity;

      if (daysSinceActive >= 14 && daysSinceCheckin >= 14) {
        // Re-engagement for inactive users
        await sendWhatsAppMessage(user.phone, "We haven't heard from you in a while! Would you like to explore targeted prayer themes today? Type *NEED*.");
        await db.collection('users').doc(userId).update({ lastCheckinSent: nowLocal.toFormat('yyyy-MM-dd') });
      } else {
        // Normal daily reminder
        await sendWhatsAppMessage(user.phone, "Hey! You haven't made your declaration today. Reply *KNOCK* to continue your streak!");
      }
    }

    // Reschedule
    await rescheduleAfterReminder(userId, user.timezone);

  } catch (error) {
    logger.error({ userId, error }, 'Failed to process reminder worker');
    await releaseExecutionLease('users', userId);
  }
});
