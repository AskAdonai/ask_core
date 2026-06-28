import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import pino from 'pino';
import { getTwilioAuthToken } from '../../services/twilioCredentials';

const logger = pino();

const PLACEHOLDER_TOKENS = new Set(['', 'your_auth_token', 'mock']);

export const isTwilioSignatureValidationEnabled = (): boolean => {
  if (process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION === 'true') {
    return false;
  }
  const authToken = getTwilioAuthToken();
  return !!authToken && !PLACEHOLDER_TOKENS.has(authToken);
};

/**
 * URL Twilio signed when posting to the webhook (must match Console config exactly).
 */
export const resolveTwilioWebhookUrl = (req: Request): string => {
  const configuredBase = process.env.TWILIO_WEBHOOK_BASE_URL?.trim().replace(/\/$/, '');
  if (configuredBase) {
    return `${configuredBase}${req.originalUrl}`;
  }

  const protocol = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
    .split(',')[0]
    .trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();

  return `${protocol}://${host}${req.originalUrl}`;
};

/**
 * Validates X-Twilio-Signature on inbound webhook and status callback POSTs.
 * Requires express.urlencoded() so req.body contains Twilio form params.
 */
export const validateTwilioSignature = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!isTwilioSignatureValidationEnabled()) {
    logger.debug('Twilio signature validation skipped (disabled or no auth token)');
    next();
    return;
  }

  const authToken = getTwilioAuthToken()!;
  const signature = req.header('X-Twilio-Signature') || '';
  const webhookUrl = resolveTwilioWebhookUrl(req);

  const valid = twilio.validateExpressRequest(req, authToken, { url: webhookUrl });

  if (!valid) {
    logger.warn(
      {
        path: req.originalUrl,
        webhookUrl,
        hasSignature: Boolean(signature),
      },
      'Rejected request with invalid Twilio signature',
    );
    res.status(403).send('Forbidden');
    return;
  }

  next();
};
