import type { Timestamp } from 'firebase-admin/firestore';

/**
 * prayerThemes/{themeId}
 *
 * Prayer categories. Users select a theme via the NEED keyword, and Journey
 * cards reference prayers inside these themes.
 * Prayers live in the sub-collection: prayerThemes/{themeId}/prayers/{prayerId}
 */
export interface PrayerTheme {
  themeId: string;        // matches document ID
  displayName: string;    // shown to user e.g. "Healing", "Financial Breakthrough"
  category: string;       // grouping e.g. "Health", "Finance", "Relationships"
  menuOrder: number;      // sort/order number in the NEED selection menu
  available: boolean;     // false = hidden from menu (upcoming/maintenance)
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// =========================================================
// Prayer entries (subcollection: prayerThemes/{themeId}/prayers)
// =========================================================
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


/**
 * systemConfig/{configId}
 * 
 * Global settings and configuration for the bot.
 * The primary document is typically systemConfig/global.
 */
export interface SystemConfig {
  /**
   * The URL of the image to send when a user requests the NEED menu.
   * If not provided, the bot will fall back to sending a text-based menu.
   */
  needMenuImageUrl?: string;
  
  updatedAt: Date;
}
