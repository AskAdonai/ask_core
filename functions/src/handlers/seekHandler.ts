import { sendWhatsAppMessage } from '../services/twilioService';
import { getJourneyPrayerContent, getNeedPrayerContent } from '../services/prayerCardService';
import { getActiveNeedTheme } from '../services/needSessionService';
import type { User } from '../types/schemas';
import type { ResolvedPrayerContent } from '../services/prayerCardService';
import pino from 'pino';

const logger = pino();

// ─────────────────────────────────────────────────────────────────────────────
// Fallback content when Firestore has no card yet
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_REFLECTION = `What is one thing God is speaking to you in this season?`;

const FALLBACK_MESSAGE = (name: string) =>
  `📖 *Today's Devotion — ${name}*\n\n` +
  `Your daily devotion content is being prepared. Stay with Him today. 🙏\n\n` +
  `_Reflect:_ ${FALLBACK_REFLECTION}\n\n` +
  `Sit with that question today. When you are ready, send *KNOCK* to make today's declaration.\n\n` +
  `• *KNOCK* — make today's declaration\n• *JOURNAL* — reflect in writing\n• *VINE* — check my growth`;

// ─────────────────────────────────────────────────────────────────────────────
// SEEK — main handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles the SEEK keyword.
 *
 * Routing logic:
 *   1. If the user has an active NEED session, fetch NEED content only.
 *   2. Otherwise resolve the user's Journey card into its referenced prayer.
 *   3. No repeat guard — users may re-read at any time.
 */
export const deliverDevotion = async (
  phone: string,
  user: Partial<User> | null
): Promise<void> => {
  if (!user || !user.name) {
    await sendWhatsAppMessage(
      phone,
      `Please join ASK first by typing *ASK*. 🙏`
    );
    return;
  }

  const name = user.name;
  const stage = user.journeyStage ?? 1;
  const dayIndex = user.journeyDayIndex ?? 1;
  const activeThemeId = await getActiveNeedTheme(phone);

  const content = activeThemeId
    ? await getNeedPrayerContent(activeThemeId, user.needPrayerIndex ?? 0)
    : await getJourneyPrayerContent(stage, dayIndex);

  if (!content) {
    // Graceful fallback — content not seeded yet
    logger.warn({ phone, stage, dayIndex, activeThemeId }, 'No prayer content found — sending fallback');
    await sendWhatsAppMessage(phone, FALLBACK_MESSAGE(name));
    if (activeThemeId) {
      const { clearNeedSession } = await import('../services/needSessionService');
      await clearNeedSession(phone);
    }
    return;
  }

  const mediaUrls: string[] = [];
  if (content.card?.imageUrl) {
    mediaUrls.push(content.card.imageUrl);
  }
  if (content.card?.morningVoiceNoteUrl) {
    mediaUrls.push(content.card.morningVoiceNoteUrl);
  }

  let devotionMessage = buildSeekMessage(name, content);

  await sendWhatsAppMessage(phone, devotionMessage, mediaUrls.length > 0 ? mediaUrls : undefined);

  if (content.source === 'need') {
    const { advanceNeedSession } = await import('../services/needSessionService');
    await advanceNeedSession(phone);
  }

  logger.info({ phone, stage, dayIndex, source: content.source, mediaCount: mediaUrls.length }, 'SEEK devotion delivered');
};

const buildSeekMessage = (name: string, content: ResolvedPrayerContent): string => {
  const { prayer, card } = content;
  const header = content.source === 'need'
    ? `🙏 *Your NEED Prayer — ${content.themeId}*`
    : `📖 *Today's Devotion — ${name}*`;

  let message =
    `${header}\n\n` +
    `_${prayer.verse}_\n— ${prayer.reference}\n\n` +
    `${prayer.prayerText}\n\n`;

  if (card?.devotionLink) {
    message += `🎥 *Watch / Listen:* ${card.devotionLink}\n\n`;
  }

  const reflection = prayer.reflectionQuestion || FALLBACK_REFLECTION;
  message +=
    `_Reflect:_ ${reflection}\n\n` +
    `Sit with that question today. You don't need to answer it now.\n\n` +
    `When you are ready for today's declaration, send *KNOCK*.\n\n` +
    `• *KNOCK* — make today's declaration\n` +
    `• *JOURNAL* — reflect in writing\n` +
    `• *VINE* — check my growth`;

  return message;
};
