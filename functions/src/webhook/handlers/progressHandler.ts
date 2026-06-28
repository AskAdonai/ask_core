import { getFirestore } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '../../services/twilioService';
import { resolveQuestWeekForUser, resolveQuestVideoIndexForUser } from '../../services/questProgressService';
import type { User } from '../../types/schemas';

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
  const week = resolveQuestWeekForUser(user);
  const videosWatched = resolveQuestVideoIndexForUser(user);
  const totalChapters = user.questChaptersLogged || 0;

  let bookName = 'the Word';
  let weekIntro = 'God is walking with you today.';
  try {
    const contentDoc = await db.collection('questContent').doc(String(week)).get();
    if (contentDoc.exists) {
      const content = contentDoc.data() as { weeklyChapterSpan?: string; weekIntro?: string };
      if (content.weeklyChapterSpan) bookName = content.weeklyChapterSpan;
      if (content.weekIntro) weekIntro = content.weekIntro;
    }
  } catch {
    // fallback strings above
  }

  const message =
    `Your Quest — ${user.name}\n` +
    `Week: ${week} (global cohort)\n` +
    `Videos watched this week: ${videosWatched} of 3\n` +
    `Total chapters logged: ${totalChapters}\n` +
    `Keep going. This week: ${bookName} — ${weekIntro}`;

  await sendWhatsAppMessage(phone, message);
};
