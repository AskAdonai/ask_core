import { getFirestore } from 'firebase-admin/firestore';
import { sendKnockResponse } from '../../services/twilioService';
import { getJourneyPrayerContent, getKnockPrayerContent } from '../../services/prayerCardService';
import { getActiveKnockTheme } from '../../services/knockSessionService';
import type { User, DailyDeclaration } from '../../types/schemas';
import { DateTime } from 'luxon';
import pino from 'pino';

const logger = pino();

/**
 * KNOCK — declaration flow.
 *
 * Fetches today's declaration text, sends it with optional audio,
 * and enters the YES confirmation loop.
 *
 * Declaration source priority:
 *   1. Calendar-based dailyDeclarations/{YYYY-MM-DD}
 *   2. Active KNOCK theme prayer's declarationText
 *   3. Journey prayer card's declarationText
 *   4. Hardcoded fallback
 */
export const deliverDeclaration = async (
  phone: string,
  user: Partial<User> | null
): Promise<void> => {
  if (!user) return;

  const db = getFirestore();
  const userId = phone.replace('+', '');

  let declarationText = '';
  let mediaUrls: string[] = [];

  const timezone = user.timezone || 'UTC';
  const todayStr = DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd');

  const dailyDeclDoc = await db.collection('dailyDeclarations').doc(todayStr).get();

  if (dailyDeclDoc.exists) {
    const data = dailyDeclDoc.data() as DailyDeclaration;
    declarationText = data.declarationText || '';
    if (data.audioUrl && !data.audioUrl.includes('example.com')) {
      mediaUrls.push(data.audioUrl);
    }
  } else {
    const activeThemeId = await getActiveKnockTheme(phone);
    if (activeThemeId) {
      const knockContent = await getKnockPrayerContent(
        activeThemeId,
        user.knockPrayerIndex ?? 0,
      );
      const knockCard = knockContent?.prayer;
      if (knockCard?.declarationText) {
        declarationText = knockCard.declarationText;
        if (knockCard.declarationAudioUrl && !knockCard.declarationAudioUrl.includes('example.com')) {
          mediaUrls.push(knockCard.declarationAudioUrl);
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

  await sendKnockResponse(phone, declarationText, mediaUrls);

  await db.collection('users').doc(userId).update({
    awaitingDeclarationYes: true,
    updatedAt: new Date(),
  });

  logger.info({ phone }, 'Delivered KNOCK declaration and started YES flow');
};
