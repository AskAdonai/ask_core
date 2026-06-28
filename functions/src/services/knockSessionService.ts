import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();

/**
 * KNOCK session state is stored inline on the User document.
 * These helpers read/write User.activeKnockTheme and User.knockPrayerIndex.
 */

const readActiveKnockTheme = (data: FirebaseFirestore.DocumentData): string | null => {
  const theme = (data.activeKnockTheme ?? data.activeNeedTheme) as string;
  return theme && theme !== '' ? theme : null;
};

const readKnockPrayerIndex = (data: FirebaseFirestore.DocumentData): number =>
  (data.knockPrayerIndex ?? data.needPrayerIndex ?? 0) as number;

/** Returns the active KNOCK theme ID, or null if no active session. */
export const getActiveKnockTheme = async (phone: string): Promise<string | null> => {
  const db = getFirestore();
  const doc = await db.collection('users').doc(phone.replace('+', '')).get();
  if (!doc.exists) return null;
  return readActiveKnockTheme(doc.data()!);
};

/** Starts a KNOCK session by setting activeKnockTheme and resetting the index. */
export const startKnockSession = async (phone: string, themeId: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(phone.replace('+', '')).update({
    activeKnockTheme: themeId,
    knockPrayerIndex: 0,
    awaitingKnockSelection: false,
    updatedAt: new Date(),
  });
  logger.info({ phone, themeId }, 'KNOCK session started on user doc');
};

/** Advances the KNOCK prayer index. */
export const advanceKnockSession = async (phone: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(phone.replace('+', '')).update({
    knockPrayerIndex: FieldValue.increment(1),
    updatedAt: new Date(),
  });
};

/** Clears the KNOCK session. */
export const clearKnockSession = async (phone: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(phone.replace('+', '')).update({
    activeKnockTheme: '',
    knockPrayerIndex: 0,
    updatedAt: new Date(),
  });
  logger.info({ phone }, 'KNOCK session cleared');
};

export { readActiveKnockTheme, readKnockPrayerIndex };
