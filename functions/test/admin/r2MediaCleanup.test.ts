import * as r2Service from '../../src/services/r2Service';

describe('deleteReplacedMediaUrl', () => {
  const originalPublicUrl = process.env.R2_PUBLIC_URL;

  beforeEach(() => {
    process.env.R2_PUBLIC_URL = 's3.askadonai.com';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalPublicUrl === undefined) {
      delete process.env.R2_PUBLIC_URL;
    } else {
      process.env.R2_PUBLIC_URL = originalPublicUrl;
    }
  });

  it('deletes the previous object when the public URL changes', async () => {
    const deleteSpy = jest.spyOn(r2Service, 'deleteFile').mockResolvedValue(undefined);

    await r2Service.deleteReplacedMediaUrl(
      'https://s3.askadonai.com/uploads/quests/1/intro.jpg',
      'https://s3.askadonai.com/uploads/quests/1/intro.png',
    );

    expect(deleteSpy).toHaveBeenCalledWith('uploads/quests/1/intro.jpg');
  });

  it('skips deletion when URLs are unchanged', async () => {
    const deleteSpy = jest.spyOn(r2Service, 'deleteFile').mockResolvedValue(undefined);

    await r2Service.deleteReplacedMediaUrl(
      'https://s3.askadonai.com/uploads/quests/1/intro.jpg',
      'https://s3.askadonai.com/uploads/quests/1/intro.jpg',
    );

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('parses hosted object keys only', () => {
    expect(r2Service.objectKeyFromPublicUrl('https://s3.askadonai.com/uploads/quests/2/intro.jpg')).toBe(
      'uploads/quests/2/intro.jpg',
    );
    expect(r2Service.objectKeyFromPublicUrl('https://cdn.example.com/file.jpg')).toBeNull();
  });
});
