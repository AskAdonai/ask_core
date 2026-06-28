const sendWhatsAppMessage = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ update: jest.fn().mockResolvedValue(undefined) })),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
  })),
}));

jest.mock('../src/services/twilioService', () => ({
  sendWhatsAppMessage,
}));

jest.mock('../src/services/knockMenuService', () => ({
  DEFAULT_KNOCK_MENU_INSTRUCTION: 'Pick a theme',
  KNOCK_UNAVAILABLE_IN_COUNTRY_MESSAGE: 'KNOCK is not available in your country.',
  getKnockMenuDisplay: jest.fn().mockResolvedValue({ imageUrl: undefined, instruction: 'Pick a theme' }),
}));

import { sendKnockThemeMenu } from '../src/webhook/handlers/themeSelectionHandler';

describe('sendKnockThemeMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends country-unavailable message when there is no menu image and no themes', async () => {
    const sent = await sendKnockThemeMenu('+15551234567');

    expect(sent).toBe(false);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      '+15551234567',
      'KNOCK is not available in your country.',
    );
  });
});
