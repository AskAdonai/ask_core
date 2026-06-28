import twilio from 'twilio';
import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import {
  isTwilioPlaceholderSid,
  resolveTwilioClientCredentials,
} from './twilioCredentials';

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
    const { accountSid, username, password } = resolveTwilioClientCredentials();
    twilioClient = twilio(username, password, { accountSid });
  }
  return twilioClient;
};

const isMock = () => isTwilioPlaceholderSid(process.env.TWILIO_ACCOUNT_SID);

/** URL Twilio POSTs message status updates to (delivered, failed, read, etc.). */
export const getTwilioStatusCallbackUrl = (): string | undefined => {
  if (process.env.TWILIO_STATUS_CALLBACK_URL) {
    return process.env.TWILIO_STATUS_CALLBACK_URL.trim();
  }
  const base = process.env.TWILIO_WEBHOOK_BASE_URL?.trim();
  if (base) {
    return `${base.replace(/\/$/, '')}/status`;
  }
  return undefined;
};

export const withStatusCallback = <T extends Record<string, unknown>>(params: T): T => {
  const statusCallback = getTwilioStatusCallbackUrl();
  if (!statusCallback) return params;
  return {
    ...params,
    statusCallback,
    statusCallbackMethod: 'POST',
  };
};

// Typing delay has been removed to improve bot performance.

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
      return await send();
    } finally {
      if (!context.typing) {
        await emitTypingWebhook(context, 'typing_ended');
      }
    }
  }

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
    const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const toAddress = `whatsapp:${to}`;

    const messageParams: any = { body, from, to: toAddress };
    if (mediaUrl && mediaUrl.length > 0) {
      messageParams.mediaUrl = mediaUrl;
    }

    const message = await withTypingIndicator(
      () => client.messages.create(withStatusCallback(messageParams)),
      body,
    );
    logger.info({ messageSid: message.sid, to, hasMedia: !!mediaUrl }, 'Twilio message sent');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'Failed to send Twilio message');
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Quiz response content template (feedback/results)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends quiz feedback/result copy through a Twilio text content template.
 *
 * Requires TWILIO_CONTENT_SID_QUIZ_RESPONSE to be set to a pre-created
 * twilio/text content template SID (HXxxx…).
 *
 * Template variables:
 *   {{1}} — full response body
 *
 * Falls back to plain text if the content SID is not configured.
 */
