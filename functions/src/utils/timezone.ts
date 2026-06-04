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

import { parsePhoneNumber } from 'libphonenumber-js';

export const TIMEZONE_MAP: Record<string, string> = {
  NG: 'Africa/Lagos',
  GH: 'Africa/Accra',
  KE: 'Africa/Nairobi',
  ZA: 'Africa/Johannesburg',
  ET: 'Africa/Addis_Ababa',
  TZ: 'Africa/Dar_es_Salaam',
  UG: 'Africa/Kampala',
  US: 'America/New_York',
  CA: 'America/Toronto',
  BR: 'America/Sao_Paulo',
  GB: 'Europe/London',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  IN: 'Asia/Kolkata',
  PK: 'Asia/Karachi',
  BD: 'Asia/Dhaka',
  AU: 'Australia/Sydney',
};

export const computeUserScheduleFields = (
  phone: string,
  hour: number,
  minute: number,
  displayTime: string,
  existingTimezone?: string
) => {
  const phoneParsed = parsePhoneNumber(phone);
  const timezone = existingTimezone || (phoneParsed?.country && TIMEZONE_MAP[phoneParsed.country]) || 'UTC';

  const reminderTimeUTC = new Date(
    new Date().setUTCHours(hour, minute, 0, 0)
  ).toISOString();

  return {
    reminderTime: displayTime,
    reminderTimeLocal: displayTime,
    reminderTimeUTC,
    timezone,
    reminderHour: hour,
    reminderMinute: minute,
    nextSendAt: computeNextSendAt(timezone, hour, minute),
    nextReminderAt: computeNextReminderAt(timezone),
  };
};
