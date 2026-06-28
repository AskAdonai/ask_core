import {
  assertAccountSid,
  resolveTwilioClientCredentials,
} from '../src/services/twilioCredentials';

describe('twilioCredentials', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects API Key SID in TWILIO_ACCOUNT_SID', () => {
    expect(() => assertAccountSid('SK22222222222222222222222222222222')).toThrow(/Account SID \(starts with AC\)/);
  });

  it('accepts Account SID', () => {
    expect(assertAccountSid('AC11111111111111111111111111111111')).toBe(
      'AC11111111111111111111111111111111',
    );
  });

  it('resolves Account SID + Auth Token credentials', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC11111111111111111111111111111111';
    process.env.TWILIO_AUTH_TOKEN = 'primary_auth_token';
    delete process.env.TWILIO_API_KEY_SID;
    delete process.env.TWILIO_API_KEY_SECRET;

    expect(resolveTwilioClientCredentials()).toEqual({
      accountSid: 'AC11111111111111111111111111111111',
      username: 'AC11111111111111111111111111111111',
      password: 'primary_auth_token',
    });
  });

  it('resolves API Key credentials when optional vars are set', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC11111111111111111111111111111111';
    process.env.TWILIO_AUTH_TOKEN = 'primary_auth_token';
    process.env.TWILIO_API_KEY_SID = 'SK22222222222222222222222222222222';
    process.env.TWILIO_API_KEY_SECRET = 'api_key_secret';

    expect(resolveTwilioClientCredentials()).toEqual({
      accountSid: 'AC11111111111111111111111111111111',
      username: 'SK22222222222222222222222222222222',
      password: 'api_key_secret',
    });
  });
});
