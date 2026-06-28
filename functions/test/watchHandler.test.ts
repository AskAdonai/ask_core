const sendWhatsAppMessage = jest.fn().mockResolvedValue('SM_test');
const getQuestProgress = jest.fn();
const syncQuestWeekToCalendar = jest.fn().mockResolvedValue(26);
const advanceQuestVideo = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/services/twilioService', () => ({
  sendWhatsAppMessage,
}));

jest.mock('../src/services/questProgressService', () => ({
  getQuestProgress,
  syncQuestWeekToCalendar,
  advanceQuestVideo,
}));

const mockGet = jest.fn();
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ get: mockGet })),
    })),
  })),
}));

import { deliverNextVideoEarly } from '../src/webhook/handlers/watchHandler';
import type { User } from '../src/types/schemas';

describe('deliverNextVideoEarly', () => {
  const phone = '+15551234567';
  const user: Partial<User> = {
    questActive: true,
    timezone: 'UTC',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getQuestProgress.mockResolvedValue({
      active: true,
      week: 26,
      videoIndex: 0,
      chaptersLogged: 0,
    });
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        weekNumber: 26,
        weeklyChapterSpan: 'Genesis 1–23',
        days: {
          monday: {
            readingPortion: 'Genesis 1–8',
            videoLink: 'https://youtu.be/abc123',
          },
          wednesday: {
            readingPortion: 'Genesis 9–16',
            videoLink: 'https://youtu.be/def456',
          },
          friday: {
            readingPortion: 'Genesis 17–23',
            videoLink: 'https://youtu.be/ghi789',
          },
        },
      }),
    });
  });

  it('sends the video link in the message body, not as mediaUrl', async () => {
    await deliverNextVideoEarly(phone, user);

    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    const [to, body, mediaUrl] = sendWhatsAppMessage.mock.calls[0];
    expect(to).toBe(phone);
    expect(body).toContain('👉 Watch here: https://youtu.be/abc123');
    expect(body).toContain('Genesis 1–8');
    expect(mediaUrl).toBeUndefined();
    expect(advanceQuestVideo).toHaveBeenCalledWith(phone);
  });

  it('does not advance the video index when Twilio send fails', async () => {
    sendWhatsAppMessage.mockRejectedValueOnce(new Error('Twilio down'));

    await deliverNextVideoEarly(phone, user);

    expect(advanceQuestVideo).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(2);
    expect(sendWhatsAppMessage.mock.calls[1][1]).toContain("couldn't send that video");
  });
});
