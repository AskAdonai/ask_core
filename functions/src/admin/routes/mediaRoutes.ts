import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateUploadUrl, deleteFile } from '../../services/r2Service';
import pino from 'pino';

const logger = pino();
const mediaRoutes = Router();

/**
 * @swagger
 * tags:
 *   - Media
 * /media-categories:
 *   get:
 *     summary: List media categories
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/media-categories - List media categories
mediaRoutes.get('/media-categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('mediaCategories').get();
    const categories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ categories });
  } catch (error) {
    logger.error({ error }, 'Error listing media categories');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Media
 * /media-categories:
 *   post:
 *     summary: Create a media category
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Media'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// POST /admin/media-categories - Create a media category
mediaRoutes.post('/media-categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('mediaCategories').doc();
    await docRef.set({
      id: docRef.id,
      name,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({ status: 'success', category: { id: docRef.id, name } });
  } catch (error) {
    logger.error({ error }, 'Error creating media category');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Media
 * /media/upload-url:
 *   post:
 *     summary: signed URL for Cloudflare R2
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Media'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// POST /admin/media/upload-url - Generate pre-signed URL for Cloudflare R2
mediaRoutes.post('/media/upload-url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
      res.status(400).json({ error: 'filename and contentType are required' });
      return;
    }

    const uploadUrl = await generateUploadUrl(filename, contentType);
    res.status(200).json({ uploadUrl, filename });
  } catch (error) {
    logger.error({ error }, 'Error generating pre-signed URL');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Media
 * /media:
 *   post:
 *     summary: Save uploaded media metadata to Firestore
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Media'
 *             additionalProperties: true
 *           example: {}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// POST /admin/media - Save uploaded media metadata to Firestore
mediaRoutes.post('/media', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, url, filename, tags, categoryIds } = req.body;

    if (!type || !url || !filename) {
      res.status(400).json({ error: 'type, url, and filename are required' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('media').doc();
    const media = {
      id: docRef.id,
      type,
      url,
      filename,
      tags: tags || [],
      categoryIds: categoryIds || [],
      createdAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(media);
    res.status(201).json({ status: 'success', media });
  } catch (error) {
    logger.error({ error }, 'Error saving media metadata');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Media
 * /media:
 *   get:
 *     summary: List media gallery items
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
// GET /admin/media - List media gallery items
mediaRoutes.get('/media', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, categoryId, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const db = getFirestore();
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('media');
    let countQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('media');

    if (type) {
      query = query.where('type', '==', type);
      countQuery = countQuery.where('type', '==', type);
    }
    if (categoryId) {
      query = query.where('categoryIds', 'array-contains', categoryId);
      countQuery = countQuery.where('categoryIds', 'array-contains', categoryId);
    }

    query = query.orderBy('createdAt', 'desc').limit(limitNum).offset(offset);

    const [snap, countSnap] = await Promise.all([
      query.get(),
      countQuery.count().get()
    ]);

    const media = snap.docs.map(doc => doc.data());
    const total = countSnap.data().count;

    res.status(200).json({ 
      media,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error listing media');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Media
 * /media/{mediaId}:
 *   get:
 *     summary: Get a specific media item
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
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
// GET /admin/media/:mediaId - Get a specific media item
mediaRoutes.get('/media/:mediaId', async (req: Request, res: Response): Promise<void> => {
  try {
    const mediaId = req.params.mediaId as string;
    const db = getFirestore();
    const doc = await db.collection('media').doc(mediaId).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Media ${mediaId} not found` });
      return;
    }

    res.status(200).json({ media: doc.data() });
  } catch (error) {
    logger.error({ error }, 'Error fetching media');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Media
 * /media/{mediaId}:
 *   delete:
 *     summary: Delete a media item and its file in R2
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
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
// DELETE /admin/media/:mediaId - Delete a media item and its file in R2
mediaRoutes.delete('/media/:mediaId', async (req: Request, res: Response): Promise<void> => {
  try {
    const mediaId = req.params.mediaId as string;
    const db = getFirestore();
    const docRef = db.collection('media').doc(mediaId);

    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: `Media ${mediaId} not found` });
      return;
    }

    const data = doc.data();
    if (data && data.filename) {
      try {
        await deleteFile(data.filename);
      } catch (err) {
        logger.error({ error: err, filename: data.filename }, 'Failed to delete file from R2');
      }
    }

    await docRef.delete();
    res.status(200).json({ status: 'success', message: `Media ${mediaId} deleted` });
  } catch (error) {
    logger.error({ error }, 'Error deleting media');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Media
 * /media-categories/{categoryId}:
 *   get:
 *     summary: Get a specific media category
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
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
// GET /admin/media-categories/:categoryId - Get a media category
mediaRoutes.get('/media-categories/:categoryId', async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = req.params.categoryId as string;
    const db = getFirestore();
    const doc = await db.collection('mediaCategories').doc(categoryId).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Category ${categoryId} not found` });
      return;
    }

    res.status(200).json({ category: doc.data() });
  } catch (error) {
    logger.error({ error }, 'Error fetching media category');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Media
 * /media-categories/{categoryId}:
 *   delete:
 *     summary: Delete a media category
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
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
// DELETE /admin/media-categories/:categoryId - Delete a media category
mediaRoutes.delete('/media-categories/:categoryId', async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = req.params.categoryId as string;
    const db = getFirestore();
    const docRef = db.collection('mediaCategories').doc(categoryId);

    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: `Category ${categoryId} not found` });
      return;
    }

    await docRef.delete();
    res.status(200).json({ status: 'success', message: `Category ${categoryId} deleted` });
  } catch (error) {
    logger.error({ error }, 'Error deleting media category');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default mediaRoutes;
