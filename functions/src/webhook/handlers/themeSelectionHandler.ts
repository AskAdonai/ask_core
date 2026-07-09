import { sendKnockThemeConfirmMessage, sendWhatsAppMessage } from '../../services/twilioService';
import { startKnockSession, clearKnockSession, getActiveKnockTheme } from '../../services/knockSessionService';
import { deliverNextKnockPrayer } from '../../services/knockPrayerDeliveryService';
import {
  DEFAULT_KNOCK_MENU_INSTRUCTION,
  getKnockMenuDisplay,
  KNOCK_UNAVAILABLE_IN_COUNTRY_MESSAGE,
} from '../../services/knockMenuService';
import { getFirestore } from 'firebase-admin/firestore';
import type { User } from '../../types/schemas';
import type { PrayerTheme } from '../../types/PrayerTheme';
import pino from 'pino';

const logger = pino();

const normalizeThemeText = (value: string): string =>
  value.toLowerCase().replace(/[^\w\s]|_/g, '').replace(/\s+/g, ' ').trim();

const themeMatchValues = (theme: PrayerTheme): string[] => [
  theme.displayName,
  theme.category,
  theme.themeId,
].map(normalizeThemeText).filter(Boolean);

export const findThemeMatch = (
  themes: PrayerTheme[],
  rawText: string
): PrayerTheme | null => {
  const normalizedText = normalizeThemeText(rawText);
  if (!normalizedText) return null;

  if (/^\d+$/.test(normalizedText)) {
    const num = parseInt(normalizedText, 10);
    return themes.find(t => t.menuOrder === num) || null;
  }

  if (normalizedText.length < 2) return null;

  return themes.find(theme => {
    const values = themeMatchValues(theme);

    if (values.includes(normalizedText)) {
      return true;
    }

    return values.some(value =>
      value
        .split(/\s+/)
        .some(word => word.length >= 2 && word.startsWith(normalizedText))
    );
  }) || null;
};

const buildTextMenuFallback = (themes: PrayerTheme[]): string => {
  const menu = themes
    .map(theme => `${theme.menuOrder}. ${theme.displayName}`)
    .join('\n');

  return (
    `${DEFAULT_KNOCK_MENU_INSTRUCTION}\n\n` +
    `Reply with a number or theme name:\n\n${menu}`
  );
};

const getAvailableKnockThemes = async (): Promise<PrayerTheme[]> => {
  const themesSnap = await getFirestore().collection('prayerThemes').get();
  return themesSnap.docs
    .map(d => d.data() as PrayerTheme)
    .filter(t => t.available)
    .sort((a, b) => a.menuOrder - b.menuOrder);
};

/** Sends the KNOCK theme menu — image + instruction when configured, else text list. */
export const sendKnockThemeMenu = async (
  phone: string,
  instructionOverride?: string,
): Promise<boolean> => {
  const { imageUrl, instruction } = await getKnockMenuDisplay();
  const body = instructionOverride ?? instruction;
  const themes = await getAvailableKnockThemes();

  if (!imageUrl && themes.length === 0) {
    await sendWhatsAppMessage(phone, KNOCK_UNAVAILABLE_IN_COUNTRY_MESSAGE);
    logger.info({ phone }, 'KNOCK menu unavailable — no image or themes for user region');
    return false;
  }

  if (imageUrl) {
    await sendWhatsAppMessage(phone, body, [imageUrl]);
    return true;
  }

  await sendWhatsAppMessage(phone, buildTextMenuFallback(themes));
  return true;
};

/** KNOCK — delivers the next targeted prayer or opens the theme selection menu. */
export const triggerThemeSelection = async (phone: string, user: Partial<User> | null) => {
  if (!user) return;

  const activeTheme = user.activeKnockTheme;
  if (activeTheme && !user.knockThemeExhausted) {
    const db = getFirestore();
    const themeDoc = await db.collection('prayerThemes').doc(activeTheme).get();
    const themeName = (themeDoc.data() as PrayerTheme | undefined)?.displayName || activeTheme;
    await deliverNextKnockPrayer(
      phone,
      activeTheme,
      themeName,
      user,
    );
    logger.info({ phone, theme: activeTheme }, 'Delivered next KNOCK prayer for active theme');
    return;
  }

  const menuSent = await sendKnockThemeMenu(phone);
  if (!menuSent) {
    return;
  }

  const db = getFirestore();
  const userId = phone.replace('+', '');

  await db.collection('users').doc(userId).update({
    awaitingKnockSelection: true,
  });

  logger.info({ phone }, 'Triggered KNOCK theme selection menu');
};

/** Handles the user's reply to the KNOCK theme selection menu. */
export const handleThemeSelection = async (phone: string, text: string, user: Partial<User> | null) => {
  if (!user) return;

  const db = getFirestore();
  const userId = phone.replace('+', '');
  const themesSnap = await db.collection('prayerThemes').get();
  const themes = themesSnap.docs.map(d => d.data() as PrayerTheme);
  const availableThemes = themes.filter(t => t.available);

  if (availableThemes.length === 0) {
    await db.collection('users').doc(userId).update({ awaitingKnockSelection: false });
    await sendWhatsAppMessage(phone, KNOCK_UNAVAILABLE_IN_COUNTRY_MESSAGE);
    logger.info({ phone }, 'KNOCK theme selection aborted — no available themes');
    return;
  }

  const selectedTheme = findThemeMatch(themes, text);

  if (!selectedTheme) {
    await sendKnockThemeMenu(
      phone,
      "I didn't recognize that theme.\n\nPlease reply with a *number* or *theme name* from the menu above.\n\nType *RESET* to cancel.",
    );
    return;
  }

  if (!selectedTheme.available) {
    await sendKnockThemeMenu(
      phone,
      `The "${selectedTheme.displayName}" theme is coming soon. Please choose an available theme from the menu above.`,
    );
    return;
  }

  await startKnockSession(phone, selectedTheme.themeId);

  await deliverNextKnockPrayer(
    phone,
    selectedTheme.themeId,
    selectedTheme.displayName,
    {
      timezone: user.timezone,
      knockCount: 1,
      lastKnockDate: '',
    },
  );

  await sendKnockThemeConfirmMessage(phone, {
    themeName: selectedTheme.displayName,
  });
  logger.info({ phone, theme: selectedTheme.themeId }, 'User selected KNOCK theme');
};

/** Clears the active targeted-prayer theme without unsubscribing from ASK. */
export const handleLeaveKnockTheme = async (phone: string, user: Partial<User> | null) => {
  if (!user) return;

  const activeTheme = await getActiveKnockTheme(phone);
  if (!activeTheme) {
    await sendWhatsAppMessage(
      phone,
      `You do not have an active targeted-prayer theme right now. Reply *KNOCK* to browse themes.`,
    );
    return;
  }

  await clearKnockSession(phone);
  await sendWhatsAppMessage(
    phone,
    `Your targeted-prayer theme has been cleared. Your daily ASK journey continues as normal.\n\nReply *KNOCK* anytime to choose a new theme.`,
  );
  logger.info({ phone, theme: activeTheme }, 'User left active KNOCK theme');
};

export { DEFAULT_KNOCK_MENU_INSTRUCTION, KNOCK_UNAVAILABLE_IN_COUNTRY_MESSAGE } from '../../services/knockMenuService';
