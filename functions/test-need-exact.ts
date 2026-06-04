import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'whatapp-497611' });

async function run() {
  const db = getFirestore();
  const themesSnap = await db.collection('prayerThemes').get();
  const themes = themesSnap.docs
    .map(d => d.data())
    .filter(t => t.available)
    .sort((a, b) => a.menuOrder - b.menuOrder);
  const menu = themes
    .map(theme => `${theme.menuOrder}. ${theme.displayName}`)
    .join('\n');

  console.log("Success! " + menu.length);
}

run().catch(console.error);
