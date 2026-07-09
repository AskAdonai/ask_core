import {
  getPrayerCard,
  getPrayerCardForDay,
  getPrayer,
  getJourneyPrayerContent,
  getKnockPrayerCard,
  getKnockPrayerContent
} from '../src/services/prayerCardService';

const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

mockWhere.mockReturnValue({
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
});
mockLimit.mockReturnValue({
  get: mockGet,
});
mockDoc.mockReturnValue({
  get: mockGet,
  collection: mockCollection,
});
mockCollection.mockReturnValue({
  where: mockWhere,
  doc: mockDoc,
  get: mockGet,
});

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

describe('prayerCardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrayerCard', () => {
    it('returns null if no card is found', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });
      mockGet.mockResolvedValueOnce({ empty: true });
      const card = await getPrayerCard(1, 5);
      expect(card).toBeNull();
      expect(mockCollection).toHaveBeenCalledWith('prayerCards');
      expect(mockWhere).toHaveBeenCalledWith('journeyStage', '==', 1);
      expect(mockWhere).toHaveBeenCalledWith('deliveryOrder', '==', 5);
      expect(mockWhere).toHaveBeenCalledWith('dayIndex', '==', 5);
    });

    it('returns the card data if found', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ title: 'Standing In Freedom' }) }],
      });
      const card = await getPrayerCard(1, 5);
      expect(card?.title).toBe('Standing In Freedom');
    });
  });

  describe('getPrayerCardForDay (deprecated)', () => {
    it('returns card by day index', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ dayIndex: 5 }) }],
      });
      const card = await getPrayerCardForDay(5);
      expect(card?.dayIndex).toBe(5);
    });
  });

  describe('getPrayer', () => {
    it('returns null without calling Firestore when ids are missing', async () => {
      const prayer = await getPrayer('', 'prayer-1');
      expect(prayer).toBeNull();
      expect(mockCollection).not.toHaveBeenCalled();
    });

    it('returns null if prayer doc does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });
      const prayer = await getPrayer('healing', 'prayer-1');
      expect(prayer).toBeNull();
    });

    it('returns prayer data if exists', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ title: 'Healing Prayer' }),
      });
      const prayer = await getPrayer('healing', 'prayer-1');
      expect(prayer?.title).toBe('Healing Prayer');
    });
  });

  describe('getJourneyPrayerContent', () => {
    it('returns null if card is missing', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });
      mockGet.mockResolvedValueOnce({ empty: true });
      const result = await getJourneyPrayerContent(1, 5);
      expect(result).toBeNull();
    });

    it('returns null if card is missing title or prayer body', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ title: '', prayerText: '' }) }],
      });

      const result = await getJourneyPrayerContent(1, 5);
      expect(result).toBeNull();
    });

    it('returns card-only journey content when deliverable', async () => {
      const mockCard = {
        title: 'Standing In Freedom',
        prayerText: 'Lord, help me walk in freedom today.',
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => mockCard }],
      });

      const result = await getJourneyPrayerContent(1, 5);
      expect(result).toEqual({
        card: mockCard,
        source: 'journey',
      });
    });
  });

  describe('getKnockPrayerCard', () => {
    it('returns null if no query match', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });
      const prayer = await getKnockPrayerCard('finances', 1);
      expect(prayer).toBeNull();
    });

    it('returns prayer by index', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ title: 'Finance Prayer' }) }],
      });
      const prayer = await getKnockPrayerCard('finances', 1);
      expect(prayer?.title).toBe('Finance Prayer');
    });
  });

  describe('getKnockPrayerContent', () => {
    it('translates 0-based index to 1-based index', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ title: 'First Prayer' }) }],
      });

      const result = await getKnockPrayerContent('finances', 0);
      expect(result?.prayer.title).toBe('First Prayer');
      expect(mockWhere).toHaveBeenCalledWith('index', '==', 1);
    });

    it('returns null if not found', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });
      const result = await getKnockPrayerContent('finances', 1);
      expect(result).toBeNull();
    });
  });
});
