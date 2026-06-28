/**
 * Firestore Schema Barrel
 *
 * Re-exports all collection and sub-collection document types.
 *
 * Collection → Type file mapping:
 *
 *   users/{phone}                              → User
 *   users/{phone}/journal/{YYYY-MM-DD}         → JournalEntry
 *   users/{phone}/declarations/{YYYY-MM-DD}    → DeclarationLog
 *   users/{phone}/questLog/{YYYY-MM-DD}        → QuestLog
 *   prayerCards/{cardId}                       → PrayerCard
 *   prayerThemes/{themeId}                     → PrayerTheme
 *   prayerThemes/{themeId}/prayers/{prayerId}  → Prayer
 *   questContent/{weekNumber}                  → QuestContent
 *   milestones/{milestoneId}                   → Milestone
 *   deliveryLogs/{logId}                       → DeliveryLog
 *   dispatchRuns/{runId}                       → DispatchRun
 *   knockMenu/current                          → KnockMenu
 *   systemConfig/{configId}                    → SystemConfig
 *
 * Removed collections (state now inlined on User):
 *   userNeedSessions — merged into User.activeKnockTheme / User.knockPrayerIndex
 *   questProgress    — merged into User.questActive / questWeek / questVideoIndex
 *   quizSessions     — merged into User.currentQuizQuestionIndex / currentQuizScore
 *
 * Opt-out: User.optOutRequestedAt + User.dataDeletionScheduledAt (7-day grace, then purge)
 */

// ── Top-level collections ────────────────────────────────────────────────────
export type { User, PendingUser } from './User';
export type { PrayerCard }     from './PrayerCard';
export type { PrayerTheme, Prayer, SystemConfig } from './PrayerTheme';
export type { KnockMenu } from './KnockMenu';
export type { QuestContent, QuestLog } from './QuestContent';
export type { Milestone }      from './Milestone';
export type { DeliveryLog, DispatchRun } from './DeliveryLog';

// ── Sub-collections ──────────────────────────────────────────────────────────
export type { JournalEntry }   from './JournalEntry';
export type { DeclarationLog } from './DeclarationLog';

// ── Media & Daily Declarations ───────────────────────────────────────────────
export type { Media, MediaCategory } from './Media';
export type { DailyDeclaration } from './DailyDeclaration';
export type { Staff } from './Staff';

// ── Enums ────────────────────────────────────────────────────────────────────
export { JourneyStage, JOURNEY_STAGE_CONFIG } from './JourneyStage';
