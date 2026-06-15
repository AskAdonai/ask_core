import { getFirestore } from 'firebase-admin/firestore';
import { sendKnockResponse } from '../../services/twilioService';
import { getJourneyPrayerContent, getNeedPrayerCard } from '../../services/prayerCardService';
import { getActiveNeedTheme } from '../../services/needSessionService';
import type { User, DailyDeclaration } from '../../types/schemas';
import { DateTime } from 'luxon';
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

  const timezone = user.timezone || 'UTC';
  const todayStr = DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd');

  // First priority: Calendar-based Daily Declaration
  const dailyDeclDoc = await db.collection('dailyDeclarations').doc(todayStr).get();

  if (dailyDeclDoc.exists) {
    const data = dailyDeclDoc.data() as DailyDeclaration;
    declarationText = data.declarationText || '';
    if (data.audioUrl && !data.audioUrl.includes('example.com')) {
      mediaUrls.push(data.audioUrl);
    }
  } else {
    // Fallback priority: Need Theme or Journey Content
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
  }

  declarationText = declarationText.trim() || "I declare God's goodness over my life today.";

  // 2. Build and send the prompt message
  await sendKnockResponse(phone, declarationText, mediaUrls);

  // 3. Set the awaitingDeclarationYes flag
  await db.collection('users').doc(userId).update({
    awaitingDeclarationYes: true,
    updatedAt: new Date(),
  });

  logger.info({ phone }, 'Delivered KNOCK declaration payload and started YES flow');
};
