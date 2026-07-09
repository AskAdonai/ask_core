import { Router, Response } from 'express';
import { getFirestore, FieldValue, DocumentData } from 'firebase-admin/firestore';
import pino from 'pino';
import type { AuthedRequest } from '../middleware/authMiddleware';
import { requireAtLeastRole } from '../middleware/authMiddleware';
import { clampJourneyDayToStage, getJourneyStage } from '../../services/journeyStageService';

const logger = pino();
const userRoutes = Router();

// Users contain sensitive PII; restrict to superadmin.
userRoutes.use(requireAtLeastRole('superadmin'));

function normalizeUserId(phone: string): string {
  return decodeURIComponent(phone).replace(/^\+/, '');
}

function sanitizeUserData(data: DocumentData): DocumentData {
  const sanitized = { ...data };
  delete sanitized.password;
  return sanitized;
}

/**
 * @swagger
 * tags:
 *   - Users
 * /users:
 *   get:
 *     summary: List all users (basic details)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/users - List all users (basic details)
userRoutes.get('/', async (_req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('users').get();
    const users = snap.docs.map(doc => {
      const data = sanitizeUserData(doc.data());
      data.id = doc.id;
      if (!data.phone) {
        data.phone = `+${doc.id}`;
      }
      return data;
    });
    res.status(200).json({ users });
  } catch (error) {
    logger.error({ error }, 'Error listing users');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Users
 * /users/{phone}:
 *   get:
 *     summary: Get a specific user's full details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/users/:phone/streak-history - List streak reset shadow records
userRoutes.get('/:phone/streak-history', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const userId = normalizeUserId(req.params.phone as string);
    const { listStreakHistory } = await import('../../services/streakHistoryService');
    const history = await listStreakHistory(userId);
    res.status(200).json({ history });
  } catch (error) {
    logger.error({ error }, 'Error listing streak history');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/users/:phone/restore-streak - Restore streak from shadow history (admin pardon)
userRoutes.post('/:phone/restore-streak', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const userId = normalizeUserId(req.params.phone as string);
    const historyId = typeof req.body?.historyId === 'string' ? req.body.historyId : undefined;
    const { restoreStreakFromHistory } = await import('../../services/streakHistoryService');
    const result = await restoreStreakFromHistory(userId, historyId);
    res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    logger.error({ error }, 'Error restoring streak from history');
    res.status(status).json({ error: message });
  }
});

// GET /admin/users/:phone - Get a specific user's full details
userRoutes.get('/:phone', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const phone = req.params.phone as string;
    const userId = normalizeUserId(phone);
    const db = getFirestore();
    const doc = await db.collection('users').doc(userId).get();

    if (!doc.exists) {
      res.status(404).json({ error: `User ${phone} not found` });
      return;
    }

    const user = sanitizeUserData(doc.data()!);
    user.id = doc.id;
    if (!user.phone) {
      user.phone = `+${userId}`;
    }

    res.status(200).json({ user });
  } catch (error) {
    logger.error({ error }, 'Error fetching user');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Users
 * /users/{phone}:
 *   put:
 *     summary: Update a user's details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// PUT /admin/users/:phone - Update a user's details
userRoutes.put('/:phone', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const phone = req.params.phone as string;
    const userId = normalizeUserId(phone);
    const updates = { ...req.body };

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No update payload provided' });
      return;
    }

    // Prevent overwriting identity or auth fields via admin update
    delete updates.phone;
    delete updates.password;
    delete updates.createdAt;
    delete updates.joinedAt;

    const db = getFirestore();
    const docRef = db.collection('users').doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `User ${phone} not found` });
      return;
    }

    if (updates.journeyStage !== undefined || updates.journeyDayIndex !== undefined) {
      const existing = doc.data()!;
      const stageNumber = Number(updates.journeyStage ?? existing.journeyStage ?? 1);
      const dayIndex = Number(updates.journeyDayIndex ?? existing.journeyDayIndex ?? 1);

      if (!Number.isFinite(stageNumber) || stageNumber < 1) {
        res.status(400).json({ error: 'Invalid journeyStage' });
        return;
      }

      const stage = await getJourneyStage(stageNumber);
      if (!stage) {
        res.status(400).json({ error: `Journey stage ${stageNumber} does not exist` });
        return;
      }

      updates.journeyStage = stageNumber;
      updates.journeyDayIndex = await clampJourneyDayToStage(stageNumber, dayIndex);
    }

    await docRef.set(
      { ...updates, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    const updatedDoc = await docRef.get();
    const user = sanitizeUserData(updatedDoc.data()!);
    if (!user.phone) {
      user.phone = `+${userId}`;
    }

    res.status(200).json({ status: 'success', message: `User ${phone} updated`, user });
  } catch (error) {
    logger.error({ error }, 'Error updating user');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Users
 * /users/{phone}:
 *   delete:
 *     summary: Delete a user recursively
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// DELETE /admin/users/:phone - Delete a user recursively
userRoutes.delete('/:phone', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const phone = req.params.phone as string;
    const userId = normalizeUserId(phone);
    const db = getFirestore();
    const docRef = db.collection('users').doc(userId);

    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: `User ${phone} not found` });
      return;
    }

    // Schedule recursive deletion in the background
    db.recursiveDelete(docRef).then(() => {
      logger.info({ userId }, 'User recursively deleted successfully');
    }).catch(err => {
      logger.error({ userId, error: err }, 'Recursive user deletion failed in background');
    });

    res.status(202).json({ status: 'accepted', message: `User ${phone} scheduled for background deletion` });
  } catch (error) {
    logger.error({ error }, 'Error scheduling user deletion');
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * tags:
 *   - Users
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// POST /admin/users - Create a new user
userRoutes.post('/', async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const { phone, ...userData } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const userId = normalizeUserId(phone);
    const db = getFirestore();
    const docRef = db.collection('users').doc(userId);
    const doc = await docRef.get();

    if (doc.exists) {
      res.status(409).json({ error: `User ${phone} already exists` });
      return;
    }

    const normalizedPhone = phone.startsWith('+') ? phone.replace(/\s/g, '') : `+${userId}`;

    await docRef.set({
      ...userData,
      phone: normalizedPhone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).json({ status: 'success', message: `User ${phone} created` });
  } catch (error) {
    logger.error({ error }, 'Error creating user');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default userRoutes;
