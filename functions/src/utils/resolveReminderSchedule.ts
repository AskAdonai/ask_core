import { validateReminderTime } from './timezone';

/** Resolves hour/minute from user doc (legacy fields or reminderTime string). */
export const resolveReminderHourMinute = (user: {
  reminderTime?: string;
  reminderHour?: number;
  reminderMinute?: number;
}): { hour: number; minute: number } | null => {
  if (
    typeof user.reminderHour === 'number' &&
    typeof user.reminderMinute === 'number' &&
    validateReminderTime(user.reminderHour, user.reminderMinute)
  ) {
    return { hour: user.reminderHour, minute: user.reminderMinute };
  }

  if (user.reminderTime) {
    const [hourStr, minuteStr] = user.reminderTime.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (validateReminderTime(hour, minute)) {
      return { hour, minute };
    }
  }

  return null;
};

export const formatDeliveryError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
};
