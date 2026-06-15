import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { computeNextQuestAt } from '../utils/timezone';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'whatapp-497611';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();

async function migrateUsers() {
  console.log(`\n🚀 Migrating existing users in ${PROJECT_ID} to add nextQuestAt...`);
  
  const snapshot = await db.collection('users').get();
  
  let migrated = 0;
  let skipped = 0;

  // We process in batches of 500 (Firestore limit)
  const batches = [];
  let currentBatch = db.batch();
  let operationCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Check if they need migration
    if (data.nextQuestAt === undefined) {
      const timezone = data.timezone || 'UTC';
      const nextQuestAt = computeNextQuestAt(timezone);
      
      currentBatch.update(doc.ref, { nextQuestAt });
      migrated++;
      operationCount++;

      if (operationCount === 500) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCount = 0;
      }
    } else {
      skipped++;
    }
  }

  // Commit any remaining operations
  if (operationCount > 0) {
    batches.push(currentBatch.commit());
  }

  if (batches.length > 0) {
    await Promise.all(batches);
  }
  
  console.log(`✅ Migrated ${migrated} users.`);
  console.log(`⏭️ Skipped ${skipped} users (already had nextQuestAt).`);
  console.log('🎉 Migration Complete!\n');
}

migrateUsers().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
