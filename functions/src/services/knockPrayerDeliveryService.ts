import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { buildKnockPrayerMessage } from '../messages/knockPrayerMessage';
import { sendWhatsAppMessage } from './twilioService';
import type { Prayer } from '../types/PrayerTheme';
import type { User } from '../types/User';
import pino from 'pino';

const logger = pino();

export const KNOCK_DAILY_LIMIT_MESSAGE =
  "You've received today's targeted prayer. Come back tomorrow for the next one — consistency grows the vine. 🌿";

const isPrayerPublished = (prayer: Prayer): boolean =>
  prayer.status === undefined || prayer.status === 'published';

const sortPrayers = (prayers: Array<{ id: string; data: Prayer }>): Array<{ id: string; data: Prayer }> =>
  [...prayers].sort((a, b) => (a.data.index ?? 0) - (b.data.index ?? 0));

export const listThemePrayers = async (themeId: string): Promise<Array<{ id: string; data: Prayer }>> => {
  const db = getFirestore();
  const snapshot = await db.collection('prayerThemes').doc(themeId).collection('prayers').get();
  return sortPrayers(
    snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as Prayer }))
      .filter((entry) => isPrayerPublished(entry.data)),
  );
};

const isPlaceholderUrl = (url?: string): boolean =>
  !url?.trim()
  || url.includes('example.com')
  || /soundhelix\.com/i.test(url)
  || /via\.placeholder\.com/i.test(url);

export const deliverKnockPrayerMessage = async (
  phone: string,
  themeName: string,
  prayer: Prayer,
): Promise<void> => {
  const msg = buildKnockPrayerMessage(themeName, prayer);

  const audioUrl = prayer.audioUrl?.trim();
  const attachmentAudio =
    audioUrl && !isPlaceholderUrl(audioUrl) ? audioUrl : undefined;

  await sendWhatsAppMessage(phone, msg, attachmentAudio ? [attachmentAudio] : undefined);
};

const userDocId = (phone: string): string => phone.replace('+', '');

type LegacyKnockUser = Pick<
  User,
  'knockDeliveredPrayerIds' | 'knockCurrentPrayerId'
>;

type KnockUserSlice = Pick<User, 'timezone' | 'knockCount' | 'lastKnockDate'> & LegacyKnockUser;

/** Resolves knockCount from the user doc, migrating legacy list-based state when needed. */
export const resolveKnockCount = (user: Partial<KnockUserSlice>): number => {
  if (typeof user.knockCount === 'number' && Number.isFinite(user.knockCount) && user.knockCount >= 1) {
    return Math.floor(user.knockCount);
  }

  const delivered = user.knockDeliveredPrayerIds?.length ?? 0;
  const inFlight = user.knockCurrentPrayerId?.trim() ? 1 : 0;
  return Math.max(1, delivered + inFlight);
};

export const getPrayerAtCount = async (
  themeId: string,
  knockCount: number,
): Promise<{ prayerId: string; prayer: Prayer } | null> => {
  const prayers = await listThemePrayers(themeId);
  if (knockCount < 1 || knockCount > prayers.length) return null;
  const entry = prayers[knockCount - 1];
  return entry ? { prayerId: entry.id, prayer: entry.data } : null;
};

export const setKnockThemeExhausted = async (phone: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(userDocId(phone)).update({
    knockThemeExhausted: true,
    updatedAt: new Date(),
  });
};

/**
 * Delivers KNOCK content using a per-user knockCount (1-based position in the theme sequence).
 *
 * - Theme selection resets knockCount to 1 (handled by startKnockSession).
 * - First KNOCK of a local calendar day delivers the prayer at knockCount.
 * - On a new local day, knockCount advances by one before delivery.
 * - Same-day repeat KNOCK holds with a daily-limit message (no multiply).
 * - When knockCount exceeds published prayers, the theme is marked exhausted.
 */
export const deliverNextKnockPrayer = async (
  phone: string,
  themeId: string,
  themeName: string,
  user: Partial<KnockUserSlice>,
): Promise<'delivered' | 'resent' | 'daily_limit' | 'exhausted' | 'none'> => {
  const db = getFirestore();
  const timezone = user.timezone || 'UTC';
  const todayStr = DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd');
  const lastKnockDate = user.lastKnockDate || '';

  if (lastKnockDate === todayStr) {
    const prayers = await listThemePrayers(themeId);
    const knockCount = resolveKnockCount(user);
    const current = prayers[knockCount - 1];
    if (current) {
      await deliverKnockPrayerMessage(phone, themeName, current.data);
      logger.info(
        { phone, themeId, prayerId: current.id, knockCount },
        'KNOCK same-day resend (full content)',
      );
      return 'resent';
    }

    await sendWhatsAppMessage(phone, KNOCK_DAILY_LIMIT_MESSAGE);
    logger.info({ phone, themeId, knockCount }, 'KNOCK daily limit reached — no prayer at position');
    return 'daily_limit';
  }

  let knockCount = resolveKnockCount(user);
  if (lastKnockDate) {
    knockCount += 1;
  }

  const prayers = await listThemePrayers(themeId);
  if (knockCount > prayers.length || prayers.length === 0) {
    await setKnockThemeExhausted(phone);
    await sendWhatsAppMessage(
      phone,
      `You have received all the targeted prayers currently available for *${themeName}*.\n\nWe will let you know when new prayers are added to this theme.`,
    );
    return 'exhausted';
  }

  const current = prayers[knockCount - 1];
  await deliverKnockPrayerMessage(phone, themeName, current.data);
  await db.collection('users').doc(userDocId(phone)).update({
    knockCount,
    lastKnockDate: todayStr,
    knockThemeExhausted: false,
    knockDeliveredPrayerIds: FieldValue.delete(),
    knockCurrentPrayerId: FieldValue.delete(),
    knockCurrentCount: FieldValue.delete(),
    knockPrayerIndex: FieldValue.delete(),
    updatedAt: new Date(),
  });

  logger.info(
    { phone, themeId, prayerId: current.id, knockCount, prayerTotal: prayers.length },
    'KNOCK prayer delivered',
  );
  return 'delivered';
};

export const notifyExhaustedUsersOfNewPrayer = async (themeId: string): Promise<number> => {
  const db = getFirestore();
  const themeDoc = await db.collection('prayerThemes').doc(themeId).get();
  if (!themeDoc.exists) return 0;

  const themeName = (themeDoc.data() as { displayName?: string }).displayName || themeId;
  const snapshot = await db
    .collection('users')
    .where('activeKnockTheme', '==', themeId)
    .where('knockThemeExhausted', '==', true)
    .get();

  let notified = 0;
  for (const doc of snapshot.docs) {
    const phone = (doc.data().phone as string) || `+${doc.id}`;
    await db.collection('users').doc(doc.id).update({
      knockThemeExhausted: false,
      updatedAt: new Date(),
    });
    await sendWhatsAppMessage(
      phone,
      `New targeted prayers are now available for *${themeName}*.\n\nReply *KNOCK* to receive the next prayer in your journey.`,
    );
    notified += 1;
  }

  logger.info({ themeId, notified }, 'Notified exhausted KNOCK users of new prayer content');
  return notified;
};
