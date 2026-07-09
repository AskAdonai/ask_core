import {
  buildKnockThemeConfirmBody,
  buildKnockThemeConfirmTemplateVariables,
  knockThemeConfirmQuickActions,
  type KnockThemeConfirmPayload,
} from '../messages/knockThemeConfirmMessage';

/**
 * Twilio Content Template: ask_knock_theme_confirm
 *
 * Type: Quick Reply
 * Body:
 *   ASK Prayer Focus
 *
 *   {{1}}
 *
 *   Choose an action below:
 *
 * Buttons: Seek | Knock | Vine
 * Env: TWILIO_CONTENT_SID_KNOCK_THEME_CONFIRM
 */
export const knockThemeConfirmTemplateBody =
  'ASK Prayer Focus\n\n{{1}}\n\nChoose an action below:';

export const knockThemeConfirmContentTemplate = {
  friendly_name: 'ask_knock_theme_confirm',
  language: 'en',
  types: {
    'twilio/quick-reply': {
      body: knockThemeConfirmTemplateBody,
      actions: [
        { title: knockThemeConfirmQuickActions.seek, id: 'seek' },
        { title: knockThemeConfirmQuickActions.knock, id: 'knock' },
        { title: knockThemeConfirmQuickActions.vine, id: 'vine' },
      ],
    },
  },
} as const;

export const knockThemeConfirmApprovalSample = buildKnockThemeConfirmBody({
  themeName: 'Friendships',
});

export const knockThemeConfirmSampleVariables = buildKnockThemeConfirmTemplateVariables(
  knockThemeConfirmApprovalSample,
);

export const buildKnockThemeConfirmTemplateVariablesFromPayload = (
  payload: KnockThemeConfirmPayload,
): Record<string, string> =>
  buildKnockThemeConfirmTemplateVariables(buildKnockThemeConfirmBody(payload));
