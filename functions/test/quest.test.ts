const sendWhatsAppMessage = jest.fn();
const getUser = jest.fn();
const updateUserFields = jest.fn().mockResolvedValue(undefined);
const stopQuest = jest.fn().mockResolvedValue(undefined);
const getQuestProgress = jest.fn();
const clearPendingStates = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/services/questProgressService', () => ({
  startQuest: jest.fn(),
  stopQuest,
  getQuestProgress,
  syncQuestWeekToCalendar: jest.fn(),
  resolveQuestWeekForUser: jest.fn((user: { questWeek?: number }) => user?.questWeek ?? 26),
  resolveQuestVideoIndexForUser: jest.fn(() => 0),
  advanceQuestVideo: jest.fn(),
  logIndependentChapter: jest.fn(),
}));

jest.mock('../src/services/userService', () => ({
  getUser,
  updateUserFields,
  setPauseState: jest.fn(),
  clearPendingStates,
}));

jest.mock('../src/services/twilioService', () => ({
  sendWhatsAppMessage,
}));

jest.mock('../src/services/optOutService', () => ({
  requestOptOut: jest.fn(),
  cancelOptOut: jest.fn(),
  sendOptOutGraceReminder: jest.fn(),
  isOptedOut: jest.fn(() => false),
}));

jest.mock('../src/services/journalService', () => ({
  saveJournalEntry: jest.fn(),
  setAwaitingJournal: jest.fn(),
}));

jest.mock('../src/webhook/handlers/themeSelectionHandler', () => ({
  triggerThemeSelection: jest.fn(),
  handleThemeSelection: jest.fn(),
}));

jest.mock('../src/webhook/handlers/declarationHandler', () => ({
  deliverDeclaration: jest.fn(),
}));

jest.mock('../src/webhook/handlers/onboardingHandler', () => ({
  handleOnboarding: jest.fn(),
  handleNameReply: jest.fn(),
  handleTimezoneReply: jest.fn(),
  handleTimeReply: jest.fn(),
}));

jest.mock('../src/webhook/handlers/questHandler', () => {
  const actual = jest.requireActual('../src/webhook/handlers/questHandler');
  return actual;
});

import { handleWebhookRequest } from '../src/webhook/webhookRouter';
import type { User } from '../src/types/schemas';

const phone = '+15551234567';

const baseUser: Partial<User> = {
  name: 'Sam',
  timezone: 'UTC',
  reminderTimeLocal: '06:00',
  awaitingOnboardingStep: null,
  questActive: false,
  vineStage: 'Grafted',
  streak: 3,
  awaitingQuestConfirm: false,
};

const mockRes = () => {
  const status = jest.fn().mockReturnThis();
  const end = jest.fn().mockReturnThis();
  const send = jest.fn();
  return { status, end, send };
};

describe('Quest webhook flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
    getUser.mockResolvedValue({ ...baseUser });
    getQuestProgress.mockResolvedValue({
      active: true,
      week: 26,
      videoIndex: 1,
      chaptersLogged: 4,
    });
  });

  it('HELP shows Quest join when user is not on The Quest', async () => {
    const res = mockRes();

    await handleWebhookRequest(
      { body: { From: `whatsapp:${phone}`, Body: 'help' } } as any,
      res as any,
    );

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('*Quest*: Join the Bible-in-a-Year quest'),
    );
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.not.stringContaining('*Unquest*'),
    );
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('HELP shows Unquest when user is on The Quest', async () => {
    getUser.mockResolvedValue({ ...baseUser, questActive: true });
    const res = mockRes();

    await handleWebhookRequest(
      { body: { From: `whatsapp:${phone}`, Body: 'HELP' } } as any,
      res as any,
    );

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('*Unquest* / *Leave Quest*'),
    );
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.not.stringContaining('*Quest*: Join the Bible-in-a-Year quest'),
    );
  });

  it('UNQUEST leaves The Quest for enrolled users', async () => {
    getUser.mockResolvedValue({ ...baseUser, questActive: true });
    const res = mockRes();

    await handleWebhookRequest(
      { body: { From: `whatsapp:${phone}`, Body: 'unquest' } } as any,
      res as any,
    );

    expect(stopQuest).toHaveBeenCalledWith(phone);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining("You've left *The Quest*"),
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('LEAVE QUEST routes to quest deactivation', async () => {
    getUser.mockResolvedValue({ ...baseUser, questActive: true });
    const res = mockRes();

    await handleWebhookRequest(
      { body: { From: `whatsapp:${phone}`, Body: 'leave quest' } } as any,
      res as any,
    );

    expect(stopQuest).toHaveBeenCalledWith(phone);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining("You've left *The Quest*"),
    );
  });

  it('UNQUEST during signup cancels confirmation without enrolling', async () => {
    getUser.mockResolvedValue({ ...baseUser, awaitingQuestConfirm: true });
    const res = mockRes();

    await handleWebhookRequest(
      { body: { From: `whatsapp:${phone}`, Body: 'unquest' } } as any,
      res as any,
    );

    expect(updateUserFields).toHaveBeenCalledWith(phone, { awaitingQuestConfirm: false });
    expect(stopQuest).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining('Quest signup cancelled'),
    );
  });

  it('UNQUEST tells inactive users they are not enrolled', async () => {
    const res = mockRes();

    await handleWebhookRequest(
      { body: { From: `whatsapp:${phone}`, Body: 'unquest' } } as any,
      res as any,
    );

    expect(stopQuest).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      phone,
      expect.stringContaining("You're not on The Quest right now"),
    );
  });
});
