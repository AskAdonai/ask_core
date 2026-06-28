import express from 'express';
import webhookRouter, { handleWebhookRequest } from './webhookRouter';
import pino from 'pino';

const logger = pino();

/**
 * Creates and returns a configured Express app with the webhook routes mounted.
 * Isolated from the admin app so Twilio inbound traffic never shares memory
 * with heavy admin operations.
 *
 * Used by:
 *  - index.ts  → exported as the `whatsappWebhook` Cloud Function
 *  - server.ts → mounted on the local dev server for curl/ngrok testing
 */
export const createWebhookApp = (): express.Application => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // Twilio sends URL-encoded bodies

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ASK WhatsApp Webhook' }));

  // Mount webhook routes (Twilio may be configured with / or /webhook)
  app.use('/', webhookRouter);
  app.use('/webhook', webhookRouter);

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Webhook unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};

// ── Re-exports for backwards compatibility ────────────────────────────────────
// Tests and any code that imported from webhook/webhook.ts still work.
export { handleWebhookRequest };

/**
 * @deprecated Use createWebhookApp() instead. Kept for backward compatibility.
 */
export const createApp = createWebhookApp;
