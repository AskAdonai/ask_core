import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  KNOCK_MENU_COLLECTION,
  KNOCK_MENU_DOC_ID,
  type KnockMenu,
} from '../../types/KnockMenu';
import pino from 'pino';

const logger = pino();
const knockMenuRoutes = Router();

/**
 * @swagger
 * tags:
 *   - Knock Menu
 * /knock-menu:
 *   get:
 *     summary: Get the KNOCK theme menu configuration
 *     tags: [Knock Menu]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KnockMenu'
 *       404:
 *         description: Knock menu not configured yet
 *       500:
 *         description: Internal Server Error
 */
knockMenuRoutes.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const doc = await db.collection(KNOCK_MENU_COLLECTION).doc(KNOCK_MENU_DOC_ID).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Knock menu not configured yet' });
      return;
    }

    res.status(200).json({ knockMenu: doc.data() });
  } catch (error) {
    logger.error({ error }, 'Error fetching knock menu');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Knock Menu
 * /knock-menu:
 *   put:
 *     summary: Create or update the KNOCK theme menu
 *     tags: [Knock Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KnockMenu'
 *     responses:
 *       200:
 *         description: Knock menu saved
 *       400:
 *         description: imageUrl is required
 *       500:
 *         description: Internal Server Error
 */
knockMenuRoutes.put('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageUrl, instruction } = req.body as Partial<KnockMenu>;

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      res.status(400).json({ error: 'imageUrl is required' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection(KNOCK_MENU_COLLECTION).doc(KNOCK_MENU_DOC_ID);

    const payload: KnockMenu = {
      imageUrl: imageUrl.trim(),
      ...(instruction?.trim() ? { instruction: instruction.trim() } : {}),
      updatedAt: FieldValue.serverTimestamp() as unknown as Date,
    };

    await docRef.set(payload, { merge: true });

    const saved = await docRef.get();
    res.status(200).json({ status: 'success', knockMenu: saved.data() });
  } catch (error) {
    logger.error({ error }, 'Error updating knock menu');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default knockMenuRoutes;
