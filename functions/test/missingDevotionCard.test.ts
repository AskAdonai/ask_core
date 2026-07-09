import { getJourneyPrayerContent } from '../src/services/prayerCardService';
import {
  getDevotionDayNotReadyMessage,
  getJourneyHoldingMessage,
} from '../src/services/journeyStageService';
import { deliverDeclaration } from '../src/webhook/handlers/declarationHandler';
import { handleYesDeclaration } from '../src/webhook/handlers/yesHandler';
import { buildMorningTemplateBody } from '../src/messages/morningMessage';

const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();
const mockUpdate = jest.fn();

mockWhere.mockReturnValue({
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
});
mockLimit.mockReturnValue({ get: mockGet });
mockDoc.mockReturnValue({
  get: mockGet,
  update: mockUpdate,
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
  FieldValue: {
    increment: jest.fn((value: number) => ({ __increment: value })),
  },
}));

jest.mock('../src/services/prayerCardService', () => ({
  getJourneyPrayerContent: jest.fn(),
  getPrayerCard: jest.fn(),
}));

jest.mock('../src/services/twilioService', () => ({
  sendWhatsAppMessage: jest.fn(),
  sendKnockResponse: jest.fn(),
  sendMultiplyDeclarationAck: jest.fn(),
}));

jest.mock('../src/services/streakService', () => ({
  incrementStreak: jest.fn().mockResolvedValue({
    incremented: true,
    streak: 3,
    vineStage: 'Grafted',
    alreadyDeclaredToday: false,
    streakReset: false,
  }),
  recordMultiplyDeclaration: jest.fn(),
}));

jest.mock('../src/services/streakMilestoneService', () => ({
  buildMilestoneCelebration: jest.fn().mockResolvedValue({ text: '', highestReached: 0 }),
}));

jest.mock('../src/services/journeyStageService', () => ({
  getJourneyStage: jest.fn().mockResolvedValue({ stageNumber: 1, title: 'Believe', dayCount: 130 }),
  getMaxStageNumber: jest.fn().mockResolvedValue(9),
  buildJourneyCompletionMessage: jest.fn(),
  getJourneyHoldingMessage: jest.fn(() => 'season holding'),
  getDevotionDayNotReadyMessage: jest.fn(
    () => "Today's devotion isn't ready yet — check back soon. Your journey day will stay right here until it is. 🙏",
  ),
  areJourneyStagesReady: jest.fn().mockResolvedValue(true),
}));

import { getJourneyPrayerContent as mockGetJourneyPrayerContent } from '../src/services/prayerCardService';
import { sendWhatsAppMessage } from '../src/services/twilioService';
import { getFirestore } from 'firebase-admin/firestore';

describe('missing devotion card handling', () => {
  const phone = '+15551234567';
  const userDay20 = {
    name: 'Friend',
    timezone: 'UTC',
    journeyStage: 1,
    journeyDayIndex: 20,
    lastMilestoneStreakDays: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ exists: false });
    (mockGetJourneyPrayerContent as jest.Mock).mockResolvedValue(null);
  });

  it('morning template build is not called when no card exists', async () => {
    const content = await (mockGetJourneyPrayerContent as jest.Mock)(1, 20);
    expect(content).toBeNull();
    expect(getDevotionDayNotReadyMessage()).toContain("Today's devotion isn't ready yet");
  });

  it('SEEK falls back to generic declaration when no card exists', async () => {
    const { sendKnockResponse } = await import('../src/services/twilioService');
    await deliverDeclaration(phone, userDay20);

    expect(sendKnockResponse).toHaveBeenCalledWith(
      phone,
      "I declare God's goodness over my life today.",
      [],
    );
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('YES does not advance journeyDayIndex when no deliverable card exists', async () => {
    await handleYesDeclaration(phone, 'YES', userDay20);

    const db = getFirestore();
    expect(db.collection).toHaveBeenCalledWith('users');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        journeyDayIndex: expect.anything(),
      }),
    );
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('Declaration received'),
    );
  });

  it('YES advances journeyDayIndex when deliverable card exists', async () => {
    (mockGetJourneyPrayerContent as jest.Mock).mockResolvedValue({
      card: { title: 'Test', prayerText: 'Body' },
      source: 'journey',
    });

    await handleYesDeclaration(phone, 'YES', { ...userDay20, journeyDayIndex: 4 });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        journeyDayIndex: { __increment: 1 },
      }),
    );
  });
});
