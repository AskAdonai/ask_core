import { getAuth } from 'firebase-admin/auth';
import pino from 'pino';
import { resolveDashboardLoginUrl } from '../utils/dashboardUrl';
import { sendResendEmail } from './email/resendEmailService';
import { buildPasswordResetEmailContent } from './email/templates/passwordResetEmail';
import { isValidStaffEmail } from '../admin/utils/staffAuthErrors';

const logger = pino();

export const PASSWORD_RESET_GENERIC_MESSAGE =
  'If that email is registered, a reset link has been sent.';

export type RequestStaffPasswordResetResult = {
  message: string;
  sent: boolean;
};

/**
 * Generates a Firebase password-reset link and delivers it via Resend.
 * Never reveals whether the email exists (enumeration-safe).
 */
export async function requestStaffPasswordReset(
  rawEmail: string,
): Promise<RequestStaffPasswordResetResult> {
  const email = rawEmail.trim().toLowerCase();

  if (!isValidStaffEmail(email)) {
    throw new PasswordResetValidationError('Enter a valid email address.');
  }

  const auth = getAuth();
  let userExists = false;

  try {
    await auth.getUserByEmail(email);
    userExists = true;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : undefined;

    if (code === 'auth/user-not-found') {
      logger.info({ email }, 'Password reset requested for unknown email — no send');
      return { message: PASSWORD_RESET_GENERIC_MESSAGE, sent: false };
    }

    throw error;
  }

  if (!userExists) {
    return { message: PASSWORD_RESET_GENERIC_MESSAGE, sent: false };
  }

  const loginUrl = resolveDashboardLoginUrl();
  const resetLink = await auth.generatePasswordResetLink(email, {
    url: loginUrl,
    handleCodeInApp: false,
  });

  const content = buildPasswordResetEmailContent({
    resetLink,
    loginUrl,
    recipientEmail: email,
  });

  await sendResendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  return { message: PASSWORD_RESET_GENERIC_MESSAGE, sent: true };
}

export class PasswordResetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordResetValidationError';
  }
}
