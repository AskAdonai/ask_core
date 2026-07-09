/**
 * Wipes and reseeds streakMilestones with the current 6-milestone spec.
 *
 * Usage: npx ts-node scripts/seedStreakMilestones.ts
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadLocalEnv } from '../src/config/loadLocalEnv';
import { DEFAULT_STREAK_MILESTONES } from '../src/services/streakMilestoneService';
import { STREAK_MILESTONES_COLLECTION } from '../src/types/StreakMilestone';

loadLocalEnv();
initializeApp();

const seed = async (): Promise<void> => {
  const db = getFirestore();
  const existing = await db.collection(STREAK_MILESTONES_COLLECTION).get();

  if (!existing.empty) {
    const deleteBatch = db.batch();
    existing.docs.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    console.log(`🗑️  Deleted ${existing.size} existing streak milestone document(s)`);
  }

  const now = new Date();
  const writeBatch = db.batch();

  for (const milestone of DEFAULT_STREAK_MILESTONES) {
    const docRef = db.collection(STREAK_MILESTONES_COLLECTION).doc(milestone.milestoneId);
    const { milestoneId, ...payload } = milestone;
    writeBatch.set(docRef, {
      ...payload,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`seeded ${milestoneId}`);
  }

  await writeBatch.commit();
};

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
