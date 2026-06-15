import { getFirestore } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '../../services/twilioService';
import type { User, QuestLog } from '../../types/schemas';

/**
 * Handles the PROGRESS keyword.
 * Fetches the user's current Quest stats and historical quiz scores.
 */
export const sendQuestProgress = async (phone: string, user: Partial<User> | null): Promise<void> => {
  if (!user || !user.name) {
    await sendWhatsAppMessage(phone, `Type *QUEST* to join the Bible-in-a-Year programme first. 📖`);
    return;
  }

  if (!user.questActive) {
    await sendWhatsAppMessage(phone, `You haven't started The Quest yet. Type *QUEST* to begin. 📖`);
    return;
  }

  const db = getFirestore();
  const week = user.questWeek || 1;
  const videosWatched = user.questVideoIndex || 0;
  const totalChapters = user.questChaptersLogged || 0;

  // 1. Fetch current week's Quest Content to get the book name
  let bookName = 'the Word';
  let weekIntro = 'God is walking with you today.';
  try {
    const contentDoc = await db.collection('questContent').doc(String(week)).get();
    if (contentDoc.exists) {
      const content = contentDoc.data() as any;
      if (content.books) bookName = content.books;
      if (content.weekIntro) weekIntro = content.weekIntro;
    }
  } catch (error) {
    // Ignore fetch errors, fallback to generic strings
  }



  // 3. Construct and send the progress message
  const message = `Your Quest — ${user.name}\nWeek: ${week} of 52\nVideos watched this week: ${videosWatched} of 3\nTotal chapters logged: ${totalChapters}\nKeep going. You are in ${bookName} — ${weekIntro}`;

  await sendWhatsAppMessage(phone, message);
};
