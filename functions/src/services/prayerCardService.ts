import { getFirestore } from 'firebase-admin/firestore';
import pino from 'pino';
import type { PrayerCard } from '../types/PrayerCard';
import { isPrayerCardDeliverable } from '../types/PrayerCard';
import type { Prayer } from '../types/schemas';

export type { PrayerCard };

export interface ResolvedJourneyDevotion {
  card: PrayerCard;
  source: 'journey';
}

export interface ResolvedKnockPrayerContent {
  prayer: Prayer;
  themeId: string;
  prayerId?: string;
  source: 'knock';
}

export type ResolvedPrayerContent = ResolvedJourneyDevotion | ResolvedKnockPrayerContent;

const logger = pino();

function isPrayerPublished(prayer: Prayer): boolean {
  return prayer.status !== 'draft';
}

/**
 * Resolves the devotion card for a user's position within a journey stage.
 * `day` is the user's journeyDayIndex — maps to deliveryOrder (admin-reorderable).
 */
export const getPrayerCard = async (
  stage: number,
  day: number,
): Promise<PrayerCard | null> => {
  const db = getFirestore();

  const byDeliveryOrder = await db
    .collection('prayerCards')
    .where('journeyStage', '==', stage)
    .where('deliveryOrder', '==', day)
    .limit(1)
    .get();

  if (!byDeliveryOrder.empty) {
    return byDeliveryOrder.docs[0].data() as PrayerCard;
  }

  const legacySnapshot = await db
    .collection('prayerCards')
    .where('journeyStage', '==', stage)
    .where('dayIndex', '==', day)
    .limit(1)
    .get();

  if (!legacySnapshot.empty) {
    return legacySnapshot.docs[0].data() as PrayerCard;
  }

  logger.warn({ stage, day }, 'No prayer card found for stage/delivery slot');
  return null;
};

/** @deprecated Use getPrayerCard(stage, dayIndex) instead. */
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

export const getPrayer = async (themeId: string, prayerId: string): Promise<Prayer | null> => {
  if (!themeId?.trim() || !prayerId?.trim()) {
    logger.warn({ themeId, prayerId }, 'Invalid theme/prayer id — skipping Firestore lookup');
    return null;
  }

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

  const prayer = doc.data() as Prayer;
  if (!isPrayerPublished(prayer)) {
    logger.warn({ themeId, prayerId }, 'Theme prayer is draft and not deliverable');
    return null;
  }

  return prayer;
};

export const getJourneyPrayerContent = async (
  stage: number,
  day: number,
): Promise<ResolvedJourneyDevotion | null> => {
  const card = await getPrayerCard(stage, day);
  if (!card) return null;

  if (!isPrayerCardDeliverable(card)) {
    logger.warn(
      { stage, day, cardId: `stage${stage}-day${day}` },
      'Journey devotion card is missing title or prayer body',
    );
    return null;
  }

  return { card, source: 'journey' };
};

export const getKnockPrayerCard = async (
  themeId: string,
  prayerIndex: number,
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

  const prayer = snapshot.docs[0].data() as Prayer;
  if (!isPrayerPublished(prayer)) {
    logger.warn({ themeId, prayerIndex }, 'KNOCK prayer is draft and not deliverable');
    return null;
  }

  return prayer;
};

export const getKnockPrayerContent = async (
  themeId: string,
  knockPrayerIndex: number,
): Promise<ResolvedKnockPrayerContent | null> => {
  const prayerIndex = Math.max(0, knockPrayerIndex) + 1;
  const prayer = await getKnockPrayerCard(themeId, prayerIndex);
  if (!prayer) return null;

  return { prayer, themeId, source: 'knock' };
};
