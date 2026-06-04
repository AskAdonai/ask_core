import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { questContentSeed } from './questContent.seed';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'whatapp-497611';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();

async function seedQuestContent() {
  console.log(`\n🌱 Seeding Quest Content into ${PROJECT_ID}...`);
  
  let count = 0;
  for (const week of questContentSeed) {
    await db.collection('questContent').doc(String(week.weekNumber)).set({
      ...week,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
  }
  
  console.log(`✅ Seeded ${count} Quest weeks.`);
  console.log('🎉 Seeding Complete!\n');
}

seedQuestContent().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
