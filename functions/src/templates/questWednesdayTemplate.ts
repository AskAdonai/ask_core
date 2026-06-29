import type { QuestWednesdayPayload } from '../services/twilioService';

/**
 * Twilio Content Template: ask_quest_wednesday
 *
 * Type: Text (no quick-reply buttons).
 * Variables match sendQuestWednesday() in twilioService.ts.
 *
 * Env: TWILIO_CONTENT_SID_QUEST_WEDNESDAY
 */
export const questWednesdayTemplateBody =
  'Hello *{{Name}}*.\n\n' +
  'Here is your second video for Week *{{WeekNumber}}*.\n\n' +
  "Today's reading covers *{{ReadingPortion}}*.\n\n" +
  '*{{WednesdaySummary}}*.\n\n' +
  'Watch here: {{VideoLink}}.\n\n' +
  'Please set aside about *{{EstimatedTime}}* for this session.\n\n' +
  '{{SignOff}}.';

export const questWednesdayContentTemplate = {
  friendly_name: 'ask_quest_wednesday',
  language: 'en',
  types: {
    'twilio/text': {
      body: questWednesdayTemplateBody,
    },
  },
} as const;

export const buildQuestWednesdayTemplateVariables = (
  payload: QuestWednesdayPayload,
): Record<string, string> => ({
  Name: payload.name,
  WeekNumber: String(payload.weekNumber),
  ReadingPortion: payload.readingPortion,
  WednesdaySummary: payload.wednesdaySummary,
  VideoLink: payload.videoLink,
  EstimatedTime: payload.estimatedTime,
  SignOff: payload.signOff,
});

/**
 * Static sample values for Twilio WhatsApp template approval.
 * Paste variable samples from questWednesdayApprovalSample when submitting.
 */
export const questWednesdayApprovalSample: QuestWednesdayPayload = {
  name: 'Friend',
  weekNumber: 1,
  readingPortion: 'Genesis Chapters 9-16',
  wednesdaySummary:
    'You will read about Gods covenant with Noah, the Tower of Babel, and the beginning of Abrahams journey of faith.',
  videoLink: 'https://www.youtube.com/watch?v=example',
  estimatedTime: '30 minutes',
  signOff: 'See you on Friday for the final video of the week',
};

export const questWednesdaySampleVariables = buildQuestWednesdayTemplateVariables(
  questWednesdayApprovalSample,
);
