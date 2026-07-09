/**
 * Real SEEK send for the designated test user — verifies declaration text + audio.
 *
 * Usage: npx ts-node scripts/sendTestSeekToUser.ts [userId] [optionalDay]
 */
import { loadLocalEnv } from '../src/config/loadLocalEnv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { deliverDeclaration } from '../src/webhook/handlers/declarationHandler';
import { getUser } from '../src/services/userService';

loadLocalEnv();

if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'askwhatsappbot',
  });
}

const TEST_USER_ID = process.argv[2] || '2348128991543';
const FORCE_DAY = process.argv[3] ? Number(process.argv[3]) : undefined;

async function main(): Promise<void> {
  const db = getFirestore();
  if (FORCE_DAY) {
    await db.collection('users').doc(TEST_USER_ID).update({
      journeyStage: 1,
      journeyDayIndex: FORCE_DAY,
      declarationContentDate: '',
      declarationContentStage: 0,
      declarationContentDayIndex: 0,
      awaitingDeclarationYes: false,
      updatedAt: new Date(),
    });
  }

  const phone = `+${TEST_USER_ID.replace(/^\+/, '')}`;
  const user = await getUser(phone);
  if (!user) throw new Error(`User ${TEST_USER_ID} not found`);

  console.log('BEFORE SEEK', {
    journeyStage: user.journeyStage,
    journeyDayIndex: user.journeyDayIndex,
    declarationContentDate: user.declarationContentDate,
    declarationContentDayIndex: user.declarationContentDayIndex,
  });

  await deliverDeclaration(phone, user);

  const after = await getUser(phone);
  console.log('AFTER SEEK', {
    journeyStage: after?.journeyStage,
    journeyDayIndex: after?.journeyDayIndex,
    declarationContentDate: after?.declarationContentDate,
    declarationContentDayIndex: after?.declarationContentDayIndex,
    awaitingDeclarationYes: after?.awaitingDeclarationYes,
  });
}

main().catch((error) => {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
