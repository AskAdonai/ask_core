import { buildMorningMessage } from '../messages/morningMessage';
import {
  getJourneyPrayerContent,
  getKnockPrayerContent,
  type ResolvedPrayerContent,
} from './prayerCardService';
import { getFirestore } from 'firebase-admin/firestore';
import type { PrayerCard } from '../types/PrayerCard';
import type { Prayer } from '../types/PrayerTheme';
import type { User } from '../types/User';
import { JOURNEY_STAGE_CONFIG, JourneyStage } from '../types/JourneyStage';

const isPlaceholderUrl = (url?: string): boolean =>
  !url || url.includes('example.com');

export interface MorningDevotionFieldStatus {
  field: string;
  label: string;
  ok: boolean;
  message?: string;
}

export interface MorningDevotionCompleteness {
  ready: boolean;
  fields: MorningDevotionFieldStatus[];
}

export interface MorningDevotionPreviewOptions {
  journeyStage: number;
  journeyDayIndex: number;
  name?: string;
  streak?: number;
  vineStage?: User['vineStage'];
  activeKnockTheme?: string;
  knockPrayerIndex?: number;
}

export interface MorningDevotionPreviewResult {
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  buttonFooter: string;
}

export interface MorningDevotionCardSummary {
  cardId: string;
  journeyStage: number;
  dayIndex: number;
  themeId: string;
  prayerId: string;
  prayerTitle?: string;
  imageUrl?: string;
  morningVoiceNoteUrl?: string;
  devotionLink?: string;
  completeness: MorningDevotionCompleteness;
}

export const assessMorningDevotionCompleteness = (
  card: PrayerCard | null | undefined,
  prayer: Prayer | null | undefined,
): MorningDevotionCompleteness => {
  const fields: MorningDevotionFieldStatus[] = [
    {
      field: 'card',
      label: 'Prayer card exists',
      ok: !!card,
      message: card ? undefined : 'No prayer card for this stage and day',
    },
    {
      field: 'themeId',
      label: 'Theme linked',
      ok: !!card?.themeId,
    },
    {
      field: 'prayerId',
      label: 'Prayer linked',
      ok: !!card?.prayerId,
    },
    {
      field: 'prayer',
      label: 'Linked prayer found',
      ok: !!prayer,
      message: prayer ? undefined : 'Prayer document missing in theme sub-collection',
    },
    {
      field: 'imageUrl',
      label: 'Card image',
      ok: !isPlaceholderUrl(card?.imageUrl),
      message: 'Upload a card image (imageUrl)',
    },
    {
      field: 'prayerText',
      label: 'Prayer body',
      ok: !!prayer?.prayerText?.trim(),
    },
    {
      field: 'reflectionQuestion',
      label: 'Reflection question',
      ok: !!(prayer?.reflectionQuestion?.trim() || card?.journalPrompt?.trim()),
      message: 'Set reflectionQuestion on prayer or journalPrompt on card',
    },
    {
      field: 'listenLink',
      label: 'Listen link',
      ok:
        !isPlaceholderUrl(card?.morningVoiceNoteUrl) ||
        !isPlaceholderUrl(prayer?.declarationAudioUrl),
      message: 'Add morningVoiceNoteUrl or declarationAudioUrl',
    },
    {
      field: 'devotionLink',
      label: 'Video link',
      ok: !isPlaceholderUrl(card?.devotionLink),
      message: 'Optional but recommended for driving users',
    },
  ];

  const requiredReady = fields
    .filter(f => f.field !== 'devotionLink')
    .every(f => f.ok);

  return { ready: requiredReady, fields };
};

