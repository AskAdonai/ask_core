import { buildMorningMessage } from '../messages/morningMessage';
import {
  getJourneyPrayerContent,
  type ResolvedJourneyDevotion,
} from './prayerCardService';
import { getFirestore } from 'firebase-admin/firestore';
import type { PrayerCard } from '../types/PrayerCard';
import { resolveDeliveryOrder, resolveReflectionPrompt, resolveScriptureText } from '../types/PrayerCard';
import type { User } from '../types/User';
import { JourneyStage } from '../types/JourneyStage';
import { listJourneyStages } from './journeyStageService';

const isPlaceholderUrl = (url?: string): boolean =>
  !url?.trim()
  || url.includes('example.com')
  || /soundhelix\.com/i.test(url)
  || /via\.placeholder\.com/i.test(url);

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
  deliveryOrder: number;
  title?: string;
  categoryId?: string;
  imageUrl?: string;
  morningVoiceNoteUrl?: string;
  devotionLink?: string;
  completeness: MorningDevotionCompleteness;
}

export const assessMorningDevotionCompleteness = (
  card: PrayerCard | null | undefined,
): MorningDevotionCompleteness => {
  const fields: MorningDevotionFieldStatus[] = [
    {
      field: 'card',
      label: 'Prayer card exists',
      ok: !!card,
      message: card ? undefined : 'No prayer card for this stage and day',
    },
    {
      field: 'title',
      label: 'Devotion title',
      ok: !!card?.title?.trim(),
      message: 'Set a title for delivery and list display',
    },
    {
      field: 'categoryId',
      label: 'Category',
      ok: !!card?.categoryId?.trim(),
      message: 'Optional — assign a devotion category',
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
      ok: !!card?.prayerText?.trim(),
    },
    {
      field: 'scriptureText',
      label: 'Scripture text',
      ok: !!resolveScriptureText(card),
      message: 'Optional anchor verse for the devotion body',
    },
    {
      field: 'reflectionPrompt',
      label: 'Reflection prompt',
      ok: !!resolveReflectionPrompt(card),
      message: 'Set the reflection prompt shown after the devotion links',
    },
    {
      field: 'listenLink',
      label: 'Devotion audio',
      ok:
        !isPlaceholderUrl(card?.audioUrl) ||
        !isPlaceholderUrl(card?.morningVoiceNoteUrl),
      message: 'Optional — add audioUrl (R2) for hands-free listening',
    },
    {
      field: 'devotionLink',
      label: 'Video link',
      ok: !isPlaceholderUrl(card?.devotionLink),
      message: 'Optional but recommended for driving users',
    },
  ];

  const requiredReady = fields
    .filter((f) => f.field !== 'devotionLink' && f.field !== 'categoryId')
    .every((f) => f.ok);

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
    lastMilestoneStreakDays: 0,
    graceDaysRemaining: 3,
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
    knockCount: 1,
    knockThemeExhausted: false,
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
    categoryId?: string;
  };
  completeness: MorningDevotionCompleteness;
  journeyContent: ResolvedJourneyDevotion | null;
  themeContent: null;
}> => {
  const journeyContent = await getJourneyPrayerContent(
    options.journeyStage,
    options.journeyDayIndex,
  );

  const user = buildPreviewUser(options);
  const { text, cloudflareMediaId, attachmentAudioUrl, videoUrl } = await buildMorningMessage(
    user,
    journeyContent,
  );

  const { morningDevotionButtonFooter } = await import('../messages/morningMessage');

  const completeness = assessMorningDevotionCompleteness(journeyContent?.card);

  return {
    preview: {
      text,
      imageUrl: cloudflareMediaId,
      audioUrl: attachmentAudioUrl,
      videoUrl,
      buttonFooter: morningDevotionButtonFooter,
    },
    sources: {
      cardId: journeyContent?.card
        ? `stage${options.journeyStage}-day${options.journeyDayIndex}`
        : undefined,
      categoryId: journeyContent?.card?.categoryId,
    },
    completeness,
    journeyContent,
    themeContent: null,
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
    const completeness = assessMorningDevotionCompleteness(card);

    cards.push({
      cardId: doc.id,
      journeyStage: card.journeyStage,
      dayIndex: card.dayIndex,
      deliveryOrder: resolveDeliveryOrder(card),
      title: card.title?.trim() || undefined,
      categoryId: card.categoryId,
      imageUrl: card.imageUrl,
      morningVoiceNoteUrl: card.morningVoiceNoteUrl,
      devotionLink: card.devotionLink,
      completeness,
    });
  }

  cards.sort((a, b) =>
    a.journeyStage === b.journeyStage
      ? a.deliveryOrder - b.deliveryOrder
      : a.journeyStage - b.journeyStage,
  );

  const journeyStages = await listJourneyStages();
  const stages = journeyStages.map((stage) => ({
    stage: stage.stageNumber,
    name: stage.title,
    requiredDays: stage.dayCount,
  }));

  return { cards, stages };
};
