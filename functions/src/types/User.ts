import { JourneyStage } from './JourneyStage';

/**
 * users/{phoneNumber}
 *
 * Core user document. The document ID IS the phone number (E.164, e.g. +2348012345678).
 * All KNOCK and Quest state lives here — no separate collections for runtime state.
 *
 * Sub-collections:
 *   users/{phone}/journal/{YYYY-MM-DD}        → JournalEntry
 *   users/{phone}/declarations/{YYYY-MM-DD}   → DeclarationLog
 *   users/{phone}/streakHistory/{historyId}      → StreakHistoryEntry
 */
export interface User {
  // ── Identity ────────────────────────────────────────────────────────────────
  phone: string;           // stored redundantly for Twilio sends (mirrors doc ID)
  name: string;

  // ── Scheduling ──────────────────────────────────────────────────────────────
  reminderTime: string;          // user-facing local "HH:mm" (e.g. "06:00")
  reminderTimeLocal: string;     // FlutterFlow alias — same value as reminderTime
  timezone: string;              // IANA tz string (e.g. "Africa/Lagos")
  reminderTimeUTC: string;       // dispatch index bucket "HH:MM" in UTC — REQUIRED for scheduler

  // ── Operational scheduling timestamps ─────────────────────────────────────
  // Kept for the dispatcher range-query fallback and reconcileStuckJobs.
  nextSendAt: Date;         // next morning card delivery timestamp
  nextReminderAt: Date;     // next evening nudge timestamp
  nextQuestAt: Date;        // next Quest delivery timestamp (5 PM local)
  lockedUntil: Date | null; // execution lease — null when not being processed

  // ── Journey Progress ───────────────────────────────────────────────────────
  journeyStage: JourneyStage; // 1-based stage index into journeyStages
  journeyDayIndex: number;       // delivery slot within current stage (maps to card deliveryOrder)
  vineStage: 'Grafted' | 'Rooted' | 'Growing' | 'Blooming' | 'Fruitful';
  streak: number;                // consecutive daily engagement days
  /** Highest streakMilestones.streakDays celebration already sent to this user. */
  lastMilestoneStreakDays: number;
  /** Full grace-day allowance; effective remaining is computed lazily from lastActiveDate. */
  graceDaysRemaining: number;

  // ── Daily State ────────────────────────────────────────────────────────────
  lastActiveDate: string;        // "YYYY-MM-DD" in user's local timezone
  declarationsToday: number;     // how many times they've declared today
  journaledToday: boolean;
  eveningReminderSentToday: boolean;
  lastCheckinSent: string;       // "YYYY-MM-DD" of last inactivity check-in

  // ── Control Flags ──────────────────────────────────────────────────────────
  paused: boolean;
  /** Set when the user opts out (STOP). Messages stop immediately. */
  optOutRequestedAt: Date | null;
  /** User data is permanently deleted after this timestamp (opt-out + 7 days). */
  dataDeletionScheduledAt: Date | null;
  awaitingJournal: boolean;
  awaitingKnockSelection: boolean;
  awaitingOnboardingStep: 'name' | 'timezone' | 'time' | null;
  awaitingQuestConfirm: boolean;
  awaitingQuizAnswer: boolean;
  awaitingDeclarationYes: boolean;
  awaitingReminderTime: boolean;

  // ── SEEK same-day content snapshot ─────────────────────────────────────────
  /**
   * Content day keyed to the user's first SEEK of a local calendar day.
   * Survives journeyDayIndex advancing on YES so same-day repeat SEEK stays on
   * today's declaration (multiply continuity) rather than tomorrow's card.
   */
  declarationContentDate?: string;       // "YYYY-MM-DD" in user TZ
  declarationContentStage?: number;
  declarationContentDayIndex?: number;

  // ── KNOCK Prayer State ─────────────────────────────────────────────────────
  // Inline (no separate userNeedSessions collection).
  activeKnockTheme: string;      // themeId or "" when no active KNOCK session
  /**
   * 1-based position in the active theme's ordered prayer sequence.
   * Resets to 1 when the user selects a theme; advances on the first KNOCK of each new local day.
   */
  knockCount: number;
  /** True when the user has received all currently available prayers for activeKnockTheme. */
  knockThemeExhausted: boolean;
  /** Local "YYYY-MM-DD" of the last KNOCK delivery. */
  lastKnockDate?: string;
  /** @deprecated Legacy list-based tracking — migrated to knockCount on read. */
  knockDeliveredPrayerIds?: string[];
  /** @deprecated Legacy in-flight prayer pointer — migrated to knockCount on read. */
  knockCurrentPrayerId?: string;
  /** @deprecated Legacy same-day multiply counter — no longer used. */
  knockCurrentCount?: number;
  /** @deprecated Legacy index field — use knockCount. */
  knockPrayerIndex?: number;

  // ── Quest State ────────────────────────────────────────────────────────────
  // Inline (no separate questProgress collection).
  questActive: boolean;
  questWeek: number;             // synced to global calendar week while questActive
  questVideoIndex: number;       // 0-2 within the week (Mon/Wed/Fri)
  questChaptersLogged: number;   // running total of self-logged chapters

  // ── Quiz State (ephemeral — cleared on completion) ─────────────────────────
  currentQuizQuestionIndex: number;  // 0-based position in quizQuestions array
  currentQuizScore: number;          // correct answers so far

  // ── Pub/Sub Idempotency ────────────────────────────────────────────────────
  // Each dispatcher embeds a UUID delivery token in the Pub/Sub payload.
  // Workers reject (ack without processing) any message whose token matches
  // the one already stored here, preventing double-sends on Pub/Sub retries.
  lastMorningDeliveryId: string | null;    // UUID of the last processed morning send
  lastReminderDeliveryId: string | null;   // UUID of the last processed reminder send
  lastQuestDeliveryId: string | null;      // UUID of the last processed quest send

  // ── Metadata ───────────────────────────────────────────────────────────────
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Minimal user document created while onboarding is still in progress.
 * The full User shape is only guaranteed after the time step finalises.
 */
export interface PendingUser {
  userId?: string;
  phone: string;
  name?: string;
  timezone?: string;
  awaitingOnboardingStep: 'name' | 'timezone' | 'time';
  createdAt: Date;
  updatedAt: Date;
}
