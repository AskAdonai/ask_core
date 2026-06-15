import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();
const themeRoutes = Router();

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes:
 *   get:
 *     summary: List all themes
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/themes - List all themes
themeRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('prayerThemes').get();
    const themes = snap.docs.map(doc => doc.data());
    res.status(200).json({ themes });
  } catch (error) {
    logger.error({ error }, 'Error listing themes');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}:
 *   get:
 *     summary: Get a specific theme
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/themes/:themeId - Get a specific theme
themeRoutes.get('/:themeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const db = getFirestore();
    const doc = await db.collection('prayerThemes').doc(themeId).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Theme ${themeId} not found` });
      return;
    }

    res.status(200).json({ theme: doc.data() });
  } catch (error) {
    logger.error({ error }, 'Error fetching theme');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}:
 *   post:
 *     summary: Create a theme
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrayerTheme'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// POST /admin/themes/:themeId - Create a theme
themeRoutes.post('/:themeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const payload = req.body;

    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId);
    const doc = await docRef.get();

    if (doc.exists) {
      res.status(409).json({ error: `Theme ${themeId} already exists. Use PUT to update.` });
      return;
    }

    await docRef.set({ ...payload, themeId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    res.status(201).json({ status: 'success', message: `Theme ${themeId} created` });
  } catch (error) {
    logger.error({ error }, 'Error creating theme');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}:
 *   put:
 *     summary: Update a theme
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrayerTheme'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// PUT /admin/themes/:themeId - Update a theme
themeRoutes.put('/:themeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const updates = req.body;

    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Theme ${themeId} not found. Use POST to create.` });
      return;
    }

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.status(200).json({ status: 'success', message: `Theme ${themeId} updated` });
  } catch (error) {
    logger.error({ error }, 'Error updating theme');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}:
 *   delete:
 *     summary: Delete a theme recursively
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// DELETE /admin/themes/:themeId - Delete a theme recursively
themeRoutes.delete('/:themeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId);

    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: `Theme ${themeId} not found` });
      return;
    }

    // Schedule recursive deletion in the background
    db.recursiveDelete(docRef).then(() => {
      logger.info({ themeId }, 'Theme recursively deleted successfully');
    }).catch(err => {
      logger.error({ themeId, error: err }, 'Recursive theme deletion failed in background');
    });

    res.status(202).json({ status: 'accepted', message: `Theme ${themeId} scheduled for background deletion` });
  } catch (error) {
    logger.error({ error }, 'Error scheduling theme deletion');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}/prayers:
 *   get:
 *     summary: List all prayers in a theme
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/themes/:themeId/prayers - List all prayers in a theme
themeRoutes.get('/:themeId/prayers', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const db = getFirestore();
    const snap = await db.collection('prayerThemes').doc(themeId).collection('prayers').get();
    const prayers = snap.docs.map(doc => doc.data());
    res.status(200).json({ prayers });
  } catch (error) {
    logger.error({ error }, 'Error listing prayers');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}/prayers/{prayerId}:
 *   get:
 *     summary: Get a specific prayer
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: prayerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/themes/:themeId/prayers/:prayerId - Get a specific prayer
themeRoutes.get('/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const prayerId = req.params.prayerId as string;
    const db = getFirestore();
    const doc = await db.collection('prayerThemes').doc(themeId).collection('prayers').doc(prayerId).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Prayer ${prayerId} not found` });
      return;
    }

    res.status(200).json({ prayer: doc.data() });
  } catch (error) {
    logger.error({ error }, 'Error fetching prayer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}/prayers/{prayerId}:
 *   post:
 *     summary: Create a prayer
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: prayerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrayerTheme'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// POST /admin/themes/:themeId/prayers/:prayerId - Create a prayer
themeRoutes.post('/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const prayerId = req.params.prayerId as string;
    const payload = req.body;

    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId).collection('prayers').doc(prayerId);
    const doc = await docRef.get();

    if (doc.exists) {
      res.status(409).json({ error: `Prayer ${prayerId} already exists. Use PUT to update.` });
      return;
    }

    await docRef.set({ ...payload, prayerId, themeId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    res.status(201).json({ status: 'success', message: `Prayer ${prayerId} created` });
  } catch (error) {
    logger.error({ error }, 'Error creating prayer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}/prayers/{prayerId}:
 *   put:
 *     summary: Update a prayer
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: prayerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrayerTheme'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// PUT /admin/themes/:themeId/prayers/:prayerId - Update a prayer
themeRoutes.put('/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const prayerId = req.params.prayerId as string;
    const updates = req.body;

    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId).collection('prayers').doc(prayerId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Prayer ${prayerId} not found. Use POST to create.` });
      return;
    }

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.status(200).json({ status: 'success', message: `Prayer ${prayerId} updated` });
  } catch (error) {
    logger.error({ error }, 'Error updating prayer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Themes
 * /themes/{themeId}/prayers/{prayerId}:
 *   delete:
 *     summary: Delete a prayer
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: prayerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrayerTheme'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// DELETE /admin/themes/:themeId/prayers/:prayerId - Delete a prayer
themeRoutes.delete('/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = req.params.themeId as string;
    const prayerId = req.params.prayerId as string;
    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId).collection('prayers').doc(prayerId);

    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: `Prayer ${prayerId} not found` });
      return;
    }

    await docRef.delete();
    res.status(200).json({ status: 'success', message: `Prayer ${prayerId} deleted` });
  } catch (error) {
    logger.error({ error }, 'Error deleting prayer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default themeRoutes;
