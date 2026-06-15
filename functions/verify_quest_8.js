const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'whatapp-497611',
});

const db = admin.firestore();

async function check() {
  const doc = await db.collection('questContent').doc('8').get();
  if (doc.exists) {
    console.log('Quest 8 exists:', doc.data());
  } else {
    console.log('Quest 8 DOES NOT exist in whatapp-497611.');
  }
}
check().catch(console.error);
