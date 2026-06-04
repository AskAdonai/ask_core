import {
  getQuizSession,
  startQuizSession,
  recordAnswer,
  clearQuizSession
} from '../src/services/quizSessionService';

const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  update: mockUpdate,
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

describe('quizSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuizSession', () => {
    it('returns null if user does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });
      const session = await getQuizSession('+15551234567');
      expect(session).toBeNull();
    });

    it('returns null if user is not awaiting quiz answer', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ awaitingQuizAnswer: false }),
      });
      const session = await getQuizSession('+15551234567');
      expect(session).toBeNull();
    });

    it('returns null if quest content does not exist', async () => {
      // user fetch
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ awaitingQuizAnswer: true, questWeek: 1 }),
      });
      // content fetch
      mockGet.mockResolvedValueOnce({ exists: false });
      
      const session = await getQuizSession('+15551234567');
      expect(session).toBeNull();
    });

    it('returns session state', async () => {
      // user fetch
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ awaitingQuizAnswer: true, questWeek: 2, currentQuizQuestionIndex: 1, currentQuizScore: 1 }),
      });
      // content fetch
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ quizQuestions: [{ question: 'Q1?' }, { question: 'Q2?' }], weekTitle: 'Genesis' }),
      });

      const session = await getQuizSession('+15551234567');
      expect(session).toEqual({
        week: 2,
        questionIndex: 1,
        score: 1,
        questions: [{ question: 'Q1?' }, { question: 'Q2?' }],
        bookTitle: 'Genesis',
      });
    });
  });

  describe('startQuizSession', () => {
    it('updates user doc and returns initial state', async () => {
      const mockQuestions = [{ question: 'Q1?' } as any];
      const result = await startQuizSession('+15551234567', 1, 'Book Title', mockQuestions);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        awaitingQuizAnswer: true,
        currentQuizQuestionIndex: 0,
        currentQuizScore: 0,
      }));
      expect(result).toEqual({
        week: 1,
        questionIndex: 0,
        score: 0,
        questions: mockQuestions,
        bookTitle: 'Book Title',
      });
    });
  });

  describe('recordAnswer', () => {
    it('increments index and score if correct', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ currentQuizQuestionIndex: 1, currentQuizScore: 1 }),
      });

      const result = await recordAnswer('+15551234567', true);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        currentQuizQuestionIndex: 2,
        currentQuizScore: 2,
      }));
      expect(result).toEqual({ questionIndex: 2, score: 2 });
    });

    it('increments index only if incorrect', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ currentQuizQuestionIndex: 1, currentQuizScore: 1 }),
      });

      const result = await recordAnswer('+15551234567', false);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        currentQuizQuestionIndex: 2,
        currentQuizScore: 1,
      }));
      expect(result).toEqual({ questionIndex: 2, score: 1 });
    });
  });

  describe('clearQuizSession', () => {
    it('resets quiz fields on user doc', async () => {
      await clearQuizSession('+15551234567');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        awaitingQuizAnswer: false,
        currentQuizQuestionIndex: 0,
        currentQuizScore: 0,
      }));
    });
  });
});
