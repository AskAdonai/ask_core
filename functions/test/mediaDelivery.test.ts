const sendWhatsAppMessage = jest.fn().mockResolvedValue('SM_test');

jest.mock('../src/services/twilioService', () => ({
  sendWhatsAppMessage,
}));

import { buildMorningMessage } from '../src/messages/morningMessage';
import { deliverKnockPrayerMessage } from '../src/services/knockPrayerDeliveryService';
import type { User } from '../src/types/User';
import type { ResolvedJourneyDevotion } from '../src/services/prayerCardService';
import type { Prayer } from '../src/types/PrayerTheme';

describe('media delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  const baseUser: User = {
    phone: '+15551234567',
    name: 'Friend',
    timezone: 'UTC',
    reminderTime: '06:00',
    reminderTimeLocal: '06:00',
    reminderTimeUTC: '06:00',
    nextSendAt: new Date(),
    nextReminderAt: new Date(),
    nextQuestAt: new Date(),
    lockedUntil: null,
    streak: 5,
    lastMilestoneStreakDays: 0,
    graceDaysRemaining: 3,
    vineStage: 'Grafted',
    journeyStage: 1,
    journeyDayIndex: 1,
    lastActiveDate: '',
    declarationsToday: 0,
    journaledToday: false,
    eveningReminderSentToday: false,
    lastCheckinSent: '',
    paused: false,
    optOutRequestedAt: null,
    dataDeletionScheduledAt: null,
    awaitingJournal: false,
    awaitingKnockSelection: false,
    awaitingOnboardingStep: null,
    awaitingQuestConfirm: false,
    awaitingQuizAnswer: false,
    awaitingDeclarationYes: false,
    awaitingReminderTime: false,
    activeKnockTheme: '',
    knockCount: 1,
    knockThemeExhausted: false,
    questActive: false,
    questWeek: 1,
    questVideoIndex: 0,
    questChaptersLogged: 0,
    currentQuizQuestionIndex: 0,
    currentQuizScore: 0,
    lastMorningDeliveryId: null,
    lastReminderDeliveryId: null,
    lastQuestDeliveryId: null,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('keeps YouTube video as plain text and exposes audio for attachment', async () => {
    const journeyContent = {
      card: {
        journeyStage: 1,
        dayIndex: 1,
        title: 'Believe',
        greeting: '[NAME], His favor surrounds you like a shield.',
        prayerText: 'Lord, I believe.',
        imageUrl: 'https://cdn.askadonai.com/card.jpg',
        audioUrl: 'https://cdn.askadonai.com/devotion.mp3',
        morningVoiceNoteUrl: '',
        devotionLink: 'https://youtu.be/abc123',
        reflectionPrompt: 'What do you believe?',
      },
      source: 'journey' as const,
    } satisfies ResolvedJourneyDevotion;

    const payload = await buildMorningMessage(baseUser, journeyContent);

    expect(payload.text).toContain('https://youtu.be/abc123');
    expect(payload.text).toContain('Friend, His favor surrounds you like a shield.');
    expect(payload.text).not.toContain('devotion.mp3');
    expect(payload.attachmentAudioUrl).toBe('https://cdn.askadonai.com/devotion.mp3');
  });

  it('sends KNOCK prayer audio as a media attachment with full prayer content', async () => {
    const prayer: Prayer = {
      title: 'Healing prayer',
      prayerText: 'Lord, heal me.',
      audioUrl: 'https://cdn.askadonai.com/prayer.mp3',
      declarationText: 'I am healed by his stripes.',
      declarationAudioUrl: '',
      verse: 'By his stripes we are healed.',
      reference: 'Isaiah 53:5',
      index: 1,
    };

    await deliverKnockPrayerMessage('+15551234567', 'Healing', prayer);

    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(2);
    expect(sendWhatsAppMessage).toHaveBeenNthCalledWith(
      1,
      '+15551234567',
      expect.stringMatching(/Healing prayer[\s\S]*Lord, heal me\.[\s\S]*Isaiah 53:5[\s\S]*I am healed by his stripes\./),
    );
    expect(sendWhatsAppMessage).toHaveBeenNthCalledWith(
      2,
      '+15551234567',
      '🎧 Prayer audio:',
      ['https://cdn.askadonai.com/prayer.mp3'],
    );
  });
});
