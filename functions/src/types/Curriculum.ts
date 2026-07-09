/**
 * curriculumVersions/{version}/stages/{stageNumber}
 *
 * Per-version journey stage definitions. Stage titles and day counts are
 * fully independent between versions.
 */
export interface CurriculumStage {
  stageNumber: number;
  title: string;
  dayCount: number;
  active?: boolean;
  updatedAt?: Date;
}

export const CURRICULUM_VERSIONS_COLLECTION = 'curriculumVersions';
export const CURRICULUM_STAGES_SUBCOLLECTION = 'stages';

export const JOURNEY_HOLDING_MESSAGE =
  'Your next season of Morning Devotion is being prepared with care. Check back soon — we will meet you here when it is ready. 🙏';
