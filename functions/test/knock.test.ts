const sendWhatsAppMessage = jest.fn();
const sendKnockResponse = jest.fn();
const update = jest.fn();
const getJourneyPrayerContent = jest.fn();
const getKnockPrayerContent = jest.fn();
const getActiveKnockTheme = jest.fn();
const incrementStreak = jest.fn();
const getUser = jest.fn();
const setPauseState = jest.fn();
const saveJournalEntry = jest.fn();
const setAwaitingJournal = jest.fn();
const triggerThemeSelection = jest.fn();
const clearPendingStates = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/webhook/handlers/themeSelectionHandler', () => ({
  triggerThemeSelection,
  handleThemeSelection: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ 
        update,
        get: jest.fn(() => Promise.resolve({ exists: false, data: () => ({}) }))
      })),
    })),
  })),
  FieldValue: {
    increment: jest.fn((value: number) => ({ __increment: value })),
  },
}));

jest.mock('../src/services/twilioService', () => ({
  sendWhatsAppMessage,
  sendKnockResponse,
  runWithTwilioResponseContext: (_payload: Record<string, unknown>, fn: () => Promise<unknown>) => fn(),
}));

jest.mock('../src/services/prayerCardService', () => ({
  getJourneyPrayerContent,
  getKnockPrayerContent,
}));

jest.mock('../src/services/knockSessionService', () => ({
  getActiveKnockTheme,
}));

jest.mock('../src/services/streakService', () => ({
  incrementStreak,
}));

jest.mock('../src/services/userService', () => ({
  getUser,
  setPauseState,
  clearPendingStates,
}));

jest.mock('../src/services/journalService', () => ({
  saveJournalEntry,
  setAwaitingJournal,
}));

import { deliverDeclaration } from '../src/webhook/handlers/declarationHandler';
import * as declarationHandler from '../src/webhook/handlers/declarationHandler';
import { handleYesDeclaration } from '../src/webhook/handlers/yesHandler';
import { handleWebhookRequest } from '../src/webhook/webhookRouter';
import type { User } from '../src/types/schemas';

describe('SEEK declaration flow', () => {
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
    getActiveKnockTheme.mockResolvedValue(null);
    getKnockPrayerContent.mockResolvedValue(null);
    getJourneyPrayerContent.mockResolvedValue(null);
    process.env.FIREBASE_PROJECT_ID = 'test-project';
  });

  afterEach(() => {
    delete process.env.FIREBASE_PROJECT_ID;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('delivers the declaration, audio, and opens the YES loop', async () => {
    getJourneyPrayerContent.mockResolvedValue({
      prayer: {
        declarationText: 'The Lord is my shepherd; I shall not want.',
        declarationAudioUrl: 'https://cdn.example.test/declaration.mp3',
      },
    });

    await deliverDeclaration(phone, user);

    expect(sendKnockResponse).toHaveBeenCalledWith(
      phone,
      'The Lord is my shepherd; I shall not want.',
      ['https://cdn.example.test/declaration.mp3'],
    );
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      awaitingDeclarationYes: true,
    }));
  });

  it('records a YES and completes the daily declaration', async () => {
    incrementStreak.mockResolvedValue({
      incremented: true,
      streak: 1,
      vineStage: 'Grafted',
      alreadyDeclaredToday: false,
    });

    await handleYesDeclaration(phone, 'yes', user);

    expect(incrementStreak).toHaveBeenCalledWith(phone, 'Africa/Lagos');
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('Declaration received. Well done, Friend. Your vine grows stronger today. 🌿'),
    );
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({
      awaitingDeclarationYes: true,
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
      alreadyDeclaredToday: false,
    });

    const status = jest.fn().mockReturnThis();
    const end = jest.fn().mockReturnThis();
    const send = jest.fn();
    const json = jest.fn();

    await handleWebhookRequest(
      {
        body: {
          From: `whatsapp:${phone}`,
          Body: 'Yes',
          ProfileName: 'Test User',
        },
      } as any,
      { status, end, json, send } as any,
    );

    expect(incrementStreak).toHaveBeenCalledWith(phone, 'Africa/Lagos');
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('Declaration received. Well done, Friend. Your vine grows stronger today. 🌿'),
    );
    expect(status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('routes seek to the declaration flow', async () => {
    process.env.NODE_ENV = 'production';
    getUser.mockResolvedValue(user);
    const deliverSpy = jest.spyOn(declarationHandler, 'deliverDeclaration').mockResolvedValue(undefined);

    const status = jest.fn().mockReturnThis();
    const end = jest.fn().mockReturnThis();
    const send = jest.fn();

    await handleWebhookRequest(
      {
        body: {
          From: `whatsapp:${phone}`,
          Body: 'seek',
        },
      } as any,
      { status, end, send } as any,
    );

    expect(deliverSpy).toHaveBeenCalledWith(phone, user);
    expect(status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();

    deliverSpy.mockRestore();
  });

  it('routes knock to the prayer theme menu', async () => {
    process.env.NODE_ENV = 'production';
    getUser.mockResolvedValue(user);
    triggerThemeSelection.mockResolvedValue(undefined);

    const status = jest.fn().mockReturnThis();
    const end = jest.fn().mockReturnThis();
    const send = jest.fn();

    await handleWebhookRequest(
      {
        body: {
          From: `whatsapp:${phone}`,
          Body: 'knock',
        },
      } as any,
      { status, end, send } as any,
    );

    expect(triggerThemeSelection).toHaveBeenCalledWith(phone, user);
    expect(status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('routes ask even while awaitingDeclarationYes', async () => {
    process.env.NODE_ENV = 'production';
    getUser.mockResolvedValue({
      ...user,
      awaitingDeclarationYes: true,
      name: 'Friend',
      vineStage: 'Rooted',
      streak: 7,
    });

    const status = jest.fn().mockReturnThis();
    const end = jest.fn().mockReturnThis();
    const send = jest.fn();

    await handleWebhookRequest(
      {
        body: {
          From: `whatsapp:${phone}`,
          Body: 'Ask',
        },
      } as any,
      { status, end, send } as any,
    );

    expect(clearPendingStates).toHaveBeenCalledWith(phone);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('Your vine is Rooted'),
    );
    expect(status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
