import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { deleteReplacedMediaUrl } from '../../services/r2Service';
import pino from 'pino';

const logger = pino();
const prayerCardRoutes = Router();

/**
 * @swagger
 * tags:
 *   - PrayerCards
 * /prayer-cards:
 *   get:
 *     summary: List all prayer cards (supports filtering by journeyStage)
 *     tags: [PrayerCards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: journeyStage
 *         schema:
 *           type: string
 *         description: Optional journeyStage to filter by (e.g. "1")
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal Server Error
 */
prayerCardRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const journeyStage = req.query.journeyStage ? Number(req.query.journeyStage) : undefined;
    
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('prayerCards');
    if (journeyStage && !isNaN(journeyStage)) {
      query = query.where('journeyStage', '==', journeyStage);
    }
    
    const snap = await query.get();
    const prayerCards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ prayerCards });
  } catch (error) {
    logger.error({ error }, 'Error listing prayer cards');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /admin/prayer-cards/reorder
 * Reassigns deliveryOrder within a stage — changes user delivery sequence.
 */
prayerCardRoutes.post('/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const journeyStage = Number(req.body.journeyStage);
    const orderedCardIds = req.body.orderedCardIds as string[] | undefined;

    if (!Number.isFinite(journeyStage) || journeyStage < 1 || !Array.isArray(orderedCardIds) || orderedCardIds.length === 0) {
      res.status(400).json({ error: 'journeyStage and orderedCardIds[] are required' });
      return;
    }

    const db = getFirestore();
    const batch = db.batch();

    orderedCardIds.forEach((cardId, index) => {
      const deliveryOrder = index + 1;
      batch.set(
        db.collection('prayerCards').doc(cardId),
        { deliveryOrder, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    });

    await batch.commit();
    res.status(200).json({ status: 'success', journeyStage, count: orderedCardIds.length });
  } catch (error) {
    logger.error({ error }, 'Error reordering prayer cards');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - PrayerCards
 * /prayer-cards/{cardId}:
 *   get:
 *     summary: Get a specific prayer card
 *     tags: [PrayerCards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID (e.g. stage1-day3)
 *     responses:
 *       200:
 *         description: Successful operation
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
prayerCardRoutes.get('/:cardId', async (req: Request, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const db = getFirestore();
    const doc = await db.collection('prayerCards').doc(cardId).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Prayer card ${cardId} not found` });
      return;
    }

    res.status(200).json({ prayerCard: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ error }, 'Error fetching prayer card');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - PrayerCards
 * /prayer-cards/{cardId}:
 *   post:
 *     summary: Create a prayer card mapping
 *     tags: [PrayerCards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID (e.g. stage1-day3)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrayerCard'
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Bad request
 *       409:
 *         description: Conflict
 *       500:
 *         description: Internal Server Error
 */
prayerCardRoutes.post('/:cardId', async (req: Request, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const payload = req.body;

    if (payload.journeyStage === undefined || payload.dayIndex === undefined) {
      res.status(400).json({ error: 'journeyStage and dayIndex are required' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('prayerCards').doc(cardId);
    const doc = await docRef.get();

    if (doc.exists) {
      res.status(409).json({ error: `Prayer card ${cardId} already exists. Use PUT to update.` });
      return;
    }

    await docRef.set({ 
      ...payload, 
      createdAt: FieldValue.serverTimestamp(), 
      updatedAt: FieldValue.serverTimestamp() 
    });
    
    res.status(201).json({ status: 'success', message: `Prayer card ${cardId} created` });
  } catch (error) {
    logger.error({ error }, 'Error creating prayer card');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - PrayerCards
 * /prayer-cards/{cardId}:
 *   put:
 *     summary: Update an existing prayer card
 *     tags: [PrayerCards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrayerCard'
 *     responses:
 *       200:
 *         description: Updated successfully
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
prayerCardRoutes.put('/:cardId', async (req: Request, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const updates = req.body;

    const db = getFirestore();
    const docRef = db.collection('prayerCards').doc(cardId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Prayer card ${cardId} not found. Use POST to create.` });
      return;
    }

    const previous = doc.data() as Record<string, string | undefined>;
    if (updates.audioUrl !== undefined) {
      await deleteReplacedMediaUrl(previous.audioUrl, updates.audioUrl);
    }
    if (updates.morningVoiceNoteUrl !== undefined) {
      await deleteReplacedMediaUrl(previous.morningVoiceNoteUrl, updates.morningVoiceNoteUrl);
    }

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.status(200).json({ status: 'success', message: `Prayer card ${cardId} updated` });
  } catch (error) {
    logger.error({ error }, 'Error updating prayer card');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - PrayerCards
 * /prayer-cards/{cardId}:
 *   delete:
 *     summary: Delete a prayer card
 *     tags: [PrayerCards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
prayerCardRoutes.delete('/:cardId', async (req: Request, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const db = getFirestore();
    const docRef = db.collection('prayerCards').doc(cardId);

    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: `Prayer card ${cardId} not found` });
      return;
    }

    await docRef.delete();
    res.status(200).json({ status: 'success', message: `Prayer card ${cardId} deleted` });
  } catch (error) {
    logger.error({ error }, 'Error deleting prayer card');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default prayerCardRoutes;
