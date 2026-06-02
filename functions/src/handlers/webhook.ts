import express, { Request, Response } from 'express';
import { matchKeyword } from '../services/fuzzyMatchService';
import { normalizeInput } from '../utils/normalizeInput';
import pino from 'pino';

const logger = pino();

/**
 * Core webhook handler logic — shared between the Express local server
 * and the Cloud Function (whatsappWebhook).
 *
 * Accepts: { Body, From, ProfileName } — same shape Twilio sends.
 */
export const handleWebhookRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Body, From, ProfileName, ButtonPayload } = req.body as {
      Body?: string;
      From?: string;
      ProfileName?: string;
      ButtonPayload?: string;  // present when user taps a Twilio quick-reply button
    };

    if (!From || !Body) {
      res.status(400).json({ error: 'Missing From or Body' });
      return;
    }

    const phone = From.replace('whatsapp:', '');
    const keyword = matchKeyword(Body);

    logger.info({ phone, body: Body, keyword }, 'Incoming webhook');

    // ── Lazy-load Firebase-dependent services only in production ──────────────
    // In test/local mode (no project ID) we skip DB calls and just
    // return the routing decision so you can verify keyword matching end-to-end.
    const isDemoMode = (!process.env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_CLOUD_PROJECT) || process.env.NODE_ENV === 'test';

    if (isDemoMode) {
      res.status(200).json({
        status: 'demo_mode',
        phone,
        keyword,
        message: keyword
          ? `Would handle keyword: ${keyword}`
          : 'No keyword matched — would check awaitingJournal state',
      });
      return;
    }

    // ── Production path ───────────────────────────────────────────────────────
    const { getUser, setPauseState } = await import('../services/userService');
    const { saveJournalEntry, setAwaitingJournal } = await import('../services/journalService');
    const { sendWhatsAppMessage, runWithTwilioResponseContext } = await import('../services/twilioService');
    const stubs = await import('./stubHandlers');
    const db = (await import('firebase-admin/firestore')).getFirestore();

    await runWithTwilioResponseContext(req.body as Record<string, unknown>, async () => {
    const user = await getUser(phone);
    const normalizedText = normalizeInput(Body);

    // ── Global Reset Command ──────────────────────────────────────────────────
    if (normalizedText === 'reset') {
      await db.collection('users').doc(phone.replace('+', '')).update({
        awaitingOnboardingStep: null,
        awaitingNeedSelection: false,
        awaitingJournal: false,
        awaitingQuestConfirm: false,
        awaitingQuizAnswer: false,
        awaitingDeclarationYes: false,
        awaitingReminderTime: false,
      });
      await sendWhatsAppMessage(phone, 'All pending actions have been reset. You are back to the main menu. Reply HELP to see your options.');
      res.status(200).json({ status: 'ok', action: 'reset' });
      return;
    }

    // ── Onboarding Interceptor ────────────────────────────────────────────────
    // If the user is mid-onboarding, intercept their reply BEFORE keyword routing.
    const { handleNameReply, handleTimeReply } = await import('./onboardingHandler');

    if (user?.awaitingOnboardingStep === 'name') {
      await handleNameReply(phone, Body);
      res.status(200).json({ status: 'ok', action: 'onboarding_name' });
      return;
    }

    if (user?.awaitingOnboardingStep === 'time') {
      await handleTimeReply(phone, Body);
      res.status(200).json({ status: 'ok', action: 'onboarding_time' });
      return;
    }

    // ── Quest Confirmation Interceptor ─────────────────────────────────────────
    // Catches "yes" / "not yet" replies after the QUEST welcome prompt.
    if (user?.awaitingQuestConfirm) {
      const { handleQuestConfirmReply } = await import('./questHandler');
      await handleQuestConfirmReply(phone, Body, user);
      res.status(200).json({ status: 'ok', action: 'quest_confirm' });
      return;
    }

    // ── Quiz Answer Interceptor ──────────────────────────────────────────────
    // Catches button taps (ButtonPayload) or typed A/B/C while a quiz is active.
    if (user?.awaitingQuizAnswer) {
      const { handleQuizAnswer } = await import('./quizHandler');
      await handleQuizAnswer(phone, Body, ButtonPayload);
      res.status(200).json({ status: 'ok', action: 'quiz_answer' });
      return;
    }

    // ── Declaration YES Interceptor ──────────────────────────────────────────
    if (user?.awaitingDeclarationYes && normalizedText.startsWith('yes')) {
      const { handleYesDeclaration } = await import('./yesHandler');
      await handleYesDeclaration(phone, normalizedText, user);
      res.status(200).json({ status: 'ok', action: 'declaration_yes' });
      return;
    }

    // ── Reminder Time Interceptor ────────────────────────────────────────────
    if (user?.awaitingReminderTime) {
      const { handleReminderTimeUpdate } = await import('./remindHandler');
      await handleReminderTimeUpdate(phone, Body, user);
      res.status(200).json({ status: 'ok', action: 'reminder_time_update' });
      return;
    }

    // ── Journal Interceptor ───────────────────────────────────────────────────
    if (user?.awaitingJournal) {
      if (normalizedText !== 'pause' && normalizedText !== 'resume') {
        await saveJournalEntry(phone, Body);
        await db.collection('users').doc(phone.replace('+', '')).update({ awaitingJournal: false });
        await sendWhatsAppMessage(phone, 'Thank you for sharing your heart. Your journal has been saved.');
        res.status(200).json({ status: 'ok', action: 'journal_saved' });
        return;
      }
    }

    // ── NEED Selection Interceptor ────────────────────────────────────────────
    if (user?.awaitingNeedSelection) {
      if (normalizedText !== 'pause' && normalizedText !== 'resume') {
        const { handleNeedSelection } = await import('./needHandler');
        await handleNeedSelection(phone, Body, user);
        res.status(200).json({ status: 'ok', action: 'need_selection' });
        return;
      }
    }

    switch (keyword) {
      case 'ask':
        await stubs.handleOnboarding(phone, user);
        break;
      case 'seek':
        await (await import('./seekHandler')).deliverDevotion(phone, user);
        break;
      case 'knock':
        await (await import('./knockHandler')).handleKnock(phone, user);
        break;
      case 'journal':
        await setAwaitingJournal(phone);
        await sendWhatsAppMessage(phone, 'What is on your heart today? Type your journal entry below...');
        break;
      case 'vine':
        await (await import('./vineHandler')).sendVineStatus(phone, user);
        break;
      case 'need':
        await (await import('./needHandler')).triggerNeedSelection(phone, user);
        break;
      case 'remind':
        await (await import('./remindHandler')).triggerReminderTimeUpdate(phone);
        break;
      case 'pause':
        if (user) await setPauseState(phone, true);
        await sendWhatsAppMessage(phone, 'Messages paused. Reply RESUME anytime.');
        break;
      case 'resume':
        if (user) await setPauseState(phone, false);
        await sendWhatsAppMessage(phone, 'Welcome back! Daily messages will resume. 🙌');
        break;
      case 'help':
        await sendWhatsAppMessage(phone, '📖 *ASK Menu*\n\n*ASK*: Get your morning card\n*SEEK*: Deepen the daily word\n*KNOCK*: Declare the word\n*JOURNAL*: Write your reflections\n*VINE*: Check your streak\n*NEED*: Targeted prayers by theme\n*QUEST*: Start your Bible journey\n*WATCH*: Early Quest video\n*LOG*: Log independent chapters\n*QUIZ*: Weekly Quest quiz\n*PROGRESS*: View Quest stats\n*REMIND*: Update your reminder time\n*PAUSE* / *RESUME*: Control daily messages');
        break;
      case 'quest':
        await (await import('./questHandler')).handleQuestOnboarding(phone, user);
        break;
      case 'watch':
        await (await import('./watchHandler')).deliverNextVideoEarly(phone, user);
        break;
      case 'log':
        await (await import('./logHandler')).handleLogChapter(phone, Body, user);
        break;
      case 'quiz':
        await (await import('./quizHandler')).triggerWeeklyQuiz(phone, user);
        break;
      case 'progress':
        await (await import('./progressHandler')).sendQuestProgress(phone, user);
        break;
      default:
        await stubs.handleFallback(phone);
    }
    res.status(200).json({ status: 'ok', action: 'routed' });
    });
    return;
  } catch (error) {
    logger.error(error, 'Webhook handler error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Creates and returns a configured Express app with the webhook route mounted.
 * Used by both the local dev server and tests.
 */
export const createApp = (): express.Application => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // Twilio sends URL-encoded bodies

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ASK WhatsApp Bot' }));

  // Main inbound webhook — Twilio POSTs here.
  // Mount on both / (Cloud Function root) and /webhook (named path) to handle both call patterns.
  app.post('/', handleWebhookRequest);
  app.post('/webhook', handleWebhookRequest);

  return app;
};
