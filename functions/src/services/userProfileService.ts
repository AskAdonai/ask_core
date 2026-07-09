import type { User, PendingUser } from '../types/schemas';

export type RegistrationField = 'name' | 'timezone' | 'morning reminder time';

const hasName = (user: Partial<User & PendingUser>): boolean =>
  Boolean(user.name?.trim());

const hasTimezone = (user: Partial<User & PendingUser>): boolean =>
  Boolean(user.timezone?.trim());

const hasReminderTime = (user: Partial<User & PendingUser>): boolean =>
  Boolean(user.reminderTimeLocal?.trim() || user.reminderTime?.trim());

/**
 * A user is fully registered when onboarding is finished and all required
 * profile fields are present.
 */
export const isRegistrationComplete = (user: Partial<User & PendingUser> | null): boolean => {
  if (!user) return false;
  if (user.awaitingOnboardingStep) return false;
  return hasName(user) && hasTimezone(user) && hasReminderTime(user);
};

export const getMissingRegistrationFields = (
  user: Partial<User & PendingUser>,
): RegistrationField[] => {
  const missing: RegistrationField[] = [];
  if (!hasName(user)) missing.push('name');
  if (!hasTimezone(user)) missing.push('timezone');
  if (!hasReminderTime(user)) missing.push('morning reminder time');
  return missing;
};

const fieldPrompts: Record<RegistrationField, string> = {
  name: 'your *name*',
  timezone: 'your *timezone*',
  'morning reminder time': 'your preferred *morning reminder time*',
};

export const buildIncompleteProfileMessage = (
  user: Partial<User & PendingUser>,
): string => {
  const missing = getMissingRegistrationFields(user);
  const list = missing.map((field) => fieldPrompts[field]).join(', ');

  if (user.awaitingOnboardingStep === 'name') {
    return `Before we continue, I still need ${list}. What is your name?`;
  }
  if (user.awaitingOnboardingStep === 'timezone') {
    return `Before we continue, I still need ${list}. Which timezone are you in?`;
  }
  if (user.awaitingOnboardingStep === 'time') {
    return `Before we continue, I still need ${list}. What time would you like your morning card? _(e.g. 6am, 7:30)_`;
  }

  return (
    `Your ASK profile is not complete yet. I still need: ${list}.\n\n` +
    `Reply *ASK* to continue registration where you left off.`
  );
};

export const buildUnregisteredPrompt = (): string =>
  `Welcome to ASK — a daily space to Ask, Seek and Knock in the presence of God.\n\n` +
  `To register and begin your journey, reply *ASK*.`;

export const buildOnboardingResumeMessage = (
  user: Partial<User & PendingUser>,
): string => {
  if (user.awaitingOnboardingStep === 'name') {
    return `Let's pick up where we left off. What is your name?`;
  }
  if (user.awaitingOnboardingStep === 'timezone') {
    return `Let's pick up where we left off. Which timezone are you in? _(e.g. Eastern, Central, Pacific)_`;
  }
  if (user.awaitingOnboardingStep === 'time') {
    return `Let's pick up where we left off. What time would you like your morning card? _(e.g. 6am, 7:30 — or type *skip* for 6:00 AM)_`;
  }

  return buildIncompleteProfileMessage(user);
};
