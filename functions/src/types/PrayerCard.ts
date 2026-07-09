import type { Timestamp } from 'firebase-admin/firestore';
import { JourneyStage } from './JourneyStage';

/**
 * prayerCards/{cardId}
 *
 * Self-contained Morning Devotion content.
 * cardId convention: "stage{n}-day{m}" (legacy) — delivery uses deliveryOrder within stage.
 */
export interface PrayerCard {
  journeyStage: JourneyStage;
  /** Legacy document slot — kept for stable IDs. */
  dayIndex: number;
  /** Delivery sequence within the stage (user journeyDayIndex maps here). */
  deliveryOrder?: number;

  title: string;
  categoryId?: string;

  /**
   * Morning greeting line for this devotion day.
   * Supports `[NAME]` / `{name}` placeholders substituted at send time.
   */
  greeting?: string;

  prayerText: string;
  scriptureText?: string;
  scriptureReference?: string;
  reflectionPrompt?: string;
  declarationText?: string;
  declarationAudioUrl?: string;

  imageUrl: string;
  audioUrl?: string;
  morningVoiceNoteUrl?: string;
  devotionLink?: string;

  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export const resolveScriptureText = (card: PrayerCard | null | undefined): string | undefined =>
  card?.scriptureText?.trim() ||
  (card as { verse?: string } | null | undefined)?.verse?.trim() ||
  undefined;

export const resolveScriptureReference = (card: PrayerCard | null | undefined): string | undefined =>
  card?.scriptureReference?.trim() ||
  (card as { reference?: string } | null | undefined)?.reference?.trim() ||
  undefined;

export const resolveReflectionPrompt = (card: PrayerCard | null | undefined): string | undefined =>
  card?.reflectionPrompt?.trim() ||
  (card as { reflectionQuestion?: string; journalPrompt?: string } | null | undefined)
    ?.reflectionQuestion?.trim() ||
  (card as { journalPrompt?: string } | null | undefined)?.journalPrompt?.trim() ||
  undefined;

/** Substitutes `[NAME]` / `{name}` in card greeting text. */
export const applyGreetingNamePlaceholder = (text: string, name: string): string =>
  text
    .replace(/\[NAME\]/gi, name)
    .replace(/\{name\}/gi, name);

/**
 * Builds the spiritual address line from the devotion card's greeting field.
 * Returns null when the card has no greeting — caller should omit that line.
 */
export const buildCardGreetingAddress = (
  card: PrayerCard | null | undefined,
  name: string,
): string | null => {
  const raw = card?.greeting?.trim();
  if (!raw) return null;

  const hasPlaceholder = /\[NAME\]/i.test(raw) || /\{name\}/i.test(raw);
  if (hasPlaceholder) {
    return applyGreetingNamePlaceholder(raw, name);
  }

  // Plain greeting text without placeholder — prepend name (legacy morning feel).
  return `${name} ${raw}`;
};

export const isPrayerCardDeliverable = (card: PrayerCard | null | undefined): boolean =>
  !!card?.title?.trim() && !!card?.prayerText?.trim();

export const resolveDeliveryOrder = (card: PrayerCard): number =>
  card.deliveryOrder ?? card.dayIndex;
