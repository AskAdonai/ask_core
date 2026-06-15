import * as functions from '@google-cloud/functions-framework';
import { getFirestore } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '../services/twilioService';
import { rescheduleAfterSend, rescheduleAfterReminder } from '../services/schedulingService';
import { releaseExecutionLease } from '../utils/executionLease';
import { getSpiritualTitle } from '../utils/spiritualTitles';
import pino from 'pino';

const logger = pino();

const toLocalDateTime = async (value: any, timezone: string) => {
  if (!value) return null;

  const { DateTime } = await import('luxon');
  if (typeof value.toDate === 'function') {
    return DateTime.fromJSDate(value.toDate()).setZone(timezone);
  }
  if (value instanceof Date) {
    return DateTime.fromJSDate(value).setZone(timezone);
  }
  if (typeof value === 'string') {
    const parsed = DateTime.fromISO(value, { zone: timezone });
    return parsed.isValid ? parsed : null;
  }

  return null;
};

functions.cloudEvent('processSendWorker', async (cloudEvent: any) => {
  if (!cloudEvent.data || !cloudEvent.data.message || !cloudEvent.data.message.data) return;
  const dataString = Buffer.from(cloudEvent.data.message.data, 'base64').toString('utf8');
  const data = JSON.parse(dataString);
  const userId = data.userId;
  const deliveryId: string | undefined = data.deliveryId;  // UUID embedded by dispatcher
  const db = getFirestore();



  try {
    // ── Idempotency check (atomic transaction) ────────────────────────────────
    // If this deliveryId was already processed, this is a Pub/Sub retry.
    // We ack it silently — no Twilio call, no state mutation.
    if (deliveryId) {
      const alreadyProcessed = await db.runTransaction(async (tx) => {
        const ref = db.collection('users').doc(userId);
        const snap = await tx.get(ref);
        if (!snap.exists) return true; // treat missing user as processed (skip)
        if (snap.data()!.lastMorningDeliveryId === deliveryId) return true; // duplicate
        // Claim this deliveryId atomically — no other invocation can pass after this
        tx.update(ref, { lastMorningDeliveryId: deliveryId, updatedAt: new Date() });
        return false;
      });
      if (alreadyProcessed) {
        logger.warn({ userId, deliveryId }, 'Duplicate morning delivery detected — acking without send');
        return;
      }
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    const user = userDoc.data()!;

    // Morning ASK always follows the Journey, even during an active NEED session.
    const { getJourneyPrayerContent } = await import('../services/prayerCardService');
    const content = await getJourneyPrayerContent(user.journeyStage ?? 1, user.journeyDayIndex ?? 1);
    const card = content?.card;
    const { buildMorningMessage } = await import('../messages/morningMessage');
    const { text: msgBody, audioUrl, cloudflareMediaId } = buildMorningMessage(user as any, content);

    const mediaUrls: string[] = [];
    if (content && card) {
      if (card.imageUrl) mediaUrls.push(card.imageUrl);
      // We still fall back to the card's URL if buildMorningMessage doesn't override it
      if (audioUrl) mediaUrls.push(audioUrl);
      else if (card.morningVoiceNoteUrl) mediaUrls.push(card.morningVoiceNoteUrl);
    }

    await sendWhatsAppMessage(user.phone, msgBody, mediaUrls.length > 0 ? mediaUrls : undefined);



    // Reschedule
    await rescheduleAfterSend(userId, user.timezone, user.reminderHour, user.reminderMinute);

  } catch (error) {
    logger.error({ userId, error }, 'Failed to process send worker');
  } finally {
    // Always release the lease — on success this collapses the lock to actual
    // execution time rather than the full 2-minute TTL, meaning the next
    // scheduled run can claim the user immediately after this one finishes.
    // On failure the lock is also released so the reconciler doesn’t need to wait.
    await releaseExecutionLease('users', userId);
  }
});

functions.cloudEvent('processReminderWorker', async (cloudEvent: any) => {
  if (!cloudEvent.data || !cloudEvent.data.message || !cloudEvent.data.message.data) return;
  const dataString = Buffer.from(cloudEvent.data.message.data, 'base64').toString('utf8');
  const data = JSON.parse(dataString);
  const userId = data.userId;
  const deliveryId: string | undefined = data.deliveryId;  // UUID embedded by dispatcher
  const db = getFirestore();

  try {
    // ── Idempotency check (atomic transaction) ────────────────────────────────
    if (deliveryId) {
      const alreadyProcessed = await db.runTransaction(async (tx) => {
        const ref = db.collection('users').doc(userId);
        const snap = await tx.get(ref);
        if (!snap.exists) return true;
        if (snap.data()!.lastReminderDeliveryId === deliveryId) return true; // duplicate
        tx.update(ref, { lastReminderDeliveryId: deliveryId, updatedAt: new Date() });
        return false;
      });
      if (alreadyProcessed) {
        logger.warn({ userId, deliveryId }, 'Duplicate reminder delivery detected — acking without send');
        return;
      }
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    const user = userDoc.data()!;

    {
      const { DateTime } = await import('luxon');
      const timezone = user.timezone || 'UTC';
      const nowLocal = DateTime.now().setZone(timezone);
      const lastActive = await toLocalDateTime(user.lastActiveDate, timezone);
      const joinedAt = await toLocalDateTime(user.joinedAt, timezone);
      const createdAt = await toLocalDateTime(user.createdAt, timezone);
      const lastCheckin = await toLocalDateTime(user.lastCheckinSent, timezone);
      const hasDeclaredToday = lastActive?.hasSame(nowLocal, 'day') === true;

      if (!hasDeclaredToday) {
        const activityBaseline = lastActive || joinedAt || createdAt || nowLocal;
        const daysSinceActive = Math.floor(
          nowLocal.startOf('day').diff(activityBaseline.startOf('day'), 'days').days
        );

        // ── Auto-pause after 7 missed days (one-time gentle check-in) ────────────
        // Guard: only send this check-in once per absence period (lastCheckinSent
        // must be null or itself older than 7 days so we don’t flood the user).
        const daysSinceCheckin = lastCheckin
          ? Math.floor(nowLocal.startOf('day').diff(lastCheckin.startOf('day'), 'days').days)
          : Infinity;

        const isAutopaused = daysSinceActive >= 7 && daysSinceCheckin >= 7;

        if (isAutopaused) {
          // Pause the user so no further morning cards fire until they RESUME
          await db.collection('users').doc(userId).update({
            paused: true,
            lastCheckinSent: nowLocal.toFormat('yyyy-MM-dd'),
            updatedAt: new Date(),
          });

          await sendWhatsAppMessage(
            user.phone,
            `Your vine is resting, ${user.name || 'Friend'}.\n\nIt has been a week since we last walked together. I have gently paused your daily card so your space stays quiet.\n\nWhenever you are ready to return, simply reply *RESUME* and I will be here — right where you left off. 🌿`
          );

          logger.info({ userId, daysSinceActive }, 'Auto-paused user after 7 missed days — gentle check-in sent');
        } else {
          // Normal evening nudge — user has not declared today.
          await sendWhatsAppMessage(
            user.phone,
            `You haven’t made your declaration today, ${user.name || 'Friend'}. Reply *KNOCK* to keep your streak alive. 🙏`
          );
        }
      }
    }

    // Reschedule
    await rescheduleAfterReminder(userId, user.timezone);

  } catch (error) {
    logger.error({ userId, error }, 'Failed to process reminder worker');
  } finally {
    // Always release — same rationale as processSendWorker above.
    await releaseExecutionLease('users', userId);
  }
});

functions.cloudEvent('processQuestWorker', async (cloudEvent: any) => {
  if (!cloudEvent.data || !cloudEvent.data.message || !cloudEvent.data.message.data) return;
  const dataString = Buffer.from(cloudEvent.data.message.data, 'base64').toString('utf8');
  const data = JSON.parse(dataString);
  const userId = data.userId;
  const deliveryId: string | undefined = data.deliveryId;  // UUID embedded by dispatcher
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();

  try {
    // ── Idempotency check (atomic transaction) ────────────────────────────────
    if (deliveryId) {
      const alreadyProcessed = await db.runTransaction(async (tx) => {
        const ref = db.collection('users').doc(userId);
        const snap = await tx.get(ref);
        if (!snap.exists) return true;
        if (snap.data()!.lastQuestDeliveryId === deliveryId) return true; // duplicate
        tx.update(ref, { lastQuestDeliveryId: deliveryId, updatedAt: new Date() });
        return false;
      });
      if (alreadyProcessed) {
        logger.warn({ userId, deliveryId }, 'Duplicate quest delivery detected — acking without send');
        return;
      }
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    const user = userDoc.data()!;

    if (user.questActive) {
      const { DateTime } = await import('luxon');
      const localNow = DateTime.now().setZone(user.timezone || 'UTC');
      const weekday = localNow.weekday; // Luxon: 1=Mon, 2=Tue … 7=Sun

      const todayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const todayName = todayNames[weekday - 1]; // 1=Mon => index 0

      // We are using a Global Calendar Track for quests.
      // To switch back to an Individual Track, simply change `activeWeek` to `user.questWeek || 1`.
      const { getCurrentCalendarWeek } = await import('../utils/calendarWeek');
      const activeWeek = getCurrentCalendarWeek(user.timezone || 'UTC');

      const contentDoc = await db.collection('questContent').doc(String(activeWeek)).get();
      if (contentDoc.exists) {
        const content = contentDoc.data() as any;
        const todayData = content.days?.[todayName];

        if (todayData) {
          const name = user.name || 'Friend';
          const weekNumber: number = content.weekNumber || activeWeek;
          const weeklyChapterSpan: string = content.weeklyChapterSpan || '';

          const {
            sendQuestMonday,
            sendQuestTuesday,
            sendQuestWednesday,
            sendQuestFriday,
            sendQuestSaturday,
            sendWhatsAppMessage: sendText,
          } = await import('../services/twilioService');

          if (todayName === 'monday') {
            await sendQuestMonday(user.phone, {
              name,
              weekNumber,
              mondayEncouragement: todayData.mondayEncouragement || '',
              readingPortion: todayData.readingPortion || '',
              videoLink: todayData.videoLink || '',
            });

          } else if (todayName === 'tuesday') {
            await sendQuestTuesday(user.phone, {
              name,
              tuesdaySummary: todayData.tuesdaySummary || '',
              reflectionQuote: todayData.reflectionQuote || '',
            });

          } else if (todayName === 'wednesday') {
            await sendQuestWednesday(user.phone, {
              name,
              weekNumber,
              readingPortion: todayData.readingPortion || '',
              wednesdaySummary: todayData.wednesdaySummary || '',
              videoLink: todayData.videoLink || '',
              estimatedTime: todayData.estimatedTime || '30 minutes',
              signOff: todayData.signOff || '',
            });

          } else if (todayName === 'thursday') {
            // No dedicated template — plain text
            let msg = `Hello ${name} 👋\n\n${todayData.thursdaySummary || ''}`;
            if (todayData.readingPortion) msg += `\n\n*Reading:* ${todayData.readingPortion}`;
            await sendText(user.phone, msg);

          } else if (todayName === 'friday') {
            await sendQuestFriday(user.phone, {
              name,
              fridayEncouragement: todayData.fridayEncouragement || '',
              weekNumber,
              readingPortion: todayData.readingPortion || '',
              videoLink: todayData.videoLink || '',
              weeklySummary: todayData.weeklySummary || '',
            });

          } else if (todayName === 'saturday') {
            await sendQuestSaturday(user.phone, {
              name,
              quizGreeting: todayData.quizGreeting || '',
              weeklyChapterSpan,
              quizLinks: todayData.quizLinks || '',
              saturdayEncouragement: todayData.saturdayEncouragement || '',
            });

          } else if (todayName === 'sunday') {
            const msg = `Hello ${name} 👋\n\n${todayData.sundaySummary || ''}`;
            await sendText(user.phone, msg);
          }

          logger.info({ userId, week: weekNumber, day: todayName }, 'Quest content delivered');
        }
      }
    }

    // Reschedule
    const { rescheduleAfterQuest } = await import('../services/schedulingService');
    await rescheduleAfterQuest(userId, user.timezone);

  } catch (error) {
    logger.error({ userId, error }, 'Failed to process quest worker');
  } finally {
    const { releaseExecutionLease } = await import('../utils/executionLease');
    await releaseExecutionLease('users', userId);
  }
});
