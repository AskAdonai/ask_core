import {
  DEFAULT_STREAK_MILESTONES,
  getNewlyReachedMilestones,
  formatMilestoneMessage,
} from '../src/services/streakMilestoneService';

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(async () => ({ empty: true, docs: [] })),
      })),
    })),
  })),
}));

describe('streakMilestoneService', () => {
  it('uses default milestones when Firestore collection is empty', async () => {
    const reached = await getNewlyReachedMilestones(0, 7);
    expect(reached).toHaveLength(1);
    expect(reached[0].label).toBe('Rooted');
  });

  it('fires each milestone only once across crossings', async () => {
    const first = await getNewlyReachedMilestones(0, 21);
    expect(first.map((m) => m.streakDays)).toEqual([7, 14, 21]);

    const second = await getNewlyReachedMilestones(21, 22);
    expect(second).toEqual([]);
  });

  it('fires 70/100 celebrations without implying another vine transition', async () => {
    const reached = await getNewlyReachedMilestones(30, 100);
    expect(reached.map((m) => m.streakDays)).toEqual([70, 100]);
    expect(reached.every((m) => m.label.includes('Fruitful'))).toBe(true);
  });

  it('includes admin-extended milestones from defaults', () => {
    expect(DEFAULT_STREAK_MILESTONES.some((m) => m.streakDays === 100)).toBe(true);
  });

  it('references the milestone label in celebration copy', () => {
    const growing = DEFAULT_STREAK_MILESTONES.find((m) => m.streakDays === 14)!;
    const message = formatMilestoneMessage(growing, 'Grace');
    expect(message).toContain('*Growing*');
    expect(message).toContain('14 days');
  });
});
