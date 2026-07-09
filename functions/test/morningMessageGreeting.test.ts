import { buildMorningMessage } from '../src/messages/morningMessage';
import type { User } from '../src/types/User';
import type { ResolvedJourneyDevotion } from '../src/services/prayerCardService';

const baseUser: User = {
  phone: '+15551234567',
  name: 'Ada',
  timezone: 'UTC',
  reminderTime: '06:00',
  reminderTimeLocal: '06:00',
  reminderTimeUTC: '06:00',
  nextSendAt: new Date(),
  nextReminderAt: new Date(),
  nextQuestAt: new Date(),
  lockedUntil: null,
  streak: 3,
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

const baseCard = {
  journeyStage: 1 as const,
  dayIndex: 1,
  title: 'Believe',
  prayerText: 'Lord, I believe.',
  imageUrl: 'https://cdn.askadonai.com/card.jpg',
};

describe('morning message card greeting', () => {
  it('substitutes [NAME] from the devotion card greeting', async () => {
    const journeyContent = {
      card: {
        ...baseCard,
        greeting: '[NAME], goodness and mercy are chasing you down today.',
      },
      source: 'journey' as const,
    } satisfies ResolvedJourneyDevotion;

    const payload = await buildMorningMessage(baseUser, journeyContent);

    expect(payload.text).toContain(
      'Ada, goodness and mercy are chasing you down today.',
    );
    expect(payload.text).not.toContain('[NAME]');
  });

  it('substitutes {name} placeholder', async () => {
    const journeyContent = {
      card: {
        ...baseCard,
        greeting: '{name} His favor surrounds you.',
      },
      source: 'journey' as const,
    } satisfies ResolvedJourneyDevotion;

    const payload = await buildMorningMessage(baseUser, journeyContent);
    expect(payload.text).toContain('Ada His favor surrounds you.');
  });

  it('omits the greeting line when the card has no greeting', async () => {
    const journeyContent = {
      card: { ...baseCard },
      source: 'journey' as const,
    } satisfies ResolvedJourneyDevotion;

    const payload = await buildMorningMessage(baseUser, journeyContent);

    expect(payload.text.startsWith('Good morning\n\nYou are Grafted.')).toBe(true);
    expect(payload.text).toContain('*Believe*');
  });

  it('prepends name when greeting has no placeholder', async () => {
    const journeyContent = {
      card: {
        ...baseCard,
        greeting: 'The ASKer of the Most High',
      },
      source: 'journey' as const,
    } satisfies ResolvedJourneyDevotion;

    const payload = await buildMorningMessage(baseUser, journeyContent);
    expect(payload.text).toContain('Ada The ASKer of the Most High');
  });
});
