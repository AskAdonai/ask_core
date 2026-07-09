/**
 * users/{phone}/streakHistory/{historyId}
 *
 * Shadow record written before a grace-exhaustion streak reset so admins can
 * restore a disputed reset.
 */
export interface StreakHistoryEntry {
  previousStreak: number;
  previousVineStage: string;
  resetAt: Date;
  reason: 'grace_exhausted';
  restoredAt?: Date | null;
}
