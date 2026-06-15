import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import pino from 'pino';

const logger = pino();
const questRoutes = Router();

// Zod Schema for Validation
const daysSchema = z.object({
  monday: z.object({
    readingPortion: z.string().optional(),
    videoLink: z.string().url().optional(),
    mondayEncouragement: z.string().optional()
  }).optional(),
  tuesday: z.object({
    tuesdaySummary: z.string().optional(),
    reflectionQuote: z.string().optional()
  }).optional(),
  wednesday: z.object({
    readingPortion: z.string().optional(),
    wednesdaySummary: z.string().optional(),
    videoLink: z.string().url().optional(),
    estimatedTime: z.string().optional(),
    signOff: z.string().optional()
  }).optional(),
  thursday: z.object({
    readingPortion: z.string().optional(),
    thursdaySummary: z.string().optional()
  }).optional(),
  friday: z.object({
    fridayEncouragement: z.string().optional(),
    readingPortion: z.string().optional(),
    videoLink: z.string().url().optional(),
    weeklySummary: z.string().optional()
  }).optional(),
  saturday: z.object({
    quizGreeting: z.string().optional(),
    quizLinks: z.string().optional(),
    saturdayEncouragement: z.string().optional()
  }).optional(),
  sunday: z.object({
    sundaySummary: z.string().optional()
  }).optional()
});

const questContentSchema = z.object({
  weekNumber: z.number().int().positive(),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  levelTracker: z.string().optional(),
  weeklyChapterSpan: z.string().optional(),
  weekIntro: z.string().optional(),
  introImageUrl: z.string().url().optional(),
  days: daysSchema,
});

/**
 * @swagger
 * tags:
 *   - Quests
 * /quests:
 *   get:
 *     summary: List all quest weeks
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Internal Server Error
 */
questRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;

    const db = getFirestore();
    let query = db.collection('questContent').orderBy('weekNumber', 'asc').limit(limit);
    
    if (page > 1) {
      query = query.offset((page - 1) * limit);
    }

    const snap = await query.get();
    const quests = snap.docs.map(doc => doc.data());
    
    const countSnap = await db.collection('questContent').count().get();
    const total = countSnap.data().count;

    res.status(200).json({ 
      quests,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error({ error }, 'Error listing quests');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Quests
 * /quests/{weekNumber}:
 *   get:
 *     summary: Get a specific quest week
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: weekNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
questRoutes.get('/:weekNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const weekNumber = req.params.weekNumber as string;
    const db = getFirestore();
    const doc = await db.collection('questContent').doc(weekNumber).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Quest week ${weekNumber} not found` });
      return;
    }

    res.status(200).json({ quest: doc.data() });
  } catch (error) {
    logger.error({ error }, 'Error fetching quest');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Quests
 * /quests/{weekNumber}:
 *   post:
 *     summary: Create a quest week
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: weekNumber
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestContent'
 *     responses:
 *       201:
 *         description: Created successfully
 *       409:
 *         description: Conflict
 *       500:
 *         description: Internal Server Error
 */
questRoutes.post('/:weekNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const weekNumberStr = req.params.weekNumber as string;
    
    // Validate request body using Zod
    const validationResult = questContentSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ error: 'Validation failed', details: validationResult.error.format() });
      return;
    }
    // Firestore throws errors if objects contain `undefined` fields. 
    // JSON parse/stringify strips them safely.
    const payload = JSON.parse(JSON.stringify(validationResult.data));

    // Ensure weekNumber in payload matches path
    const weekNumber = parseInt(weekNumberStr, 10);
    if (isNaN(weekNumber)) {
      res.status(400).json({ error: 'weekNumber must be a valid number string' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('questContent').doc(weekNumberStr);
    const doc = await docRef.get();

    if (doc.exists) {
      res.status(409).json({ error: `Quest week ${weekNumberStr} already exists. Use PUT to update.` });
      return;
    }

    await docRef.set({ 
      ...payload, 
      weekNumber, 
      createdAt: FieldValue.serverTimestamp(), 
      updatedAt: FieldValue.serverTimestamp() 
    });
    
    res.status(201).json({ status: 'success', message: `Quest week ${weekNumberStr} created` });
  } catch (error) {
    logger.error({ error }, 'Error creating quest');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Quests
 * /quests/{weekNumber}:
 *   put:
 *     summary: Update a quest week
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: weekNumber
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestContent'
 *     responses:
 *       200:
 *         description: Updated successfully
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
questRoutes.put('/:weekNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const weekNumberStr = req.params.weekNumber as string;
    
    // We use a partial schema for PUT so they can update parts of a week without sending everything
    const partialSchema = questContentSchema.partial();
    const validationResult = partialSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ error: 'Validation failed', details: validationResult.error.format() });
      return;
    }
    const updates = JSON.parse(JSON.stringify(validationResult.data));

    const db = getFirestore();
    const docRef = db.collection('questContent').doc(weekNumberStr);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Quest week ${weekNumberStr} not found. Use POST to create.` });
      return;
    }

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.status(200).json({ status: 'success', message: `Quest week ${weekNumberStr} updated` });
  } catch (error) {
    logger.error({ error }, 'Error updating quest');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Quests
 * /quests/{weekNumber}:
 *   delete:
 *     summary: Delete a quest week
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: weekNumber
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
questRoutes.delete('/:weekNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const weekNumber = req.params.weekNumber as string;
    const db = getFirestore();
    const docRef = db.collection('questContent').doc(weekNumber);

    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: `Quest week ${weekNumber} not found` });
      return;
    }

    await docRef.delete();
    res.status(200).json({ status: 'success', message: `Quest week ${weekNumber} deleted` });
  } catch (error) {
    logger.error({ error }, 'Error deleting quest');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default questRoutes;
