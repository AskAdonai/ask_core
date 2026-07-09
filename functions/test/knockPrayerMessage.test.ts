import { buildKnockPrayerMessage } from '../src/messages/knockPrayerMessage';
import type { Prayer } from '../src/types/PrayerTheme';

describe('buildKnockPrayerMessage', () => {
  const fullPrayer: Prayer = {
    title: 'Peace in the storm',
    prayerText: 'Lord, grant me peace today.',
    audioUrl: 'https://cdn.askadonai.com/prayer.mp3',
    declarationText: 'I receive your peace over my life.',
    declarationAudioUrl: '',
    verse: 'Peace I leave with you.',
    reference: 'John 14:27',
    index: 1,
  };

  it('includes title, prayer text, verse, reference, and declaration text', () => {
    const message = buildKnockPrayerMessage('Healing', fullPrayer);

    expect(message).toContain('*Peace in the storm*');
    expect(message).toContain('_Healing_');
    expect(message).toContain('Lord, grant me peace today.');
    expect(message).toContain('_Peace I leave with you._');
    expect(message).toContain('— John 14:27');
    expect(message).toContain('I receive your peace over my life.');
  });

  it('falls back to theme name when title is empty', () => {
    const message = buildKnockPrayerMessage('Healing', {
      ...fullPrayer,
      title: '',
    });

    expect(message.startsWith('*Healing*')).toBe(true);
    expect(message).not.toContain('_Healing_');
  });
});
