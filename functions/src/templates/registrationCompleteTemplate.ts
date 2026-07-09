import {
  buildRegistrationCompleteBody,
  buildRegistrationCompleteTemplateVariables,
  registrationCompleteQuickActions,
  type RegistrationCompletePayload,
} from '../messages/registrationMessage';

/**
 * Twilio Content Template: ask_registration_complete
 *
 * ── Twilio Console submission ───────────────────────────────────────────────
 *
 * 1. Type: Quick Reply
 * 2. Body (exact):
 *      ASK Welcome
 *
 *      {{1}}
 *
 *      Choose an action below:
 * 3. Button 1 title: Seek
 * 4. Button 2 title: Knock
 * 5. Button 3 title: Help
 * 6. Sample for {{1}} only: paste registrationCompleteApprovalSample (below)
 *
 * Button titles must be fixed — no variables, no _ * ~ { } or newlines.
 */
export const registrationCompleteTemplateBody =
  'ASK Welcome\n\n{{1}}\n\nChoose an action below:';

export const registrationCompleteContentTemplate = {
  friendly_name: 'ask_registration_complete',
  language: 'en',
  types: {
    'twilio/quick-reply': {
      body: registrationCompleteTemplateBody,
      actions: [
        { title: registrationCompleteQuickActions.seek, id: 'seek' },
        { title: registrationCompleteQuickActions.knock, id: 'knock' },
        { title: registrationCompleteQuickActions.help, id: 'help' },
      ],
    },
  },
} as const;

export const registrationCompleteApprovalSample = buildRegistrationCompleteBody({
  name: 'Friend',
  morningTime: '06:00',
});

export const registrationCompleteSampleVariables = buildRegistrationCompleteTemplateVariables(
  registrationCompleteApprovalSample,
);

export const buildRegistrationCompleteTemplateVariablesFromPayload = (
  payload: RegistrationCompletePayload,
): Record<string, string> =>
  buildRegistrationCompleteTemplateVariables(buildRegistrationCompleteBody(payload));
