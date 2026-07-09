/**
 * Determines the vine stage based on the user's streak.
 * Stages: Grafted (0–6), Rooted (7–13), Growing (14–20), Blooming (21–29), Fruitful (30+).
 */
export const determineVineStage = (streak: number): string => {
  if (streak >= 30) return 'Fruitful';
  if (streak >= 21) return 'Blooming';
  if (streak >= 14) return 'Growing';
  if (streak >= 7) return 'Rooted';
  return 'Grafted';
};

/** Streak day counts where the named vine stage begins (matches determineVineStage). */
export const VINE_STAGE_THRESHOLDS = [7, 14, 21, 30] as const;

/** Days remaining until the next vine-stage threshold, or null at Fruitful (30+). */
export const getDaysToNextVineStage = (streak: number): number | null => {
  const next = VINE_STAGE_THRESHOLDS.find((threshold) => streak < threshold);
  return next !== undefined ? next - streak : null;
};
