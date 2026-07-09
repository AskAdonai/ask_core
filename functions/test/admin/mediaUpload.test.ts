import request from 'supertest';
import express from 'express';
import mediaRoutes from '../../src/admin/routes/mediaRoutes';

jest.mock('../../src/services/r2Service', () => ({
  resolveUploadObjectKey: jest.fn((params: { scope?: string; weekNumber?: number }) => {
    if (params.scope === 'quest-intro') {
      return `uploads/quests/${params.weekNumber}/intro.jpg`;
    }
    return 'uploads/generic/file.jpg';
  }),
  generateUploadUrl: jest.fn(async () => 'https://r2.example.com/signed-put'),
  getPublicUrl: jest.fn((key: string) => `https://s3.askadonai.com/${key}`),
  mediaTypeFromContentType: jest.fn(() => 'image'),
  deleteFile: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ id: 'media-doc-1' })),
    })),
  })),
  FieldValue: { serverTimestamp: jest.fn() },
}));

describe('POST /media/upload-url', () => {
  const app = express();
  app.use(express.json());
  app.use(mediaRoutes);

  it('returns presigned upload credentials for quest intro uploads', async () => {
    const res = await request(app)
      .post('/media/upload-url')
      .send({
        filename: 'quest-cover.jpg',
        contentType: 'image/jpeg',
        scope: 'quest-intro',
        weekNumber: 7,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uploadUrl: 'https://r2.example.com/signed-put',
      publicUrl: 'https://s3.askadonai.com/uploads/quests/7/intro.jpg',
      mediaId: 'uploads/quests/7/intro.jpg',
      filename: 'uploads/quests/7/intro.jpg',
    });
  });

  it('requires filename and contentType', async () => {
    const res = await request(app).post('/media/upload-url').send({ filename: 'a.jpg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/filename and contentType/);
  });
});
