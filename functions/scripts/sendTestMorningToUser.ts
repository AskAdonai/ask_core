/**
 * Sends a real morning devotion to the designated test user (production Twilio + Firestore).
 *
 * Usage: npx ts-node scripts/sendTestMorningToUser.ts [userId]
 */
import { loadLocalEnv } from '../src/config/loadLocalEnv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

loadLocalEnv();

const TEST_USER_ID = process.argv[2] || '2348128991543';

if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'askwhatsappbot',
  });
}

async function main() {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(TEST_USER_ID).get();

  if (!userDoc.exists) {
    throw new Error(`User ${TEST_USER_ID} not found`);
  }

  const user = userDoc.data()!;
  const phone = user.phone || `+${TEST_USER_ID.replace(/^\+/, '')}`;
  const journeyStage = user.journeyStage ?? 1;
  const journeyDayIndex = user.journeyDayIndex ?? 1;

  const { getJourneyPrayerContent } = await import('../src/services/prayerCardService');
  const {
    getDevotionDayNotReadyMessage,
    getJourneyHoldingMessage,
    areJourneyStagesReady,
  } = await import('../src/services/journeyStageService');
  const { buildMorningTemplateBody } = await import('../src/messages/morningMessage');
  const { sendMorningDevotionMessage, sendWhatsAppMessage } = await import('../src/services/twilioService');
  const { resetMorningDeliveryFailures } = await import('../src/services/morningDeliveryFailureService');
  const { rescheduleAfterSend } = await import('../src/services/schedulingService');
  const { resolveReminderHourMinute } = await import('../src/utils/resolveReminderSchedule');

  console.log('Test user:', {
    userId: TEST_USER_ID,
    phone,
    journeyStage,
    journeyDayIndex,
  });

  const stagesReady = await areJourneyStagesReady();
  if (!stagesReady) {
    const sid = await sendWhatsAppMessage(phone, getJourneyHoldingMessage());
    console.log('Sent holding message. SID:', sid);
    return;
  }

  const journeyContent = await getJourneyPrayerContent(journeyStage, journeyDayIndex);
  if (!journeyContent) {
    const sid = await sendWhatsAppMessage(phone, getDevotionDayNotReadyMessage());
    console.log('Sent not-ready message. SID:', sid);
    return;
  }

  const { text: msgBody, attachmentAudioUrl } = await buildMorningTemplateBody(user as any, journeyContent);
  const imageUrl = journeyContent.card.imageUrl;
  const sid = await sendMorningDevotionMessage(phone, msgBody, imageUrl, attachmentAudioUrl);

  const schedule = resolveReminderHourMinute(user);
  if (schedule && user.timezone) {
    await rescheduleAfterSend(TEST_USER_ID, user.timezone, schedule.hour, schedule.minute);
  }
  await resetMorningDeliveryFailures(TEST_USER_ID);

  console.log('Sent morning devotion:', {
    title: journeyContent.card.title,
    twilioSid: sid,
    phone,
  });
}

main().catch((error) => {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
