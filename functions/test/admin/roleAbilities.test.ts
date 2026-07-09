const mockDocGet = jest.fn();
const mockDocSet = jest.fn();
const mockDocDelete = jest.fn();
const mockCollectionGet = jest.fn();
const mockCountGet = jest.fn();
const mockRecursiveDelete = jest.fn();

function createDocRef() {
  return {
    get: mockDocGet,
    set: mockDocSet,
    delete: mockDocDelete,
    collection: jest.fn(() => createPrayersCollection()),
  };
}

function createPrayersCollection() {
  return {
    doc: jest.fn(() => createDocRef()),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    count: jest.fn(() => ({ get: mockCountGet })),
    get: mockCollectionGet,
  };
}

function createCollectionQuery() {
  return {
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    count: jest.fn(() => ({ get: mockCountGet })),
    get: mockCollectionGet,
  };
}

jest.mock('../../src/admin/middleware/authMiddleware', () => {
  const actual = jest.requireActual('../../src/admin/middleware/authMiddleware');
  return {
    ...actual,
    requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => createDocRef()),
      ...createCollectionQuery(),
    })),
    recursiveDelete: mockRecursiveDelete,
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  },
}));

jest.mock('../../src/services/staffService', () => {
  const actual = jest.requireActual('../../src/services/staffService');
  return {
    ...actual,
    listStaff: jest.fn().mockResolvedValue([]),
    resetStaffPassword: jest.fn().mockResolvedValue(undefined),
  };
});

import request from 'supertest';
import questRoutes from '../../src/admin/routes/questRoutes';
import themeRoutes from '../../src/admin/routes/themeRoutes';
import userRoutes from '../../src/admin/routes/userRoutes';
import staffRoutes from '../../src/admin/routes/staffRoutes';
import { mountWithStaff } from './helpers/mountRouter';
import { allRoles } from './fixtures/staff';
import type { StaffRole } from '../../src/types/Staff';

const questPayload = {
  weekNumber: 42,
  status: 'draft',
  days: {
    monday: { readingPortion: 'Genesis 1' },
  },
};

const publishedQuestPayload = {
  ...questPayload,
  status: 'published',
};

function resetFirestoreMocks(docExists = false, docData: Record<string, unknown> = { status: 'draft' }) {
  mockDocGet.mockReset();
  mockDocSet.mockReset();
  mockDocDelete.mockReset();
  mockCollectionGet.mockReset();
  mockCountGet.mockReset();
  mockRecursiveDelete.mockReset();

  mockDocGet.mockResolvedValue({
    exists: docExists,
    data: () => docData,
    id: '42',
  });
  mockDocSet.mockResolvedValue(undefined);
  mockDocDelete.mockResolvedValue(undefined);
  mockCollectionGet.mockResolvedValue({ docs: [] });
  mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });
  mockRecursiveDelete.mockResolvedValue(undefined);
}

function mockThemeAndPrayerDocs(themeExists: boolean, prayerExists: boolean) {
  mockDocGet
    .mockResolvedValueOnce({
      exists: themeExists,
      data: () => ({ themeId: 'theme-1', title: 'Theme' }),
      id: 'theme-1',
    })
    .mockResolvedValueOnce({
      exists: prayerExists,
      data: () => ({ prayerId: 'prayer-1', title: 'Prayer', status: 'draft' }),
      id: 'prayer-1',
    });
}

function canPublish(role: StaffRole) {
  return role === 'superEditor' || role === 'superadmin';
}

function canDelete(role: StaffRole) {
  return role === 'superadmin';
}

function canAccessUsers(role: StaffRole) {
  return role === 'superadmin';
}

