import { Router, Request, Response } from 'express';
import { handleTestQuest } from './handlers/testQuestHandler';
import { getUser, setPauseState, clearPendingStates, updateUserFields } from '../services/userService';
import { saveJournalEntry, setAwaitingJournal } from '../services/journalService';
import { sendWhatsAppMessage } from '../services/twilioService';
import { matchKeyword } from '../services/fuzzyMatchService';
import { normalizeInput } from '../utils/normalizeInput';
import { isYesReply } from '../utils/yesReply';
import pino from 'pino';

// Handlers
import { handleOnboarding, handleNameReply, handleTimezoneReply, handleTimeReply } from './handlers/onboardingHandler';
import { triggerThemeSelection, handleThemeSelection } from './handlers/themeSelectionHandler';
import { handleQuestOnboarding, handleQuestConfirmReply, handleLeaveQuest } from './handlers/questHandler';
import { triggerReminderTimeUpdate, handleReminderTimeUpdate } from './handlers/remindHandler';
import { handleYesDeclaration } from './handlers/yesHandler';
import { deliverDeclaration } from './handlers/declarationHandler';
import { deliverNextVideoEarly } from './handlers/watchHandler';
import { handleLogChapter } from './handlers/logHandler';
import { sendQuestProgress } from './handlers/progressHandler';
import { sendVineStatus } from './handlers/vineHandler';
import { handleFallback } from './handlers/stubHandlers';
import { handleTwilioStatusCallback } from './handlers/twilioStatusHandler';
import { validateTwilioSignature } from './middleware/validateTwilioSignature';
import { respondTwilioOk } from '../utils/twilioWebhookResponse';
import {
  requestOptOut,
  cancelOptOut,
  sendOptOutGraceReminder,
  isOptedOut,
} from '../services/optOutService';
import type { User } from '../types/schemas';

const logger = pino();
const router = Router();

const ERROR_REPLY =
  "Something went wrong while processing your message. Please try again in a moment, or reply *HELP* for options.";

const COMMAND_ESCAPE_KEYWORDS = new Set([
  'ask', 'seek', 'knock', 'help', 'journal', 'vine', 'remind',
  'quest', 'pause', 'resume', 'progress', 'watch', 'log', 'quiz',
  'stop', 'optout', 'unsubscribe', 'unquest', 'leavequest',
]);

const buildHelpMessage = (user: User): string => {
  const lines = [
    'Here are some things you can say:',
    '- *Seek*: Make today\'s declaration',
    '- *Knock*: Browse prayer themes',
    '- *Journal*: Write a journal entry',
    '- *Remind*: Change your reminder time',
    user.questActive
      ? '- *Unquest* / *Leave Quest*: Leave The Quest (your ASK account continues)'
      : '- *Quest*: Join the Bible-in-a-Year quest',
    '- *Watch*: Get your next quest video early (if enrolled)',
    '- *Log*: Log a Bible chapter you read',
    '- *Progress*: See your quest stats (if enrolled)',
    '- *Pause* / *Resume*: Pause or resume your ASK journey',
    '- *Stop*: Unsubscribe and delete your data (7-day grace period)',
    '- *Vine*: See your vine status',
    '- *Ask*: Check your vine status',
  ];
  return lines.join('\n');
};

