/**
 * Registration-complete message sent after onboarding (time step).
 * Quick-reply buttons replace the text CTA footer when a Twilio template is configured.
 */

export interface RegistrationCompletePayload {
  name: string;
  morningTime: string;
}

/** Quick-reply button labels (≤20 chars, no _ * ~ { } or newlines). */
export const registrationCompleteQuickActions = {
  seek: 'Seek',
  knock: 'Knock',
  help: 'Help',
} as const;

export const registrationCompleteButtonFooter =
  `• *${registrationCompleteQuickActions.seek}* — make today's declaration\n` +
  `• *${registrationCompleteQuickActions.knock}* — browse prayer themes\n` +
  `• *${registrationCompleteQuickActions.help}* — see all I can do`;

/** Strips WhatsApp-forbidden chars from text injected into template variable {{1}}. */
export const sanitizeRegistrationBodyForWhatsAppTemplate = (body: string): string =>
  body
    .replace(/[*_~{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const buildRegistrationCompleteBody = (
  payload: RegistrationCompletePayload,
): string => {
  const name = payload.name.trim() || 'Friend';
  const morningTime = payload.morningTime.trim() || '06:00';

  return (
    `We begin at Season 1 *Believe*.\n\n` +
    `However, if your heart has a specific prayer need at any time — healing, provision, a waiting season — simply type *KNOCK* at any time and I will bring you targeted prayers alongside your journey.\n\n` +
    `You are *Grafted* on Day 1. Your first morning card arrives tomorrow at ${morningTime}. When it does, please read it slowly. Then type *SEEK* when you are ready to make today's declaration. Together we will Ask, Seek and Knock every day.\n\n` +
    `I will see you tomorrow morning. 🙏`
  );
};

export const buildRegistrationCompleteMessage = (
  payload: RegistrationCompletePayload,
): { body: string; fallbackBody: string } => {
  const body = buildRegistrationCompleteBody(payload);
  const fallbackBody = `${body}\n\n${registrationCompleteButtonFooter}`;
  return { body, fallbackBody };
};

export const buildRegistrationCompleteTemplateVariables = (
  body: string,
): Record<string, string> => ({
  '1': sanitizeRegistrationBodyForWhatsAppTemplate(body),
});
