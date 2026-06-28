import { getMorningGreetingFrame } from '../utils/spiritualTitles';
import type { ResolvedPrayerContent } from '../services/prayerCardService';
import type { User } from '../types/User';

const isPlaceholderUrl = (url?: string): boolean =>
  !url || url.includes('example.com');

/**
 * Generates the morning devotion message sent by the morning cron worker.
 * Includes full prayer text and verse, plus listen/video links for users on the go.
 */
export interface MorningMessagePayload {
  text: string;
  cloudflareMediaId?: string;
  videoUrl?: string;
  audioUrl?: string;
}

export const readActiveThemeId = (user: Partial<User>): string =>
  (user.activeKnockTheme ?? '').trim();

const buildSpiritualAddress = (name: string, streak: number): string => {
  const frame = getMorningGreetingFrame(streak);
  if (frame.type === 'gods_voice') {
    return `${name} "${frame.text}"`;
  }
  return `${name} ${frame.text}`;
};

const resolveReflection = (
  journeyContent: ResolvedPrayerContent | null,
  themeContent?: ResolvedPrayerContent | null,
): string =>
  journeyContent?.prayer?.reflectionQuestion ||
  journeyContent?.card?.journalPrompt ||
  themeContent?.prayer?.reflectionQuestion ||
  'What is one thing God is speaking to you in this season?';

const resolveDevotionLinks = (
  journeyContent: ResolvedPrayerContent | null,
  themeContent?: ResolvedPrayerContent | null,
): { videoUrl?: string; audioUrl?: string } => {
  const card = journeyContent?.card;
  const journeyPrayer = journeyContent?.prayer;
  const themePrayer = themeContent?.prayer;

  const videoUrl = !isPlaceholderUrl(card?.devotionLink) ? card!.devotionLink : undefined;

  let audioUrl: string | undefined;
  if (!isPlaceholderUrl(card?.morningVoiceNoteUrl)) {
    audioUrl = card!.morningVoiceNoteUrl;
  } else if (!isPlaceholderUrl(journeyPrayer?.declarationAudioUrl)) {
    audioUrl = journeyPrayer!.declarationAudioUrl;
  } else if (!isPlaceholderUrl(themePrayer?.declarationAudioUrl)) {
    audioUrl = themePrayer!.declarationAudioUrl;
  }

  return { videoUrl, audioUrl };
};

const buildDevotionLinksSection = (audioUrl?: string, videoUrl?: string): string => {
  let section =
    `Here is today's devotion and prayer\n` +
    `Here is a link to listen and read along to today's devotion.\n`;

  if (audioUrl) {
    section += `${audioUrl}\n`;
  }

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

export const morningDevotionButtonFooter =
  `• *SEEK* — make today's declaration\n` +
  `• *JOURNAL* — reflect in writing\n` +
  `• *VINE* — check my growth`;

export const buildMorningMessage = (
  user: User,
  journeyContent: ResolvedPrayerContent | null,
  themeContent?: ResolvedPrayerContent | null,
): MorningMessagePayload => {
  const name = user.name || 'Friend';
  const streak = user.streak ?? 0;
  const frame = getMorningGreetingFrame(streak);
  const vineStage = user.vineStage || 'Grafted';
  const spiritualAddress = buildSpiritualAddress(name, streak);
  const reflection = resolveReflection(journeyContent, themeContent);
  const { videoUrl, audioUrl } = resolveDevotionLinks(journeyContent, themeContent);

  const journeyPrayer = journeyContent?.prayer;
  const themePrayer = themeContent?.prayer;
  const displayPrayer = journeyPrayer ?? themePrayer;

  const header =
    `Good morning\n` +
    `${spiritualAddress}\n\n` +
    `You are ${vineStage}.\n` +
    `Streak: ${streak} days.\n\n`;

  if (!displayPrayer) {
    return {
      text:
        header +
        buildDevotionLinksSection(audioUrl, videoUrl) +
        buildReflectionSection(reflection) +
        morningDeclarationCta,
      videoUrl,
      audioUrl,
      cloudflareMediaId: frame.audioId,
    };
  }

  const themeId = journeyContent?.themeId || themeContent?.themeId || 'today';
  const themePhrase =
    displayPrayer.title ||
    themeId.charAt(0).toUpperCase() + themeId.slice(1);

  const anchorVerse = displayPrayer.verse
    ? `_${displayPrayer.verse}_\n— ${displayPrayer.reference}`
    : '';

  let text = header + `*${themePhrase}*\n\n`;

  if (anchorVerse) {
    text += `${anchorVerse}\n\n`;
  }

  text += `${displayPrayer.prayerText}\n\n`;

  const showAdditionalThemePrayer =
    themePrayer &&
    journeyPrayer &&
    themePrayer !== journeyPrayer;

  if (showAdditionalThemePrayer) {
    const themeAudio = !isPlaceholderUrl(themePrayer.declarationAudioUrl)
      ? themePrayer.declarationAudioUrl
      : undefined;

    text +=
      `*Additional prayer — ${themePrayer.title}*\n\n` +
      `${themePrayer.prayerText}\n\n`;

    if (themeAudio) {
      text += `For audio: ${themeAudio}\n\n`;
    }
  }

  text +=
    buildDevotionLinksSection(audioUrl, videoUrl) +
    buildReflectionSection(reflection) +
    morningDeclarationCta;

  return {
    text,
    videoUrl,
    audioUrl,
    cloudflareMediaId: frame.audioId,
  };
};