export const sendQuizResponse = async (to: string, body: string): Promise<string> => {
  const contentSid = undefined; // process.env.TWILIO_CONTENT_SID_QUIZ_RESPONSE;

  if (isMock() || !contentSid) {
    logger.info({ to }, '[MOCK/FALLBACK] sendQuizResponse — no contentSid, using text');
    return sendWhatsAppMessage(to, body);
  }

  try {
    const client = getTwilioClient();
    const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const toAddress = `whatsapp:${to}`;

    const message = await withTypingIndicator(() => client.messages.create(withStatusCallback({
      from,
      to: toAddress,
      contentSid,
      contentVariables: JSON.stringify({ '1': body }),
    } as any)), body);

    logger.info({ messageSid: message.sid, to }, 'Quiz response sent (content template)');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'Failed to send quiz response template — falling back to text');
    return sendWhatsAppMessage(to, body);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Quest daily content templates (Mon / Tue / Wed / Fri / Sat)
// Each day maps to one Twilio Content Template SID + named variables.
// ─────────────────────────────────────────────────────────────────────────────

export interface QuestMondayPayload {
  name: string;          // {{1}}
  weekNumber: number;    // {{2}}  e.g. "Week 1 of the Bible in a Year Quest!"
  mondayEncouragement: string; // {{3}}
  readingPortion: string;      // {{4}}
  videoLink: string;           // {{5}}
}

export interface QuestTuesdayPayload {
  name: string;           // {{1}}
  tuesdaySummary: string; // {{2}}
  reflectionQuote: string;// {{3}}
}

export interface QuestWednesdayPayload {
  name: string;             // {{1}}
  weekNumber: number;       // {{2}}
  readingPortion: string;   // {{3}}
  wednesdaySummary: string; // {{4}}
  videoLink: string;        // {{5}}
  estimatedTime: string;    // {{6}}
  signOff: string;          // {{7}}
}

export interface QuestFridayPayload {
  name: string;              // {{1}}
  fridayEncouragement: string; // {{2}}
  weekNumber: number;        // {{3}}
  readingPortion: string;    // {{4}}
  videoLink: string;         // {{5}}
  weeklySummary: string;     // {{6}}
}

export interface QuestSaturdayPayload {
  name: string;                  // {{1}}
  quizGreeting: string;          // {{2}}
  weeklyChapterSpan: string;     // {{3}}
  quizLinks: string;             // {{4}}
  saturdayEncouragement: string; // {{5}}
}

/**
 * Sends the Monday quest template.
 *
 * Template variables:
 *   {{1}} Name
 *   {{2}} Week number intro ("Week 1 of the Bible in a Year Quest!")
 *   {{3}} MondayEncouragement
 *   {{4}} ReadingPortion
 *   {{5}} VideoLink
 *
 * Env var: TWILIO_CONTENT_SID_QUEST_MONDAY
 */
export const sendQuestMonday = async (to: string, payload: QuestMondayPayload): Promise<string> => {
  const contentSid = undefined; // process.env.TWILIO_CONTENT_SID_QUEST_MONDAY;

  const fallback =
    `Hello ${payload.name} 👋👋\n\n` +
    `Welcome to Week ${payload.weekNumber} of the Bible in a Year Quest!\n` +
    `${payload.mondayEncouragement}\n\n` +
    `Today's video covers ${payload.readingPortion}.\n` +
    `👉 Here is your link for today: ${payload.videoLink}\n\n` +
    `Take your time to watch and follow along with the reading.\n` +
    `I'll check in tomorrow before your next video.`;

  if (isMock() || !contentSid) {
    logger.info({ to }, '[MOCK/FALLBACK] sendQuestMonday — using text');
    return sendWhatsAppMessage(to, fallback);
  }

  try {
    const client = getTwilioClient();
    const variables = {
      'Name': payload.name,
      'WeekNumber': String(payload.weekNumber),
      'MondayEncouragement': payload.mondayEncouragement,
      'ReadingPortion': payload.readingPortion,
      'VideoLink': payload.videoLink,
    };
    const message = await withTypingIndicator(() => client.messages.create(withStatusCallback({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      contentSid,
      contentVariables: JSON.stringify(variables),
    } as any)), fallback);
    logger.info({ messageSid: message.sid, to }, 'Quest Monday sent (content template)');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'sendQuestMonday template failed — falling back to text');
    return sendWhatsAppMessage(to, fallback);
  }
};

/**
 * Sends the Tuesday quest reflection template.
 *
 * Env var: TWILIO_CONTENT_SID_QUEST_TUESDAY
 */
export const sendQuestTuesday = async (to: string, payload: QuestTuesdayPayload): Promise<string> => {
  const contentSid = undefined; // process.env.TWILIO_CONTENT_SID_QUEST_TUESDAY;

  const fallback =
    `Hello ${payload.name} 👋\n\n` +
    `${payload.tuesdaySummary}\n\n` +
    `Reflect on this:\n"${payload.reflectionQuote}"\n\n` +
    `I'll be back tomorrow with your next video.`;

  if (isMock() || !contentSid) {
    logger.info({ to }, '[MOCK/FALLBACK] sendQuestTuesday — using text');
    return sendWhatsAppMessage(to, fallback);
  }

  try {
    const client = getTwilioClient();
    const variables = {
      'Name': payload.name,
      'TuesdaySummary': payload.tuesdaySummary,
      'ReflectionQuote': payload.reflectionQuote,
    };
    const message = await withTypingIndicator(() => client.messages.create(withStatusCallback({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      contentSid,
      contentVariables: JSON.stringify(variables),
    } as any)), fallback);
    logger.info({ messageSid: message.sid, to }, 'Quest Tuesday sent (content template)');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'sendQuestTuesday template failed — falling back to text');
    return sendWhatsAppMessage(to, fallback);
  }
};

/**
 * Sends the Wednesday quest video template.
 *
 * Env var: TWILIO_CONTENT_SID_QUEST_WEDNESDAY
 */
