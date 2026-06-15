import { DateTime } from 'luxon';

/**
 * Calculates the current quest week based on the global calendar track.
 * Currently uses the standard ISO week of the year (1-53).
 * 
 * If the client decides that "Week 1" starts on a specific launch date 
 * rather than January 1st, this function can be easily updated to calculate 
 * the week offset from that launch date instead.
 */
export const getCurrentCalendarWeek = (timezone: string = 'UTC'): number => {
  const localNow = DateTime.now().setZone(timezone);
  
  // localWeekNumber returns the ISO week of the year (1-53) based on the local timezone
  // For most years, this bounds perfectly to 1-52.
  return localNow.localWeekNumber;
};
