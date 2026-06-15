require('dotenv').config({ path: '/home/bash/Desktop/Upwork projects/whatsapp_bot/whatsappBot/functions/.env' });
const admin = require('firebase-admin');

admin.initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'whatapp-497611',
});

const db = admin.firestore();

const week4Data = {
  weekNumber: 4,
  status: 'published',
  weekTitle: "LEVEL 3.2",
  books: "Exodus 8-24",
  weekIntro: "Welcome to Week 4! You're moving steadily through Scripture-well done.",
  introImageUrl: "https://via.placeholder.com/600x400?text=Week+4",
  days: [
    {
      dayOfWeek: "MONDAY",
      readingCoverage: "Exodus 8-12",
      videoUrl: "https://youtu.be/y0I-7JlrWbc",
      bodyText: "You're moving steadily through Scripture-well done.",
    },
    {
      dayOfWeek: "TUESDAY",
      bodyText: "Yesterday's reading (Exodus 8-12) shows God's power displayed through the plagues in Egypt and the seriousness of His command to Pharaoh.",
      reflectionQuestion: "Do I trust God's timing even when the situation seems unyielding?"
    },
    {
      dayOfWeek: "WEDNESDAY",
      readingCoverage: "Exodus 13-18",
      videoUrl: "https://youtu.be/NmJG45uMKpE",
      bodyText: "You'll follow Israel's deliverance from Egypt, the crossing of the Red Sea, and God's provision in the wilderness.\n\nEstimated Time: 30 minutes\n\nSee you on Friday for the final video."
    },
    {
      dayOfWeek: "FRIDAY",
      readingCoverage: "Exodus 19-24",
      videoUrl: "https://youtu.be/vIjK15v8e3s",
      bodyText: "Well done-you're keeping up consistently!\n\nThis week you've witnessed God's deliverance, His guidance, and the giving of the Law at Mount Sinai."
    },
    {
      dayOfWeek: "SATURDAY",
      bodyText: "Quick quiz time!\n\nKeep going-you're building strong consistency in the Word.",
      quizLinks: [
        "https://forms.gle/...",
        "https://forms.gle/..."
      ]
    }
  ],
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};

async function seed() {
  await db.collection('questContent').doc('4').set(week4Data);
  console.log('Week 4 seeded successfully.');
}
seed().catch(console.error);
