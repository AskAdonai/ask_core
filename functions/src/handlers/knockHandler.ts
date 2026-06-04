import { getFirestore } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '../services/twilioService';
import { getJourneyPrayerContent, getNeedPrayerCard } from '../services/prayerCardService';
import { getActiveNeedTheme } from '../services/needSessionService';
import type { User } from '../types/schemas';
import pino from 'pino';

const logger = pino();

/**
 * Handles the KNOCK keyword.
 * Fetches the daily declaration and audio file, sends it, and prompts the user
 * to declare it 10 times via the YES iterative flow.
 */
export const handleKnock = async (phone: string, user: Partial<User> | null) => {
  if (!user) return;

  const db = getFirestore();
  const userId = phone.replace('+', '');

  // 1. Determine what declaration text the user is declaring
  let declarationText = '';
  let mediaUrls: string[] = [];

  const activeThemeId = await getActiveNeedTheme(phone);
  if (activeThemeId) {
    const idx = Math.max(1, user.needPrayerIndex ?? 0);
    const needCard = await getNeedPrayerCard(activeThemeId, idx);
    if (needCard && needCard.declarationText) {
      declarationText = needCard.declarationText;
      if (needCard.declarationAudioUrl && !needCard.declarationAudioUrl.includes('example.com')) {
        mediaUrls.push(needCard.declarationAudioUrl);
      }
    }
  } else {
    const content = await getJourneyPrayerContent(user.journeyStage ?? 1, user.journeyDayIndex ?? 1);
    if (content?.prayer.declarationText) {
      declarationText = content.prayer.declarationText;
      const audioUrl = content.prayer.declarationAudioUrl;
      if (audioUrl && !audioUrl.includes('example.com')) {
        mediaUrls.push(audioUrl);
      }
    }
  }

  declarationText = declarationText.trim() || "I declare God's goodness over my life today.";

  // 2. Build and send the prompt message
  const msg = `Today's declaration:\n\n${declarationText}\n\nSpeak it 10 times. Each time you declare it, reply YES.\n\n• *YES* — I declare it\n• *JOURNAL* — reflect\n• *VINE* — my growth`;

  await sendWhatsAppMessage(phone, msg, mediaUrls.length > 0 ? mediaUrls : undefined);

  // 3. Set the awaitingDeclarationYes flag
  await db.collection('users').doc(userId).update({
    awaitingDeclarationYes: true,
    updatedAt: new Date(),
  });

  logger.info({ phone }, 'Delivered KNOCK declaration payload and started YES flow');
};
