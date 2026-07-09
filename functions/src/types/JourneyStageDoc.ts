/**
 * journeyStages/{stageNumber}
 *
 * Flat, extendable journey stage definitions (no curriculum versioning).
 */
export interface JourneyStageDoc {
  stageNumber: number;
  title: string;
  dayCount: number;
  description?: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const JOURNEY_STAGES_COLLECTION = 'journeyStages';

export const JOURNEY_HOLDING_MESSAGE =
  'Your next season of Morning Devotion is being prepared with care. Check back soon — we will meet you here when it is ready. 🙏';

/** Sent when a user's current day has no devotion card document yet. */
export const DEVOTION_DAY_NOT_READY_MESSAGE =
  "Today's devotion isn't ready yet — check back soon. Your journey day will stay right here until it is. 🙏";

export const JOURNEY_NEXT_STAGE_HOLDING_MESSAGE =
  'The next journey stage is not ready yet. Your Quest and Targeted Prayer journeys continue as normal — we will meet you here when the next stage opens. 🙏';
