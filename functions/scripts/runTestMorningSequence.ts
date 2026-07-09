/**
 * Sends morning devotions for consecutive journey days using the same code path as
 * the WhatsApp `testmorning` command (handleTestMorning).
 *
 * Usage: npx ts-node scripts/runTestMorningSequence.ts [userId] [fromDay] [toDay]
 */
import { loadLocalEnv } from '../src/config/loadLocalEnv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getUser } from '../src/services/userService';
import { sendMorningDevotionMessage, sendWhatsAppMessage } from '../src/services/twilioService';
import { getJourneyPrayerContent } from '../src/services/prayerCardService';
import { buildMorningTemplateBody } from '../src/messages/morningMessage';
import type { User } from '../src/types/User';

loadLocalEnv();

if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'askwhatsappbot',
  });
}

const TEST_USER_ID = process.argv[2] || '2348128991543';
const FROM_DAY = Number(process.argv[3] || 1);
const TO_DAY = Number(process.argv[4] || 5);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Mirrors handleTestMorning — same imports and send logic as the webhook handler. */
async function sendTestMorning(phone: string): Promise<{ title: string; sid: string } | { fallback: string; sid: string }> {
  const user = await getUser(phone);
  if (!user) {
    throw new Error('No user profile found');
  }

  const journeyStage = user.journeyStage ?? 1;
  const journeyDayIndex = user.journeyDayIndex ?? 1;

  const {
    getJourneyHoldingMessage,
    getDevotionDayNotReadyMessage,
    areJourneyStagesReady,
  } = await import('../src/services/journeyStageService');

  const stagesReady = await areJourneyStagesReady();
  if (!stagesReady) {
    const sid = await sendWhatsAppMessage(phone, getJourneyHoldingMessage());
    return { fallback: 'journey_holding', sid };
  }

  const journeyContent = await getJourneyPrayerContent(journeyStage, journeyDayIndex);
  if (!journeyContent) {
    const sid = await sendWhatsAppMessage(phone, getDevotionDayNotReadyMessage());
    return { fallback: 'day_not_ready', sid };
  }

  const { text: msgBody, attachmentAudioUrl } = await buildMorningTemplateBody(user as User, journeyContent);
  const imageUrl = journeyContent?.card?.imageUrl;
  const sid = await sendMorningDevotionMessage(phone, msgBody, imageUrl, attachmentAudioUrl);
  return { title: journeyContent.card.title, sid };
}

async function main(): Promise<void> {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
  if (!userDoc.exists) {
    throw new Error(`User ${TEST_USER_ID} not found`);
  }

  const phone = userDoc.data()!.phone || `+${TEST_USER_ID.replace(/^\+/, '')}`;
  const results: Array<{ day: number; title?: string; fallback?: string; sid: string }> = [];

  for (let day = FROM_DAY; day <= TO_DAY; day += 1) {
    await db.collection('users').doc(TEST_USER_ID).update({
      journeyStage: 1,
      journeyDayIndex: day,
      updatedAt: new Date(),
    });

    const result = await sendTestMorning(phone);
    if ('title' in result) {
      results.push({ day, title: result.title, sid: result.sid });
      console.log(`Day ${day}: sent "${result.title}" — ${result.sid}`);
    } else {
      results.push({ day, fallback: result.fallback, sid: result.sid });
      console.log(`Day ${day}: sent fallback (${result.fallback}) — ${result.sid}`);
    }

    if (day < TO_DAY) {
      await sleep(15000);
    }
  }

  console.log('\nSummary:', JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
