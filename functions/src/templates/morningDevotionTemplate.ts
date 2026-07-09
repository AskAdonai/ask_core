import {
  buildMorningTemplateVariables,
  morningDevotionQuickActions,
} from '../messages/morningMessage';

/**
 * Twilio Content Template: ask_morning_devotion_card
 *
 * ── Twilio Console submission (duplicate template if retrying) ──────────────
 *
 * Use content type: `twilio/card` (WhatsApp supports media + quick replies).
 *
 * Variables:
 *  - {{1}}: devotion body text
 *  - {{2}}: image path suffix (after domain) e.g. "uploads/devotion/stage1/day1/image.png"
 *
 * NOTE: WhatsApp drops `body` for twilio/card; put all text in `title`.
 *
 * "Reply Title" errors mean a BUTTON field has bad chars — never paste the
 * devotion text into button titles. Buttons cannot contain: _ * ~ { } or newlines.
 *
 * {{1}} = runtime composed card from morningMessage.ts (sanitized at send time).
 */
export const morningDevotionCardTitle =
  'ASK Daily Devotion\n\n{{1}}\n\nChoose an action below:';

export const morningDevotionContentTemplate = {
  friendly_name: 'ask_morning_devotion_card',
  language: 'en',
  types: {
    'twilio/card': {
      title: morningDevotionCardTitle,
      media: ['https://s3.askadonai.com/{{2}}'],
      actions: [
        { type: 'QUICK_REPLY', title: morningDevotionQuickActions.seek, id: 'seek' },
        { type: 'QUICK_REPLY', title: morningDevotionQuickActions.journal, id: 'journal' },
        { type: 'QUICK_REPLY', title: morningDevotionQuickActions.vine, id: 'vine' },
      ],
    } as any,
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
  'https://s3.askadonai.com/uploads/devotion/stage1/day1/image.png',
);

export const morningDevotionButtonLabels = morningDevotionQuickActions;
