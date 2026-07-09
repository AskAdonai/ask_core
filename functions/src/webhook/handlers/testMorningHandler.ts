import { Request, Response } from 'express';
import { getUser } from '../../services/userService';
import { sendMorningDevotionMessage, sendWhatsAppMessage } from '../../services/twilioService';
import { getJourneyPrayerContent } from '../../services/prayerCardService';
import { buildMorningTemplateBody } from '../../messages/morningMessage';
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

    const {
      getJourneyHoldingMessage,
      getDevotionDayNotReadyMessage,
      areJourneyStagesReady,
    } = await import('../../services/journeyStageService');

    const stagesReady = await areJourneyStagesReady();
    if (!stagesReady) {
      await sendWhatsAppMessage(phone, getJourneyHoldingMessage());
      return respondTwilioOk(res);
    }

    const journeyContent = await getJourneyPrayerContent(journeyStage, journeyDayIndex);

    if (!journeyContent) {
      await sendWhatsAppMessage(phone, getDevotionDayNotReadyMessage());
      return respondTwilioOk(res);
    }

    const { text: msgBody, attachmentAudioUrl } = await buildMorningTemplateBody(user as User, journeyContent);
    const imageUrl = journeyContent?.card?.imageUrl;

    await sendMorningDevotionMessage(phone, msgBody, imageUrl, attachmentAudioUrl);
    return respondTwilioOk(res);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in handleTestMorning:', error);
    await sendWhatsAppMessage(phone, `Error sending test morning card: ${message}`);
    return res.status(500).send('Internal Server Error');
  }
};
