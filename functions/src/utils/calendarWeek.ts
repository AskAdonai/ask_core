import { DateTime } from 'luxon';

/**
 * Global quest cohort week (ISO calendar week, 1–53 in the user's timezone).
 *
 * All active questers receive the same `questContent/{weekNumber}` document.
 * Admins map curriculum onto the calendar by seeding week 1 content at the
 * programme launch week (see `SEED_QUEST_START_WEEK` in seed_quests.ts).
 * New users join the ongoing week — they do not start an individual Week 1 track.
 */
export const getCurrentCalendarWeek = (timezone: string = 'UTC'): number => {
  const localNow = DateTime.now().setZone(timezone);
  return localNow.localWeekNumber;
};
