

/**
 * users/{phoneNumber}
 *
 * Core user document. The document ID IS the phone number (E.164, e.g. +2348012345678).
 * All NEED and Quest state lives here — no separate collections for runtime state.
 *
 * Sub-collections:
 *   users/{phone}/journal/{YYYY-MM-DD}        → JournalEntry
 *   users/{phone}/declarations/{YYYY-MM-DD}   → DeclarationLog
 *   users/{phone}/questLog/{YYYY-MM-DD}       → QuestLog
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
  lockedUntil: Date | null; // execution lease — null when not being processed

  // ── Journey Progress ───────────────────────────────────────────────────────
  journeyStage: import('./JourneyStage').JourneyStage; // 1-9  (Believe → Reign)
  journeyDayIndex: number;       // day within current stage (1-based)
  vineStage: 'Grafted' | 'Rooted' | 'Growing' | 'Blooming' | 'Fruitful';
  streak: number;                // consecutive daily engagement days

  // ── Daily State ────────────────────────────────────────────────────────────
  lastActiveDate: string;        // "YYYY-MM-DD" in user's local timezone
  declarationsToday: number;     // how many times they've declared today
  journaledToday: boolean;
  eveningReminderSentToday: boolean;
  lastCheckinSent: string;       // "YYYY-MM-DD" of last inactivity check-in

  // ── Control Flags ──────────────────────────────────────────────────────────
  paused: boolean;
  awaitingJournal: boolean;
  awaitingNeedSelection: boolean;
  awaitingOnboardingStep: 'name' | 'time' | null;
  awaitingQuestConfirm: boolean;
  awaitingQuizAnswer: boolean;
  awaitingDeclarationYes: boolean;
  awaitingReminderTime: boolean;

  // ── NEED Prayer State ──────────────────────────────────────────────────────
  // Inline (no separate userNeedSessions collection).
  activeNeedTheme: string;       // themeId or "" when no active NEED session
  needPrayerIndex: number;       // index within prayerThemes/{themeId}/prayers

  // ── Quest State ────────────────────────────────────────────────────────────
  // Inline (no separate questProgress collection).
  questActive: boolean;
  questWeek: number;             // current week (1-52)
  questVideoIndex: number;       // 0-2 within the week (Mon/Wed/Fri)
  questChaptersLogged: number;   // running total of self-logged chapters

  // ── Quiz State (ephemeral — cleared on completion) ─────────────────────────
  currentQuizQuestionIndex: number;  // 0-based position in quizQuestions array
  currentQuizScore: number;          // correct answers so far

  // ── Metadata ───────────────────────────────────────────────────────────────
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
