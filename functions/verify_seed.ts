import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as yaml from 'yaml';
import { readFileSync } from 'fs';

const envRaw = readFileSync(path.resolve(__dirname, '.env.yaml'), 'utf8');
const env = yaml.parse(envRaw);
const PROJECT_ID = env.FIREBASE_PROJECT_ID || 'whatapp-497611';

console.log('Using project:', PROJECT_ID);

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();

async function verify() {
  const snap = await db.collection('questContent').get();
  console.log(`questContent has ${snap.size} docs:`);
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(` - Doc ID: ${doc.id}, weekNumber: ${d.weekNumber}, status: ${d.status}`);
  }
}
verify().catch(console.error);
