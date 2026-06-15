import { sendWhatsAppMessage } from '../../services/twilioService';
import { logIndependentChapter } from '../../services/questProgressService';
import type { User } from '../../types/schemas';

/**
 * Handles the LOG keyword.
 * Extracts the chapter name from the message body and records it.
 */
export const handleLogChapter = async (phone: string, body: string, user: Partial<User> | null): Promise<void> => {
  if (!user || !user.name) {
    await sendWhatsAppMessage(phone, `Type *QUEST* to join the Bible-in-a-Year programme first. 📖`);
    return;
  }

  // Remove the keyword "log" (case insensitive) from the start of the string
  const chapterName = body.replace(/^log\s*/i, '').trim();

  if (!chapterName) {
    await sendWhatsAppMessage(
      phone,
      `To log an independent chapter, reply with *LOG* followed by the chapter name.\n\nExample: *LOG Genesis 3*`
    );
    return;
  }

  const { totalChapters } = await logIndependentChapter(phone, chapterName);

  // Note: We use a text-based fallback for buttons since we don't have a specific
  // Twilio Content Template SID configured for LOG confirmation buttons.
  const message = `${chapterName} logged. Well done for reading independently.\nTotal chapters logged: ${totalChapters}\n\n_Reply LOG to log another, or PROGRESS to see your tracker._`;

  await sendWhatsAppMessage(phone, message);
};