const dispatchKeyword = async (
  keyword: string,
  phone: string,
  user: User,
  rawText: string
): Promise<void> => {
  switch (keyword) {
    case 'knock':
      await triggerThemeSelection(phone, user);
      break;
    case 'seek':
      await deliverDeclaration(phone, user);
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
    case 'unquest':
    case 'leavequest':
      await handleLeaveQuest(phone, user);
      break;
    case 'vine':
      await sendVineStatus(phone, user);
      break;
    case 'pause':
      await setPauseState(phone, true);
      await sendWhatsAppMessage(phone, "Your journey has been paused. Type 'resume' whenever you're ready to continue.\n\nTo permanently leave and delete your data, reply *STOP*.");
      break;
    case 'resume': {
      const wasOptOut = await cancelOptOut(phone, user);
      if (wasOptOut) {
        await sendWhatsAppMessage(phone, `Welcome back, ${user.name || 'Friend'}. Your account is safe and your daily messages will continue. 🌱`);
      } else {
        await setPauseState(phone, false);
        await sendWhatsAppMessage(phone, "Your journey has been resumed. Welcome back! 🌱");
      }
      break;
    }
    case 'stop':
    case 'optout':
    case 'unsubscribe':
      if (isOptedOut(user)) {
        await sendOptOutGraceReminder(phone, user);
      } else {
        await requestOptOut(phone, user);
      }
      break;
    case 'journal':
      await setAwaitingJournal(phone);
      await sendWhatsAppMessage(phone, "What's on your mind? Type out your journal entry below. 📖");
      break;
    case 'help':
      await sendWhatsAppMessage(phone, buildHelpMessage(user));
      break;
    case 'ask':
      await sendWhatsAppMessage(
        phone,
        `You are already planted, ${user.name || 'Friend'}. Your vine is ${user.vineStage || 'Grafted'} — Streak: ${user.streak || 0} days. Reply *HELP* to see your options.`
      );
      break;
    case 'quiz':
      await sendWhatsAppMessage(phone, "The quiz will be sent automatically on Saturdays!");
      break;
    default:
      await handleFallback(phone);
      break;
  }
};

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
    let user = await getUser(phone);
    if (!user) {
      await handleOnboarding(phone, null);
      return respondTwilioOk(res);
    }

    const rawText = req.body?.Body?.trim() || '';
    const normalizedText = normalizeInput(rawText);

    // Treat multi-word commands before fuzzy match
    let bodyForMatch = normalizedText === 'opt out' ? 'optout' : body;
    if (
      normalizedText === 'leave quest' ||
      normalizedText === 'quest leave' ||
      normalizedText === 'leave the quest'
    ) {
      bodyForMatch = 'unquest';
    }

    // Global RESET — escape any pending interactive state
    if (normalizedText === 'reset') {
      await clearPendingStates(phone);
      await sendWhatsAppMessage(
        phone,
        'All pending actions have been reset. You are back to the main menu. Reply *HELP* to see your options.'
      );
      return respondTwilioOk(res);
    }

    // Opted-out users: block normal flow except explicit recovery commands
    if (isOptedOut(user)) {
      const optKeyword = matchKeyword(bodyForMatch);
      if (optKeyword === 'resume') {
        await cancelOptOut(phone, user);
        await sendWhatsAppMessage(phone, `Welcome back, ${user.name || 'Friend'}. Your account is safe and your daily messages will continue. 🌱`);
        return respondTwilioOk(res);
      }
      if (optKeyword === 'help') {
        await dispatchKeyword('help', phone, user, rawText);
        return respondTwilioOk(res);
      }
      if (optKeyword === 'stop' || optKeyword === 'optout' || optKeyword === 'unsubscribe') {
        await sendOptOutGraceReminder(phone, user);
        return respondTwilioOk(res);
      }
      await sendOptOutGraceReminder(phone, user);
      return respondTwilioOk(res);
    }

    // 2.5 Expire Stale Awaiting States (older than 5 minutes)
    const hasInteractiveState = 
      user.awaitingReminderTime ||
      user.awaitingQuestConfirm ||
      user.awaitingKnockSelection ||
      user.awaitingDeclarationYes ||
      user.awaitingJournal;

    if (hasInteractiveState && user.updatedAt) {
      const updatedAtDate = (user.updatedAt as any).toDate ? (user.updatedAt as any).toDate() : new Date(user.updatedAt as any);
      const minutesSinceUpdate = (Date.now() - updatedAtDate.getTime()) / (1000 * 60);
      
      if (minutesSinceUpdate > 5) {
        await clearPendingStates(phone);
        // Clear in-memory so the normal flow executes below
        user.awaitingReminderTime = false;
        user.awaitingQuestConfirm = false;
        user.awaitingKnockSelection = false;
        user.awaitingDeclarationYes = false;
        user.awaitingJournal = false;
        logger.info({ phone, minutesSinceUpdate }, 'Cancelled stale awaiting state (older than 5 minutes)');
      }
    }

    // 3. Check State Overrides (Awaiting Input)
    if (user.awaitingOnboardingStep === 'name') {
      await handleNameReply(phone, rawText);
      return respondTwilioOk(res);
    }
    if (user.awaitingOnboardingStep === 'timezone') {
      await handleTimezoneReply(phone, rawText);
      return respondTwilioOk(res);
    }
    if (user.awaitingOnboardingStep === 'time') {
      await handleTimeReply(phone, rawText, user);
      return respondTwilioOk(res);
    }
    if (user.awaitingReminderTime) {
      await handleReminderTimeUpdate(phone, rawText, user);
      return respondTwilioOk(res);
    }
    if (user.awaitingQuestConfirm) {
      const questEscape = matchKeyword(bodyForMatch);
      if (questEscape === 'unquest' || questEscape === 'leavequest') {
        await updateUserFields(phone, { awaitingQuestConfirm: false } as Partial<User>);
        await sendWhatsAppMessage(
          phone,
          'Quest signup cancelled. Your ASK journey continues. Reply *HELP* for options.',
        );
        return respondTwilioOk(res);
      }
      await handleQuestConfirmReply(phone, rawText, user);
      return respondTwilioOk(res);
    }
    if (user.awaitingKnockSelection) {
      const escapeKeyword = matchKeyword(bodyForMatch);
      if (escapeKeyword && COMMAND_ESCAPE_KEYWORDS.has(escapeKeyword)) {
        await clearPendingStates(phone);
        user = { ...user, awaitingKnockSelection: false };
      } else {
        await handleThemeSelection(phone, rawText, user);
        return respondTwilioOk(res);
      }
    }
    if (user.awaitingDeclarationYes) {
      if (isYesReply(rawText)) {
        await handleYesDeclaration(phone, rawText, user);
        return respondTwilioOk(res);
      }

      const escapeKeyword = matchKeyword(bodyForMatch);
      if (escapeKeyword && COMMAND_ESCAPE_KEYWORDS.has(escapeKeyword)) {
        await clearPendingStates(phone);
        user = { ...user, awaitingDeclarationYes: false };
      } else {
        await sendWhatsAppMessage(
          phone,
          "When you've declared it aloud, reply *YES*. Or type *RESET* to cancel."
        );
        return respondTwilioOk(res);
      }
    }
    if (user.awaitingJournal) {
      await saveJournalEntry(phone, rawText);
      await sendWhatsAppMessage(phone, "Thank you for journaling today! 📝");
      return respondTwilioOk(res);
    }

    // 4. Intent Matching (fuzzy match)
    const keyword = matchKeyword(bodyForMatch);
    await dispatchKeyword(keyword ?? '', phone, user, rawText);

    return respondTwilioOk(res);

  } catch (error) {
    logger.error({ phone, error }, 'Error handling webhook request');
    try {
      await sendWhatsAppMessage(phone, ERROR_REPLY);
    } catch (sendError) {
      logger.error({ phone, sendError }, 'Failed to send error reply to user');
    }
    return respondTwilioOk(res);
  }
};

router.post('/', validateTwilioSignature, handleWebhookRequest);
router.post('/status', validateTwilioSignature, handleTwilioStatusCallback);

export { handleTwilioStatusCallback } from './handlers/twilioStatusHandler';
export default router;
