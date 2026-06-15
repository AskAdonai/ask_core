import { incrementStreak } from '../src/services/streakService';
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
          lastActiveDate: { toDate: () => pastDate },
        }),
      });

      const result = await incrementStreak('+15551234567', 'UTC');

      expect(result).toEqual({
        incremented: true,
        streak: 6,
        vineStage: 'Grafted',
        alreadyDeclaredToday: false,
      });

      // Assert transaction updates
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ streak: 6, vineStage: expect.any(String) })
      );
    });

    it('increments declarations only if already done today', async () => {
      const todayDate = DateTime.now().setZone('UTC').toJSDate();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          streak: 5,
          vineStage: 'Rooted',
          declarationsToday: 1,
          lastActiveDate: { toDate: () => todayDate },
        }),
      });

      const result = await incrementStreak('+15551234567', 'UTC');

      expect(result).toEqual({
        incremented: false,
        streak: 5,
        vineStage: 'Rooted',
        alreadyDeclaredToday: true,
      });

      // Should not update streak
      const updateCalls = mockUpdate.mock.calls;
      const streakUpdateCall = updateCalls.find(call => call[1].streak !== undefined);
      expect(streakUpdateCall).toBeUndefined();
    });
  });
});
