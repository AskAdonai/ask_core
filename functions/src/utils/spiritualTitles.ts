import greetingsData from '../seed/morningGreetings.json';

export type GreetingFrameType = 'title' | 'promise' | 'gods_voice';

export interface MorningGreetingFrame {
  type: GreetingFrameType;
  text: string;
  audioId?: string; // Cloudflare media ID for the greeting's voice note
}

/**
 * 30 rotating spiritual greetings used in the morning greeting.
 * Loaded from the JSON seed file which defines the 3 frames:
 * - Title: Identity affirmation
 * - Promise: A spoken declaration
 * - God's Voice: Specific days introducing God speaking
 *
 * The greeting for a given day is selected using:
 *   MORNING_GREETINGS[(streak - 1) % 30]
 */
export const MORNING_GREETINGS: readonly MorningGreetingFrame[] = greetingsData as MorningGreetingFrame[];

/**
 * Returns the spiritual greeting frame for a given streak count.
 * Uses the formula: (streak - 1) % 30, clamped for streak === 0.
 */
export const getMorningGreetingFrame = (streak: number): MorningGreetingFrame => {
  const index = streak <= 0 ? 0 : (streak - 1) % MORNING_GREETINGS.length;
  return MORNING_GREETINGS[index];
};

/**
 * Backward compatibility: Returns just a plain string title if the old function is called elsewhere.
 * In a real refactor, all usages should migrate to getMorningGreetingFrame.
 */
export const getSpiritualTitle = (streak: number): string => {
  const frame = getMorningGreetingFrame(streak);
  // If it's a title, return it directly. Otherwise, fall back to a generic title so old calls don't break
  if (frame.type === 'title') return frame.text;
  return 'Seeker of Truth';
};
