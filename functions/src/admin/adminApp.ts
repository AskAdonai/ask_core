import express from 'express';
import cors from 'cors';
import adminRouter from './adminRouter';
import pino from 'pino';
import { isAdminOriginAllowed, parseAllowedAdminOrigins } from './corsPolicy';

const logger = pino();

/**
 * Creates and returns a configured Express app exclusively for the admin API.
 * This is isolated from the main webhook to ensure heavy admin operations
 * (stats fetching, recursive deletion, image updates) don't consume memory
 * or connections needed by the latency-sensitive WhatsApp message parser.
 */
export const createAdminApp = (): express.Application => {
  const app = express();

  const allowedOrigins = parseAllowedAdminOrigins(process.env.ALLOWED_ADMIN_ORIGINS);

  if (allowedOrigins.length === 0) {
    logger.warn('ALLOWED_ADMIN_ORIGINS is empty — browser CORS requests will be rejected');
  } else {
    logger.info({ allowedOrigins }, 'Admin API CORS allowlist loaded');
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (isAdminOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }

      logger.warn({ origin, allowedOrigins }, 'CORS blocked request from unauthorized origin');
      // Do not pass an Error — that becomes HTTP 500. Deny without throwing.
      return callback(null, false);
    },
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ASK Admin API' }));

  // Mount Admin API routes
  // e.g. /admin/config/global, /admin/users, /admin/quiz/:week
  app.use('/admin', adminRouter);

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Admin API unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};
