import {
  isRegistrationComplete,
  getMissingRegistrationFields,
  buildIncompleteProfileMessage,
  buildUnregisteredPrompt,
  buildOnboardingResumeMessage,
} from '../src/services/userProfileService';
import type { User } from '../src/types/schemas';

describe('userProfileService', () => {
  const completeUser: Partial<User> = {
    name: 'Grace',
    timezone: 'Africa/Lagos',
    reminderTimeLocal: '06:00',
    awaitingOnboardingStep: null,
  };

  describe('isRegistrationComplete', () => {
    it('returns false for null user', () => {
      expect(isRegistrationComplete(null)).toBe(false);
    });

    it('returns false when onboarding step is active', () => {
      expect(
        isRegistrationComplete({
          ...completeUser,
          awaitingOnboardingStep: 'name',
        }),
      ).toBe(false);
    });

    it('returns false when name is missing', () => {
      expect(
        isRegistrationComplete({
          ...completeUser,
          name: '',
        }),
      ).toBe(false);
    });

    it('returns true when required fields are present', () => {
      expect(isRegistrationComplete(completeUser)).toBe(true);
    });
  });

  describe('getMissingRegistrationFields', () => {
    it('lists each missing field by name', () => {
      expect(
        getMissingRegistrationFields({
          awaitingOnboardingStep: 'name',
        }),
      ).toEqual(['name', 'timezone', 'morning reminder time']);
    });
  });

  describe('buildIncompleteProfileMessage', () => {
    it('names missing fields explicitly', () => {
      const message = buildIncompleteProfileMessage({
        awaitingOnboardingStep: null,
        timezone: 'UTC',
        reminderTimeLocal: '06:00',
      });

      expect(message).toContain('your *name*');
      expect(message).toContain('Reply *ASK*');
    });

    it('prompts for the active onboarding step', () => {
      const message = buildIncompleteProfileMessage({
        awaitingOnboardingStep: 'time',
        name: 'Grace',
        timezone: 'UTC',
      });

      expect(message).toContain('morning reminder time');
    });
  });

  describe('buildUnregisteredPrompt', () => {
    it('instructs users to text ASK', () => {
      expect(buildUnregisteredPrompt()).toContain('*ASK*');
    });
  });

  describe('buildOnboardingResumeMessage', () => {
    it('resumes at the timezone step', () => {
      expect(
        buildOnboardingResumeMessage({ awaitingOnboardingStep: 'timezone' }),
      ).toContain('timezone');
    });
  });
});
