export enum JourneyStage {
  BELIEVE = 1,
  STAGE_2 = 2,
  STAGE_3 = 3,
  STAGE_4 = 4,
  STAGE_5 = 5,
  STAGE_6 = 6,
  STAGE_7 = 7,
  STAGE_8 = 8,
  REIGN = 9,
}

export const JOURNEY_STAGE_CONFIG: Record<JourneyStage, { name: string; requiredDays: number }> = {
  [JourneyStage.BELIEVE]: { name: 'Believe', requiredDays: 30 },
  [JourneyStage.STAGE_2]: { name: 'Stage 2', requiredDays: 30 },
  [JourneyStage.STAGE_3]: { name: 'Stage 3', requiredDays: 30 },
  [JourneyStage.STAGE_4]: { name: 'Stage 4', requiredDays: 30 },
  [JourneyStage.STAGE_5]: { name: 'Stage 5', requiredDays: 30 },
  [JourneyStage.STAGE_6]: { name: 'Stage 6', requiredDays: 30 },
  [JourneyStage.STAGE_7]: { name: 'Stage 7', requiredDays: 30 },
  [JourneyStage.STAGE_8]: { name: 'Stage 8', requiredDays: 30 },
  [JourneyStage.REIGN]: { name: 'Reign', requiredDays: 30 },
};
