import { Request, Response } from 'express';
import pino from 'pino';
import { recordTwilioStatusCallback } from '../../services/deliveryLogService';
import { respondTwilioOk } from '../../utils/twilioWebhookResponse';

const logger = pino();

/**
 * Twilio status callback webhook.
 * Receives delivery receipts (delivered, read) and failures (failed, undelivered).
 *
 * Configure in Twilio Console or per-message via statusCallback URL:
 *   https://<webhook-host>/status
 *   https://<webhook-host>/webhook/status
 */
export const handleTwilioStatusCallback = async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};

  const messageSid = String(body.MessageSid || body.SmsSid || '').trim();
  const messageStatus = String(body.MessageStatus || body.SmsStatus || '').trim();

  if (!messageSid || !messageStatus) {
    logger.warn({ body }, 'Twilio status callback missing MessageSid or MessageStatus');
    res.status(400).send('Missing MessageSid or MessageStatus');
    return;
  }

  const to = String(body.To || '').replace('whatsapp:', '');
  const from = String(body.From || '').replace('whatsapp:', '');
  const errorCode = body.ErrorCode ? String(body.ErrorCode) : undefined;
  const errorMessage = body.ErrorMessage ? String(body.ErrorMessage) : undefined;

  try {
    const result = await recordTwilioStatusCallback({
      messageSid,
      messageStatus,
      errorCode,
      errorMessage,
      to,
      from,
    });

    logger.info(
      {
        messageSid,
        messageStatus,
        errorCode,
        deliveryLogId: result.deliveryLogId,
        eventId: result.eventId,
      },
      'Twilio status callback recorded',
    );

    respondTwilioOk(res);
  } catch (error) {
    logger.error({ error, messageSid, messageStatus }, 'Failed to record Twilio status callback');
    // Always ack Twilio — logging must not fail the status webhook (avoids 500 retries).
    respondTwilioOk(res);
  }
};
