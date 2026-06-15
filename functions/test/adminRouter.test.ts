import request from 'supertest';
import { createAdminApp } from '../src/admin/adminApp';
import { getFirestore } from 'firebase-admin/firestore';

jest.mock('firebase-admin/firestore', () => {
  const mockSet = jest.fn();
  const mockGet = jest.fn();
  const mockCollectionGet = jest.fn();
  const mockRecursiveDelete = jest.fn();

  return {
    getFirestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: mockGet,
          set: mockSet,
          collection: jest.fn(() => ({
            doc: jest.fn(() => ({
              get: mockGet,
              set: mockSet,
            })),
            get: mockCollectionGet,
          })),
        })),
        get: mockCollectionGet,
      })),
      batch: jest.fn(),
      recursiveDelete: mockRecursiveDelete,
    })),
    FieldValue: {
      serverTimestamp: jest.fn(() => 'server-timestamp'),
    },
  };
});

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('Admin API Router', () => {
  const app = createAdminApp();
  let dbMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    dbMock = getFirestore();
  });

  it('rejects requests without authorization', async () => {
    const res = await request(app).get('/admin/quiz/1');
    expect(res.status).toBe(401);
  });

  it('allows access with test token', async () => {
    const mockGet = dbMock.collection().doc().get;
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ weekNumber: 1, quizQuestions: [{ question: 'Q1' }] }),
    });

    const res = await request(app)
      .get('/admin/quiz/1')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.weekNumber).toBe(1);
    expect(res.body.quizQuestions).toHaveLength(1);
  });

  it('returns 404 if week does not exist', async () => {
    const mockGet = dbMock.collection().doc().get;
    mockGet.mockResolvedValueOnce({
      exists: false,
    });

    const res = await request(app)
      .get('/admin/quiz/99')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(404);
  });

  it('updates quiz via POST', async () => {
    const mockSet = dbMock.collection().doc().set;
    mockSet.mockResolvedValueOnce({});

    const payload = { quizQuestions: [{ question: 'Q1?', options: ['A', 'B', 'C'], answerIndex: 0 }] };
    const res = await request(app)
      .post('/admin/quiz/1')
      .set('Authorization', 'Bearer test-token')
      .send(payload);

    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        quizQuestions: payload.quizQuestions
      }),
      { merge: true }
    );
  });

  it('rejects POST if quizQuestions is not an array', async () => {
    const res = await request(app)
      .post('/admin/quiz/1')
      .set('Authorization', 'Bearer test-token')
      .send({ quizQuestions: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('deletes quiz questions via DELETE', async () => {
    const mockSet = dbMock.collection().doc().set;
    mockSet.mockResolvedValueOnce({});

    const res = await request(app)
      .delete('/admin/quiz/1')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        quizQuestions: []
      }),
      { merge: true }
    );
  });

  describe('User Management Endpoints', () => {
    it('GET /admin/users lists users', async () => {
      const mockGet = dbMock.collection().get;
      mockGet.mockResolvedValueOnce({
        docs: [
          { data: () => ({ phone: '+1234', name: 'Alice', streak: 5 }) }
        ]
      });

      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].name).toBe('Alice');
    });

    it('GET /admin/users/:phone retrieves a specific user', async () => {
      const mockGet = dbMock.collection().doc().get;
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ phone: '+1234', name: 'Alice' })
      });

      const res = await request(app)
        .get('/admin/users/+1234')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Alice');
    });

    it('POST /admin/users creates a new user', async () => {
      const mockGet = dbMock.collection().doc().get;
      const mockSet = dbMock.collection().doc().set;
      mockGet.mockResolvedValueOnce({ exists: false });
      mockSet.mockResolvedValueOnce({});

      const res = await request(app)
        .post('/admin/users')
        .set('Authorization', 'Bearer test-token')
        .send({ phone: '+9999', name: 'Bob' });

      expect(res.status).toBe(201);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bob' })
      );
    });

    it('PUT /admin/users/:phone updates a user', async () => {
      const mockGet = dbMock.collection().doc().get;
      const mockSet = dbMock.collection().doc().set;
      mockGet.mockResolvedValueOnce({ exists: true });
      mockSet.mockResolvedValueOnce({});

      const res = await request(app)
        .put('/admin/users/+1234')
        .set('Authorization', 'Bearer test-token')
        .send({ paused: true });

      expect(res.status).toBe(200);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ paused: true }),
        { merge: true }
      );
    });

    it('DELETE /admin/users/:phone schedules a recursive delete', async () => {
      const mockGet = dbMock.collection().doc().get;
      dbMock.recursiveDelete.mockResolvedValueOnce({});
      mockGet.mockResolvedValueOnce({ exists: true });

      const res = await request(app)
        .delete('/admin/users/+1234')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(202);
      expect(res.body.message).toMatch(/scheduled for background deletion/i);
      expect(dbMock.recursiveDelete).toHaveBeenCalled();
    });
  });

  describe('Theme Management Endpoints', () => {
    it('GET /admin/themes lists themes', async () => {
      const mockGet = dbMock.collection().get;
      mockGet.mockResolvedValueOnce({
        docs: [
          { data: () => ({ themeId: 'love', title: 'Love' }) }
        ]
      });

      const res = await request(app)
        .get('/admin/themes')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.themes).toHaveLength(1);
      expect(res.body.themes[0].title).toBe('Love');
    });

    it('POST /admin/themes/:themeId creates a theme', async () => {
      const mockGet = dbMock.collection().doc().get;
      const mockSet = dbMock.collection().doc().set;
      mockGet.mockResolvedValueOnce({ exists: false });
      mockSet.mockResolvedValueOnce({});

      const res = await request(app)
        .post('/admin/themes/peace')
        .set('Authorization', 'Bearer test-token')
        .send({ title: 'Peace' });

      expect(res.status).toBe(201);
      expect(mockSet).toHaveBeenCalled();
    });

    it('DELETE /admin/themes/:themeId schedules recursive delete', async () => {
      const mockGet = dbMock.collection().doc().get;
      dbMock.recursiveDelete.mockResolvedValueOnce({});
      mockGet.mockResolvedValueOnce({ exists: true });

      const res = await request(app)
        .delete('/admin/themes/peace')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(202);
      expect(dbMock.recursiveDelete).toHaveBeenCalled();
    });
  });

  describe('Prayer Management Endpoints', () => {
    it('POST /admin/themes/:themeId/prayers/:prayerId creates a prayer', async () => {
      const mockGet = dbMock.collection().doc().collection().doc().get;
      const mockSet = dbMock.collection().doc().collection().doc().set;

      mockGet.mockResolvedValueOnce({ exists: false });
      mockSet.mockResolvedValueOnce({});

      const res = await request(app)
        .post('/admin/themes/love/prayers/prayer1')
        .set('Authorization', 'Bearer test-token')
        .send({ prayerText: 'A prayer for love' });

      expect(res.status).toBe(201);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ prayerText: 'A prayer for love' })
      );
    });
  });
});
