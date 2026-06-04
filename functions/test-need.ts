import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'whatapp-497611' });

async function run() {
  const db = getFirestore();
  const themesSnap = await db.collection('prayerThemes').get();
  const themes = themesSnap.docs
    .map(d => d.data())
    .filter(t => t.available)
    .sort((a, b) => (a.menuOrder || 0) - (b.menuOrder || 0));
  const menu = themes
    .map(theme => `${theme.menuOrder}. ${theme.displayName}`)
    .join('\n');

  const msg = `What does your heart need today?\n\nReply with a number or theme name to receive targeted prayers and declarations:\n\n${menu}`;
  console.log("MESSAGE LENGTH:", msg.length);
  console.log("MESSAGE CONTENT:\n" + msg);
}

run().catch(console.error);
