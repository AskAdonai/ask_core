import type { Prayer } from '../types/PrayerTheme';

/** Builds the full KNOCK targeted-prayer WhatsApp body from prayer content fields. */
export const buildKnockPrayerMessage = (themeName: string, prayer: Prayer): string => {
  const title = prayer.title?.trim() || themeName;
  const lines: string[] = [`*${title}*`];

  if (themeName.trim() && title !== themeName.trim()) {
    lines.push(`_${themeName.trim()}_`);
  }

  if (prayer.prayerText?.trim()) {
    lines.push('', prayer.prayerText.trim());
  }

  if (prayer.verse?.trim()) {
    lines.push('', `_${prayer.verse.trim()}_`);
    if (prayer.reference?.trim()) {
      lines.push(`— ${prayer.reference.trim()}`);
    }
  } else if (prayer.reference?.trim()) {
    lines.push('', `— ${prayer.reference.trim()}`);
  }

  if (prayer.declarationText?.trim()) {
    lines.push('', prayer.declarationText.trim());
  }

  return lines.join('\n');
};
