import { DateTime } from 'luxon';
import {
  computeStreakOnFirstYes,
  DEFAULT_GRACE_DAYS,
  getEffectiveStreakState,
} from '../src/services/effectiveStreakService';

describe('effectiveStreakService', () => {
  const timezone = 'UTC';

  it('treats yesterday activity as consecutive', () => {
    const yesterday = DateTime.now().setZone(timezone).minus({ days: 1 }).toJSDate();
    const state = getEffectiveStreakState(
      {
        streak: 10,
        vineStage: 'Rooted',
        lastActiveDate: yesterday,
        graceDaysRemaining: DEFAULT_GRACE_DAYS,
      },
      timezone,
    );

    expect(state.continuity).toBe('consecutive');
    expect(state.shouldResetOnNextYes).toBe(false);
    expect(computeStreakOnFirstYes(state, 10)).toEqual({ newStreak: 11, streakReset: false });
  });

  it('continues streak within grace after one missed day', () => {
    const twoDaysAgo = DateTime.now().setZone(timezone).minus({ days: 2 }).toJSDate();
    const state = getEffectiveStreakState(
      {
        streak: 10,
        vineStage: 'Rooted',
        lastActiveDate: twoDaysAgo,
        graceDaysRemaining: DEFAULT_GRACE_DAYS,
      },
      timezone,
    );

    expect(state.continuity).toBe('within_grace');
    expect(state.inactiveDays).toBe(1);
    expect(state.graceDaysRemaining).toBe(2);
    expect(computeStreakOnFirstYes(state, 10)).toEqual({ newStreak: 11, streakReset: false });
  });

  it('requires reset after grace is exhausted', () => {
    const fiveDaysAgo = DateTime.now().setZone(timezone).minus({ days: 5 }).toJSDate();
    const state = getEffectiveStreakState(
      {
        streak: 20,
        vineStage: 'Growing',
        lastActiveDate: fiveDaysAgo,
        graceDaysRemaining: DEFAULT_GRACE_DAYS,
      },
      timezone,
    );

    expect(state.continuity).toBe('grace_exhausted');
    expect(state.effectiveStreak).toBe(0);
    expect(state.shouldResetOnNextYes).toBe(true);
    expect(computeStreakOnFirstYes(state, 20)).toEqual({ newStreak: 1, streakReset: true });
  });

  it('shows stored streak while within grace at read time', () => {
    const threeDaysAgo = DateTime.now().setZone(timezone).minus({ days: 3 }).toJSDate();
    const state = getEffectiveStreakState(
      {
        streak: 8,
        vineStage: 'Rooted',
        lastActiveDate: threeDaysAgo,
        graceDaysRemaining: DEFAULT_GRACE_DAYS,
      },
      timezone,
    );

    expect(state.continuity).toBe('within_grace');
    expect(state.inactiveDays).toBe(2);
    expect(state.effectiveStreak).toBe(8);
  });
});
