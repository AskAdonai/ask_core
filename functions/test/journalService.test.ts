import { saveJournalEntry, setAwaitingJournal } from '../src/services/journalService';

const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();

mockDoc.mockReturnValue({
  collection: mockCollection,
  set: mockSet,
});
mockCollection.mockReturnValue({
  doc: mockDoc,
});

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatch = jest.fn(() => ({
  set: mockBatchSet,
  update: mockBatchUpdate,
  commit: mockBatchCommit,
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
    batch: mockBatch,
  })),
}));

describe('journalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveJournalEntry', () => {
    it('saves entry and clears awaiting state using a batch', async () => {
      const today = new Date().toISOString().split('T')[0];
      await saveJournalEntry('+15551234567', 'My journal response');

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          response: 'My journal response',
        }),
        { merge: true }
      );

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          awaitingJournal: false,
          journaledToday: true,
        })
      );

      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('setAwaitingJournal', () => {
    it('sets awaitingJournal flag', async () => {
      await setAwaitingJournal('+15551234567');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ awaitingJournal: true }),
        { merge: true }
      );
    });
  });
});
