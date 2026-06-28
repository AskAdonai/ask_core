import { getFirestore } from 'firebase-admin/firestore';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { computeNextSendAt, computeNextReminderAt, computeNextQuestAt } from '../utils/timezone';
import pino from 'pino';

// Re-export User type so existing imports from userService still work
export type { User } from '../types/schemas';
import type { PendingUser, User } from '../types/schemas';

const logger = pino();


/**
 * Creates a new user. Returns {exists: true} if the phone is already registered.
 */
export const createUser = async (
  phone: string,
  name: string,
  reminderHour = 8,
  reminderMinute = 0,
  existingTimezone?: string
): Promise<{ exists: boolean; user: Partial<User> }> => {
  const db = getFirestore();

  // Derive timezone from country code — expanded mapping
  const parsed = parsePhoneNumberWithError(phone);
  const countryCode = parsed?.country || '';
  const { resolveCountryTimezone } = await import('../utils/timezone');
  const timezone = existingTimezone || resolveCountryTimezone(countryCode);

  const userId = phone.replace('+', '');
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();
  const existingData = doc.exists ? doc.data() as Partial<User & PendingUser> : null;

  if (doc.exists && !existingData?.awaitingOnboardingStep) {
    logger.info({ userId }, 'User already registered');
    return { exists: true, user: existingData as User };
  }

  const localTime = `${reminderHour.toString().padStart(2, '0')}:${reminderMinute.toString().padStart(2, '0')}`;
  
  // ── UTC Conversion Fix ───────────────────────────────────────────────────
  // Use Luxon to accurately convert the user's local time to UTC, respecting
  // their specific timezone offset rather than the server's local timezone.
  // Note: Due to DST, this HH:MM bucket will drift. The dispatchers rely entirely
  // on nextSendAt (which is a precise timestamp recalculated daily) to avoid DST bugs.
  const { DateTime } = await import('luxon');
  const localDateTime = DateTime.fromObject(
    { hour: reminderHour, minute: reminderMinute },
    { zone: timezone }
  );
  const reminderTimeUTC = localDateTime.toUTC().toFormat('HH:mm');

  const userData: User = {
    phone,
    name: name || existingData?.name || '',
    timezone,
    reminderTime: localTime,
    reminderTimeLocal: localTime,
    reminderTimeUTC,
    nextSendAt: computeNextSendAt(timezone, reminderHour, reminderMinute),
    nextReminderAt: computeNextReminderAt(timezone),
    nextQuestAt: computeNextQuestAt(timezone),
    lockedUntil: null,
    streak: 0,
    vineStage: 'Grafted',
    journeyStage: 1,
    journeyDayIndex: 1,
    lastActiveDate: '',
    declarationsToday: 0,
    journaledToday: false,
    eveningReminderSentToday: false,
    lastCheckinSent: '',
    paused: false,
    optOutRequestedAt: null,
    dataDeletionScheduledAt: null,
    awaitingJournal: false,
    awaitingKnockSelection: false,
    awaitingOnboardingStep: null,
    awaitingQuestConfirm: false,
    awaitingQuizAnswer: false,
    awaitingDeclarationYes: false,
    awaitingReminderTime: false,
    activeKnockTheme: '',
    knockPrayerIndex: 0,
    questActive: false,
    questWeek: 1,
    questVideoIndex: 0,
    questChaptersLogged: 0,
    currentQuizQuestionIndex: 0,
    currentQuizScore: 0,
    lastMorningDeliveryId: null,
    lastReminderDeliveryId: null,
    lastQuestDeliveryId: null,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await userRef.set(userData, { merge: true });
  logger.info({ phone }, 'New user created');
  return { exists: false, user: userData };
};

/**
 * Retrieves a user by phone number.
 */
export const getUser = async (phone: string): Promise<User | null> => {
  const db = getFirestore();
  const userId = phone.replace('+', '');
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists ? (doc.data() as User) : null;
};

/**
 * Pauses or resumes messaging for a user.
 */
export const setPauseState = async (phone: string, paused: boolean): Promise<void> => {
  const db = getFirestore();
  const userId = phone.replace('+', '');
  await db.collection('users').doc(userId).update({ paused, updatedAt: new Date() });
};

/**
 * Sets the awaitingOnboardingStep field to track multi-step onboarding.
 */
export const setOnboardingStep = async (
  phone: string,
  step: 'name' | 'timezone' | 'time' | null
): Promise<void> => {
  const db = getFirestore();
  const userId = phone.replace('+', '');
  await db.collection('users').doc(userId).set(
    { awaitingOnboardingStep: step, updatedAt: new Date() },
    { merge: true }
  );
};

/**
 * Creates a minimal "pending" user document at the start of onboarding (step 0).
 * The document is completed in step 2 after name + time are collected.
 */
export const createPendingUser = async (phone: string): Promise<void> => {
  const db = getFirestore();
  const userId = phone.replace('+', '');
  const pendingUser: PendingUser = {
    userId,
    phone,
    awaitingOnboardingStep: 'name',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('users').doc(userId).set(pendingUser);
  logger.info({ userId }, 'Pending user document created');
};

/**
 * Merges arbitrary fields into an existing user document.
 */
export const updateUserFields = async (
  phone: string,
  fields: Partial<User>
): Promise<void> => {
  const db = getFirestore();
  const userId = phone.replace('+', '');
  await db.collection('users').doc(userId).update({ ...fields, updatedAt: new Date() });
};

/** Clears interactive awaiting-* flags so the user can send commands again. */
export const clearPendingStates = async (phone: string): Promise<void> => {
  const db = getFirestore();
  const userId = phone.replace('+', '');
  await db.collection('users').doc(userId).update({
    awaitingDeclarationYes: false,
    awaitingKnockSelection: false,
    awaitingJournal: false,
    awaitingQuestConfirm: false,
    awaitingQuizAnswer: false,
    awaitingReminderTime: false,
    updatedAt: new Date(),
  });
};

const parseReminderParts = (reminderTime?: string): { hour: number; minute: number } => {
  const [hStr, mStr] = (reminderTime || '06:00').split(':');
  return {
    hour: parseInt(hStr, 10) || 6,
    minute: parseInt(mStr, 10) || 0,
  };
};

/** Resets journey, session, and scheduler runtime fields to a fresh-user baseline. */
export const buildDefaultUserState = (user: Partial<User>): Partial<User> => {
  const timezone = user.timezone || 'UTC';
  const { hour, minute } = parseReminderParts(user.reminderTime || user.reminderTimeLocal);

  return {
    lockedUntil: null,
    journeyStage: 1,
    journeyDayIndex: 1,
    vineStage: 'Grafted',
    streak: 0,
    lastActiveDate: '',
    declarationsToday: 0,
    journaledToday: false,
    eveningReminderSentToday: false,
    lastCheckinSent: '',
    paused: false,
    optOutRequestedAt: null,
    dataDeletionScheduledAt: null,
    awaitingJournal: false,
    awaitingKnockSelection: false,
    awaitingOnboardingStep: null,
    awaitingQuestConfirm: false,
    awaitingQuizAnswer: false,
    awaitingDeclarationYes: false,
    awaitingReminderTime: false,
    activeKnockTheme: '',
    knockPrayerIndex: 0,
    questActive: false,
    questWeek: 1,
    questVideoIndex: 0,
    questChaptersLogged: 0,
    currentQuizQuestionIndex: 0,
    currentQuizScore: 0,
    lastMorningDeliveryId: null,
    lastReminderDeliveryId: null,
    lastQuestDeliveryId: null,
    nextSendAt: computeNextSendAt(timezone, hour, minute),
    nextReminderAt: computeNextReminderAt(timezone),
    nextQuestAt: computeNextQuestAt(timezone),
    updatedAt: new Date(),
  };
};
