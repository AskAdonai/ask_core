import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();
const userRoutes = Router();

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
userRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('users').get();
    const users = snap.docs.map(doc => {
      const data = doc.data();
      // send back all fields without the password field if it exists
      delete data.password;
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
// GET /admin/users/:phone - Get a specific user's full details
userRoutes.get('/:phone', async (req: Request, res: Response): Promise<void> => {
  try {
    const phone = req.params.phone as string;
    const userId = phone.replace('+', '');
    const db = getFirestore();
    const doc = await db.collection('users').doc(userId).get();

    if (!doc.exists) {
      res.status(404).json({ error: `User ${phone} not found` });
      return;
    }

    res.status(200).json({ user: doc.data() });
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
userRoutes.put('/:phone', async (req: Request, res: Response): Promise<void> => {
  try {
    const phone = req.params.phone as string;
    const userId = phone.replace('+', '');
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No update payload provided' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('users').doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `User ${phone} not found` });
      return;
    }

    await docRef.set(
      { ...updates, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    res.status(200).json({ status: 'success', message: `User ${phone} updated` });
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
userRoutes.delete('/:phone', async (req: Request, res: Response): Promise<void> => {
  try {
    const phone = req.params.phone as string;
    const userId = phone.replace('+', '');
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
userRoutes.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, ...userData } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('users').doc(phone);
    const doc = await docRef.get();

    if (doc.exists) {
      res.status(409).json({ error: `User ${phone} already exists` });
      return;
    }

    await docRef.set({
      ...userData,
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
