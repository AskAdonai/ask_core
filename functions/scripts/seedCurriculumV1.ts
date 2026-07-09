/**
 * Seeds curriculumVersions/1/stages from the legacy JourneyStage config.
 *
 * Usage: npx ts-node scripts/seedCurriculumV1.ts
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { JOURNEY_STAGE_CONFIG } from '../src/types/JourneyStage';
import {
  CURRICULUM_STAGES_SUBCOLLECTION,
  CURRICULUM_VERSIONS_COLLECTION,
} from '../src/types/Curriculum';

initializeApp();

const seed = async (): Promise<void> => {
  const db = getFirestore();
  const versionRef = db.collection(CURRICULUM_VERSIONS_COLLECTION).doc('1');
  await versionRef.set({ version: 1, updatedAt: new Date() }, { merge: true });

  for (const [stageKey, config] of Object.entries(JOURNEY_STAGE_CONFIG)) {
    const stageNumber = Number(stageKey);
    const stageRef = versionRef.collection(CURRICULUM_STAGES_SUBCOLLECTION).doc(String(stageNumber));
    const existing = await stageRef.get();
    if (existing.exists) {
      console.log(`skip stage ${stageNumber}`);
      continue;
    }

    await stageRef.set({
      stageNumber,
      title: config.name,
      dayCount: config.requiredDays,
      active: true,
      updatedAt: new Date(),
    });
    console.log(`seeded stage ${stageNumber} — ${config.name}`);
  }
};

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
