import type { QuestSaturdayPayload } from '../services/twilioService';

/**
 * Twilio Content Template: ask_quest_saturday
 *
 * Type: Text (no quick-reply buttons).
 * Variables match sendQuestSaturday() in twilioService.ts.
 *
 * Env: TWILIO_CONTENT_SID_QUEST_SATURDAY
 */
export const questSaturdayTemplateBody =
  'Hello *{{Name}}*.\n\n' +
  '{{QuizGreeting}}\n\n' +
  "This week you've read {{WeeklyChapterSpan}}.\n" +
  'Take a few minutes to reflect and test your understanding.\n\n' +
  'Quiz link: {{QuizLinks}}.\n\n' +
  '{{SaturdayEncouragement}}.\n\n' +
  'Have a lovely Weekend';

export const questSaturdayContentTemplate = {
  friendly_name: 'ask_quest_saturday',
  language: 'en',
  types: {
    'twilio/text': {
      body: questSaturdayTemplateBody,
    },
  },
} as const;

export const buildQuestSaturdayTemplateVariables = (
  payload: QuestSaturdayPayload,
): Record<string, string> => ({
  Name: payload.name,
  QuizGreeting: payload.quizGreeting,
  WeeklyChapterSpan: payload.weeklyChapterSpan,
  QuizLinks: payload.quizLinks,
  SaturdayEncouragement: payload.saturdayEncouragement,
});

/** Sample values for Twilio WhatsApp template approval. */
export const questSaturdayApprovalSample: QuestSaturdayPayload = {
  name: 'Friend',
  quizGreeting: 'How about a quick quiz? You have completed your first week of the Bible in a Year Quest.',
  weeklyChapterSpan: 'Genesis Chapters 1-23',
  quizLinks: 'https://forms.gle/example-quiz-link',
  saturdayEncouragement: 'Keep going, you have started well and we are excited to continue this journey with you.',
};

export const questSaturdaySampleVariables = buildQuestSaturdayTemplateVariables(
  questSaturdayApprovalSample,
);
