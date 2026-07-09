import { DateTime } from 'luxon';
import { DEFAULT_GRACE_DAYS } from '../src/services/effectiveStreakService';

describe('grace window timing', () => {
  const timezone = 'UTC';

  it('uses a 3-day grace allowance by default', () => {
    expect(DEFAULT_GRACE_DAYS).toBe(3);
  });

  it('exhausts grace after more than 3 inactive days', async () => {
    const { getEffectiveStreakState } = await import('../src/services/effectiveStreakService');
    const lastActive = DateTime.now().setZone(timezone).minus({ days: 5 }).toJSDate();
    const state = getEffectiveStreakState(
      {
        streak: 4,
        vineStage: 'Grafted',
        lastActiveDate: lastActive,
        graceDaysRemaining: DEFAULT_GRACE_DAYS,
      },
      timezone,
    );

    expect(state.inactiveDays).toBe(4);
    expect(state.graceExhausted).toBe(true);
  });

  it('keeps grace active through exactly 3 inactive days', async () => {
    const { getEffectiveStreakState } = await import('../src/services/effectiveStreakService');
    const lastActive = DateTime.now().setZone(timezone).minus({ days: 4 }).toJSDate();
    const state = getEffectiveStreakState(
      {
        streak: 4,
        vineStage: 'Grafted',
        lastActiveDate: lastActive,
        graceDaysRemaining: DEFAULT_GRACE_DAYS,
      },
      timezone,
    );

    expect(state.inactiveDays).toBe(3);
    expect(state.graceExhausted).toBe(false);
    expect(state.graceDaysRemaining).toBe(0);
  });
});