export const sendQuestWednesday = async (to: string, payload: QuestWednesdayPayload): Promise<string> => {
  const contentSid = undefined; // process.env.TWILIO_CONTENT_SID_QUEST_WEDNESDAY;

  const fallback =
    `Hello ${payload.name} 👋👋\n\n` +
    `Here is your second video for Week ${payload.weekNumber}.\n` +
    `Today's reading covers ${payload.readingPortion}.\n\n` +
    `${payload.wednesdaySummary}\n\n` +
    `👉 Watch here: ${payload.videoLink}\n\n` +
    `Please set aside about ${payload.estimatedTime} for this session.\n` +
    `${payload.signOff}`;

  if (isMock() || !contentSid) {
    logger.info({ to }, '[MOCK/FALLBACK] sendQuestWednesday — using text');
    return sendWhatsAppMessage(to, fallback);
  }

  try {
    const client = getTwilioClient();
    const variables = {
      'Name': payload.name,
      'WeekNumber': String(payload.weekNumber),
      'ReadingPortion': payload.readingPortion,
      'WednesdaySummary': payload.wednesdaySummary,
      'VideoLink': payload.videoLink,
      'EstimatedTime': payload.estimatedTime,
      'SignOff': payload.signOff,
    };
    const message = await withTypingIndicator(() => client.messages.create(withStatusCallback({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      contentSid,
      contentVariables: JSON.stringify(variables),
    } as any)), fallback);
    logger.info({ messageSid: message.sid, to }, 'Quest Wednesday sent (content template)');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'sendQuestWednesday template failed — falling back to text');
    return sendWhatsAppMessage(to, fallback);
  }
};

/**
 * Sends the Friday final video template.
 *
 * Env var: TWILIO_CONTENT_SID_QUEST_FRIDAY
 */
export const sendQuestFriday = async (to: string, payload: QuestFridayPayload): Promise<string> => {
  const contentSid = undefined; // process.env.TWILIO_CONTENT_SID_QUEST_FRIDAY;

  const fallback =
    `Hello ${payload.name} 👋\n\n` +
    `${payload.fridayEncouragement}\n\n` +
    `Here is your final video for Week ${payload.weekNumber}.\n` +
    `Today's reading covers ${payload.readingPortion}.\n` +
    `👉 Watch here: ${payload.videoLink}\n\n` +
    `${payload.weeklySummary}\n\n` +
    `If you missed any part, take time to catch up before the quiz tomorrow.`;

  if (isMock() || !contentSid) {
    logger.info({ to }, '[MOCK/FALLBACK] sendQuestFriday — using text');
    return sendWhatsAppMessage(to, fallback);
  }

  try {
    const client = getTwilioClient();
    const variables = {
      'Name': payload.name,
      'FridayEncouragement': payload.fridayEncouragement,
      'WeekNumber': String(payload.weekNumber),
      'ReadingPortion': payload.readingPortion,
      'VideoLink': payload.videoLink,
      'WeeklySummary': payload.weeklySummary,
    };
    const message = await withTypingIndicator(() => client.messages.create(withStatusCallback({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      contentSid,
      contentVariables: JSON.stringify(variables),
    } as any)), fallback);
    logger.info({ messageSid: message.sid, to }, 'Quest Friday sent (content template)');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'sendQuestFriday template failed — falling back to text');
    return sendWhatsAppMessage(to, fallback);
  }
};

/**
 * Sends the Saturday quiz template.
 *
 * Env var: TWILIO_CONTENT_SID_QUEST_SATURDAY
 */
