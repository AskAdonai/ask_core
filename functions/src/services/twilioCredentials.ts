/**
 * Twilio credential resolution.
 *
 * TWILIO_ACCOUNT_SID must be the Account SID (AC...), never an API Key SID (SK...).
 * Webhook signature validation always uses TWILIO_AUTH_TOKEN (primary Auth Token).
 *
 * Optional API Key auth for the REST client:
 *   TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (with TWILIO_ACCOUNT_SID = AC...)
 */
export interface TwilioClientCredentials {
  accountSid: string;
  username: string;
  password: string;
}

const PLACEHOLDER_SIDS = new Set(['', 'your_account_sid', 'mock']);

export const isTwilioPlaceholderSid = (sid: string | undefined): boolean =>
  !sid || PLACEHOLDER_SIDS.has(sid);

export const assertAccountSid = (sid: string | undefined, label = 'TWILIO_ACCOUNT_SID'): string => {
  const value = sid?.trim() ?? '';

  if (value.startsWith('SK')) {
    throw new Error(
      `${label} must be your Account SID (starts with AC), not an API Key SID (SK). ` +
      'Find AC... in Twilio Console → Account Info. Put SK... in TWILIO_API_KEY_SID instead.',
    );
  }

  if (!value.startsWith('AC')) {
    throw new Error(
      `${label} must be your Twilio Account SID (starts with AC). ` +
      'Find it in Twilio Console → Account Info.',
    );
  }

  return value;
};

export const resolveTwilioClientCredentials = (): TwilioClientCredentials => {
  const accountSid = assertAccountSid(process.env.TWILIO_ACCOUNT_SID);
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim() ?? '';
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim() ?? '';

  if (apiKeySid) {
    if (!apiKeySid.startsWith('SK')) {
      throw new Error('TWILIO_API_KEY_SID must start with SK when set.');
    }
    if (!apiKeySecret) {
      throw new Error('TWILIO_API_KEY_SECRET is required when TWILIO_API_KEY_SID is set.');
    }
    return { accountSid, username: apiKeySid, password: apiKeySecret };
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? '';
  if (!authToken || authToken === 'your_auth_token') {
    throw new Error('TWILIO_AUTH_TOKEN must be set (primary Auth Token from Twilio Console).');
  }

  return { accountSid, username: accountSid, password: authToken };
};

export const getTwilioAuthToken = (): string | undefined => {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token || token === 'your_auth_token' || token === 'mock') return undefined;
  return token;
};
