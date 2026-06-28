import { Router, Request, Response } from 'express';
import {
  getMorningDeliverySummary,
  listDeliveryLogs,
  pinDeliveryLog,
} from '../../services/deliveryLogService';
import { getFirestore } from 'firebase-admin/firestore';
import type { DeliveryLog } from '../../types/DeliveryLog';
import pino from 'pino';

const logger = pino();
const deliveryLogRoutes = Router();

const parseDateParam = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/**
 * GET /admin/delivery-logs
 * List delivery attempts for the dashboard (newest first).
 */
deliveryLogRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = typeof req.query.type === 'string'
      ? req.query.type as DeliveryLog['type']
      : undefined;
    const status = typeof req.query.status === 'string'
      ? req.query.status as DeliveryLog['status']
      : undefined;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const since = parseDateParam(req.query.since);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await listDeliveryLogs({ type, status, userId, since, limit });
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Error listing delivery logs');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/delivery-logs/morning/summary
 * Today's morning pipeline stats for the dashboard home widget.
 */
deliveryLogRoutes.get('/morning/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const summary = await getMorningDeliverySummary(date);
    res.status(200).json({ summary });
  } catch (error) {
    logger.error({ error }, 'Error fetching morning delivery summary');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/delivery-logs/dispatch-runs
 * MinuteTick dispatch aggregates (morning / reminder / quest).
 */
deliveryLogRoutes.get('/dispatch-runs', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const duty = typeof req.query.duty === 'string' ? req.query.duty : undefined;
    const since = parseDateParam(req.query.since) ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      db.collection('dispatchRuns').where('startedAt', '>=', since);

    if (duty) query = query.where('duty', '==', duty);

    const snap = await query.orderBy('startedAt', 'desc').limit(limit).get();
    const runs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ runs });
  } catch (error) {
    logger.error({ error }, 'Error listing dispatch runs');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /admin/delivery-logs/:logId/pin
 * Keep a log entry beyond the default 30-day retention.
 */
deliveryLogRoutes.patch('/:logId/pin', async (req: Request, res: Response): Promise<void> => {
  try {
    const logId = req.params.logId as string;
    await pinDeliveryLog(logId);
    res.status(200).json({ status: 'success', logId, pinned: true });
  } catch (error) {
    logger.error({ error }, 'Error pinning delivery log');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default deliveryLogRoutes;
