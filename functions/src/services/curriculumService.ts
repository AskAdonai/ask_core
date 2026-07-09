/**
 * @deprecated Use journeyStageService — curriculum versioning removed.
 * Re-exports kept for gradual migration of import sites.
 */
export {
  listJourneyStages as listCurriculumStages,
  getJourneyStage as getCurriculumStage,
  getMaxStageNumber,
  areJourneyStagesReady as isJourneyVersionReady,
  buildJourneyCompletionMessage,
  getJourneyHoldingMessage,
  logMissingJourneyStages as logMissingCurriculumVersion,
} from './journeyStageService';
