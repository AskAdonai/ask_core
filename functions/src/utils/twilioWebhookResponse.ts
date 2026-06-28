import type { Response } from 'express';

/** Ack inbound webhook when replies go out via REST API — no TwiML body needed. */
export const respondTwilioOk = (res: Response): Response => res.status(204).end();
