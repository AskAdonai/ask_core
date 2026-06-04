import { findNeedThemeMatch } from '../src/handlers/needHandler';
import type { PrayerTheme } from '../src/types/PrayerTheme';

const themes: PrayerTheme[] = [
  {
    themeId: 'trusting-god',
    displayName: 'Trusting God',
    category: 'Waiting Season',
    menuOrder: 1,
    available: true,
  },
  {
    themeId: 'healing',
    displayName: 'Healing',
    category: 'Restoration',
    menuOrder: 2,
    available: true,
  },
];

describe('findNeedThemeMatch', () => {
  it('does not accept one-letter text as a theme match', () => {
    expect(findNeedThemeMatch(themes, 'T')).toBeNull();
    expect(findNeedThemeMatch(themes, 'h')).toBeNull();
  });

  it('matches by menu number', () => {
    expect(findNeedThemeMatch(themes, '2')?.themeId).toBe('healing');
  });

  it('matches exact and meaningful prefix theme text', () => {
    expect(findNeedThemeMatch(themes, 'Trusting God')?.themeId).toBe('trusting-god');
    expect(findNeedThemeMatch(themes, 'heal')?.themeId).toBe('healing');
    expect(findNeedThemeMatch(themes, 'wait')?.themeId).toBe('trusting-god');
  });
});
