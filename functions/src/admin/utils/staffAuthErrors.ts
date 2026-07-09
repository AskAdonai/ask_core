import type { Response } from 'express';
import pino from 'pino';

const logger = pino();

/** Require a domain with a dot (blocks `user@gmailcom`). */
export const isValidStaffEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

type AuthLikeError = {
  code?: string;
  message?: string;
  errorInfo?: { code?: string; message?: string };
};

const authErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as AuthLikeError;
  return err.code || err.errorInfo?.code;
};

/**
 * Maps Firebase Auth Admin errors to HTTP responses for staff create/update flows.
 * Returns true when the response was sent.
 */
export const respondWithStaffAuthError = (
  res: Response,
  error: unknown,
  context: string,
): boolean => {
  const code = authErrorCode(error);

  switch (code) {
    case 'auth/invalid-email':
      res.status(400).json({ error: 'Enter a valid email address.' });
      return true;
    case 'auth/email-already-exists':
      res.status(409).json({
        error: 'An account with this email already exists.',
      });
      return true;
    case 'auth/invalid-password':
    case 'auth/weak-password':
      res.status(400).json({
        error: 'Password must be at least 6 characters (use 8+ for staff invites).',
      });
      return true;
    case 'auth/uid-already-exists':
      res.status(409).json({ error: 'A staff account with this identity already exists.' });
      return true;
    case 'auth/user-not-found':
      res.status(404).json({ error: 'Staff account not found.' });
      return true;
    default:
      logger.error({ error, code, context }, context);
      return false;
  }
};
