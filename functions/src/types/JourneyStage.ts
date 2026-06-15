export enum JourneyStage {
  BELIEVE = 1,
  ABIDE = 2,
  YIELD = 3,
  ARISE = 4,
  RETURN = 5,
  RENEW = 6,
  FLOURISH = 7,
  ADVANCE = 8,
  REIGN = 9,
}

export interface JourneyStageConfig {
  name: string;
  description: string;
  subtitle: string;
  requiredDays: number;
}

export const JOURNEY_STAGE_CONFIG: Record<JourneyStage, JourneyStageConfig> = {
  [JourneyStage.BELIEVE]: {
    name: 'Believe',
    description: 'New beginnings, rebuilding and strengthening faith',
    subtitle: 'The door opens',
    requiredDays: 20
  },
  [JourneyStage.ABIDE]: {
    name: 'Abide',
    description: 'Abiding in Christ, intimacy with the Holy Spirit, nourishment in the Word',
    subtitle: 'Roots go down',
    requiredDays: 30
  },
  [JourneyStage.YIELD]: {
    name: 'Yield',
    description: "Submission to God's will, obedience, being led by God, guided growth",
    subtitle: 'The will surrenders',
    requiredDays: 35
  },
  [JourneyStage.ARISE]: {
    name: 'Arise',
    description: 'Boldness, reawakening, readiness',
    subtitle: 'The spirit wakes up',
    requiredDays: 45
  },
  [JourneyStage.RETURN]: {
    name: 'Return',
    description: 'Repentance, finding our way back to God as King and Father',
    subtitle: 'The prodigal comes home',
    requiredDays: 60
  },
  [JourneyStage.RENEW]: {
    name: 'Renew',
    description: 'Restoration, recovery, rebuilding and renewing connection with God',
    subtitle: 'The old becomes new',
    requiredDays: 80
  },
  [JourneyStage.FLOURISH]: {
    name: 'Flourish',
    description: 'Fullness, fruitfulness, answered prayers',
    subtitle: 'The fruit appears',
    requiredDays: 100
  },
  [JourneyStage.ADVANCE]: {
    name: 'Advance',
    description: 'Spiritual warfare, spiritual advancement',
    subtitle: 'The warrior steps forward',
    requiredDays: 110
  },
  [JourneyStage.REIGN]: {
    name: 'Reign',
    description: 'Reigning with Christ, eternal purpose',
    subtitle: 'The heir takes their place',
    requiredDays: 130
  },
};
