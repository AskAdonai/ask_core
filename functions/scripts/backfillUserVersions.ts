/**
 * Backfills journeyContentVersion: 1 and graceDaysRemaining for existing users.
 *
 * Usage: npx ts-node scripts/backfillUserVersions.ts
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

const backfill = async (): Promise<void> => {
  const db = getFirestore();
  const snapshot = await db.collection('users').get();
  let updated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const patch: Record<string, unknown> = {};

    if (data.journeyContentVersion === undefined) {
      patch.journeyContentVersion = 1;
    }
    if (data.graceDaysRemaining === undefined) {
      patch.graceDaysRemaining = 3;
    }
    if (data.knockDeliveredPrayerIds === undefined) {
      patch.knockDeliveredPrayerIds = [];
    }
    if (data.knockThemeExhausted === undefined) {
      patch.knockThemeExhausted = false;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date();
      await doc.ref.update(patch);
      updated += 1;
    }
  }

  console.log(`backfilled ${updated} users`);
};

backfill()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