describe('admin role abilities', () => {
  beforeEach(() => {
    resetFirestoreMocks(false);
  });

  describe.each(allRoles)('role: %s', (role) => {
    describe('quests', () => {
      const app = mountWithStaff(questRoutes, role);

      it('can list quests', async () => {
        const res = await request(app).get('/?limit=5&page=1');
        expect(res.status).toBe(200);
      });

      it(`${canPublish(role) ? 'can' : 'cannot'} create published quest`, async () => {
        const res = await request(app)
          .post('/42')
          .send(publishedQuestPayload);

        expect(res.status).toBe(canPublish(role) ? 201 : 403);
        if (!canPublish(role)) {
          expect(res.body.error).toMatch(/superEditor role required to publish/);
        }
      });

      it('can create draft quest', async () => {
        const res = await request(app).post('/42').send(questPayload);
        expect(res.status).toBe(201);
      });

      it(`${canPublish(role) ? 'can' : 'cannot'} publish existing draft`, async () => {
        mockDocGet
          .mockResolvedValueOnce({ exists: true, data: () => ({ status: 'draft' }), id: '42' })
          .mockResolvedValueOnce({ exists: true, data: () => ({ status: 'published' }), id: '42' });
        const res = await request(app).put('/42').send({ status: 'published' });
        expect(res.status).toBe(canPublish(role) ? 200 : 403);
      });

      it(`${canDelete(role) ? 'can' : 'cannot'} delete quest`, async () => {
        resetFirestoreMocks(true, { status: 'draft' });
        const res = await request(app).delete('/42');
        expect(res.status).toBe(canDelete(role) ? 200 : 403);
        if (!canDelete(role)) {
          expect(res.body.error).toMatch(/superadmin role required/);
        }
      });
    });

    describe('themes and prayers', () => {
      const app = mountWithStaff(themeRoutes, role);

      it('can list themes', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
      });

      it(`${canPublish(role) ? 'can' : 'cannot'} publish theme`, async () => {
        mockDocGet
          .mockResolvedValueOnce({ exists: true, data: () => ({ available: false, title: 'Theme' }), id: 'theme-1' })
          .mockResolvedValueOnce({ exists: true, data: () => ({ available: true, title: 'Theme' }), id: 'theme-1' });
        const res = await request(app).put('/theme-1').send({ available: true });
        expect(res.status).toBe(canPublish(role) ? 200 : 403);
      });

      it(`${canDelete(role) ? 'can' : 'cannot'} delete theme`, async () => {
        resetFirestoreMocks(true, { title: 'Theme' });
        const res = await request(app).delete('/theme-1');
        expect(res.status).toBe(canDelete(role) ? 202 : 403);
      });

      it(`${canPublish(role) ? 'can' : 'cannot'} create published prayer`, async () => {
        mockThemeAndPrayerDocs(true, false);

        const res = await request(app)
          .post('/theme-1/prayers/prayer-1')
          .send({ title: 'Prayer', index: 1, status: 'published' });

        expect(res.status).toBe(canPublish(role) ? 201 : 403);
      });

      it(`${canDelete(role) ? 'can' : 'cannot'} delete prayer`, async () => {
        resetFirestoreMocks(true, { title: 'Prayer', status: 'draft' });
        const res = await request(app).delete('/theme-1/prayers/prayer-1');
        expect(res.status).toBe(canDelete(role) ? 200 : 403);
      });
    });

    describe('users', () => {
      const app = mountWithStaff(userRoutes, role);

      it(`${canAccessUsers(role) ? 'can' : 'cannot'} list users`, async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(canAccessUsers(role) ? 200 : 403);
        if (!canAccessUsers(role)) {
          expect(res.body.error).toMatch(/superadmin role required/);
        }
      });
    });

    describe('staff', () => {
      const app = mountWithStaff(staffRoutes, role);

      it('can change own password', async () => {
        const res = await request(app)
          .put('/me/password')
          .send({ password: 'new-password-123' });
        expect(res.status).toBe(200);
      });

      it(`${canDelete(role) ? 'can' : 'cannot'} list staff`, async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(canDelete(role) ? 200 : 403);
        if (!canDelete(role)) {
          expect(res.body.error).toBe('Super admin required');
        }
      });
    });
  });
});
