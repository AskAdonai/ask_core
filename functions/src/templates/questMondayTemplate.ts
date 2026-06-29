import type { QuestMondayPayload } from '../services/twilioService';

/**
 * Twilio Content Template: ask_quest_monday
 *
 * Type: Text (no quick-reply buttons).
 * Variables match sendQuestMonday() in twilioService.ts.
 *
 * CoverPic = quest week introImageUrl (optional; empty string if none).
 * Env: TWILIO_CONTENT_SID_QUEST_MONDAY
 */
export const questMondayTemplateBody =
    'Hello *{{Name}}*!\n\n' +
    '{{CoverPic}}\n\n' +
    'Welcome to Week {{WeekNumber}} of the Bible in a Year Quest!\n\n' +
    '{{MondayEncouragement}}\n\n' +
    "Today's video covers *{{ReadingPortion}}*.\n" +
    'Here is your link for today: {{VideoLink}}\n\n' +
    'Take your time to watch and follow along with the reading.\n' +
    "I'll check in tomorrow before your next video.";

export const questMondayContentTemplate = {
  friendly_name: 'ask_quest_monday',
  language: 'en',
  types: {
    'twilio/text': {
      body: questMondayTemplateBody,
    },
  },
} as const;

export const buildQuestMondayTemplateVariables = (
  payload: QuestMondayPayload,
): Record<string, string> => ({
  Name: payload.name,
  CoverPic: payload.coverPic?.trim() || ' ',
  WeekNumber: String(payload.weekNumber),
  MondayEncouragement: payload.mondayEncouragement,
  ReadingPortion: payload.readingPortion,
  VideoLink: payload.videoLink,
});

/** Sample values for Twilio WhatsApp template approval. */
export const questMondayApprovalSample: QuestMondayPayload = {
  name: 'Friend',
  coverPic: 'https://cdn.example.com/quest/week-1-cover.jpg',
  weekNumber: 1,
  mondayEncouragement:
    'With three videos each week, you will read through the entire Bible in one year. What a journey this will be!',
  readingPortion: 'Genesis Chapters 1-8',
  videoLink: 'https://www.youtube.com/watch?v=example',
};

export const questMondaySampleVariables = buildQuestMondayTemplateVariables(
  questMondayApprovalSample,
);
