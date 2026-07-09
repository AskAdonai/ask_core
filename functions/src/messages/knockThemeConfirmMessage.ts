/**
 * Confirmation sent after a user selects a KNOCK prayer theme.
 */

export interface KnockThemeConfirmPayload {
  themeName: string;
}

/** Quick-reply button labels (≤20 chars, no _ * ~ { } or newlines). */
export const knockThemeConfirmQuickActions = {
  seek: 'Seek',
  knock: 'Knock',
  vine: 'Vine',
} as const;

export const knockThemeConfirmButtonFooter =
  `• *${knockThemeConfirmQuickActions.seek}* — make today's declaration\n` +
  `• *${knockThemeConfirmQuickActions.knock}* — browse prayer themes\n` +
  `• *${knockThemeConfirmQuickActions.vine}* — my growth`;

export const sanitizeKnockThemeConfirmForWhatsAppTemplate = (body: string): string =>
  body
    .replace(/[*_~{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const buildKnockThemeConfirmBody = (payload: KnockThemeConfirmPayload): string => {
  const themeName = payload.themeName.trim() || 'Your theme';
  return (
    `${themeName}. I am bringing you targeted prayers for this season.\n\n` +
    `Your next morning content will carry these prayers. Your journey continues alongside. Type KNOCK anytime to change your focus.`
  );
};

export const buildKnockThemeConfirmMessage = (
  payload: KnockThemeConfirmPayload,
): { body: string; fallbackBody: string } => {
  const body = buildKnockThemeConfirmBody(payload);
  return { body, fallbackBody: `${body}\n\n${knockThemeConfirmButtonFooter}` };
};

export const buildKnockThemeConfirmTemplateVariables = (
  body: string,
): Record<string, string> => ({
  '1': sanitizeKnockThemeConfirmForWhatsAppTemplate(body),
});
