import { Request, Response } from 'express';
import { getUser } from '../../services/userService';
import { sendMorningDevotionMessage, sendWhatsAppMessage } from '../../services/twilioService';
import {
  getJourneyPrayerContent,
  getKnockPrayerContent,
} from '../../services/prayerCardService';
import { buildMorningTemplateBody, readActiveThemeId } from '../../messages/morningMessage';
import type { User } from '../../types/User';
import { respondTwilioOk } from '../../utils/twilioWebhookResponse';

/**
 * WhatsApp test command: `testmorning`
 * Sends the same morning devotion card as the cron worker for the sender's user record.
 */
export const handleTestMorning = async (req: Request, res: Response) => {
  const from = req.body?.From || '';

  if (!from) {
    return res.status(400).send('Missing From parameter');
  }

  const phone = from.replace('whatsapp:', '');

  try {
    const user = await getUser(phone);
    if (!user) {
      await sendWhatsAppMessage(
        phone,
        'No user profile found. Complete onboarding first, then try *testmorning* again.',
      );
      return respondTwilioOk(res);
    }

    const journeyStage = user.journeyStage ?? 1;
    const journeyDayIndex = user.journeyDayIndex ?? 1;

    const journeyContent = await getJourneyPrayerContent(journeyStage, journeyDayIndex);
    const activeThemeId = readActiveThemeId(user as User);
    const themeContent = activeThemeId
      ? await getKnockPrayerContent(activeThemeId, user.knockPrayerIndex ?? 0)
      : null;

    const { text: msgBody } = buildMorningTemplateBody(user as User, journeyContent, themeContent);
    const imageUrl = journeyContent?.card?.imageUrl;

    await sendMorningDevotionMessage(phone, msgBody, imageUrl);
    return respondTwilioOk(res);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in handleTestMorning:', error);
    await sendWhatsAppMessage(phone, `Error sending test morning card: ${message}`);
    return res.status(500).send('Internal Server Error');
  }
};
