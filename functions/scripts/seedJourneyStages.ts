/**
 * Wipes and reseeds journeyStages/{stageNumber} with the full 9-stage year plan.
 * 365 days split: stages 1–5 get 41 days, stages 6–9 get 40 days.
 *
 * Usage: npx ts-node scripts/seedJourneyStages.ts
 */
import * as admin from 'firebase-admin';
import { loadLocalEnv } from '../src/config/loadLocalEnv';
import { JOURNEY_STAGES_COLLECTION } from '../src/types/JourneyStageDoc';

loadLocalEnv();

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'askwhatsappbot';

const STAGES = [
  { stageNumber: 1, title: 'Believe', dayCount: 41, description: 'New beginnings, rebuilding and strengthening faith' },
  { stageNumber: 2, title: 'Abide', dayCount: 41, description: 'Abiding in Christ, intimacy with the Holy Spirit, nourishment in the Word' },
  { stageNumber: 3, title: 'Yield', dayCount: 41, description: "Submission to God's will, obedience, being led by God, guided growth" },
  { stageNumber: 4, title: 'Arise', dayCount: 41, description: 'Boldness, reawakening, readiness' },
  { stageNumber: 5, title: 'Return', dayCount: 41, description: 'Repentance, finding our way back to God as King and Father' },
  { stageNumber: 6, title: 'Renew', dayCount: 40, description: 'Restoration, recovery, rebuilding and renewing connection with God' },
  { stageNumber: 7, title: 'Flourish', dayCount: 40, description: 'Fullness, fruitfulness, answered prayers' },
  { stageNumber: 8, title: 'Advance', dayCount: 40, description: 'Spiritual warfare, spiritual advancement' },
  { stageNumber: 9, title: 'Reign', dayCount: 40, description: 'Reigning with Christ, eternal purpose' },
] as const;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

async function main() {
  const existing = await db.collection(JOURNEY_STAGES_COLLECTION).get();
  if (!existing.empty) {
    const deleteBatch = db.batch();
    existing.docs.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    console.log(`🗑️  Deleted ${existing.size} existing journey stage document(s)`);
  }

  const now = new Date();
  const writeBatch = db.batch();

  for (const stage of STAGES) {
    const ref = db.collection(JOURNEY_STAGES_COLLECTION).doc(String(stage.stageNumber));
    writeBatch.set(ref, {
      stageNumber: stage.stageNumber,
      title: stage.title,
      dayCount: stage.dayCount,
      description: stage.description,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeBatch.commit();
  const totalDays = STAGES.reduce((sum, stage) => sum + stage.dayCount, 0);
  console.log(`✅ Seeded ${STAGES.length} journey stages (${totalDays} total days)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
