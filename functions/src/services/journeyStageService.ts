import { getFirestore } from 'firebase-admin/firestore';
import { JOURNEY_STAGE_CONFIG, JourneyStage } from '../types/JourneyStage';
import {
  JOURNEY_HOLDING_MESSAGE,
  JOURNEY_NEXT_STAGE_HOLDING_MESSAGE,
  DEVOTION_DAY_NOT_READY_MESSAGE,
  JOURNEY_STAGES_COLLECTION,
  type JourneyStageDoc,
} from '../types/JourneyStageDoc';
import pino from 'pino';

const logger = pino();

const fallbackStages = (): JourneyStageDoc[] =>
  Object.entries(JOURNEY_STAGE_CONFIG).map(([stageKey, config]) => ({
    stageNumber: Number(stageKey),
    title: config.name,
    dayCount: config.requiredDays,
    active: true,
  }));

export const listJourneyStages = async (): Promise<JourneyStageDoc[]> => {
  const db = getFirestore();
  const snapshot = await db
    .collection(JOURNEY_STAGES_COLLECTION)
    .orderBy('stageNumber', 'asc')
    .get();

  if (snapshot.empty) {
    return fallbackStages();
  }

  return snapshot.docs.map((doc) => doc.data() as JourneyStageDoc);
};

export const getJourneyStage = async (stageNumber: number): Promise<JourneyStageDoc | null> => {
  const db = getFirestore();
  const doc = await db.collection(JOURNEY_STAGES_COLLECTION).doc(String(stageNumber)).get();

  if (doc.exists) {
    return doc.data() as JourneyStageDoc;
  }

  const fallback = JOURNEY_STAGE_CONFIG[stageNumber as JourneyStage];
  if (!fallback) return null;

  return {
    stageNumber,
    title: fallback.name,
    dayCount: fallback.requiredDays,
    active: true,
  };
};

/** Clamps journeyDayIndex to [1, stage.dayCount] using live journeyStages data. */
export const clampJourneyDayToStage = async (
  stageNumber: number,
  dayIndex: number,
): Promise<number> => {
  const stage = await getJourneyStage(stageNumber);
  const maxDay = stage?.dayCount ?? 1;
  const normalized = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 1;
  return Math.min(Math.max(1, normalized), maxDay);
};

export const getMaxStageNumber = async (): Promise<number> => {
  const stages = await listJourneyStages();
  if (stages.length === 0) return JourneyStage.REIGN;
  return Math.max(...stages.map((stage) => stage.stageNumber));
};

export const areJourneyStagesReady = async (): Promise<boolean> => {
  const stages = await listJourneyStages();
  return stages.length > 0;
};

export const buildJourneyCompletionMessage = (stageTitle: string): string =>
  `You have completed *${stageTitle}* — the final journey stage currently available.\n\n` +
  `${JOURNEY_NEXT_STAGE_HOLDING_MESSAGE}`;

export const getJourneyHoldingMessage = (): string => JOURNEY_HOLDING_MESSAGE;

export const getDevotionDayNotReadyMessage = (): string => DEVOTION_DAY_NOT_READY_MESSAGE;

export const logMissingJourneyStages = (userId: string): void => {
  logger.warn({ userId }, 'No journey stages configured');
};

// Backward-compatible aliases during transition
export const listCurriculumStages = async (_version?: number) => listJourneyStages();
export const getCurriculumStage = async (_version: number | undefined, stageNumber: number) =>
  getJourneyStage(stageNumber);
export const isJourneyVersionReady = async (_version?: number) => areJourneyStagesReady();
export const logMissingCurriculumVersion = (_version: number, userId: string) =>
  logMissingJourneyStages(userId);
