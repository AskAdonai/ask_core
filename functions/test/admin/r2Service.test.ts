import {
  buildDevotionImageKey,
  buildPrayerAudioKey,
  buildQuestIntroKey,
  extensionFromContentType,
  getPublicUrl,
  mediaTypeFromContentType,
  objectKeyFromPublicUrl,
  resolveUploadObjectKey,
  sanitizeObjectFilename,
} from '../../src/services/r2Service';

describe('r2Service helpers', () => {
  const originalPublicUrl = process.env.R2_PUBLIC_URL;

  afterEach(() => {
    if (originalPublicUrl === undefined) {
      delete process.env.R2_PUBLIC_URL;
    } else {
      process.env.R2_PUBLIC_URL = originalPublicUrl;
    }
  });

  it('sanitizes unsafe filename characters', () => {
    expect(sanitizeObjectFilename('../../evil name!.jpg')).toBe('evil_name_.jpg');
  });

  it('builds stable quest intro keys', () => {
    expect(buildQuestIntroKey(12, 'png')).toBe('uploads/quests/12/intro.png');
  });

  it('builds stable prayer audio keys', () => {
    expect(buildPrayerAudioKey('theme-1', 'prayer-2', 'mp3')).toBe(
      'uploads/prayers/theme-1/prayer-2/declaration.mp3',
    );
  });

  it('builds stable devotion media keys', () => {
    expect(buildDevotionImageKey(1, 4, 'webp')).toBe('uploads/devotion/stage1/day4/image.webp');
  });

  it('resolves scoped upload object keys', () => {
    expect(
      resolveUploadObjectKey({
        scope: 'quest-intro',
        weekNumber: 5,
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      }),
    ).toBe('uploads/quests/5/intro.jpg');

    expect(
      resolveUploadObjectKey({
        scope: 'prayer-audio',
        themeId: 'faith',
        prayerId: 'prayer-1',
        filename: 'note.mp3',
        contentType: 'audio/mpeg',
      }),
    ).toBe('uploads/prayers/faith/prayer-1/declaration.mp3');

    expect(
      resolveUploadObjectKey({
        scope: 'devotion-image',
        journeyStage: 1,
        deliveryOrder: 4,
        filename: 'card.jpg',
        contentType: 'image/jpeg',
      }),
    ).toBe('uploads/devotion/stage1/day4/image.jpg');
  });

  it('builds public URL from R2_PUBLIC_URL', () => {
    process.env.R2_PUBLIC_URL = 's3.askadonai.com';
    expect(getPublicUrl('uploads/quests/1/intro.jpg')).toBe(
      'https://s3.askadonai.com/uploads/quests/1/intro.jpg',
    );
  });

  it('parses object keys from public URLs', () => {
    process.env.R2_PUBLIC_URL = 's3.askadonai.com';
    expect(objectKeyFromPublicUrl('https://s3.askadonai.com/uploads/quests/1/intro.jpg')).toBe(
      'uploads/quests/1/intro.jpg',
    );
    expect(objectKeyFromPublicUrl('https://other.example.com/file.jpg')).toBeNull();
  });

  it('infers media type and extension from content type', () => {
    expect(mediaTypeFromContentType('image/png')).toBe('image');
    expect(mediaTypeFromContentType('audio/mpeg')).toBe('audio');
    expect(extensionFromContentType('audio/mpeg')).toBe('mp3');
  });
});