const buildPreviewUser = (options: MorningDevotionPreviewOptions): User => {
  const now = new Date();
  return {
    phone: '+10000000000',
    name: options.name ?? 'Friend',
    reminderTime: '06:00',
    reminderTimeLocal: '06:00',
    timezone: 'UTC',
    reminderTimeUTC: '06:00',
    nextSendAt: now,
    nextReminderAt: now,
    nextQuestAt: now,
    lockedUntil: null,
    journeyStage: options.journeyStage as JourneyStage,
    journeyDayIndex: options.journeyDayIndex,
    vineStage: options.vineStage ?? 'Grafted',
    streak: options.streak ?? 1,
    lastActiveDate: '',
    declarationsToday: 0,
    journaledToday: false,
    eveningReminderSentToday: false,
    lastCheckinSent: '',
    paused: false,
    optOutRequestedAt: null,
    dataDeletionScheduledAt: null,
    awaitingJournal: false,
    awaitingKnockSelection: false,
    awaitingOnboardingStep: null,
    awaitingQuestConfirm: false,
    awaitingQuizAnswer: false,
    awaitingDeclarationYes: false,
    awaitingReminderTime: false,
    activeKnockTheme: options.activeKnockTheme ?? '',
    knockPrayerIndex: options.knockPrayerIndex ?? 0,
    questActive: false,
    questWeek: 1,
    questVideoIndex: 0,
    questChaptersLogged: 0,
    currentQuizQuestionIndex: 0,
    currentQuizScore: 0,
    lastMorningDeliveryId: null,
    lastReminderDeliveryId: null,
    lastQuestDeliveryId: null,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
};

export const buildMorningDevotionPreview = async (
  options: MorningDevotionPreviewOptions,
): Promise<{
  preview: MorningDevotionPreviewResult;
  sources: {
    cardId?: string;
    themeId?: string;
    prayerId?: string;
    activeKnockTheme?: string;
  };
  completeness: MorningDevotionCompleteness;
  journeyContent: ResolvedPrayerContent | null;
  themeContent: ResolvedPrayerContent | null;
}> => {
  const journeyContent = await getJourneyPrayerContent(
    options.journeyStage,
    options.journeyDayIndex,
  );

  const activeThemeId = (options.activeKnockTheme ?? '').trim();
  const themeContent = activeThemeId
    ? await getKnockPrayerContent(activeThemeId, options.knockPrayerIndex ?? 0)
    : null;

  const user = buildPreviewUser(options);
  const { text, cloudflareMediaId, audioUrl, videoUrl } = buildMorningMessage(
    user,
    journeyContent,
    themeContent,
  );

  const { morningDevotionButtonFooter } = await import('../messages/morningMessage');

  const completeness = assessMorningDevotionCompleteness(
    journeyContent?.card,
    journeyContent?.prayer,
  );

  return {
    preview: {
      text,
      imageUrl: cloudflareMediaId,
      audioUrl,
      videoUrl,
      buttonFooter: morningDevotionButtonFooter,
    },
    sources: {
      cardId: journeyContent?.card
        ? `stage${options.journeyStage}-day${options.journeyDayIndex}`
        : undefined,
      themeId: journeyContent?.themeId,
      prayerId: journeyContent?.prayerId,
      activeKnockTheme: activeThemeId || undefined,
    },
    completeness,
    journeyContent,
    themeContent,
  };
};

export const listMorningDevotionCards = async (
  journeyStage?: number,
): Promise<{
  cards: MorningDevotionCardSummary[];
  stages: Array<{ stage: number; name: string; requiredDays: number }>;
}> => {
  const db = getFirestore();
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
    db.collection('prayerCards');

  if (journeyStage !== undefined && !Number.isNaN(journeyStage)) {
    query = query.where('journeyStage', '==', journeyStage);
  }

  const snap = await query.get();
  const cards: MorningDevotionCardSummary[] = [];

  for (const doc of snap.docs) {
    const card = doc.data() as PrayerCard;
    const prayerSnap = await db
      .collection('prayerThemes')
      .doc(card.themeId)
      .collection('prayers')
      .doc(card.prayerId)
      .get();

    const prayer = prayerSnap.exists ? (prayerSnap.data() as Prayer) : null;
    const completeness = assessMorningDevotionCompleteness(card, prayer);

    cards.push({
      cardId: doc.id,
      journeyStage: card.journeyStage,
      dayIndex: card.dayIndex,
      themeId: card.themeId,
      prayerId: card.prayerId,
      prayerTitle: prayer?.title,
      imageUrl: card.imageUrl,
      morningVoiceNoteUrl: card.morningVoiceNoteUrl,
      devotionLink: card.devotionLink,
      completeness,
    });
  }

  cards.sort((a, b) =>
    a.journeyStage === b.journeyStage
      ? a.dayIndex - b.dayIndex
      : a.journeyStage - b.journeyStage,
  );

  const stages = Object.entries(JOURNEY_STAGE_CONFIG).map(([stage, config]) => ({
    stage: Number(stage),
    name: config.name,
    requiredDays: config.requiredDays,
  }));

  return { cards, stages };
};
