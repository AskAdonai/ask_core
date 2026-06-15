import type { Timestamp } from 'firebase-admin/firestore';
import { JourneyStage } from './JourneyStage';

/**
 * prayerCards/{cardId}
 *
 * Journey routing card. Indexed by journeyStage + dayIndex.
 * Prayer content is resolved from prayerThemes/{themeId}/prayers/{prayerId}.
 *
 * cardId convention: "stage{n}-day{m}" e.g. "stage1-day3"
 */
export interface PrayerCard {
  // ── Journey Mapping ─────────────────────────────────────────────────────────
  journeyStage: JourneyStage; // Ties to User.journeyStage
  dayIndex: number;              // Ties to User.journeyDayIndex within the stage (1-based)

  themeId: string;               // ID linking to a specific theme (e.g. "believe", "healing")
  prayerId: string;              // ID of the prayer inside prayerThemes/{themeId}/prayers

  imageUrl: string;              // image shown with the Journey prayer card
  morningVoiceNoteUrl: string;   // optional morning ASK voice note link
  devotionLink: string;          // YouTube / audio link rendered in chat

  // ── JOURNAL prompt ────────────────────────────────────────────────────────
  journalPrompt: string;         // prompt shown when user replies JOURNAL

  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
