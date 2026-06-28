import { getFirestore } from 'firebase-admin/firestore';
import type { PrayerCard } from '../types/PrayerCard';
import type { Prayer } from '../types/schemas';
import pino from 'pino';

export type { PrayerCard };

export interface ResolvedPrayerContent {
  card?: PrayerCard;
  prayer: Prayer;
  themeId: string;
  prayerId?: string;
  source: 'journey' | 'knock';
}

const logger = pino();

/**
 * Fetches the prayer card for a given journey stage and day index.
 * Used by the morning dispatch worker and SEEK declaration flow.
 *
 * Collection path: prayerCards/{id}
 * Query: journeyStage == stage AND dayIndex == day
 */
export const getPrayerCard = async (
  stage: number,
  day: number
): Promise<PrayerCard | null> => {
  const db = getFirestore();
  const snapshot = await db
    .collection('prayerCards')
    .where('journeyStage', '==', stage)
    .where('dayIndex', '==', day)
    .limit(1)
    .get();

  if (snapshot.empty) {
    logger.warn({ stage, day }, 'No prayer card found for stage/day');
    return null;
  }

  return snapshot.docs[0].data() as PrayerCard;
};

/**
 * Legacy helper — fetches by flat "day" number (streak-based).
 * Kept for backward compatibility with workers.ts until migrated.
 * @deprecated Use getPrayerCard(stage, dayIndex) instead.
 */
export const getPrayerCardForDay = async (day: number): Promise<PrayerCard | null> => {
  const db = getFirestore();
  const snapshot = await db
    .collection('prayerCards')
    .where('dayIndex', '==', day)
    .limit(1)
    .get();

  if (snapshot.empty) {
    logger.warn({ day }, 'No prayer card found for day');
    return null;
  }

  return snapshot.docs[0].data() as PrayerCard;
};

/**
 * Fetches a reusable prayer by document ID from a theme.
 */
export const getPrayer = async (
  themeId: string,
  prayerId: string
): Promise<Prayer | null> => {
  const db = getFirestore();
  const doc = await db
    .collection('prayerThemes')
    .doc(themeId)
    .collection('prayers')
    .doc(prayerId)
    .get();

  if (!doc.exists) {
    logger.warn({ themeId, prayerId }, 'No theme prayer found by document ID');
    return null;
  }

  return doc.data() as Prayer;
};

/**
 * Resolves a Journey card to the Prayer it references.
 */
export const getJourneyPrayerContent = async (
  stage: number,
  day: number
): Promise<ResolvedPrayerContent | null> => {
  const card = await getPrayerCard(stage, day);
  if (!card) return null;

  const prayer = await getPrayer(card.themeId, card.prayerId);
  if (!prayer) {
    logger.warn(
      { stage, day, themeId: card.themeId, prayerId: card.prayerId },
      'Journey prayer card references missing theme prayer'
    );
    return null;
  }

  return {
    card,
    prayer,
    themeId: card.themeId,
    prayerId: card.prayerId,
    source: 'journey',
  };
};

/**
 * Fetches a prayer from prayerThemes/{themeId}/prayers sub-collection by index.
 * Returns Prayer or null if not found.
 */
export const getKnockPrayerCard = async (
  themeId: string,
  prayerIndex: number
): Promise<Prayer | null> => {
  const db = getFirestore();
  const snapshot = await db
    .collection('prayerThemes')
    .doc(themeId)
    .collection('prayers')
    .where('index', '==', prayerIndex)
    .limit(1)
    .get();

  if (snapshot.empty) {
    logger.warn({ themeId, prayerIndex }, 'No KNOCK prayer found in prayerThemes sub-collection');
    return null;
  }

  return snapshot.docs[0].data() as Prayer;
};

/**
 * Resolves KNOCK routing from the stored 0-based user position to the next
 * 1-based Prayer.index value.
 */
export const getKnockPrayerContent = async (
  themeId: string,
  knockPrayerIndex: number
): Promise<ResolvedPrayerContent | null> => {
  const prayerIndex = Math.max(0, knockPrayerIndex) + 1;
  const prayer = await getKnockPrayerCard(themeId, prayerIndex);
  if (!prayer) return null;

  return {
    prayer,
    themeId,
    source: 'knock',
  };
};
