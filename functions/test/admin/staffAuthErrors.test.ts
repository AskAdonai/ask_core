import {
  isValidStaffEmail,
  respondWithStaffAuthError,
} from '../../src/admin/utils/staffAuthErrors';

describe('staffAuthErrors', () => {
  it('rejects emails without a dotted domain', () => {
    expect(isValidStaffEmail('saviorisrael@gmailcom')).toBe(false);
    expect(isValidStaffEmail('mercy@gmail.com')).toBe(true);
    expect(isValidStaffEmail('  mercy@gmail.com ')).toBe(true);
  });

  it('maps auth/invalid-email to 400', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as any;

    const handled = respondWithStaffAuthError(
      res,
      { code: 'auth/invalid-email', message: 'invalid' },
      'create',
    );

    expect(handled).toBe(true);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Enter a valid email address.' });
  });

  it('maps auth/email-already-exists to 409', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as any;

    const handled = respondWithStaffAuthError(
      res,
      { code: 'auth/email-already-exists' },
      'create',
    );

    expect(handled).toBe(true);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      error: 'An account with this email already exists.',
    });
  });

  it('returns false for unknown errors', () => {
    const res = { status: jest.fn() } as any;
    expect(respondWithStaffAuthError(res, new Error('boom'), 'create')).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
  });
});
