import { normalizeInput } from './normalizeInput';

const YES_REPLIES = new Set([
  'yes',
  'y',
  'yeah',
  'yep',
  'amen',
  'ideclare',
  'declare',
  'ideclared',
]);

/**
 * True when the user is confirming their spoken declaration (YES flow).
 */
export const isYesReply = (text: string): boolean => {
  const normalized = normalizeInput(text);
  if (!normalized) return false;
  if (YES_REPLIES.has(normalized)) return true;
  return normalized.startsWith('yes');
};
