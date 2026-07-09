import { getFirestore } from 'firebase-admin/firestore';
import { sendKnockResponse } from '../../services/twilioService';
import { getPrayerCard } from '../../services/prayerCardService';
import type { User, DailyDeclaration } from '../../types/schemas';
import { DateTime } from 'luxon';
import pino from 'pino';

const logger = pino();

const isPlaceholderAudioUrl = (url?: string): boolean =>
  !url?.trim()
  || url.includes('example.com')
  || /soundhelix\.com/i.test(url)
  || /via\.placeholder\.com/i.test(url);

/**
 * Resolves which journey stage/day SEEK should use for content.
 *
 * Same-day continuity: once a content day is snapshotted for today (first SEEK),
 * later SEEK after YES still serves that day — even if journeyDayIndex already
 * advanced. Next calendar day starts a new snapshot from the live pointer.
 */
export const resolveDeclarationContentPosition = (
  user: Partial<User>,
  todayStr: string,
): { journeyStage: number; journeyDayIndex: number; fromSnapshot: boolean } => {
  const liveStage = user.journeyStage ?? 1;
  const liveDay = user.journeyDayIndex ?? 1;

  if (
    user.declarationContentDate === todayStr
    && Number.isFinite(user.declarationContentStage)
    && Number.isFinite(user.declarationContentDayIndex)
    && (user.declarationContentStage as number) >= 1
    && (user.declarationContentDayIndex as number) >= 1
  ) {
    return {
      journeyStage: user.declarationContentStage as number,
      journeyDayIndex: user.declarationContentDayIndex as number,
      fromSnapshot: true,
    };
  }

  return {
    journeyStage: liveStage,
    journeyDayIndex: liveDay,
    fromSnapshot: false,
  };
};

/**
 * SEEK — declaration flow.
 *
 * Fetches today's declaration text from the journey curriculum (or admin calendar),
 * sends it with optional declaration audio, and enters the YES confirmation loop.
 *
 * Declaration source priority:
 *   1. Calendar-based dailyDeclarations/{YYYY-MM-DD}
 *   2. Journey prayer card's declarationText (+ declarationAudioUrl)
 *   3. Hardcoded fallback (text only)
 *
 * Active KNOCK / targeted-prayer themes are intentionally excluded — those are
 * delivered only through the explicit KNOCK theme flow.
 */
export const deliverDeclaration = async (
  phone: string,
  user: Partial<User> | null
): Promise<void> => {
  if (!user) return;

  const db = getFirestore();
  const userId = phone.replace('+', '');

  let declarationText = '';
  let mediaUrls: string[] = [];

  const timezone = user.timezone || 'UTC';
  const todayStr = DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd');

  const dailyDeclDoc = await db.collection('dailyDeclarations').doc(todayStr).get();

  const contentPosition = resolveDeclarationContentPosition(user, todayStr);

  if (dailyDeclDoc.exists) {
    const data = dailyDeclDoc.data() as DailyDeclaration;
    declarationText = data.declarationText || '';
    if (!isPlaceholderAudioUrl(data.audioUrl)) {
      mediaUrls.push(data.audioUrl!.trim());
    }
  } else {
    const card = await getPrayerCard(
      contentPosition.journeyStage,
      contentPosition.journeyDayIndex,
    );
    if (card?.declarationText?.trim()) {
      declarationText = card.declarationText.trim();
      if (!isPlaceholderAudioUrl(card.declarationAudioUrl)) {
        mediaUrls.push(card.declarationAudioUrl!.trim());
      }
    }
  }

  declarationText = declarationText.trim() || "I declare God's goodness over my life today.";

  await sendKnockResponse(phone, declarationText, mediaUrls);

  const snapshotUpdate: Record<string, unknown> = {
    awaitingDeclarationYes: true,
    updatedAt: new Date(),
  };

  // Snapshot today's content position on first SEEK of the local day so YES
  // advancing journeyDayIndex cannot make a later same-day SEEK jump ahead.
  if (!contentPosition.fromSnapshot) {
    snapshotUpdate.declarationContentDate = todayStr;
    snapshotUpdate.declarationContentStage = contentPosition.journeyStage;
    snapshotUpdate.declarationContentDayIndex = contentPosition.journeyDayIndex;
  }

  await db.collection('users').doc(userId).update(snapshotUpdate);

  logger.info(
    {
      phone,
      journeyStage: contentPosition.journeyStage,
      journeyDayIndex: contentPosition.journeyDayIndex,
      fromSnapshot: contentPosition.fromSnapshot,
      hasAudio: mediaUrls.length > 0,
    },
    'Delivered SEEK declaration and started YES flow',
  );
};
