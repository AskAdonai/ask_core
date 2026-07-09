import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import pino from 'pino';
import type { AuthedRequest } from '../middleware/authMiddleware';
import { requireAtLeastRole } from '../middleware/authMiddleware';
import { authorFromStaff, canPublishRole } from '../utils/staffAttribution';
import { deleteReplacedMediaUrl } from '../../services/r2Service';

const logger = pino();
const questRoutes = Router();

// Editors and above can manage quest drafts.
questRoutes.use(requireAtLeastRole('editor'));

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
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const weekNumberFilterRaw = typeof req.query.weekNumber === 'string' ? req.query.weekNumber : undefined;
    const levelFilter = typeof req.query.level === 'string' ? req.query.level.trim() : undefined;
    const weekNumberFilter = weekNumberFilterRaw ? parseInt(weekNumberFilterRaw, 10) : undefined;
    const offset = (page - 1) * limit;

    const db = getFirestore();
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('questContent');

    if (Number.isFinite(weekNumberFilter)) {
      query = query.where('weekNumber', '==', weekNumberFilter);
    }
    if (levelFilter) {
      query = query.where('levelTracker', '==', levelFilter);
    }

    query = query.orderBy('weekNumber', 'asc');
    
    const [snap, countSnap] = await Promise.all([
      query.offset(offset).limit(limit).get(),
      query.count().get(),
    ]);
    const quests = snap.docs.map(doc => doc.data());
    
    const total = countSnap.data().count;

    res.status(200).json({ 
      quests,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
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
questRoutes.post('/:weekNumber', async (req: AuthedRequest, res: Response): Promise<void> => {
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

    // Only superEditor+ can publish.
    if (payload.status === 'published' && !canPublishRole(req.staff?.role)) {
      res.status(403).json({ error: 'superEditor role required to publish' });
      return;
    }

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

    const createdBy = authorFromStaff(req.staff);
    const isPublishing = payload.status === 'published';

    await docRef.set({
      ...payload,
      weekNumber,
      createdBy,
      ...(isPublishing
        ? {
            publishedBy: createdBy,
            publishedAt: FieldValue.serverTimestamp(),
          }
        : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
questRoutes.put('/:weekNumber', async (req: AuthedRequest, res: Response): Promise<void> => {
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

    // Only superEditor+ can publish.
    if (updates.status === 'published' && !canPublishRole(req.staff?.role)) {
      res.status(403).json({ error: 'superEditor role required to publish' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('questContent').doc(weekNumberStr);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Quest week ${weekNumberStr} not found. Use POST to create.` });
      return;
    }

    const wasPublished = doc.data()?.status === 'published';
    const isPublishing = updates.status === 'published' && !wasPublished;
    const publishedBy = authorFromStaff(req.staff);
    const previousIntroImageUrl = doc.data()?.introImageUrl as string | undefined;

    if (updates.introImageUrl !== undefined) {
      await deleteReplacedMediaUrl(previousIntroImageUrl, updates.introImageUrl);
    }

    await docRef.set(
      {
        ...updates,
        ...(isPublishing && publishedBy
          ? {
              publishedBy,
              publishedAt: FieldValue.serverTimestamp(),
            }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const updatedDoc = await docRef.get();
    res.status(200).json({
      status: 'success',
      message: `Quest week ${weekNumberStr} updated`,
      quest: updatedDoc.data(),
    });
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
questRoutes.delete('/:weekNumber', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    if (req.staff?.role !== 'superadmin') {
      res.status(403).json({ error: 'superadmin role required' });
      return;
    }
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
