import { DateTime } from 'luxon';

/**
 * Validates if the given reminder hour and minute are within acceptable ranges.
 */
export const validateReminderTime = (hour: number, minute: number): boolean => {
  if (typeof hour !== 'number' || typeof minute !== 'number') return false;
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

/**
 * Computes the next send-at timestamp (UTC) for a given timezone, hour, and minute.
 * If the computed time today has already passed, it schedules for tomorrow.
 */
export const computeNextSendAt = (timezone: string, hour: number, minute: number): Date => {
  const now = DateTime.now().setZone(timezone);
  let next = now.set({ hour, minute, second: 0, millisecond: 0 });

  if (next <= now) {
    next = next.plus({ days: 1 });
  }

  return next.toUTC().toJSDate();
};

/**
 * Computes the next reminder timestamp (UTC) for a given timezone.
 * Reminders are strictly at 8:00 PM (20:00) local time.
 */
export const computeNextReminderAt = (timezone: string): Date => {
  return computeNextSendAt(timezone, 20, 0);
};

/**
 * Computes the next Quest timestamp (UTC) for a given timezone.
 * Quest delivery is strictly at 5:00 PM (17:00) local time.
 */
export const computeNextQuestAt = (timezone: string): Date => {
  return computeNextSendAt(timezone, 17, 0);
};

import { getCountry } from 'countries-and-timezones';
import { parsePhoneNumber } from 'libphonenumber-js';

/**
 * Returns the primary IANA timezone for a given country code, falling back to UTC.
 */
export const resolveCountryTimezone = (countryCode: string): string => {
  const countryData = getCountry(countryCode);
  if (countryData && countryData.timezones.length > 0) {
    return countryData.timezones[0];
  }
  return 'UTC';
};

export const computeUserScheduleFields = (
  phone: string,
  hour: number,
  minute: number,
  displayTime: string,
  existingTimezone?: string
) => {
  const phoneParsed = parsePhoneNumber(phone);
  const countryCode = phoneParsed?.country || '';
  const timezone = existingTimezone || resolveCountryTimezone(countryCode);

  const localDateTime = DateTime.fromObject(
    { hour, minute },
    { zone: timezone }
  );
  const reminderTimeUTC = localDateTime.toUTC().toFormat('HH:mm');

  return {
    reminderTime: displayTime,
    reminderTimeLocal: displayTime,
    reminderTimeUTC,
    timezone,
    reminderHour: hour,
    reminderMinute: minute,
    nextSendAt: computeNextSendAt(timezone, hour, minute),
    nextReminderAt: computeNextReminderAt(timezone),
    nextQuestAt: computeNextQuestAt(timezone),
  };
};
