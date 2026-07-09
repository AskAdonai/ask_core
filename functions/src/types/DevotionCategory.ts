/**
 * devotionCategories/{categoryId}
 *
 * Organizational tags for Morning Devotion cards — independent from KNOCK prayerThemes.
 */
export interface DevotionCategory {
  categoryId: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const DEVOTION_CATEGORIES_COLLECTION = 'devotionCategories';
