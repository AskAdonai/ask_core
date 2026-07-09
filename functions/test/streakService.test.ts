import { incrementStreak, recordMultiplyDeclaration } from '../src/services/streakService';
import { DateTime } from 'luxon';

const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

mockDoc.mockReturnValue({
  collection: mockCollection,
});
mockCollection.mockReturnValue({
  doc: mockDoc,
});

const mockRunTransaction = jest.fn(async (callback) => {
  const transaction = {
    get: mockGet,
    update: mockUpdate,
    set: mockSet,
  };
  return callback(transaction);
});

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  })),
  FieldValue: {
    increment: jest.fn((val) => ({ __increment: val })),
    arrayUnion: jest.fn((val) => ({ __arrayUnion: val })),
  },
}));

describe('streakService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('incrementStreak', () => {
    it('throws if user not found', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });
      await expect(incrementStreak('+15551234567', 'UTC')).rejects.toThrow('User not found');
    });

    it('increments streak and declarations if not done today', async () => {
      // Mock user doc with a lastActiveDate in the past
      const pastDate = DateTime.now().setZone('UTC').minus({ days: 1 }).toJSDate();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          streak: 5,
          vineStage: 'Grafted',
          declarationsToday: 0,
          graceDaysRemaining: 3,
          lastActiveDate: { toDate: () => pastDate },
        }),
      });

      const result = await incrementStreak('+15551234567', 'UTC');

      expect(result).toEqual({
        incremented: true,
        streak: 6,
        vineStage: 'Grafted',
        alreadyDeclaredToday: false,
        streakReset: false,
      });

      // Assert transaction updates
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ streak: 6, vineStage: expect.any(String) })
      );
    });

    it('routes to multiply path when already declared today', async () => {
      const todayDate = DateTime.now().setZone('UTC').toJSDate();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          streak: 5,
          vineStage: 'Rooted',
          declarationsToday: 2,
          lastActiveDate: { toDate: () => todayDate },
        }),
      });

      const result = await incrementStreak('+15551234567', 'UTC');

      expect(result).toEqual({
        incremented: false,
        streak: 5,
        vineStage: 'Rooted',
        alreadyDeclaredToday: true,
        streakReset: false,
      });

      const updateCalls = mockUpdate.mock.calls;
      const streakUpdateCall = updateCalls.find(call => call[1].streak !== undefined);
      expect(streakUpdateCall).toBeUndefined();
    });

    it('resets streak to 1 and writes shadow history when grace is exhausted', async () => {
      const fiveDaysAgo = DateTime.now().setZone('UTC').minus({ days: 5 }).toJSDate();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          streak: 12,
          vineStage: 'Growing',
          declarationsToday: 0,
          graceDaysRemaining: 3,
          lastActiveDate: { toDate: () => fiveDaysAgo },
        }),
      });

      const result = await incrementStreak('+15551234567', 'UTC');

      expect(result).toEqual({
        incremented: true,
        streak: 1,
        vineStage: 'Grafted',
        alreadyDeclaredToday: false,
        streakReset: true,
      });
      expect(mockSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          previousStreak: 12,
          previousVineStage: 'Growing',
          reason: 'grace_exhausted',
        }),
      );
    });
  });

  describe('recordMultiplyDeclaration', () => {
    it('increments declarationsToday when already declared today', async () => {
      const todayDate = DateTime.now().setZone('UTC').toJSDate();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          declarationsToday: 2,
          lastActiveDate: { toDate: () => todayDate },
        }),
      });

      const result = await recordMultiplyDeclaration('+15551234567', 'UTC');

      expect(result).toEqual({ declarationsToday: 3 });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ declarationsToday: 3 }),
      );
    });

    it('throws if first declaration of the day has not been made', async () => {
      const pastDate = DateTime.now().setZone('UTC').minus({ days: 1 }).toJSDate();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          declarationsToday: 0,
          lastActiveDate: { toDate: () => pastDate },
        }),
      });

      await expect(recordMultiplyDeclaration('+15551234567', 'UTC')).rejects.toThrow(
        'Cannot record multiply declaration before first declaration of the day',
      );
    });
  });
});
