const mockGetUserByEmail = jest.fn();
const mockGeneratePasswordResetLink = jest.fn();
const mockSendResendEmail = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUserByEmail: mockGetUserByEmail,
    generatePasswordResetLink: mockGeneratePasswordResetLink,
  }),
}));

jest.mock('../../src/services/email/resendEmailService', () => ({
  sendResendEmail: (...args: unknown[]) => mockSendResendEmail(...args),
}));

import {
  PasswordResetValidationError,
  requestStaffPasswordReset,
} from '../../src/services/staffPasswordResetService';

describe('requestStaffPasswordReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DASHBOARD_URL = 'https://dashboard.askadonai.com';
    mockGeneratePasswordResetLink.mockResolvedValue('https://example.com/reset');
    mockSendResendEmail.mockResolvedValue({ id: 'email_123' });
  });

  it('rejects invalid email format', async () => {
    await expect(requestStaffPasswordReset('not-an-email')).rejects.toBeInstanceOf(
      PasswordResetValidationError,
    );
    expect(mockSendResendEmail).not.toHaveBeenCalled();
  });

  it('returns generic message without sending for unknown users', async () => {
    mockGetUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });

    const result = await requestStaffPasswordReset('missing@example.com');

    expect(result.sent).toBe(false);
    expect(result.message).toMatch(/reset link has been sent/i);
    expect(mockSendResendEmail).not.toHaveBeenCalled();
  });

  it('generates Firebase link with dashboard login redirect and sends via Resend', async () => {
    mockGetUserByEmail.mockResolvedValue({ uid: 'uid-1', email: 'staff@example.com' });

    const result = await requestStaffPasswordReset('staff@example.com');

    expect(result.sent).toBe(true);
    expect(mockGeneratePasswordResetLink).toHaveBeenCalledWith('staff@example.com', {
      url: 'https://dashboard.askadonai.com/login',
      handleCodeInApp: false,
    });
    expect(mockSendResendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'staff@example.com',
        subject: expect.stringContaining('Reset'),
      }),
    );
  });
});
