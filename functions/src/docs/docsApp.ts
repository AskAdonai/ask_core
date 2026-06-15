import express from 'express';
import cors from 'cors';
import { swaggerSpec } from './swaggerConfig';
import swaggerUi from 'swagger-ui-express';
import pino from 'pino';

const logger = pino();

/**
 * Creates and returns a configured Express app exclusively for API documentation.
 * Served as a separate Cloud Function to isolate documentation traffic.
 */
export const createDocsApp = (): express.Application => {
  const app = express();
  
  app.use(cors({ origin: true }));
  
  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ASK Docs API' }));

  // API Documentation (Swagger)
  // Disabled in production
  if (process.env.NODE_ENV !== 'production') {
    app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    logger.info('📚 Swagger API docs app created');
  } else {
    // Return 404 in production
    app.use('/', (_req, res) => {
      res.status(404).json({ error: 'Documentation is not available in production environment' });
    });
  }

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Docs API unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};
