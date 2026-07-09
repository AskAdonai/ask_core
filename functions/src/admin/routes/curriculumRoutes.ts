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
const curriculumRoutes = Router();

curriculumRoutes.use(requireAtLeastRole('editor'));

const stageSchema = z.object({
  stageNumber: z.number().int().min(1),
  title: z.string().min(1).max(120),
  dayCount: z.number().int().min(1),
  active: z.boolean().optional(),
});

/** Legacy — versioning removed; always returns a single logical version. */
curriculumRoutes.get('/', async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ versions: [1] });
});

curriculumRoutes.get('/:version/stages', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(JOURNEY_STAGES_COLLECTION)
      .orderBy('stageNumber', 'asc')
      .get();

    const stages = snapshot.docs.map((doc) => ({
      stageId: doc.id,
      ...(doc.data() as JourneyStageDoc),
    }));
    res.status(200).json({ version: 1, stages });
  } catch (error) {
    logger.error({ error }, 'Error listing journey stages (legacy curriculum route)');
    res.status(500).json({ error: 'Internal server error' });
  }
});

curriculumRoutes.put('/:version/stages/:stageNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const stageNumber = req.params.stageNumber as string;
    const parsed = stageSchema.safeParse({
      ...req.body,
      stageNumber: Number(stageNumber),
    });

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const db = getFirestore();
    const stageRef = db.collection(JOURNEY_STAGES_COLLECTION).doc(stageNumber);
    const payload: JourneyStageDoc = {
      stageNumber: parsed.data.stageNumber,
      title: parsed.data.title.trim(),
      dayCount: parsed.data.dayCount,
      active: parsed.data.active ?? true,
      updatedAt: new Date(),
    };

    await stageRef.set(payload, { merge: true });
    res.status(200).json({ stage: payload });
  } catch (error) {
    logger.error({ error }, 'Error saving journey stage (legacy curriculum route)');
    res.status(500).json({ error: 'Internal server error' });
  }
});

curriculumRoutes.delete('/:version/stages/:stageNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const stageNumber = req.params.stageNumber as string;
    const db = getFirestore();
    await db.collection(JOURNEY_STAGES_COLLECTION).doc(stageNumber).delete();
    res.status(200).json({ status: 'deleted', version: 1, stageNumber });
  } catch (error) {
    logger.error({ error }, 'Error deleting journey stage (legacy curriculum route)');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default curriculumRoutes;
