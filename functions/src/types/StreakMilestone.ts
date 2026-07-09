/**
 * streakMilestones/{milestoneId}
 *
 * Admin-configurable celebration messages fired when a user reaches a streak day count.
 * Independent from the five fixed vine-stage names in utils/vine.ts — admins may add
 * milestones beyond Fruitful (e.g. 100-day, 150-day celebrations).
 */
export interface StreakMilestone {
  milestoneId: string;
  streakDays: number;
  label: string;
  message: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const STREAK_MILESTONES_COLLECTION = 'streakMilestones';
