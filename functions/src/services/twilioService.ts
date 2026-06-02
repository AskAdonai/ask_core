import twilio from 'twilio';
import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

const logger = pino();

let twilioClient: ReturnType<typeof twilio> | null = null;

export type TwilioInboundChannel = 'conversations' | 'whatsapp' | 'sms' | 'unknown';

export interface TwilioTypingContext {
  channel: TwilioInboundChannel;
  conversationSid?: string;
  from?: string;
  typing?: () => Promise<void> | void;
  typingWebhookUrl?: string;
  hasShownTyping?: boolean;
}

type TypingState = 'typing_started' | 'typing_ended';

const typingContext = new AsyncLocalStorage<TwilioTypingContext>();

const getTwilioClient = () => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
};

const isMock = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  return !sid || sid === 'your_account_sid' || sid === 'mock';
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getResponseDelayMs = (text = '') => {
  const lengthDelay = Math.floor(text.length / 80) * 300;
  return Math.min(3000, Math.max(1500, 1500 + lengthDelay));
};

export const detectTwilioChannel = (payload: Record<string, unknown>): TwilioInboundChannel => {
  const from = String(payload.From || payload.Author || '').toLowerCase();
  const channelType = String(payload.ChannelType || payload.MessagingBindingType || '').toLowerCase();

  if (payload.ConversationSid || payload.ChannelSid || payload.ChatServiceSid) {
    return 'conversations';
  }

  if (from.startsWith('whatsapp:') || channelType === 'whatsapp') {
    return 'whatsapp';
  }

  if (from.startsWith('sms:') || channelType === 'sms' || /^\+?\d/.test(from)) {
    return 'sms';
  }

  return 'unknown';
};

export const runWithTwilioResponseContext = async <T>(
  inboundPayload: Record<string, unknown>,
  fn: () => Promise<T>,
  overrides: Partial<TwilioTypingContext> = {},
): Promise<T> => {
  const context: TwilioTypingContext = {
    channel: detectTwilioChannel(inboundPayload),
    conversationSid: String(inboundPayload.ConversationSid || inboundPayload.ChannelSid || ''),
    from: String(inboundPayload.From || inboundPayload.Author || ''),
    typingWebhookUrl: process.env.TWILIO_TYPING_STATE_WEBHOOK_URL,
    ...overrides,
  };

  return typingContext.run(context, fn);
};

const emitTypingWebhook = async (
  context: TwilioTypingContext,
  state: TypingState,
): Promise<void> => {
  if (!context.typingWebhookUrl) return;

  try {
    await fetch(context.typingWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        state,
        channel: context.channel,
        conversationSid: context.conversationSid,
        from: context.from,
      }),
    });
  } catch (error) {
    logger.warn({ error, state, conversationSid: context.conversationSid }, 'Typing state webhook failed');
  }
};

const withTypingIndicator = async <T>(
  send: () => Promise<T>,
  responseText = '',
  context = typingContext.getStore(),
): Promise<T> => {
  if (!context || context.channel === 'unknown') {
    return send();
  }

  if (context.hasShownTyping) {
    return send();
  }
  context.hasShownTyping = true;

  if (context.channel === 'conversations') {
    try {
      if (context.typing) {
        await context.typing();
      } else {
        await emitTypingWebhook(context, 'typing_started');
      }
      await sleep(getResponseDelayMs(responseText));
      return await send();
    } finally {
      if (!context.typing) {
        await emitTypingWebhook(context, 'typing_ended');
      }
    }
  }

  await sleep(getResponseDelayMs(responseText));
  return send();
};

// ─────────────────────────────────────────────────────────────────────────────
// Plain text message
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a plain WhatsApp message via Twilio, with optional media URLs.
 */
export const sendWhatsAppMessage = async (to: string, body: string, mediaUrl?: string[]): Promise<string> => {
  try {
    if (isMock()) {
      logger.info({ to, body, mediaUrl }, '[MOCK TWILIO] sendWhatsAppMessage');
      return `mock_sid_${Date.now()}`;
    }

    const client = getTwilioClient();
    const from      = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const toAddress = `whatsapp:${to}`;

    const messageParams: any = { body, from, to: toAddress };
    if (mediaUrl && mediaUrl.length > 0) {
      messageParams.mediaUrl = mediaUrl;
    }

    const message = await withTypingIndicator(() => client.messages.create(messageParams), body);
    logger.info({ messageSid: message.sid, to, hasMedia: !!mediaUrl }, 'Twilio message sent');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'Failed to send Twilio message');
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Interactive quick-reply (3 buttons — used for quiz questions)
// ─────────────────────────────────────────────────────────────────────────────

export interface QuizButtonPayload {
  questionNumber: number;  // 1-based, shown in header
  totalQuestions: number;
  bookTitle: string;
  questionText: string;
  options: [string, string, string];  // exactly A, B, C
}

/**
 * Sends an interactive quick-reply message with 3 clickable option buttons.
 *
 * Requires TWILIO_CONTENT_SID_QUIZ to be set to a pre-created
 * twilio/quick-reply content template SID (HXxxx…).
 *
 * Template variables:
 *   {{1}} — header line (e.g. "Week 3 Quiz — Exodus | Question 2 of 4")
 *   {{2}} — question text
 *   {{3}} — option A text
 *   {{4}} — option B text
 *   {{5}} — option C text
 *
 * Falls back to plain text if the content SID is not configured.
 */
export const sendQuizQuestion = async (
  to: string,
  payload: QuizButtonPayload
): Promise<string> => {
  const contentSid = process.env.TWILIO_CONTENT_SID_QUIZ;

  // ── Fallback: plain text with A/B/C labels ────────────────────────────────
  if (isMock() || !contentSid) {
    const { questionNumber, totalQuestions, bookTitle, questionText, options } = payload;
    const fallback =
      `*${bookTitle} — Question ${questionNumber} of ${totalQuestions}*\n\n` +
      `${questionText}\n\n` +
      `A — ${options[0]}\n` +
      `B — ${options[1]}\n` +
      `C — ${options[2]}\n\n` +
      `_Reply A, B or C_`;
    logger.info({ to }, '[MOCK/FALLBACK] sendQuizQuestion — no contentSid, using text');
    return sendWhatsAppMessage(to, fallback);
  }

  // ── Interactive quick-reply via Content API ───────────────────────────────
  try {
    const client = getTwilioClient();
    const from      = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const toAddress = `whatsapp:${to}`;

    const header = `${payload.bookTitle} — Question ${payload.questionNumber} of ${payload.totalQuestions}`;

    const contentVariables = {
      '1': header,
      '2': payload.questionText,
      '3': `A — ${payload.options[0]}`,
      '4': `B — ${payload.options[1]}`,
      '5': `C — ${payload.options[2]}`,
    };

    const message = await withTypingIndicator(() => client.messages.create({
      from,
      to: toAddress,
      contentSid,
      contentVariables: JSON.stringify(contentVariables),
    } as any), `${header}\n${payload.questionText}`); // Twilio SDK typings lag behind Content API support

    logger.info({ messageSid: message.sid, to }, 'Quiz question sent (interactive)');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'Failed to send interactive quiz question — falling back to text');
    // Graceful degradation
    const { questionNumber, totalQuestions, bookTitle, questionText, options } = payload;
    const fallback =
      `*${bookTitle} — Question ${questionNumber} of ${totalQuestions}*\n\n` +
      `${questionText}\n\n` +
      `A — ${options[0]}\n` +
      `B — ${options[1]}\n` +
      `C — ${options[2]}\n\n` +
      `_Reply A, B or C_`;
    return sendWhatsAppMessage(to, fallback);
  }
};
