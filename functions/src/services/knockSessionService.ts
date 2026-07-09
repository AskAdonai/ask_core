import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();

/**
 * KNOCK session state is stored inline on the User document.
 * These helpers read/write User.activeKnockTheme and User.knockCount.
 */

const readActiveKnockTheme = (data: FirebaseFirestore.DocumentData): string | null => {
  const theme = (data.activeKnockTheme ?? data.activeNeedTheme) as string;
  return theme && theme !== '' ? theme : null;
};

const readKnockCount = (data: FirebaseFirestore.DocumentData): number => {
  if (typeof data.knockCount === 'number' && data.knockCount >= 1) {
    return Math.floor(data.knockCount);
  }
  const delivered = Array.isArray(data.knockDeliveredPrayerIds) ? data.knockDeliveredPrayerIds.length : 0;
  const inFlight = data.knockCurrentPrayerId ? 1 : 0;
  return Math.max(1, delivered + inFlight);
};

/** Returns the active KNOCK theme ID, or null if no active session. */
export const getActiveKnockTheme = async (phone: string): Promise<string | null> => {
  const db = getFirestore();
  const doc = await db.collection('users').doc(phone.replace('+', '')).get();
  if (!doc.exists) return null;
  return readActiveKnockTheme(doc.data()!);
};

/** Starts a KNOCK session by setting activeKnockTheme and resetting delivery state. */
export const startKnockSession = async (phone: string, themeId: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(phone.replace('+', '')).update({
    activeKnockTheme: themeId,
    knockCount: 1,
    knockThemeExhausted: false,
    lastKnockDate: '',
    knockDeliveredPrayerIds: FieldValue.delete(),
    knockCurrentPrayerId: FieldValue.delete(),
    knockCurrentCount: FieldValue.delete(),
    knockPrayerIndex: FieldValue.delete(),
    awaitingKnockSelection: false,
    updatedAt: new Date(),
  });
  logger.info({ phone, themeId }, 'KNOCK session started on user doc');
};

/** Clears the KNOCK session. */
export const clearKnockSession = async (phone: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(phone.replace('+', '')).update({
    activeKnockTheme: '',
    knockCount: 1,
    knockThemeExhausted: false,
    lastKnockDate: '',
    knockDeliveredPrayerIds: FieldValue.delete(),
    knockCurrentPrayerId: FieldValue.delete(),
    knockCurrentCount: FieldValue.delete(),
    knockPrayerIndex: FieldValue.delete(),
    awaitingKnockSelection: false,
    updatedAt: new Date(),
  });
  logger.info({ phone }, 'KNOCK session cleared');
};

export { readActiveKnockTheme, readKnockCount };
