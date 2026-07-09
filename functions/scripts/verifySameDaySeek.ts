/**
 * Demonstrates/same-day SEEK after YES continues day N (not N+1).
 * Dry-run by default (no Twilio). Pass --send to actually WhatsApp.
 *
 * Usage: npx ts-node scripts/verifySameDaySeek.ts [--send]
 */
import { loadLocalEnv } from '../src/config/loadLocalEnv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { getPrayerCard } from '../src/services/prayerCardService';
import { resolveDeclarationContentPosition } from '../src/webhook/handlers/declarationHandler';
import { deliverDeclaration } from '../src/webhook/handlers/declarationHandler';
import { getUser } from '../src/services/userService';

loadLocalEnv();
if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'askwhatsappbot',
  });
}

const SEND = process.argv.includes('--send');
const TEST_USER_ID = '2348128991543';

async function main(): Promise<void> {
  const db = getFirestore();
  const phone = `+${TEST_USER_ID}`;
  const timezone = 'Africa/Lagos';
  const todayStr = DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd');

  // Reset to day 3 for clean test
  await db.collection('users').doc(TEST_USER_ID).update({
    journeyStage: 1,
    journeyDayIndex: 3,
    declarationContentDate: '',
    declarationContentStage: 0,
    declarationContentDayIndex: 0,
    awaitingDeclarationYes: false,
    timezone,
    updatedAt: new Date(),
  });

  const before = {
    journeyStage: 1,
    journeyDayIndex: 3,
  };
  const beforePos = resolveDeclarationContentPosition(before, todayStr);
  const beforeCard = await getPrayerCard(beforePos.journeyStage, beforePos.journeyDayIndex);
  console.log('BEFORE YES lookup → day', beforePos.journeyDayIndex, beforeCard?.title, beforeCard?.declarationText?.slice(0, 50));

  // Simulate first SEEK snapshot then YES advance (without calling YES handler side effects)
  await db.collection('users').doc(TEST_USER_ID).update({
    declarationContentDate: todayStr,
    declarationContentStage: 1,
    declarationContentDayIndex: 3,
    journeyDayIndex: 4, // YES advanced
  });

  const afterYes = await getUser(phone);
  const afterPos = resolveDeclarationContentPosition(afterYes!, todayStr);
  const afterCard = await getPrayerCard(afterPos.journeyStage, afterPos.journeyDayIndex);
  console.log('AFTER YES (pointer=4) SEEK would use day', afterPos.journeyDayIndex, '| fromSnapshot=', afterPos.fromSnapshot);
  console.log('  content:', afterCard?.title, '|', afterCard?.declarationText?.slice(0, 60));
  console.log('  audio:', afterCard?.declarationAudioUrl || '(none)');

  if (afterPos.journeyDayIndex !== 3) {
    throw new Error(`FAIL: expected day 3 after YES, got ${afterPos.journeyDayIndex}`);
  }
  console.log('PASS: same-day SEEK after YES stays on day 3');

  // Next calendar day drops snapshot
  const nextDayPos = resolveDeclarationContentPosition(afterYes!, '2099-01-01');
  console.log('NEXT calendar day would use live day', nextDayPos.journeyDayIndex, '| fromSnapshot=', nextDayPos.fromSnapshot);
  if (nextDayPos.journeyDayIndex !== 4 || nextDayPos.fromSnapshot) {
    throw new Error('FAIL: next day should use advanced live pointer');
  }
  console.log('PASS: next day picks up day 4');

  if (SEND) {
    console.log('\nSending real SEEK (should be day 3 content + audio)...');
    await deliverDeclaration(phone, afterYes!);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
