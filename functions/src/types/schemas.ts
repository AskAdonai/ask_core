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
 *   prayerThemes/{themeId}/prayers/{prayerId}  → ThemePrayer
 *   questContent/{weekNumber}                  → QuestContent, QuestQuestion
 *   milestones/{milestoneId}                   → Milestone
 *   deliveryLogs/{logId}                       → DeliveryLog
 *
 * Removed collections (state now inlined on User):
 *   userNeedSessions — merged into User.activeNeedTheme / User.needPrayerIndex
 *   questProgress    — merged into User.questActive / questWeek / questVideoIndex
 *   quizSessions     — merged into User.currentQuizQuestionIndex / currentQuizScore
 */

// ── Top-level collections ────────────────────────────────────────────────────
export type { User }           from './User';
export type { PrayerCard }     from './PrayerCard';
export type { PrayerTheme }    from './PrayerTheme';
export type { QuestContent, QuestQuestion } from './QuestContent';
export type { Milestone }      from './Milestone';
export type { DeliveryLog }    from './DeliveryLog';

// ── Sub-collections ──────────────────────────────────────────────────────────
export type { JournalEntry }   from './JournalEntry';
export type { DeclarationLog } from './DeclarationLog';
export type { QuestLog }       from './QuestLog';
export type { ThemePrayer }    from './ThemePrayer';

// ── Enums ────────────────────────────────────────────────────────────────────
export { JourneyStage, JOURNEY_STAGE_CONFIG } from './JourneyStage';
