import type { ResolvedJourneyDevotion } from '../services/prayerCardService';
import {
  buildCardGreetingAddress,
  resolveReflectionPrompt,
  resolveScriptureReference,
  resolveScriptureText,
} from '../types/PrayerCard';
import type { User } from '../types/User';

const isPlaceholderUrl = (url?: string): boolean =>
  !url?.trim()
  || url.includes('example.com')
  || /soundhelix\.com/i.test(url)
  || /via\.placeholder\.com/i.test(url);

/**
 * Generates the morning devotion message sent by the morning cron worker.
 * Journey curriculum only — never merges active KNOCK / targeted-prayer content.
 *
 * Greeting comes from the devotion card's `greeting` field (not a separate pool).
 */
export interface MorningMessagePayload {
  text: string;
  cloudflareMediaId?: string;
  videoUrl?: string;
  /** R2 audio URL — delivered as a WhatsApp media attachment, not embedded in text. */
  attachmentAudioUrl?: string;
}

const resolveReflection = (journeyContent: ResolvedJourneyDevotion | null): string =>
  resolveReflectionPrompt(journeyContent?.card) ||
  'What is one thing God is speaking to you in this season?';

const resolveDevotionLinks = (
  journeyContent: ResolvedJourneyDevotion | null,
): { videoUrl?: string; attachmentAudioUrl?: string } => {
  const card = journeyContent?.card;

  const videoUrl = !isPlaceholderUrl(card?.devotionLink) ? card!.devotionLink : undefined;

  let attachmentAudioUrl: string | undefined;
  if (!isPlaceholderUrl(card?.audioUrl)) {
    attachmentAudioUrl = card!.audioUrl;
  } else if (!isPlaceholderUrl(card?.morningVoiceNoteUrl)) {
    attachmentAudioUrl = card!.morningVoiceNoteUrl;
  }

  return { videoUrl, attachmentAudioUrl };
};

const buildDevotionLinksSection = (videoUrl?: string): string => {
  let section =
    `Here is today's devotion and prayer\n` +
    `Here is a link to listen and read along to today's devotion.\n`;

  if (videoUrl) {
    section += `If you prefer a video : ${videoUrl}\n`;
  }

  return section;
};

const buildReflectionSection = (reflection: string): string =>
  `\nReflect: ${reflection}\n` +
  `Sit with that question today. You don't need to answer it now.\n\n`;

export const morningDeclarationCta =
  `When you are ready for our scripture declaration send *SEEK* — make today's declaration / *JOURNAL* — reflect in writing / *VINE* — check my growth`;

/** Quick-reply button labels (≤20 chars, no _ * ~ { } or newlines). */
export const morningDevotionQuickActions = {
  seek: 'Seek',
  journal: 'Journal',
  vine: 'Vine',
} as const;

export const morningDevotionButtonFooter =
  `• *${morningDevotionQuickActions.seek}* — make today's declaration\n` +
  `• *${morningDevotionQuickActions.journal}* — reflect in writing\n` +
  `• *${morningDevotionQuickActions.vine}* — check my growth`;

export const sanitizeMorningBodyForWhatsAppTemplate = (body: string): string =>
  body
    .replace(/[*_~{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const buildMorningTemplateVariables = (body: string): Record<string, string> => ({
  '1': sanitizeMorningBodyForWhatsAppTemplate(body),
});

export const buildMorningMessage = async (
  user: User,
  journeyContent: ResolvedJourneyDevotion | null,
): Promise<MorningMessagePayload> => {
  const name = user.name || 'Friend';
  const streak = user.streak ?? 0;
  const vineStage = user.vineStage || 'Grafted';
  const reflection = resolveReflection(journeyContent);
  const { videoUrl, attachmentAudioUrl } = resolveDevotionLinks(journeyContent);

  const card = journeyContent?.card;
  const greetingLine = buildCardGreetingAddress(card, name);

  let header = `Good morning\n`;
  if (greetingLine) {
    header += `${greetingLine}\n`;
  }
  header += `\nYou are ${vineStage}.\n` + `Streak: ${streak} days.\n\n`;

  if (!card?.title?.trim() || !card?.prayerText?.trim()) {
    return {
      text:
        header +
        buildDevotionLinksSection(videoUrl) +
        buildReflectionSection(reflection) +
        morningDeclarationCta,
      videoUrl,
      attachmentAudioUrl,
    };
  }

  const scriptureText = resolveScriptureText(card);
  const scriptureReference = resolveScriptureReference(card);
  const anchorVerse = scriptureText
    ? `_${scriptureText}_\n— ${scriptureReference || ''}`
    : '';

  let text = header + `*${card.title.trim()}*\n\n`;

  if (anchorVerse) {
    text += `${anchorVerse}\n\n`;
  }

  text += `${card.prayerText.trim()}\n\n`;
  text +=
    buildDevotionLinksSection(videoUrl) +
    buildReflectionSection(reflection) +
    morningDeclarationCta;

  return {
    text,
    videoUrl,
    attachmentAudioUrl,
  };
};

export const buildMorningTemplateBody = async (
  user: User,
  journeyContent: ResolvedJourneyDevotion | null,
): Promise<MorningMessagePayload> => {
  const payload = await buildMorningMessage(user, journeyContent);
  const ctaSuffix = morningDeclarationCta;
  const text = payload.text.endsWith(ctaSuffix)
    ? payload.text.slice(0, -ctaSuffix.length).trimEnd()
    : payload.text;

  return { ...payload, text };
};
