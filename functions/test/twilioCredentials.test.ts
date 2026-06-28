import { loadLocalEnv } from '../src/config/loadLocalEnv';
import {
  assertAccountSid,
  resolveTwilioClientCredentials,
} from '../src/services/twilioCredentials';

loadLocalEnv();

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? '';
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? '';
const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim() ?? '';
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim() ?? '';

const hasAccountSid = accountSid.startsWith('AC');
const hasAuthToken = authToken.length > 0 && authToken !== 'your_auth_token';
const hasApiKeySid = apiKeySid.startsWith('SK');
const hasApiKeySecret = apiKeySecret.length > 0;

describe('twilioCredentials', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  (hasApiKeySid ? it : it.skip)(
    'rejects API Key SID in TWILIO_ACCOUNT_SID',
    () => {
      expect(() => assertAccountSid(apiKeySid)).toThrow(/Account SID \(starts with AC\)/);
    },
  );

  (hasAccountSid ? it : it.skip)('accepts Account SID', () => {
    expect(assertAccountSid(accountSid)).toBe(accountSid);
  });

  (hasAccountSid && hasAuthToken ? it : it.skip)(
    'resolves Account SID + Auth Token credentials',
    () => {
      process.env.TWILIO_ACCOUNT_SID = accountSid;
      process.env.TWILIO_AUTH_TOKEN = authToken;
      delete process.env.TWILIO_API_KEY_SID;
      delete process.env.TWILIO_API_KEY_SECRET;

      expect(resolveTwilioClientCredentials()).toEqual({
        accountSid,
        username: accountSid,
        password: authToken,
      });
    },
  );

  (hasAccountSid && hasAuthToken && hasApiKeySid && hasApiKeySecret ? it : it.skip)(
    'resolves API Key credentials when optional vars are set',
    () => {
      process.env.TWILIO_ACCOUNT_SID = accountSid;
      process.env.TWILIO_AUTH_TOKEN = authToken;
      process.env.TWILIO_API_KEY_SID = apiKeySid;
      process.env.TWILIO_API_KEY_SECRET = apiKeySecret;

      expect(resolveTwilioClientCredentials()).toEqual({
        accountSid,
        username: apiKeySid,
        password: apiKeySecret,
      });
    },
  );
});
