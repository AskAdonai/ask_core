import { distance } from 'fastest-levenshtein';
import { normalizeInput } from '../utils/normalizeInput';

export const VALID_KEYWORDS = [
  'ask', 'seek', 'knock', 'journal', 'vine',
  'remind', 'pause', 'resume', 'help',
  'stop', 'optout', 'unsubscribe', 
  'quest', 'watch', 'log', 'quiz', 'progress', 'unquest', 'leavequest',
  'testmonday', 'testtuesday', 'testwednesday',
  'testthursday', 'testfriday', 'testsaturday', 'testmorning'
];

/** 
 * Matches an input string against valid keywords using exact and fuzzy matching.
 * Returns the matched keyword or null if no match found.
 */
export const matchKeyword = (input: string): string | null => {
  const normalized = normalizeInput(input);

  if (!normalized) return null;

  // 1. Exact match first
  if (VALID_KEYWORDS.includes(normalized)) {
    return normalized;
  }

  // 1b. Check if the first word is a valid keyword (for commands with arguments like "LOG Genesis 3")
  const firstWord = normalized.split(/\s+/)[0];
  if (VALID_KEYWORDS.includes(firstWord)) {
    return firstWord;
  }

  // 1c. Safe fuzzy match for the first word (handles typos like "LGO Genesis 3" -> "log")
  let bestWordMatch: string | null = null;
  let minWordDistance = Infinity;

  for (const keyword of VALID_KEYWORDS) {
    const dist = distance(firstWord, keyword);
    // Allow distance=1 (e.g. 'loog' -> 'log').
    // Allow distance=2 ONLY if they are an exact anagram/transposition (e.g. 'lgo' -> 'log') 
    // to prevent completely different words (like 'god' -> 'log' which has distance 2) from matching.
    const isAnagram = firstWord.split('').sort().join('') === keyword.split('').sort().join('');
    
    if (dist <= 1 || (dist === 2 && isAnagram)) {
      if (dist < minWordDistance) {
        minWordDistance = dist;
        bestWordMatch = keyword;
      }
    }
  }

  if (bestWordMatch) {
    return bestWordMatch;
  }

  // 2. Fuzzy match entire string — only for short inputs to avoid treating journal entries as typos
  if (normalized.length <= 15) {
    let bestMatch: string | null = null;
    let minDistance = Infinity;

    for (const keyword of VALID_KEYWORDS) {
      const dist = distance(normalized, keyword);
      if (dist <= 2 && dist < minDistance) {
        minDistance = dist;
        bestMatch = keyword;
      }
    }

    if (bestMatch) return bestMatch;
  }

  return null;
};
