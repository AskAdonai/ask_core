import { Router, Request, Response } from 'express';
import { handleTestQuest } from './handlers/testQuestHandler';
import { getUser, setPauseState } from '../services/userService';
import { saveJournalEntry, setAwaitingJournal } from '../services/journalService';
import { sendWhatsAppMessage } from '../services/twilioService';
import { matchKeyword } from '../services/fuzzyMatchService';

// Handlers
import { handleOnboarding, handleNameReply, handleTimezoneReply, handleTimeReply } from './handlers/onboardingHandler';
import { handleKnock } from './handlers/knockHandler';
import { triggerNeedSelection, handleNeedSelection } from './handlers/needHandler';
import { handleQuestOnboarding, handleQuestConfirmReply } from './handlers/questHandler';
import { triggerReminderTimeUpdate, handleReminderTimeUpdate } from './handlers/remindHandler';
import { handleYesDeclaration } from './handlers/yesHandler';
import { deliverDevotion } from './handlers/seekHandler';
import { deliverNextVideoEarly } from './handlers/watchHandler';
import { handleLogChapter } from './handlers/logHandler';
import { sendQuestProgress } from './handlers/progressHandler';
import { sendVineStatus } from './handlers/vineHandler';
import { handleFallback } from './handlers/stubHandlers';

const router = Router();

export const handleWebhookRequest = async (req: Request, res: Response) => {
  const body = req.body?.Body?.toLowerCase()?.trim() || '';
  const from = req.body?.From || '';
  const phone = from.replace('whatsapp:', '');

  if (!phone) {
    return res.status(400).send('No phone number provided');
  }

  // 1. Intercept test quest commands
  if (/^test(monday|tuesday|wednesday|friday|saturday)/.test(body)) {
    return handleTestQuest(req, res);
  }

  try {
    // 2. Fetch User
    const user = await getUser(phone);
    if (!user) {
      await handleOnboarding(phone, null);
      return res.status(200).send('OK');
    }

    const rawText = req.body?.Body?.trim() || '';

    // 3. Check State Overrides (Awaiting Input)
    if (user.awaitingOnboardingStep === 'name') {
      await handleNameReply(phone, rawText);
      return res.status(200).send('OK');
    }
    if (user.awaitingOnboardingStep === 'timezone') {
      await handleTimezoneReply(phone, rawText);
      return res.status(200).send('OK');
    }
    if (user.awaitingOnboardingStep === 'time') {
      await handleTimeReply(phone, rawText, user);
      return res.status(200).send('OK');
    }
    if (user.awaitingReminderTime) {
      await handleReminderTimeUpdate(phone, rawText, user);
      return res.status(200).send('OK');
    }
    if (user.awaitingQuestConfirm) {
      await handleQuestConfirmReply(phone, rawText, user);
      return res.status(200).send('OK');
    }
    if (user.awaitingNeedSelection) {
      await handleNeedSelection(phone, rawText, user);
      return res.status(200).send('OK');
    }
    if (user.awaitingDeclarationYes) {
      await handleYesDeclaration(phone, rawText, user);
      return res.status(200).send('OK');
    }
    if (user.awaitingJournal) {
      await saveJournalEntry(phone, rawText);
      await sendWhatsAppMessage(phone, "Thank you for journaling today! 📝");
      return res.status(200).send('OK');
    }

    // 4. Intent Matching (fuzzy match)
    const keyword = matchKeyword(body);
    switch (keyword) {
      case 'seek':
        await deliverDevotion(phone, user);
        break;
      case 'knock':
        await handleKnock(phone, user);
        break;
      case 'need':
        await triggerNeedSelection(phone, user);
        break;
      case 'remind':
        await triggerReminderTimeUpdate(phone);
        break;
      case 'quest':
        await handleQuestOnboarding(phone, user);
        break;
      case 'watch':
        await deliverNextVideoEarly(phone, user);
        break;
      case 'log':
        await handleLogChapter(phone, rawText, user);
        break;
      case 'progress':
        await sendQuestProgress(phone, user);
        break;
      case 'vine':
        await sendVineStatus(phone, user);
        break;
      case 'pause':
        await setPauseState(phone, true);
        await sendWhatsAppMessage(phone, "Your journey has been paused. Type 'resume' whenever you're ready to continue.");
        break;
      case 'resume':
        await setPauseState(phone, false);
        await sendWhatsAppMessage(phone, "Your journey has been resumed. Welcome back! 🌱");
        break;
      case 'journal':
        await setAwaitingJournal(phone);
        await sendWhatsAppMessage(phone, "What's on your mind? Type out your journal entry below. 📖");
        break;
      case 'help':
        await sendWhatsAppMessage(phone, "Here are some things you can say:\n- *Seek*: Get a devotion\n- *Knock*: Enter the prayer room\n- *Need*: Get prayer for a specific need\n- *Journal*: Write a journal entry\n- *Remind*: Change your reminder time\n- *Quest*: Start the weekly quest\n- *Pause* / *Resume*: Manage your journey\n- *Progress*: See your stats\n- *Vine*: See your vine status");
        break;
      case 'ask':
        await sendWhatsAppMessage(phone, "The 'ask' feature is coming soon! For now, try *seek* or *knock*.");
        break;
      case 'quiz':
        await sendWhatsAppMessage(phone, "The quiz will be sent automatically on Saturdays!");
        break;
      default:
        await handleFallback(phone);
        break;
    }

    return res.status(200).send('OK');

  } catch (error) {
    console.error('Error handling webhook request:', error);
    return res.status(500).send('Internal Server Error');
  }
};

router.post('/', handleWebhookRequest);

export default router;
