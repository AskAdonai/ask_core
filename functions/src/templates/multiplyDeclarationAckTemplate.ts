/**
 * Twilio Content Template: ask_multiply_declaration_ack
 *
 * Quick-reply follow-up after the first declaration of the day — lets the user
 * tap again to multiply without typing free text.
 *
 * Body must not contain the literal word "yes" (keyword-matching safety).
 */

import { seekDeclarationQuickActions } from './seekDeclarationTemplate';

/** Reuse the same button labels as the SEEK declaration template. */
export const multiplyDeclarationQuickActions = seekDeclarationQuickActions;

export const multiplyDeclarationTemplateBody =
  'ASK Declaration\n\n{{1}}\n\nTap below to declare again or choose another action:';

export const multiplyDeclarationContentTemplate = {
  friendly_name: 'ask_multiply_declaration_ack',
  language: 'en',
  types: {
    'twilio/quick-reply': {
      body: multiplyDeclarationTemplateBody,
      actions: [
        { title: multiplyDeclarationQuickActions.yes, id: 'yes' },
        { title: multiplyDeclarationQuickActions.journal, id: 'journal' },
        { title: multiplyDeclarationQuickActions.vine, id: 'vine' },
      ],
    },
  },
} as const;

export const sanitizeMultiplyAckForWhatsAppTemplate = (body: string): string =>
  body
    .replace(/[*_~{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const buildMultiplyDeclarationAckBody = (
  name: string,
  declarationsToday: number,
): string => {
  const countLabel = declarationsToday === 1 ? 'once' : `${declarationsToday} times`;
  return `Well done, ${name}. Declared ${countLabel} today.`;
};

export const buildMultiplyDeclarationTemplateVariables = (
  name: string,
  declarationsToday: number,
): Record<string, string> => ({
  '1': sanitizeMultiplyAckForWhatsAppTemplate(
    buildMultiplyDeclarationAckBody(name, declarationsToday),
  ),
});
