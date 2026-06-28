import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getUser } from '../../services/userService';
import { 
  sendWhatsAppMessage,
  sendQuestMonday, 
  sendQuestTuesday, 
  sendQuestWednesday, 
  sendQuestFriday, 
  sendQuestSaturday 
} from '../../services/twilioService';
import { 
  formatMondayPayload, 
  formatTuesdayPayload, 
  formatWednesdayPayload, 
  formatFridayPayload, 
  formatSaturdayPayload 
} from '../../utils/questPayloadFormatter';
import { getCurrentCalendarWeek } from '../../utils/calendarWeek';
import { respondTwilioOk } from '../../utils/twilioWebhookResponse';

export const handleTestQuest = async (req: Request, res: Response) => {
  const body = req.body?.Body?.toLowerCase()?.trim() || '';
  const from = req.body?.From || '';

  if (!from) {
    return res.status(400).send('Missing From parameter');
  }

  // Matches "testmonday", "testtuesday 2", etc.
  const match = body.match(/^test(monday|tuesday|wednesday|friday|saturday)(?:\s+(\d+))?$/);
  if (!match) {
    return res.status(400).send('Invalid test command. Use e.g. "testmonday 1"');
  }

  const day = match[1];
  const weekNumber = match[2] || String(getCurrentCalendarWeek()); // Default to global calendar week if not provided

  try {
    const db = getFirestore();
    const doc = await db.collection('questContent').doc(weekNumber).get();

    if (!doc.exists) {
      await sendWhatsAppMessage(from.replace('whatsapp:', ''), `Week ${weekNumber} data not found in database.`);
      return respondTwilioOk(res);
    }

    const questData = doc.data()!;
    
    // The sendQuest* functions expect the raw phone number without the "whatsapp:" prefix
    const cleanPhone = from.replace('whatsapp:', '');

    // Fetch the actual user from the DB to use their real name
    const user = await getUser(cleanPhone) || { name: 'Friend' };

    switch (day) {
      case 'monday':
        await sendQuestMonday(cleanPhone, formatMondayPayload(user, questData));
        break;
      case 'tuesday':
        await sendQuestTuesday(cleanPhone, formatTuesdayPayload(user, questData));
        break;
      case 'wednesday':
        await sendQuestWednesday(cleanPhone, formatWednesdayPayload(user, questData));
        break;
      case 'friday':
        await sendQuestFriday(cleanPhone, formatFridayPayload(user, questData));
        break;
      case 'saturday':
        await sendQuestSaturday(cleanPhone, formatSaturdayPayload(user, questData));
        break;
    }

    return respondTwilioOk(res);
  } catch (error: any) {
    console.error('Error in testQuestHandler:', error);
    const cleanPhone = from.replace('whatsapp:', '');
    await sendWhatsAppMessage(cleanPhone, `Error testing ${day}: ${error.message || error}`);
    return res.status(500).send('Internal Server Error');
  }
};
