/**
 * prayerCards/{cardId}
 *
 * Journey devotion content. Indexed by journeyStage + dayIndex.
 * Fetched by SEEK and the morning send worker.
 *
 * cardId convention: "stage{n}-day{m}" e.g. "stage1-day3"
 */
export interface PrayerCard {
  journeyStage: number;          // 1-9  (Believe → Reign)
  dayIndex: number;              // day within the stage (1-based)

  // ── Content ──────────────────────────────────────────────────────────────
  theme: string;                 // thematic label (e.g. "Trust", "Surrender")
  themeId: string;               // ID linking to a specific theme (e.g. "believe", "healing")
  verse: string;                 // scripture text
  reference: string;             // citation e.g. "John 15:5 (NIV)"
  devotionText: string;          // full written devotion body
  devotionLink: string;          // YouTube / audio link rendered in chat
  reflectionQuestion: string;    // one question to sit with

  // ── KNOCK content ─────────────────────────────────────────────────────────
  declarationText: string;       // spoken declaration shown on KNOCK
  declarationAudioUrl: string;   // audio URL for the declaration (optional link)

  // ── JOURNAL prompt ────────────────────────────────────────────────────────
  journalPrompt: string;         // prompt shown when user replies JOURNAL
}
