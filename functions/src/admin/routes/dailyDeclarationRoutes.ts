import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();
const dailyDeclarationRoutes = Router();

/**
 * @swagger
 * tags:
 *   - Daily Declarations
 * /daily-declarations/{date}:
 *   get:
 *     summary: declarations/:date
 *     tags: [Daily Declarations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyDeclaration'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/daily-declarations/:date
dailyDeclarationRoutes.get('/:date', async (req: Request, res: Response): Promise<void> => {
  try {
    const date = req.params.date as string; // Expected format: YYYY-MM-DD
    const db = getFirestore();
    const doc = await db.collection('dailyDeclarations').doc(date).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Daily declaration for ${date} not found` });
      return;
    }

    res.status(200).json({ dailyDeclaration: doc.data() });
  } catch (error) {
    logger.error({ error }, 'Error fetching daily declaration');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Daily Declarations
 * /daily-declarations/{date}:
 *   post:
 *     summary: declarations/:date
 *     tags: [Daily Declarations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DailyDeclaration'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyDeclaration'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// POST /admin/daily-declarations/:date
dailyDeclarationRoutes.post('/:date', async (req: Request, res: Response): Promise<void> => {
  try {
    const date = req.params.date as string; // Expected format: YYYY-MM-DD
    const payload = req.body;

    if (!payload.mediaId || !payload.audioUrl) {
      res.status(400).json({ error: 'mediaId and audioUrl are required' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('dailyDeclarations').doc(date);

    await docRef.set({
      ...payload,
      date,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    res.status(200).json({ status: 'success', message: `Daily declaration for ${date} saved.` });
  } catch (error) {
    logger.error({ error }, 'Error saving daily declaration');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default dailyDeclarationRoutes;