export const sendQuestSaturday = async (to: string, payload: QuestSaturdayPayload): Promise<string> => {
  const contentSid = undefined; // process.env.TWILIO_CONTENT_SID_QUEST_SATURDAY;

  const fallback =
    `Hello ${payload.name} 👋\n\n` +
    `${payload.quizGreeting}\n` +
    `This week you've read ${payload.weeklyChapterSpan}.\n` +
    `Take a few minutes to reflect and test your understanding.\n\n` +
    `Quiz link\n${payload.quizLinks}\n\n` +
    `${payload.saturdayEncouragement}`;

  if (isMock() || !contentSid) {
    logger.info({ to }, '[MOCK/FALLBACK] sendQuestSaturday — using text');
    return sendWhatsAppMessage(to, fallback);
  }

  try {
    const client = getTwilioClient();
    const variables = {
      'Name': payload.name,
      'QuizGreeting': payload.quizGreeting,
      'WeeklyChapterSpan': payload.weeklyChapterSpan,
      'QuizLinks': payload.quizLinks,
      'SaturdayEncouragement': payload.saturdayEncouragement,
    };
    const message = await withTypingIndicator(() => client.messages.create(withStatusCallback({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      contentSid,
      contentVariables: JSON.stringify(variables),
    } as any)), fallback);
    logger.info({ messageSid: message.sid, to }, 'Quest Saturday sent (content template)');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'sendQuestSaturday template failed — falling back to text');
    return sendWhatsAppMessage(to, fallback);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Morning devotion quick-reply (SEEK / JOURNAL / VINE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends the scheduled morning devotion with optional quick-reply buttons.
 * Video and audio URLs are embedded in the message body so they render as links in chat.
 */
export const sendMorningDevotionMessage = async (
  to: string,
  body: string,
  imageUrl?: string,
): Promise<string> => {
  const { morningDevotionButtonFooter } = await import('../messages/morningMessage');
  const contentSid = process.env.TWILIO_CONTENT_SID_MORNING_DEVOTION;

  const footer = `\n\n${morningDevotionButtonFooter}`;
  const fallbackBody = `${body}${footer}`;
  const mediaUrl = imageUrl && !imageUrl.includes('example.com') ? [imageUrl] : undefined;

  if (isMock() || !contentSid) {
    logger.info({ to }, '[MOCK/FALLBACK] sendMorningDevotionMessage — no contentSid, using text');
    return sendWhatsAppMessage(to, fallbackBody, mediaUrl);
  }

  try {
    const client = getTwilioClient();
    const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const toAddress = `whatsapp:${to}`;

    if (mediaUrl) {
      await sendWhatsAppMessage(to, body, mediaUrl);
    }

    const message = await withTypingIndicator(() => client.messages.create(withStatusCallback({
      from,
      to: toAddress,
      contentSid,
      contentVariables: JSON.stringify({
        '1': body,
        '2': 'SEEK',
        '3': 'JOURNAL',
        '4': 'VINE',
      }),
    } as any)), fallbackBody);

    logger.info({ messageSid: message.sid, to }, 'Morning devotion sent (interactive)');
    return message.sid;
  } catch (error) {
    logger.error({ error, to }, 'Failed to send morning devotion template — falling back to text');
    return sendWhatsAppMessage(to, fallbackBody, mediaUrl);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Knock response content template
// ─────────────────────────────────────────────────────────────────────────────

export const sendKnockResponse = async (to: string, declarationText: string, mediaUrls?: string[]): Promise<void> => {
  const contentSid = undefined; // process.env.TWILIO_CONTENT_SID_KNOCK_RESPONSE;
  
  const fallback = `Today's declaration:\n\n${declarationText}\n\nSpeak it aloud. When you have declared it, reply *YES*.\n\n• *YES* — I declare it\n• *JOURNAL* — reflect\n• *VINE* — my growth`;

  // If there are media URLs, send them first via a standard message so they aren't lost
  if (mediaUrls && mediaUrls.length > 0) {
    await sendWhatsAppMessage(to, "Listen to today's declaration:", mediaUrls);
  }

  if (isMock() || !contentSid) {
    logger.info({ to }, '[MOCK/FALLBACK] sendKnockResponse — no contentSid, using text');
    await sendWhatsAppMessage(to, fallback);
    return;
  }

  try {
    const client = getTwilioClient();
    const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const toAddress = `whatsapp:${to}`;

    const message = await withTypingIndicator(() => client.messages.create(withStatusCallback({
      from,
      to: toAddress,
      contentSid,
      contentVariables: JSON.stringify({ '1': declarationText }),
    } as any)), fallback);

    logger.info({ messageSid: message.sid, to }, 'Knock response sent (content template)');
  } catch (error) {
    logger.error({ error, to }, 'Failed to send knock response template — falling back to text');
    await sendWhatsAppMessage(to, fallback);
  }
};
