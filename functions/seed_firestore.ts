import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import * as yaml from 'yaml';

async function seed() {
  const envRaw = readFileSync('./.env.yaml', 'utf8');
  const env = yaml.parse(envRaw);
  process.env.GOOGLE_CLOUD_PROJECT = env.GOOGLE_CLOUD_PROJECT;
  
  // Initialize only if not already initialized
  try {
    initializeApp({ projectId: env.GOOGLE_CLOUD_PROJECT });
  } catch (e) {}

  const db = getFirestore();
  
  try {
    console.log("Fetching existing docs...");
    const snap = await db.collection('questContent').get();
    
    for (const doc of snap.docs) {
      console.log("Deleting doc:", doc.id);
      await doc.ref.delete();
    }

    const newQuest = {
      weekNumber: 1,
      status: 'published',
      levelTracker: 'LEVEL 1.1',
      weeklyChapterSpan: 'Genesis 1-25',
      weekIntro: 'Welcome to the first week of the Bible Challenge! Dive into the beginnings of everything.',
      introImageUrl: 'https://via.placeholder.com/600x400?text=Week+1+Intro',
      days: {
        monday: {
          readingPortion: 'Genesis 1-5',
          videoLink: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          mondayEncouragement: 'Start strong! God created the heavens and the earth.'
        },
        tuesday: {
          tuesdaySummary: 'We saw the creation of the world and the fall.',
          reflectionQuote: '"In the beginning God created..." - Genesis 1:1'
        },
        wednesday: {
          readingPortion: 'Genesis 6-10',
          wednesdaySummary: 'Noah and the great flood.',
          videoLink: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          estimatedTime: '15 mins',
          signOff: 'Blessings!'
        },
        thursday: {
          readingPortion: 'Genesis 11-15',
          thursdaySummary: 'The tower of Babel and the call of Abram.'
        },
        friday: {
          readingPortion: 'Genesis 16-20',
          videoLink: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          fridayEncouragement: 'Keep going! The weekend is near.',
          weeklySummary: 'This week we covered the origins of humanity and the beginning of God\'s covenant.'
        },
        saturday: {
          quizGreeting: 'Ready for a quick review?',
          quizLinks: 'Take the quiz: https://example.com/quiz1',
          saturdayEncouragement: 'Great job completing the week!'
        },
        sunday: {
          sundaySummary: 'Rest and reflect on God\'s promises.'
        }
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    console.log("Seeding new quest Week 1...");
    await db.collection('questContent').doc('1').set(newQuest);

    console.log("Successfully seeded database!");
  } catch(e) {
    console.error(e);
  }
}
seed();
