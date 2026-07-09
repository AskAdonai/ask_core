import * as functions from '@google-cloud/functions-framework';
import { getFirestore } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '../services/twilioService';
import { rescheduleAfterSend, rescheduleAfterReminder } from '../services/schedulingService';
import { releaseExecutionLease } from '../utils/executionLease';
import { getEffectiveStreakState } from '../services/effectiveStreakService';
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
  const deliveryId: string | undefined = data.deliveryId;
  const db = getFirestore();

    const {
      writeDeliveryLog,
      isDuplicateDelivery,
      markDeliveryProcessed,
    } = await import('../services/deliveryLogService');
    const { formatDeliveryError, resolveReminderHourMinute } = await import('../utils/resolveReminderSchedule');
    const {
      recordMorningDeliveryFailure,
      resetMorningDeliveryFailures,
    } = await import('../services/morningDeliveryFailureService');

  try {
    if (deliveryId && await isDuplicateDelivery(userId, deliveryId, 'lastMorningDeliveryId')) {
      logger.warn({ userId, deliveryId }, 'Duplicate morning delivery detected — acking without send');
      await writeDeliveryLog({
        userId,
        type: 'MORNING_CARD',
        status: 'skipped',
        stage: 'worker',
        deliveryId,
        skipReason: 'duplicate_delivery_id',
      });
      return;
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      await writeDeliveryLog({
        userId,
        type: 'MORNING_CARD',
        status: 'skipped',
        stage: 'worker',
        deliveryId,
        skipReason: 'user_not_found',
      });
      return;
    }

    const user = userDoc.data()!;
    if (!user.phone) {
      await writeDeliveryLog({
        userId,
        type: 'MORNING_CARD',
        status: 'skipped',
        stage: 'worker',
        deliveryId,
        skipReason: 'missing_phone',
      });
      return;
    }

    const schedule = resolveReminderHourMinute(user);
    if (!schedule) {
      throw new Error(`Missing or invalid reminder schedule for user ${userId}`);
    }

    const journeyStage = user.journeyStage ?? 1;
    const journeyDayIndex = user.journeyDayIndex ?? 1;

    const { getJourneyPrayerContent } = await import('../services/prayerCardService');
    const {
      getJourneyHoldingMessage,
      getDevotionDayNotReadyMessage,
      areJourneyStagesReady,
      logMissingJourneyStages,
    } = await import('../services/journeyStageService');
    const { buildMorningTemplateBody } = await import('../messages/morningMessage');
    const { sendMorningDevotionMessage } = await import('../services/twilioService');

    const stagesReady = await areJourneyStagesReady();
    if (!stagesReady) {
      logMissingJourneyStages(userId);
      const holdingMsg = getJourneyHoldingMessage();
      await sendWhatsAppMessage(user.phone, holdingMsg);
      await rescheduleAfterSend(userId, user.timezone, schedule.hour, schedule.minute);

      if (deliveryId) {
        await markDeliveryProcessed(userId, deliveryId, 'lastMorningDeliveryId');
      }

      await writeDeliveryLog({
        userId,
        type: 'MORNING_CARD',
        status: 'sent',
        stage: 'worker',
        deliveryId,
        metadata: {
          holdingMessage: true,
        },
      });
      await resetMorningDeliveryFailures(userId);
      return;
    }

    const journeyContent = await getJourneyPrayerContent(journeyStage, journeyDayIndex);

    if (!journeyContent) {
      const holdingMsg = getDevotionDayNotReadyMessage();
      await sendWhatsAppMessage(user.phone, holdingMsg);
      await rescheduleAfterSend(userId, user.timezone, schedule.hour, schedule.minute);

      if (deliveryId) {
        await markDeliveryProcessed(userId, deliveryId, 'lastMorningDeliveryId');
      }

      await writeDeliveryLog({
        userId,
        type: 'MORNING_CARD',
        status: 'sent',
        stage: 'worker',
        deliveryId,
        metadata: {
          journeyStage,
          journeyDayIndex,
          holdingMessage: true,
        },
      });
      await resetMorningDeliveryFailures(userId);
      return;
    }

    const { text: msgBody, attachmentAudioUrl } = await buildMorningTemplateBody(user as any, journeyContent);
    const imageUrl = journeyContent?.card?.imageUrl;

    const twilioSid = await sendMorningDevotionMessage(
      user.phone,
      msgBody,
      imageUrl,
      attachmentAudioUrl,
    );
    await rescheduleAfterSend(userId, user.timezone, schedule.hour, schedule.minute);

    if (deliveryId) {
      await markDeliveryProcessed(userId, deliveryId, 'lastMorningDeliveryId');
    }

    await writeDeliveryLog({
      userId,
      type: 'MORNING_CARD',
      status: 'sent',
      stage: 'worker',
      deliveryId,
      twilioSid,
      metadata: {
        journeyStage: user.journeyStage ?? 1,
        journeyDayIndex: user.journeyDayIndex ?? 1,
        hasJourneyContent: !!journeyContent,
        hasThemeContent: false,
      },
    });
    await resetMorningDeliveryFailures(userId);
  } catch (error) {
    const message = formatDeliveryError(error);
    logger.error({ userId, deliveryId, error }, 'Failed to process send worker');

    const userDoc = await db.collection('users').doc(userId).get();
    const failedUser = userDoc.data();
    const schedule = failedUser ? resolveReminderHourMinute(failedUser) : null;

    if (failedUser?.timezone && schedule) {
      await recordMorningDeliveryFailure({
        userId,
        timezone: failedUser.timezone,
        reminderHour: schedule.hour,
        reminderMinute: schedule.minute,
        deliveryId,
        error,
        journeyStage: failedUser.journeyStage,
        journeyDayIndex: failedUser.journeyDayIndex,
      });
    } else {
      await writeDeliveryLog({
        userId,
        type: 'MORNING_CARD',
        status: 'failed',
        stage: 'worker',
        deliveryId,
        error: message,
      });
    }
  } finally {
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
      const streakState = getEffectiveStreakState(user as import('../types/User').User, timezone, nowLocal);

      if (!hasDeclaredToday) {
        if (streakState.graceExhausted && !user.paused) {
          await db.collection('users').doc(userId).update({
            paused: true,
            lastCheckinSent: nowLocal.toFormat('yyyy-MM-dd'),
            updatedAt: new Date(),
          });

          await sendWhatsAppMessage(
            user.phone,
            `Your vine is resting, ${user.name || 'Friend'}.\n\nYour grace window has ended without a declaration. I have gently paused your daily card so your space stays quiet.\n\nWhenever you are ready to return, simply reply *RESUME* and I will be here — right where you left off. 🌿`
          );

          logger.info(
            { userId, inactiveDays: streakState.inactiveDays },
            'Auto-paused user after 3-day grace exhaustion — gentle check-in sent',
          );
        } else if (!streakState.graceExhausted) {
          await sendWhatsAppMessage(
            user.phone,
            `You haven’t made your declaration today, ${user.name || 'Friend'}. Reply *SEEK* to keep your streak alive. 🙏`
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

      const { getCurrentCalendarWeek } = await import('../utils/calendarWeek');
      const { syncQuestWeekToCalendar } = await import('../services/questProgressService');
      const activeWeek = getCurrentCalendarWeek(user.timezone || 'UTC');
      await syncQuestWeekToCalendar(user.phone, user.timezone || 'UTC');

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
              coverPic: content.introImageUrl || '',
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
