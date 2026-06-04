import {
  getQuestProgress,
  startQuest,
  advanceQuestVideo,
  advanceQuestWeek,
  logIndependentChapter,
  recordQuizScore
} from '../src/services/questProgressService';

const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

mockDoc.mockReturnValue({
  get: mockGet,
  update: mockUpdate,
  set: mockSet,
  collection: mockCollection,
});

mockCollection.mockReturnValue({
  doc: mockDoc,
});

const mockBatchUpdate = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn();

const mockBatch = jest.fn(() => ({
  update: mockBatchUpdate,
  set: mockBatchSet,
  commit: mockBatchCommit,
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
    batch: mockBatch,
  })),
  FieldValue: {
    increment: jest.fn((val) => ({ __increment: val })),
    arrayUnion: jest.fn((val) => ({ __arrayUnion: val })),
  },
}));

describe('questProgressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuestProgress', () => {
    it('returns null if user does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });
      const progress = await getQuestProgress('+15551234567');
      expect(progress).toBeNull();
    });

    it('returns progress data', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          questActive: true,
          questWeek: 2,
          questVideoIndex: 1,
          questChaptersLogged: 5,
        }),
      });

      const progress = await getQuestProgress('+15551234567');
      expect(progress).toEqual({
        active: true,
        week: 2,
        videoIndex: 1,
        chaptersLogged: 5,
      });
    });
  });

  describe('startQuest', () => {
    it('resets quest progress fields', async () => {
      await startQuest('+15551234567');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        questActive: true,
        questWeek: 1,
        questVideoIndex: 0,
        questChaptersLogged: 0,
        awaitingQuestConfirm: false,
      }));
    });
  });

  describe('advanceQuestVideo', () => {
    it('increments video index', async () => {
      await advanceQuestVideo('+15551234567');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        questVideoIndex: { __increment: 1 },
      }));
    });
  });

  describe('advanceQuestWeek', () => {
    it('increments week and resets video index', async () => {
      await advanceQuestWeek('+15551234567');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        questWeek: { __increment: 1 },
        questVideoIndex: 0,
      }));
    });
  });

  describe('logIndependentChapter', () => {
    it('uses a batch to update user and push to log array', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ questChaptersLogged: 6 }),
      });

      const result = await logIndependentChapter('+15551234567', 'Genesis 1');

      expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        questChaptersLogged: { __increment: 1 },
      }));
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        chaptersLogged: { __arrayUnion: 'Genesis 1' },
      }), { merge: true });
      expect(mockBatchCommit).toHaveBeenCalled();

      expect(result.totalChapters).toBe(6);
    });
  });

  describe('recordQuizScore', () => {
    it('writes quiz score to daily questLog document', async () => {
      await recordQuizScore('+15551234567', 1, 3, 4);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ quizScore: 3, quizTotal: 4, quizWeek: 1 }),
        { merge: true }
      );
    });
  });
});
