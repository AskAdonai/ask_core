import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();
const configRoutes = Router();

/**
 * @swagger
 * tags:
 *   - Configuration
 * /config/global:
 *   get:
 *     summary: Get global system configuration
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemConfig'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/config/global - Get global system configuration
configRoutes.get('/global', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const doc = await db.collection('systemConfig').doc('global').get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Global configuration not found' });
      return;
    }

    res.status(200).json({ config: doc.data() });
  } catch (error) {
    logger.error({ error }, 'Error fetching system config');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Configuration
 * /config/global:
 *   put:
 *     summary: Update global system configuration
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SystemConfig'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemConfig'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// PUT /admin/config/global - Update global system configuration
configRoutes.put('/global', async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body;
    const db = getFirestore();
    const docRef = db.collection('systemConfig').doc('global');

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    res.status(200).json({ status: 'success', message: 'Global configuration updated' });
  } catch (error) {
    logger.error({ error }, 'Error updating system config');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default configRoutes;
