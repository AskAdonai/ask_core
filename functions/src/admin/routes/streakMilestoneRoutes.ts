import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import pino from 'pino';
import { requireAtLeastRole } from '../middleware/authMiddleware';
import {
  STREAK_MILESTONES_COLLECTION,
  type StreakMilestone,
} from '../../types/StreakMilestone';

const logger = pino();
const streakMilestoneRoutes = Router();

streakMilestoneRoutes.use(requireAtLeastRole('editor'));

const milestoneSchema = z.object({
  streakDays: z.number().int().min(1),
  label: z.string().min(1).max(80),
  message: z.string().min(1).max(2000),
  active: z.boolean().optional(),
});

const milestoneUpdateSchema = milestoneSchema.partial();

// GET /admin/streak-milestones
streakMilestoneRoutes.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(STREAK_MILESTONES_COLLECTION)
      .orderBy('streakDays', 'asc')
      .get();

    const milestones = snapshot.docs.map((doc) => ({
      milestoneId: doc.id,
      ...(doc.data() as StreakMilestone),
    }));

    res.status(200).json({ milestones });
  } catch (error) {
    logger.error({ error }, 'Error listing streak milestones');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/streak-milestones
streakMilestoneRoutes.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = milestoneSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection(STREAK_MILESTONES_COLLECTION).doc();
    const payload: StreakMilestone = {
      milestoneId: docRef.id,
      streakDays: parsed.data.streakDays,
      label: parsed.data.label.trim(),
      message: parsed.data.message.trim(),
      active: parsed.data.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await docRef.set(payload);
    res.status(201).json({ milestone: payload });
  } catch (error) {
    logger.error({ error }, 'Error creating streak milestone');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /admin/streak-milestones/:milestoneId
streakMilestoneRoutes.put('/:milestoneId', async (req: Request, res: Response): Promise<void> => {
  try {
    const milestoneId = req.params.milestoneId as string;
    const parsed = milestoneUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection(STREAK_MILESTONES_COLLECTION).doc(milestoneId);
    const existing = await docRef.get();
    if (!existing.exists) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    const updates = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    await docRef.update(updates);
    const saved = await docRef.get();
    res.status(200).json({ milestone: { milestoneId, ...saved.data() } });
  } catch (error) {
    logger.error({ error }, 'Error updating streak milestone');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/streak-milestones/:milestoneId
streakMilestoneRoutes.delete('/:milestoneId', async (req: Request, res: Response): Promise<void> => {
  try {
    const milestoneId = req.params.milestoneId as string;
    const db = getFirestore();
    const docRef = db.collection(STREAK_MILESTONES_COLLECTION).doc(milestoneId);
    const existing = await docRef.get();
    if (!existing.exists) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    await docRef.delete();
    res.status(200).json({ status: 'deleted', milestoneId });
  } catch (error) {
    logger.error({ error }, 'Error deleting streak milestone');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default streakMilestoneRoutes;
