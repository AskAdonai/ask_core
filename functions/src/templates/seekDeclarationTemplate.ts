/**
 * Twilio Content Template: ask_seek_declaration
 *
 * Type: Quick Reply
 * Body:
 *   ASK Declaration
 *
 *   {{1}}
 *
 *   Speak it aloud. When you have declared it, tap Yes below.
 *
 *   Choose an action below:
 *
 * Buttons: Yes | Journal | Vine (fixed titles — no variables)
 * Env: TWILIO_CONTENT_SID_KNOCK_RESPONSE
 */

/** Quick-reply button labels (≤20 chars, no _ * ~ { } or newlines). */
export const seekDeclarationQuickActions = {
  yes: 'Yes',
  journal: 'Journal',
  vine: 'Vine',
} as const;

export const seekDeclarationTemplateBody =
  'ASK Declaration\n\n{{1}}\n\nSpeak it aloud. When you have declared it, tap Yes below.\n\nChoose an action below:';

export const seekDeclarationContentTemplate = {
  friendly_name: 'ask_seek_declaration',
  language: 'en',
  types: {
    'twilio/quick-reply': {
      body: seekDeclarationTemplateBody,
      actions: [
        { title: seekDeclarationQuickActions.yes, id: 'yes' },
        { title: seekDeclarationQuickActions.journal, id: 'journal' },
        { title: seekDeclarationQuickActions.vine, id: 'vine' },
      ],
    },
  },
} as const;

export const seekDeclarationButtonFooter =
  `• *${seekDeclarationQuickActions.yes}* — I declare it\n` +
  `• *${seekDeclarationQuickActions.journal}* — reflect\n` +
  `• *${seekDeclarationQuickActions.vine}* — my growth`;

/** Strips WhatsApp-forbidden chars from text injected into template variable {{1}}. */
export const sanitizeSeekDeclarationForWhatsAppTemplate = (body: string): string =>
  body
    .replace(/[*_~{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Builds {{1}} for the SEEK declaration template.
 * When audio is available, the listen link is included in the body (template messages cannot carry media).
 */
export const buildSeekDeclarationTemplateBody = (
  declarationText: string,
  audioUrl?: string,
): string => {
  const text = declarationText.trim();
  const url = audioUrl?.trim();
  if (url && !url.includes('example.com')) {
    return `Listen here: ${url}\n\n${text}`;
  }
  return text;
};

export const buildSeekDeclarationTemplateVariables = (
  declarationText: string,
  audioUrl?: string,
): Record<string, string> => ({
  '1': sanitizeSeekDeclarationForWhatsAppTemplate(
    buildSeekDeclarationTemplateBody(declarationText, audioUrl),
  ),
});

export const seekDeclarationApprovalSample =
  'Listen here: https://cdn.example.com/declaration.mp3\n\nI am strong and courageous. The Lord goes with me wherever I go.';

export const seekDeclarationSampleVariables = buildSeekDeclarationTemplateVariables(
  'I am strong and courageous. The Lord goes with me wherever I go.',
  'https://cdn.example.com/declaration.mp3',
);
