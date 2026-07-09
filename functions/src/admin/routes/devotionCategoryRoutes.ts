import { Router, Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import pino from 'pino';
import { requireAtLeastRole } from '../middleware/authMiddleware';
import {
  DEVOTION_CATEGORIES_COLLECTION,
  type DevotionCategory,
} from '../../types/DevotionCategory';

const logger = pino();
const devotionCategoryRoutes = Router();

devotionCategoryRoutes.use(requireAtLeastRole('editor'));

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const categoryUpdateSchema = categorySchema.partial();

devotionCategoryRoutes.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(DEVOTION_CATEGORIES_COLLECTION).get();

    const categories = snapshot.docs
      .map((doc) => ({
        categoryId: doc.id,
        ...(doc.data() as DevotionCategory),
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

    res.status(200).json({ categories });
  } catch (error) {
    logger.error({ error }, 'Error listing devotion categories');
    res.status(500).json({ error: 'Internal server error' });
  }
});

devotionCategoryRoutes.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection(DEVOTION_CATEGORIES_COLLECTION).doc();
    const payload: DevotionCategory = {
      categoryId: docRef.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim(),
      sortOrder: parsed.data.sortOrder ?? 0,
      active: parsed.data.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await docRef.set(payload);
    res.status(201).json({ category: payload });
  } catch (error) {
    logger.error({ error }, 'Error creating devotion category');
    res.status(500).json({ error: 'Internal server error' });
  }
});

devotionCategoryRoutes.put('/:categoryId', async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = req.params.categoryId as string;
    const parsed = categoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection(DEVOTION_CATEGORIES_COLLECTION).doc(categoryId);
    const existing = await docRef.get();
    if (!existing.exists) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    await docRef.set(
      {
        ...parsed.data,
        name: parsed.data.name?.trim(),
        description: parsed.data.description?.trim(),
        updatedAt: new Date(),
      },
      { merge: true },
    );

    const saved = await docRef.get();
    res.status(200).json({ category: { categoryId, ...saved.data() } });
  } catch (error) {
    logger.error({ error }, 'Error updating devotion category');
    res.status(500).json({ error: 'Internal server error' });
  }
});

devotionCategoryRoutes.delete('/:categoryId', async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = req.params.categoryId as string;
    const db = getFirestore();
    const docRef = db.collection(DEVOTION_CATEGORIES_COLLECTION).doc(categoryId);
    const existing = await docRef.get();
    if (!existing.exists) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    await docRef.delete();
    res.status(200).json({ status: 'deleted', categoryId });
  } catch (error) {
    logger.error({ error }, 'Error deleting devotion category');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default devotionCategoryRoutes;
