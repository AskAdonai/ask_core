const sendWhatsAppMessage = jest.fn();
const update = jest.fn();
const getPrayerCard = jest.fn();
const getNeedPrayerCard = jest.fn();
const getActiveNeedTheme = jest.fn();
const incrementStreak = jest.fn();
const getUser = jest.fn();
const setPauseState = jest.fn();
const saveJournalEntry = jest.fn();
const setAwaitingJournal = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ update })),
    })),
  })),
  FieldValue: {
    increment: jest.fn((value: number) => ({ __increment: value })),
  },
}));

jest.mock('../src/services/twilioService', () => ({
  sendWhatsAppMessage,
  runWithTwilioResponseContext: (_payload: Record<string, unknown>, fn: () => Promise<unknown>) => fn(),
}));

jest.mock('../src/services/prayerCardService', () => ({
  getPrayerCard,
  getNeedPrayerCard,
}));

jest.mock('../src/services/needSessionService', () => ({
  getActiveNeedTheme,
}));

jest.mock('../src/services/streakService', () => ({
  incrementStreak,
}));

jest.mock('../src/services/userService', () => ({
  getUser,
  setPauseState,
}));

jest.mock('../src/services/journalService', () => ({
  saveJournalEntry,
  setAwaitingJournal,
}));

import { handleKnock } from '../src/handlers/knockHandler';
import { handleYesDeclaration } from '../src/handlers/yesHandler';
import { handleWebhookRequest } from '../src/handlers/webhook';
import type { User } from '../src/types/schemas';

describe('KNOCK declaration flow', () => {
  const phone = '+15551234567';
  const originalNodeEnv = process.env.NODE_ENV;
  const user: Partial<User> = {
    timezone: 'Africa/Lagos',
    journeyStage: 1,
    journeyDayIndex: 1,
    vineStage: 'Grafted',
    streak: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getActiveNeedTheme.mockResolvedValue(null);
    getNeedPrayerCard.mockResolvedValue(null);
    process.env.FIREBASE_PROJECT_ID = 'test-project';
  });

  afterEach(() => {
    delete process.env.FIREBASE_PROJECT_ID;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('delivers the declaration, audio, and opens the YES loop', async () => {
    getPrayerCard.mockResolvedValue({
      declarationText: 'The Lord is my shepherd; I shall not want.',
      declarationAudioUrl: 'https://cdn.example.test/declaration.mp3',
    });

    await handleKnock(phone, user);

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining("Today's declaration:\n\nThe Lord is my shepherd; I shall not want."),
      ['https://cdn.example.test/declaration.mp3'],
    );
    expect(sendWhatsAppMessage.mock.calls[0][1]).toContain('Speak it 10 times');
    expect(sendWhatsAppMessage.mock.calls[0][1]).toContain('*YES* — I declare it');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      awaitingDeclarationYes: true,
    }));
  });

  it('records a single YES and keeps prompting until 10 declarations', async () => {
    incrementStreak.mockResolvedValue({
      incremented: true,
      streak: 1,
      vineStage: 'Grafted',
      declarationsToday: 1,
    });

    await handleYesDeclaration(phone, 'yes', user);

    expect(incrementStreak).toHaveBeenCalledWith(phone, 'Africa/Lagos', 1);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('1 of 10. Keep going.'),
    );
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({
      awaitingDeclarationYes: false,
    }));
  });

  it('accepts YES x10 and completes the declaration streak marker', async () => {
    incrementStreak.mockResolvedValue({
      incremented: true,
      streak: 1,
      vineStage: 'Grafted',
      declarationsToday: 10,
    });

    await handleYesDeclaration(phone, 'yes x10', user);

    expect(incrementStreak).toHaveBeenCalledWith(phone, 'Africa/Lagos', 10);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      '10 declarations received. Well done. Your vine grows stronger today.',
    );
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      awaitingDeclarationYes: false,
    }));
  });

  it('routes a mixed-case Yes webhook reply into the declaration flow', async () => {
    process.env.NODE_ENV = 'production';
    getUser.mockResolvedValue({
      ...user,
      awaitingDeclarationYes: true,
    });
    incrementStreak.mockResolvedValue({
      incremented: true,
      streak: 1,
      vineStage: 'Grafted',
      declarationsToday: 1,
    });

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    await handleWebhookRequest(
      {
        body: {
          From: `whatsapp:${phone}`,
          Body: 'Yes',
          ProfileName: 'Test User',
        },
      } as any,
      { status, json } as any,
    );

    expect(incrementStreak).toHaveBeenCalledWith(phone, 'Africa/Lagos', 1);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('1 of 10. Keep going.'),
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ status: 'ok', action: 'declaration_yes' });
  });
});
