import { sendWhatsAppMessage } from '../../services/twilioService';
import {
  createPendingUser,
  setOnboardingStep,
  updateUserFields,
  createUser,
  User,
} from '../../services/userService';
import { parseTime } from '../../utils/timeParser';
import { parsePhoneNumber } from 'libphonenumber-js';
import { computeNextSendAt, computeNextReminderAt, computeUserScheduleFields } from '../../utils/timezone';
import pino from 'pino';

const logger = pino();

// Journey image URL from env — set in GCP Secret Manager / .env
const JOURNEY_IMAGE_URL = process.env.JOURNEY_IMAGE_URL || '';

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 — User texts "ASK"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entry point for the onboarding flow.
 * - If user already exists: sends their current vine stage + streak (duplicate guard).
 * - If new: creates a pending Firestore doc and sends the welcome message.
 */
export const handleOnboarding = async (phone: string, user: Partial<User> | null): Promise<void> => {
  // Duplicate guard — user already registered
  if (user && user.awaitingOnboardingStep === null || (user && user.name)) {
    const name = user.name || 'Friend';
    const stage = user.vineStage || 'Grafted';
    const streak = user.streak ?? 0;
    await sendWhatsAppMessage(
      phone,
      `You are already planted, ${name}. Your vine is *${stage}* — Streak: ${streak} day${streak === 1 ? '' : 's'}. Reply HELP to see your options.`
    );
    logger.info({ phone, stage, streak }, 'Duplicate ASK — returning vine status');
    return;
  }

  // New user — create pending doc and send welcome
  await createPendingUser(phone);

  await sendWhatsAppMessage(
    phone,
    `You have just done something significant.\n\nWelcome to ASK — a daily space to Ask, Seek and Knock in the presence of God. Every morning I will meet you here with a word, a prayer and a declaration. Our goal is to walk together towards a tightly knit relationship with the Holy Spirit. One day at a time.\n\n_Always remember: In consistency lies the power._\n\nBefore we begin, may I know your name?`
  );

  logger.info({ phone }, 'Onboarding started — awaiting name');
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — User replies with their name
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Captures the user's name, stores it, advances to the time-selection step.
 */
export const handleNameReply = async (phone: string, rawText: string): Promise<void> => {
  const trimmed = rawText.trim();

  // Guard 1 — empty input
  if (!trimmed) {
    await sendWhatsAppMessage(phone, `I didn't catch that. What is your name?`);
    return; // Stay on 'name' step
  }

  // Guard 2 — name too long (spec: < 30 characters)
  if (trimmed.length >= 30) {
    await sendWhatsAppMessage(
      phone,
      `That name is a little long for me to carry! Could you share a shorter version — a first name or nickname works perfectly. _(max 29 characters)_`
    );
    return; // Stay on 'name' step — do NOT advance to 'time'
  }

  // Capitalize first letter of each word
  const name = trimmed
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Check if user is in a multi-timezone country
  const parsedPhone = parsePhoneNumber(phone);
  const countryCode = parsedPhone?.country || '';
  const MULTI_TZ_COUNTRIES = ['US', 'CA', 'AU', 'BR'];
  const requiresTimezonePrompt = MULTI_TZ_COUNTRIES.includes(countryCode);

  await updateUserFields(phone, { name } as Partial<User>);

  if (requiresTimezonePrompt) {
    await setOnboardingStep(phone, 'timezone');
    
    let regionPrompt = 'I see you are in the US or Canada. Are you in Eastern, Central, Mountain, or Pacific time?';
    if (countryCode === 'AU') regionPrompt = 'I see you are in Australia. Are you in Sydney/Melbourne (AEST), Adelaide (ACST), or Perth (AWST) time?';
    if (countryCode === 'BR') regionPrompt = 'I see you are in Brazil. Are you in Brasilia, Amazon, or Acre time?';

    await sendWhatsAppMessage(
      phone,
      `${name}. Beautiful.\n\nGod knew that name before you did. I am going to walk with you every day, ${name}.\n\nBefore we set your morning delivery, ${regionPrompt}`
    );
    logger.info({ phone, name, countryCode }, 'Onboarding name captured — awaiting timezone');
  } else {
    await setOnboardingStep(phone, 'time');
    await sendWhatsAppMessage(
      phone,
      `${name}. Beautiful.\n\nGod knew that name before you did. I am going to walk with you every day, ${name}.\n\nEvery morning your prayer card arrives. If you haven't completed your movement by 8:00 PM I will send a gentle reminder. That is all I will ever send — unless you ask for more.\n\nWhat time would you like your morning card? _(e.g. 6am, 7:30, 18:00 — default is 6:00 AM)_`
    );
    logger.info({ phone, name }, 'Onboarding name captured — awaiting time');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 1.5 — User replies with their timezone (Multi-TZ countries only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps conversational timezone replies to exact IANA zones.
 */
export const handleTimezoneReply = async (phone: string, rawText: string): Promise<void> => {
  const normalized = rawText.toLowerCase().replace(/[^a-z]/g, '');
  let timezone = '';

  // US / CA
  if (normalized.includes('eastern') || normalized.includes('est') || normalized.includes('edt') || normalized.includes('newyork')) {
    timezone = 'America/New_York';
  } else if (normalized.includes('central') || normalized.includes('cst') || normalized.includes('cdt') || normalized.includes('chicago') || normalized.includes('texas')) {
    timezone = 'America/Chicago';
  } else if (normalized.includes('mountain') || normalized.includes('mst') || normalized.includes('mdt') || normalized.includes('denver')) {
    timezone = 'America/Denver';
  } else if (normalized.includes('pacific') || normalized.includes('pst') || normalized.includes('pdt') || normalized.includes('california') || normalized.includes('losangeles')) {
    timezone = 'America/Los_Angeles';
  } 
  // AU
  else if (normalized.includes('sydney') || normalized.includes('melbourne') || normalized.includes('aest') || normalized.includes('aedt')) {
    timezone = 'Australia/Sydney';
  } else if (normalized.includes('adelaide') || normalized.includes('darwin') || normalized.includes('acst')) {
    timezone = 'Australia/Adelaide';
  } else if (normalized.includes('perth') || normalized.includes('awst')) {
    timezone = 'Australia/Perth';
  }
  // BR
  else if (normalized.includes('brasilia') || normalized.includes('sao') || normalized.includes('paulo')) {
    timezone = 'America/Sao_Paulo';
  } else if (normalized.includes('amazon') || normalized.includes('manaus')) {
    timezone = 'America/Manaus';
  } else if (normalized.includes('acre') || normalized.includes('rio')) {
    timezone = 'America/Rio_Branco';
  }

  if (!timezone) {
    await sendWhatsAppMessage(phone, `I couldn't quite recognize that timezone. Could you specify Eastern, Central, Mountain, or Pacific? (Or your nearest major city).`);
    return;
  }

  // Save the specific timezone to the pending doc and advance to time
  await updateUserFields(phone, { timezone } as Partial<User>);
  await setOnboardingStep(phone, 'time');

  await sendWhatsAppMessage(
    phone,
    `Perfect. Now, what time would you like your morning card? _(e.g. 6am, 7:30, 18:00 — default is 6:00 AM)_`
  );
  logger.info({ phone, timezone }, 'Onboarding timezone captured — awaiting time');
};


// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — User replies with their preferred time
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Captures the user's preferred reminder time, derives their timezone,
 * finalises the Firestore user document, and sends the journey welcome messages.
 */
export const handleTimeReply = async (phone: string, rawText: string, user: Partial<User> | null): Promise<void> => {
  // Allow "skip" or empty to default to 6:00 AM
  const isDefault = rawText.trim().toLowerCase() === 'skip' || rawText.trim() === '';
  const parsed = isDefault ? { hour: 6, minute: 0, display: '06:00' } : parseTime(rawText);

  if (!parsed) {
    await sendWhatsAppMessage(
      phone,
      `Sorry, I didn't quite catch that. Please try a format like:\n*6am*, *8:30*, *18:00*\n\nOr type *skip* to use the default (6:00 AM).`
    );
    return; // Stay on 'time' step — don't advance
  }

  const existingTimezone = user?.timezone;
  const scheduleFields = computeUserScheduleFields(phone, parsed.hour, parsed.minute, parsed.display, existingTimezone);

  // Finalise the user document via createUser (idempotent — merges over pending doc)
  // We pass existingTimezone here so that the multi-region step isn't overwritten.
  await createUser(phone, user?.name || '', parsed.hour, parsed.minute, existingTimezone);

  // Override with actual values from onboarding (name was stored in step 1)
  await updateUserFields(phone, {
    ...scheduleFields,
    journeyStage: 1,
    vineStage: 'Grafted',
    streak: 0,
    paused: false,
    awaitingOnboardingStep: null,
  } as Partial<User>);

  logger.info({ phone, timezone: scheduleFields.timezone, localTime: scheduleFields.reminderTimeLocal }, 'Onboarding complete — scheduling finalised');

  // ── Send Journey Stage 1 (Believe) Welcome ──────────────────────────────────
  await sendWhatsAppMessage(
    phone,
    `Everyday, I will be here. No matter what the day holds, I will show up if you show up.\n\nHere is what to expect. Our first ASK devotion is a journey through nine seasons of fellowship with God, each one taking you deeper into a closer walk with God and a stronger prayer walk.\n\nWe start at *Believe* and journey to *Reign*.\n\n_"He that cometh to God must know that He Is, and that He is a rewarder of those who diligently seek Him."_`
  );

  // Send Journey image if URL is configured
  if (JOURNEY_IMAGE_URL) {
    const twilioClient = (await import('../../services/twilioService')).sendWhatsAppMessage;
    // Re-send with media — Twilio handles MMS when mediaUrl is provided
    // For now, send image URL inline until media-send is wired up
    await sendWhatsAppMessage(phone, JOURNEY_IMAGE_URL);
  }

  // ── Journey Welcome — Message 2 ─────────────────────────────────────────
  await sendWhatsAppMessage(
    phone,
    `We begin at Season 1 *Believe*.\n\nHowever, if your heart has a specific prayer need at any time — healing, provision, a waiting season — simply type *NEED* at any time and I will bring you targeted prayers alongside your journey.\n\nYou are *Grafted* on Day 1. Your first morning card arrives tomorrow at ${scheduleFields.reminderTimeLocal}. When it does, please read it slowly. Then type *SEEK* when you are ready to go deeper. Type *KNOCK* to make your declaration. Together we will Ask, Seek and Knock every day.\n\nI will see you tomorrow morning. 🙏\n\n_SEEK — get today's word now_\n_NEED — browse prayer themes_\n_HELP — see all I can do_`
  );
};
