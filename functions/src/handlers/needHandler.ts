import { sendWhatsAppMessage } from '../services/twilioService';
import { startNeedSession } from '../services/needSessionService';
import { getFirestore } from 'firebase-admin/firestore';
import type { User } from '../types/schemas';
import type { PrayerTheme } from '../types/PrayerTheme';
import pino from 'pino';

const logger = pino();

// Fallback image URL for the categories list if none provided
const NEED_MENU_IMAGE_URL = 'https://example.com/need-menu.png';

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

  const msg = `What does your heart need today?\n\nReply with a number or theme name to receive targeted prayers and declarations:\n\n1. Healing\n2. Warfare\n10. Finances\n14. Anxiety and Fear\n15. Waiting Seasons`;

  // We send the message
  await sendWhatsAppMessage(phone, msg);
  logger.info({ phone }, 'Triggered NEED selection menu');
};

/**
 * Handles the user's response to the NEED selection menu.
 */
export const handleNeedSelection = async (phone: string, text: string, user: Partial<User> | null) => {
  if (!user) return;

  const db = getFirestore();
  const normalizedText = text.toLowerCase().trim();

  // Fetch all themes to match against
  const themesSnap = await db.collection('prayerThemes').get();
  const themes = themesSnap.docs.map(d => d.data() as PrayerTheme);

  // Try to match by number first, then by name (fuzzy/exact)
  let selectedTheme: PrayerTheme | null = null;

  // Is it a number?
  const isNumber = /^\d+$/.test(normalizedText);
  if (isNumber) {
    const num = parseInt(normalizedText, 10);
    selectedTheme = themes.find(t => t.number === num) || null;
  } else {
    // Try matching name
    selectedTheme = themes.find(t =>
      t.displayName.toLowerCase().includes(normalizedText) ||
      t.category.toLowerCase().includes(normalizedText) ||
      t.themeId.toLowerCase().includes(normalizedText)
    ) || null;
  }

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
      `1. Healing\n2. Warfare\n10. Finances\n14. Anxiety and Fear\n15. Waiting Seasons.\n\n` +
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
