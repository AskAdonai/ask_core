const sendWhatsAppMessage = jest.fn();
const update = jest.fn();
const fieldDelete = jest.fn(() => ({ __delete: true }));

const prayerDocs: Record<string, { id: string; data: Record<string, unknown> }> = {
  'prayer-1': {
    id: 'prayer-1',
    data: {
      title: 'First',
      prayerText: 'Prayer one body',
      index: 1,
      status: 'published',
    },
  },
  'prayer-2': {
    id: 'prayer-2',
    data: {
      title: 'Second',
      prayerText: 'Prayer two body',
      index: 2,
      status: 'published',
    },
  },
};

const mockPrayersGet = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((name: string) => {
      if (name === 'prayerThemes') {
        return {
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              get: mockPrayersGet,
            })),
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ displayName: 'Career' }),
            }),
          })),
        };
      }
      return {
        doc: jest.fn(() => ({ update })),
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          })),
        })),
      };
    }),
  })),
  FieldValue: {
    delete: fieldDelete,
  },
}));

jest.mock('../src/services/twilioService', () => ({
  sendWhatsAppMessage,
}));

import {
  deliverNextKnockPrayer,
  KNOCK_DAILY_LIMIT_MESSAGE,
  resolveKnockCount,
} from '../src/services/knockPrayerDeliveryService';

describe('KNOCK knockCount progression', () => {
  const phone = '+15551234567';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrayersGet.mockResolvedValue({
      docs: Object.values(prayerDocs).map((entry) => ({
        id: entry.id,
        data: () => entry.data,
      })),
    });
  });

  it('migrates legacy delivered IDs into knockCount', () => {
    expect(
      resolveKnockCount({
        knockDeliveredPrayerIds: ['prayer-1'],
        knockCurrentPrayerId: 'prayer-2',
      }),
    ).toBe(2);
  });

  it('first KNOCK delivers prayer at knockCount 1', async () => {
    const result = await deliverNextKnockPrayer(phone, 'career_work', 'Career', {
      timezone: 'UTC',
      knockCount: 1,
      lastKnockDate: '',
    });

    expect(result).toBe('delivered');
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('Prayer one body'),
      undefined,
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        knockCount: 1,
        lastKnockDate: expect.any(String),
      }),
    );
  });

  it('second KNOCK same day resends full prayer content', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await deliverNextKnockPrayer(phone, 'career_work', 'Career', {
      timezone: 'UTC',
      knockCount: 1,
      lastKnockDate: today,
    });

    expect(result).toBe('resent');
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('Prayer one body'),
      undefined,
    );
    expect(sendWhatsAppMessage).not.toHaveBeenCalledWith(phone, KNOCK_DAILY_LIMIT_MESSAGE);
  });

  it('on a new day advances knockCount and delivers the next prayer', async () => {
    const result = await deliverNextKnockPrayer(phone, 'career_work', 'Career', {
      timezone: 'UTC',
      knockCount: 1,
      lastKnockDate: '2020-01-01',
    });

    expect(result).toBe('delivered');
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('Prayer two body'),
      undefined,
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        knockCount: 2,
        lastKnockDate: expect.any(String),
      }),
    );
  });

  it('marks theme exhausted when knockCount exceeds available prayers', async () => {
    const result = await deliverNextKnockPrayer(phone, 'career_work', 'Career', {
      timezone: 'UTC',
      knockCount: 2,
      lastKnockDate: '2020-01-01',
    });

    expect(result).toBe('exhausted');
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('all the targeted prayers'),
    );
  });
});
