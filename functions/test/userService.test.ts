import { createUser, getUser, setPauseState, setOnboardingStep, createPendingUser, updateUserFields } from '../src/services/userService';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

jest.mock('../src/utils/timezone', () => ({
  computeNextSendAt: jest.fn(() => new Date('2026-06-03T08:00:00.000Z')),
  computeNextReminderAt: jest.fn(() => new Date('2026-06-02T20:00:00.000Z')),
}));

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('returns exists: true if user already exists', async () => {
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Existing User' }) });

      const result = await createUser('+15551234567', 'Test');
      expect(result.exists).toBe(true);
      expect(result.user.name).toBe('Existing User');
    });

    it('creates a new user and returns exists: false', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await createUser('+2348012345678', 'New User', 8, 30);
      
      expect(result.exists).toBe(false);
      expect(result.user.name).toBe('New User');
      expect(result.user.timezone).toBe('Africa/Lagos');
      expect(result.user.reminderTime).toBe('08:30');
      expect(result.user.reminderTimeUTC).toEqual(expect.any(String)); 
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New User',
        phone: '+2348012345678',
        timezone: 'Africa/Lagos',
      }));
    });
  });

  describe('getUser', () => {
    it('returns null if user does not exist', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });
      const user = await getUser('+15551234567');
      expect(user).toBeNull();
    });

    it('returns user data if exists', async () => {
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Test' }) });
      const user = await getUser('+15551234567');
      expect(user?.name).toBe('Test');
    });
  });

  describe('setPauseState', () => {
    it('updates paused field', async () => {
      await setPauseState('+15551234567', true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ paused: true }));
    });
  });

  describe('setOnboardingStep', () => {
    it('merges onboarding step', async () => {
      await setOnboardingStep('+15551234567', 'time');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ awaitingOnboardingStep: 'time' }),
        { merge: true }
      );
    });
  });

  describe('createPendingUser', () => {
    it('creates a minimal user', async () => {
      await createPendingUser('+15551234567');
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        phone: '+15551234567',
        awaitingOnboardingStep: 'name',
      }));
    });
  });

  describe('updateUserFields', () => {
    it('updates specified fields', async () => {
      await updateUserFields('+15551234567', { streak: 5 });
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ streak: 5 }));
    });
  });
});
