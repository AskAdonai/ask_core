import { DateTime } from 'luxon';
import { determineVineStage } from '../utils/vine';
import type { User } from '../types/schemas';

export const DEFAULT_GRACE_DAYS = 3;

export type StreakContinuity =
  | 'first_ever'
  | 'active_today'
  | 'consecutive'
  | 'within_grace'
  | 'grace_exhausted';

export interface EffectiveStreakState {
  storedStreak: number;
  /** Streak value to display before today's YES is recorded. */
  effectiveStreak: number;
  effectiveVineStage: string;
  declaredToday: boolean;
  daysSinceLastActive: number | null;
  /** Full local days missed since last activity (excluding today). */
  inactiveDays: number;
  graceAllowance: number;
  graceDaysRemaining: number;
  graceExhausted: boolean;
  shouldResetOnNextYes: boolean;
  continuity: StreakContinuity;
}

type StreakUserFields = Pick<
  User,
  'streak' | 'vineStage' | 'lastActiveDate' | 'graceDaysRemaining'
>;

export const parseLastActiveToLocal = (
  lastActiveDate: unknown,
  timezone: string,
): DateTime | null => {
  if (!lastActiveDate) return null;

  if (typeof lastActiveDate === 'string') {
    if (!lastActiveDate.trim()) return null;
    const parsed = DateTime.fromISO(lastActiveDate, { zone: timezone });
    return parsed.isValid ? parsed : null;
  }

  if (lastActiveDate instanceof Date) {
    return DateTime.fromJSDate(lastActiveDate).setZone(timezone);
  }

  if (typeof lastActiveDate === 'object' && lastActiveDate !== null && 'toDate' in lastActiveDate) {
    const timestamp = lastActiveDate as { toDate: () => Date };
    return DateTime.fromJSDate(timestamp.toDate()).setZone(timezone);
  }

  return null;
};

/**
 * Lazy read-time derivation of streak, vine stage, and grace status.
 * Single source of truth for VINE display and first-YES-of-day writes.
 */
export const getEffectiveStreakState = (
  user: Partial<StreakUserFields>,
  timezone: string,
  now: DateTime = DateTime.now().setZone(timezone),
): EffectiveStreakState => {
  const storedStreak = user.streak ?? 0;
  const graceAllowance = user.graceDaysRemaining ?? DEFAULT_GRACE_DAYS;
  const storedVineStage = user.vineStage ?? determineVineStage(storedStreak);
  const lastActive = parseLastActiveToLocal(user.lastActiveDate, timezone);

  if (!lastActive?.isValid) {
    return {
      storedStreak,
      effectiveStreak: storedStreak,
      effectiveVineStage: storedVineStage,
      declaredToday: false,
      daysSinceLastActive: null,
      inactiveDays: 0,
      graceAllowance,
      graceDaysRemaining: graceAllowance,
      graceExhausted: false,
      shouldResetOnNextYes: false,
      continuity: 'first_ever',
    };
  }

  const today = now.startOf('day');
  const lastDay = lastActive.startOf('day');
  const daysSinceLastActive = Math.floor(today.diff(lastDay, 'days').days);
  const declaredToday = daysSinceLastActive === 0;

  if (declaredToday) {
    return {
      storedStreak,
      effectiveStreak: storedStreak,
      effectiveVineStage: storedVineStage,
      declaredToday: true,
      daysSinceLastActive: 0,
      inactiveDays: 0,
      graceAllowance,
      graceDaysRemaining: graceAllowance,
      graceExhausted: false,
      shouldResetOnNextYes: false,
      continuity: 'active_today',
    };
  }

  if (daysSinceLastActive === 1) {
    return {
      storedStreak,
      effectiveStreak: storedStreak,
      effectiveVineStage: storedVineStage,
      declaredToday: false,
      daysSinceLastActive,
      inactiveDays: 0,
      graceAllowance,
      graceDaysRemaining: graceAllowance,
      graceExhausted: false,
      shouldResetOnNextYes: false,
      continuity: 'consecutive',
    };
  }

  const inactiveDays = daysSinceLastActive - 1;
  const graceDaysRemaining = Math.max(0, graceAllowance - inactiveDays);
  const graceExhausted = inactiveDays > graceAllowance;

  return {
    storedStreak,
    effectiveStreak: graceExhausted ? 0 : storedStreak,
    effectiveVineStage: graceExhausted ? 'Grafted' : storedVineStage,
    declaredToday: false,
    daysSinceLastActive,
    inactiveDays,
    graceAllowance,
    graceDaysRemaining,
    graceExhausted,
    shouldResetOnNextYes: graceExhausted,
    continuity: graceExhausted ? 'grace_exhausted' : 'within_grace',
  };
};

export const computeStreakOnFirstYes = (
  state: EffectiveStreakState,
  storedStreak: number,
): { newStreak: number; streakReset: boolean } => {
  if (state.declaredToday) {
    throw new Error('Cannot compute first-YES streak when already declared today');
  }

  if (state.continuity === 'first_ever') {
    return { newStreak: 1, streakReset: false };
  }

  if (state.continuity === 'grace_exhausted') {
    return { newStreak: 1, streakReset: true };
  }

  if (
    state.continuity === 'consecutive' ||
    state.continuity === 'within_grace'
  ) {
    return { newStreak: storedStreak + 1, streakReset: false };
  }

  return { newStreak: storedStreak + 1, streakReset: false };
};
