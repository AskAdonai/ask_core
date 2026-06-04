import {
  getPrayerCard,
  getPrayerCardForDay,
  getThemePrayer,
  getJourneyPrayerContent,
  getNeedPrayerCard,
  getNeedPrayerContent
} from '../src/services/prayerCardService';

const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

// Build a chainable mock for Firestore queries
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
      const card = await getPrayerCard(1, 5);
      expect(card).toBeNull();
      expect(mockCollection).toHaveBeenCalledWith('prayerCards');
      expect(mockWhere).toHaveBeenCalledWith('journeyStage', '==', 1);
      expect(mockWhere).toHaveBeenCalledWith('dayIndex', '==', 5);
    });

    it('returns the card data if found', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ themeId: 'test' }) }],
      });
      const card = await getPrayerCard(1, 5);
      expect(card?.themeId).toBe('test');
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

  describe('getThemePrayer', () => {
    it('returns null if prayer doc does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });
      const prayer = await getThemePrayer('healing', 'prayer-1');
      expect(prayer).toBeNull();
    });

    it('returns prayer data if exists', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ title: 'Healing Prayer' }),
      });
      const prayer = await getThemePrayer('healing', 'prayer-1');
      expect(prayer?.title).toBe('Healing Prayer');
    });
  });

  describe('getJourneyPrayerContent', () => {
    it('returns null if card is missing', async () => {
      // getPrayerCard returns null
      mockGet.mockResolvedValueOnce({ empty: true });
      const result = await getJourneyPrayerContent(1, 5);
      expect(result).toBeNull();
    });

    it('returns null if theme prayer is missing', async () => {
      // card found
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ themeId: 'healing', prayerId: 'prayer-1' }) }],
      });
      // prayer not found
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await getJourneyPrayerContent(1, 5);
      expect(result).toBeNull();
    });

    it('returns combined content', async () => {
      const mockCard = { themeId: 'healing', prayerId: 'prayer-1' };
      const mockPrayer = { title: 'Healing Prayer' };
      
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => mockCard }],
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockPrayer,
      });

      const result = await getJourneyPrayerContent(1, 5);
      expect(result).toEqual({
        card: mockCard,
        prayer: mockPrayer,
        themeId: 'healing',
        prayerId: 'prayer-1',
        source: 'journey',
      });
    });
  });

  describe('getNeedPrayerCard', () => {
    it('returns null if no query match', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });
      const prayer = await getNeedPrayerCard('finances', 1);
      expect(prayer).toBeNull();
    });

    it('returns prayer by index', async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ title: 'Finance Prayer' }) }],
      });
      const prayer = await getNeedPrayerCard('finances', 1);
      expect(prayer?.title).toBe('Finance Prayer');
    });
  });

  describe('getNeedPrayerContent', () => {
    it('translates 0-based index to 1-based index', async () => {
      // 0 -> 1
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ title: 'First Prayer' }) }],
      });
      
      const result = await getNeedPrayerContent('finances', 0);
      expect(result?.prayer.title).toBe('First Prayer');
      expect(mockWhere).toHaveBeenCalledWith('index', '==', 1);
    });

    it('returns null if not found', async () => {
      mockGet.mockResolvedValueOnce({ empty: true });
      const result = await getNeedPrayerContent('finances', 1);
      expect(result).toBeNull();
    });
  });
});
