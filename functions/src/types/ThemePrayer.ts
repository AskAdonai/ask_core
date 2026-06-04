import type { Timestamp } from 'firebase-admin/firestore';

/**
 * prayerThemes/{themeId}/prayers/{prayerId}
 *
 * Individual prayer entries within a reusable prayer theme.
 * Fetched sequentially by index — User.needPrayerIndex tracks the position.
 *
 * prayerId convention: "prayer-{index}" e.g. "prayer-1", "prayer-2"
 */
export interface ThemePrayer {
  title: string;
  prayerText: string;            // full prayer body
  declarationText: string;       // spoken declaration to follow the prayer
  declarationAudioUrl: string;   // audio URL for the declaration
  verse: string;                 // supporting scripture (text only)
  reference: string;             // citation e.g. "John 15:5 (NIV)"
  reflectionQuestion: string;    // one question to sit with
  index: number;                 // 1-based sequence within the theme
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
