import {
  buildMorningTemplateVariables,
  morningDevotionQuickActions,
} from '../messages/morningMessage';

/**
 * Twilio Content Template: ask_morning_devotion
 *
 * ── Twilio Console submission (duplicate template if retrying) ──────────────
 *
 * 1. Type: Quick Reply
 * 2. Body (exact):
 *      ASK Daily Devotion
 *
 *      {{1}}
 *
 *      Choose an action below:
 * 3. Button 1 title: Seek        (NOT the sample body — one word only)
 * 4. Button 2 title: Journal
 * 5. Button 3 title: Vine
 * 6. Sample for {{1}} only: paste morningDevotionApprovalSample (one line below)
 *
 * "Reply Title" errors mean a BUTTON field has bad chars — never paste the
 * devotion text into button titles. Buttons cannot contain: _ * ~ { } or newlines.
 *
 * {{1}} = runtime composed card from morningMessage.ts (sanitized at send time).
 */
export const morningDevotionTemplateBody =
  'ASK Daily Devotion\n\n{{1}}\n\nChoose an action below:';

export const morningDevotionContentTemplate = {
  friendly_name: 'ask_morning_devotion',
  language: 'en',
  types: {
    'twilio/quick-reply': {
      body: morningDevotionTemplateBody,
      actions: [
        { title: morningDevotionQuickActions.seek, id: 'seek' },
        { title: morningDevotionQuickActions.journal, id: 'journal' },
        { title: morningDevotionQuickActions.vine, id: 'vine' },
      ],
    },
  },
} as const;

/**
 * Paste this ONE LINE into the {{1}} sample field when submitting for approval.
 * Do not paste into button title fields.
 */
export const morningDevotionApprovalSample =
    'Good morning Friend. You are Grafted. Streak 3 days. Faith For The Unseen. Lord, strengthen my faith today. Reflect on what God is speaking to you.';

/** @deprecated Use morningDevotionApprovalSample for Twilio submission */
export const morningDevotionSampleBody = morningDevotionApprovalSample;

export const morningDevotionSampleVariables = buildMorningTemplateVariables(
  morningDevotionApprovalSample,
);

export const morningDevotionButtonLabels = morningDevotionQuickActions;
