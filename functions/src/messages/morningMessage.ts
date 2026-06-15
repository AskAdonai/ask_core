import { getMorningGreetingFrame } from '../utils/spiritualTitles';
import type { ResolvedPrayerContent } from '../services/prayerCardService';
import type { User } from '../types/User';

/**
 * Generates the morning message string based on the user's progress and the day's content.
 * 
 * Morning message anatomy:
 * - Time-sensitive greeting
 * - Personalised spiritual address (Title, Promise, or God's Voice based on day)
 * - Vine stage and streak
 * - Theme for the day
 * - Anchor verse
 * - Voice note (handled outside this function via media array)
 * - Call to action
 */
export interface MorningMessagePayload {
  text: string;
  cloudflareMediaId?: string; // To be updated later with Cloudflare R2 Media ID
  audioUrl?: string;          // Resolved public URL from Cloudflare
}

export const buildMorningMessage = (user: User, content: ResolvedPrayerContent | null): MorningMessagePayload => {
  const name = user.name || 'Friend';
  const streak = user.streak ?? 0;
  const frame = getMorningGreetingFrame(streak);
  const vineStage = user.vineStage || 'Grafted';

  const greeting = `Good morning`;

  let spiritualAddress = '';
  if (frame.type === 'title') {
    spiritualAddress = `${name} ${frame.text}`;
  } else if (frame.type === 'promise') {
    spiritualAddress = `${name} ${frame.text}`;
  } else if (frame.type === 'gods_voice') {
    spiritualAddress = `${name} "${frame.text}"`;
  }

  const vineAndStreak = `You are ${vineStage}. Streak: ${streak} days.`;

  // Placeholders for Cloudflare R2 integration
  let cloudflareMediaId: string | undefined = frame.audioId;
  let audioUrl: string | undefined;

  if (!content || !content.prayer) {
    return {
      text: `${greeting}\n${spiritualAddress}\n${vineAndStreak}\n\nIt's time for your daily devotional. Send *SEEK* to read today's word. 🙏`,
      cloudflareMediaId,
    };
  }

  const { prayer, card } = content;
  // If a prayer title isn't set, default to capitalised themeId
  const themePhrase = prayer.title || (content.themeId.charAt(0).toUpperCase() + content.themeId.slice(1));
  const anchorVerse = `_${prayer.verse}_\n— ${prayer.reference}`;
  const callToAction = `Send *SEEK* to read today's word.`;

  // If the frame explicitly defines an audioId, we assume it's the direct URL for now.
  // When Cloudflare integration is complete, this is where we will resolve the ID to a public URL.
  if (frame.audioId) {
    audioUrl = frame.audioId;
  } else if (card && card.morningVoiceNoteUrl) {
    audioUrl = card.morningVoiceNoteUrl;
  }

  return {
    text: `${greeting}\n${spiritualAddress}\n${vineAndStreak}\n\n*${themePhrase}*\n\n${anchorVerse}\n\n${callToAction}`,
    audioUrl,
    cloudflareMediaId,
  };
};
