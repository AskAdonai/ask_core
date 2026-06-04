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
