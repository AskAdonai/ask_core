import { findNeedThemeMatch, triggerNeedSelection } from '../src/webhook/handlers/needHandler';
import { sendWhatsAppMessage } from '../src/services/twilioService';
import { getFirestore } from 'firebase-admin/firestore';
import type { PrayerTheme } from '../src/types/PrayerTheme';

const themes: PrayerTheme[] = [
  {
    themeId: 'trusting-god',
    displayName: 'Trusting God',
    category: 'Waiting Season',
    menuOrder: 1,
    available: true,
  },
  {
    themeId: 'healing',
    displayName: 'Healing',
    category: 'Restoration',
    menuOrder: 2,
    available: true,
  },
];

describe('findNeedThemeMatch', () => {
  it('does not accept one-letter text as a theme match', () => {
    expect(findNeedThemeMatch(themes, 'T')).toBeNull();
    expect(findNeedThemeMatch(themes, 'h')).toBeNull();
  });

  it('matches by menu number', () => {
    expect(findNeedThemeMatch(themes, '2')?.themeId).toBe('healing');
  });

  it('matches exact and meaningful prefix theme text', () => {
    expect(findNeedThemeMatch(themes, 'Trusting God')?.themeId).toBe('trusting-god');
    expect(findNeedThemeMatch(themes, 'heal')?.themeId).toBe('healing');
    expect(findNeedThemeMatch(themes, 'wait')?.themeId).toBe('trusting-god');
  });
});

// Mock Firestore and Twilio
jest.mock('firebase-admin/firestore');
jest.mock('../src/services/twilioService');

describe('triggerNeedSelection', () => {
  let mockUpdate: jest.Mock;
  let mockGetConfig: jest.Mock;
  let mockGetThemes: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdate = jest.fn();
    mockGetConfig = jest.fn();
    mockGetThemes = jest.fn().mockResolvedValue({
      docs: [
        { data: () => ({ themeId: 't1', displayName: 'Theme 1', menuOrder: 1, available: true }) }
      ]
    });

    (getFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn((colName) => {
        if (colName === 'users') {
          return { doc: jest.fn(() => ({ update: mockUpdate })) };
        }
        if (colName === 'systemConfig') {
          return { doc: jest.fn(() => ({ get: mockGetConfig })) };
        }
        if (colName === 'prayerThemes') {
          return { get: mockGetThemes };
        }
        return {};
      })
    });
  });

  it('sends the text menu if no systemConfig image URL is set', async () => {
    mockGetConfig.mockResolvedValueOnce({ exists: false });

    await triggerNeedSelection('+123456', { name: 'Test' });

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      '+123456',
      expect.stringContaining('1. Theme 1'),
      undefined
    );
  });

  it('sends the image menu if needMenuImageUrl is configured', async () => {
    const dummyUrl = 'https://example.com/menu.jpg';
    mockGetConfig.mockResolvedValueOnce({
      exists: true,
      data: () => ({ needMenuImageUrl: dummyUrl })
    });

    await triggerNeedSelection('+123456', { name: 'Test' });

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      '+123456',
      expect.not.stringContaining('1. Theme 1'), // should NOT send the text list
      [dummyUrl]
    );
  });
});
