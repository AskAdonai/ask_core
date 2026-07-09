import { Router, Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import pino from 'pino';
import { requireAtLeastRole } from '../middleware/authMiddleware';
import {
  JOURNEY_STAGES_COLLECTION,
  type JourneyStageDoc,
} from '../../types/JourneyStageDoc';

const logger = pino();
const journeyStageRoutes = Router();

journeyStageRoutes.use(requireAtLeastRole('editor'));

const stageSchema = z.object({
  title: z.string().min(1).max(120),
  dayCount: z.number().int().min(1),
  active: z.boolean().optional(),
});

journeyStageRoutes.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(JOURNEY_STAGES_COLLECTION).orderBy('stageNumber', 'asc').get();
    const stages = snapshot.docs.map((doc) => ({
      stageNumber: Number(doc.id),
      ...(doc.data() as JourneyStageDoc),
    }));
    res.status(200).json({ stages });
  } catch (error) {
    logger.error({ error }, 'Error listing journey stages');
    res.status(500).json({ error: 'Internal server error' });
  }
});

journeyStageRoutes.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = stageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const db = getFirestore();
    const existing = await db.collection(JOURNEY_STAGES_COLLECTION).orderBy('stageNumber', 'desc').limit(1).get();
    const nextStageNumber = existing.empty
      ? 1
      : Number(existing.docs[0].id) + 1;

    const payload: JourneyStageDoc = {
      stageNumber: nextStageNumber,
      title: parsed.data.title.trim(),
      dayCount: parsed.data.dayCount,
      active: parsed.data.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(JOURNEY_STAGES_COLLECTION).doc(String(nextStageNumber)).set(payload);
    res.status(201).json({ stage: payload });
  } catch (error) {
    logger.error({ error }, 'Error creating journey stage');
    res.status(500).json({ error: 'Internal server error' });
  }
});

journeyStageRoutes.put('/:stageNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const stageNumber = Number(req.params.stageNumber);
    const parsed = stageSchema.safeParse(req.body);
    if (!parsed.success || !Number.isFinite(stageNumber) || stageNumber < 1) {
      res.status(400).json({ error: parsed.success ? 'Invalid stage number' : parsed.error.flatten() });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection(JOURNEY_STAGES_COLLECTION).doc(String(stageNumber));
    const existing = await docRef.get();
    if (!existing.exists) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }

    const payload: JourneyStageDoc = {
      stageNumber,
      title: parsed.data.title.trim(),
      dayCount: parsed.data.dayCount,
      active: parsed.data.active ?? true,
      updatedAt: new Date(),
    };

    await docRef.set(payload, { merge: true });
    res.status(200).json({ stage: payload });
  } catch (error) {
    logger.error({ error }, 'Error updating journey stage');
    res.status(500).json({ error: 'Internal server error' });
  }
});

journeyStageRoutes.delete('/:stageNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const stageNumber = req.params.stageNumber as string;
    const db = getFirestore();
    const docRef = db.collection(JOURNEY_STAGES_COLLECTION).doc(stageNumber);
    const existing = await docRef.get();
    if (!existing.exists) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }

    await docRef.delete();
    res.status(200).json({ status: 'deleted', stageNumber });
  } catch (error) {
    logger.error({ error }, 'Error deleting journey stage');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default journeyStageRoutes;
