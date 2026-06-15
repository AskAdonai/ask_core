import { sendWhatsAppMessage } from '../../services/twilioService';
import { startNeedSession } from '../../services/needSessionService';
import { getFirestore } from 'firebase-admin/firestore';
import type { User } from '../../types/schemas';
import type { PrayerTheme } from '../../types/PrayerTheme';
import pino from 'pino';

const logger = pino();

// Fallback image URL for the categories list if none provided

const normalizeNeedText = (value: string): string =>
  value.toLowerCase().replace(/[^\w\s]|_/g, '').replace(/\s+/g, ' ').trim();

const themeMatchValues = (theme: PrayerTheme): string[] => [
  theme.displayName,
  theme.category,
  theme.themeId,
].map(normalizeNeedText).filter(Boolean);

export const findNeedThemeMatch = (
  themes: PrayerTheme[],
  rawText: string
): PrayerTheme | null => {
  const normalizedText = normalizeNeedText(rawText);
  if (!normalizedText) return null;

  if (/^\d+$/.test(normalizedText)) {
    const num = parseInt(normalizedText, 10);
    return themes.find(t => t.menuOrder === num) || null;
  }

  // Avoid one-letter accidental matches like "T" selecting the first theme
  // that happens to contain the letter.
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

/**
 * Triggers the NEED selection flow.
 * Sends the image and sets the user into awaitingNeedSelection state.
 */
export const triggerNeedSelection = async (phone: string, user: Partial<User> | null) => {
  if (!user) return;

  const db = getFirestore();

  // Set user state to awaiting selection
  await db.collection('users').doc(phone.replace('+', '')).update({
    awaitingNeedSelection: true,
  });

  const themesSnap = await db.collection('prayerThemes').get();
  const themes = themesSnap.docs
    .map(d => d.data() as PrayerTheme)
    .filter(t => t.available)
    .sort((a, b) => a.menuOrder - b.menuOrder);
  const menu = themes
    .map(theme => `${theme.menuOrder}. ${theme.displayName}`)
    .join('\n');

  // Fetch the dynamic image URL from the database
  const configSnap = await db.collection('systemConfig').doc('global').get();
  const systemConfig = configSnap.exists ? configSnap.data() as import('../../types/PrayerTheme').SystemConfig : null;
  const menuImageUrl = systemConfig?.needMenuImageUrl;

  const msg = menuImageUrl
    ? `What does your heart need today?\n\nReply with a number to receive targeted prayers and declarations.`
    : `What does your heart need today?\n\nReply with a number or theme name to receive targeted prayers and declarations:\n\n${menu}`;

  const mediaUrls = menuImageUrl ? [menuImageUrl] : undefined;

  // We send the message with the image (if configured)
  await sendWhatsAppMessage(phone, msg, mediaUrls);
  logger.info({ phone, sentImage: !!mediaUrls }, 'Triggered NEED selection menu');
};

/**
 * Handles the user's response to the NEED selection menu.
 */
export const handleNeedSelection = async (phone: string, text: string, user: Partial<User> | null) => {
  if (!user) return;

  const db = getFirestore();

  // Fetch all themes to match against
  const themesSnap = await db.collection('prayerThemes').get();
  const themes = themesSnap.docs.map(d => d.data() as PrayerTheme);

  const selectedTheme = findNeedThemeMatch(themes, text);

  // If no theme matched
  if (!selectedTheme) {
    await sendWhatsAppMessage(phone, "I didn't recognize that theme. Please reply with a valid number from 1 to 20, or type *RESET* to cancel.");
    return; // Do not clear the state, let them try again
  }

  // If the theme is "Coming Soon" (available: false)
  if (!selectedTheme.available) {
    await sendWhatsAppMessage(
      phone,
      `The "${selectedTheme.displayName}" theme is coming soon! Currently available themes are:\n` +
      themes
        .filter(theme => theme.available)
        .sort((a, b) => a.menuOrder - b.menuOrder)
        .map(theme => `${theme.menuOrder}. ${theme.displayName}`)
        .join('\n') +
      `\n\n` +
      `Please reply with an available number.`
    );
    return; // Do not clear the state, let them try again
  }

  // Theme is valid and available! Start the session.
  await startNeedSession(phone, selectedTheme.themeId);

  const confirmMsg =
    `${selectedTheme.displayName}. I am bringing you targeted prayers for this season.\n\n` +
    `Your next SEEK content will carry these prayers. Your journey continues alongside. Type NEED anytime to change your focus.\n\n` +
    `• *SEEK* — today's prayer\n` +
    `• *KNOCK* — declare it\n` +
    `• *VINE* — my growth`;

  await sendWhatsAppMessage(phone, confirmMsg);
  logger.info({ phone, theme: selectedTheme.themeId }, 'User selected NEED theme');
};
