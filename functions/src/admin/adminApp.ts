import express from 'express';
import cors from 'cors';
import adminRouter from './adminRouter';
import pino from 'pino';

const logger = pino();

/**
 * Creates and returns a configured Express app exclusively for the admin API.
 * This is isolated from the main webhook to ensure heavy admin operations
 * (stats fetching, recursive deletion, image updates) don't consume memory
 * or connections needed by the latency-sensitive WhatsApp message parser.
 */
export const createAdminApp = (): express.Application => {
  const app = express();

  // Restrict CORS to allowed domains from environment variables
  const allowedOrigins = process.env.ALLOWED_ADMIN_ORIGINS
    ? process.env.ALLOWED_ADMIN_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173',""]; // Localdev fallbacks

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        logger.warn({ origin }, 'CORS blocked request from unauthorized origin');
        return callback(new Error('The CORS policy for this API does not allow access from the specified Origin.'), false);
      }
    }
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
