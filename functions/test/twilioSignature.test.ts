import twilio from 'twilio';
import {
  isTwilioSignatureValidationEnabled,
  resolveTwilioWebhookUrl,
  validateTwilioSignature,
} from '../src/webhook/middleware/validateTwilioSignature';

const mockReq = (overrides: Record<string, unknown> = {}) => ({
  method: 'POST',
  headers: {},
  header(name: string) {
    const key = name.toLowerCase();
    const headers = this.headers as Record<string, string>;
    return headers[key] ?? headers[name];
  },
  body: {},
  originalUrl: '/webhook',
  protocol: 'https',
  get(name: string) {
    if (name.toLowerCase() === 'host') return 'example.test';
    return undefined;
  },
  ...overrides,
});

const mockRes = () => {
  const res: {
    statusCode?: number;
    body?: string;
    status: jest.Mock;
    send: jest.Mock;
  } = {
    status: jest.fn(),
    send: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.send.mockImplementation((body: string) => {
    res.body = body;
    return res;
  });
  return res;
};

describe('validateTwilioSignature', () => {
  const originalAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const originalBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL;
  const originalSkip = process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION;

  afterEach(() => {
    if (originalAuthToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = originalAuthToken;

    if (originalBaseUrl === undefined) delete process.env.TWILIO_WEBHOOK_BASE_URL;
    else process.env.TWILIO_WEBHOOK_BASE_URL = originalBaseUrl;

    if (originalSkip === undefined) delete process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION;
    else process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION = originalSkip;
  });

  it('is enabled when auth token is configured', () => {
    process.env.TWILIO_AUTH_TOKEN = 'real-token';
    delete process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION;
    expect(isTwilioSignatureValidationEnabled()).toBe(true);
  });

  it('is disabled when skip flag is set', () => {
    process.env.TWILIO_AUTH_TOKEN = 'real-token';
    process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION = 'true';
    expect(isTwilioSignatureValidationEnabled()).toBe(false);
  });

  it('builds webhook URL from TWILIO_WEBHOOK_BASE_URL', () => {
    process.env.TWILIO_WEBHOOK_BASE_URL = 'https://example.test/whatsappWebhook/';
    const req = mockReq({ originalUrl: '/status' });
    expect(resolveTwilioWebhookUrl(req as any)).toBe(
      'https://example.test/whatsappWebhook/status',
    );
  });

  it('accepts requests with a valid Twilio signature', () => {
    const authToken = 'test_auth_token';
    const webhookUrl = 'https://example.test/whatsappWebhook/webhook';
    const body = { From: 'whatsapp:+15551234567', Body: 'SEEK' };
    const signature = twilio.getExpectedTwilioSignature(authToken, webhookUrl, body);

    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.TWILIO_WEBHOOK_BASE_URL = 'https://example.test/whatsappWebhook';
    delete process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION;

    const req = mockReq({
      headers: { 'x-twilio-signature': signature },
      body,
      originalUrl: '/webhook',
    });
    const res = mockRes();
    const next = jest.fn();

    validateTwilioSignature(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects requests with an invalid Twilio signature', () => {
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
    process.env.TWILIO_WEBHOOK_BASE_URL = 'https://example.test/whatsappWebhook';
    delete process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION;

    const req = mockReq({
      headers: { 'x-twilio-signature': 'invalid-signature' },
      body: { From: 'whatsapp:+15551234567', Body: 'SEEK' },
      originalUrl: '/webhook',
    });
    const res = mockRes();
    const next = jest.fn();

    validateTwilioSignature(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toBe('Forbidden');
  });

  it('skips validation when auth token is a placeholder', () => {
    process.env.TWILIO_AUTH_TOKEN = 'your_auth_token';
    delete process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION;

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    validateTwilioSignature(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
