import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue, DocumentData } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();
const themeRoutes = Router();

function decodeParam(value: string): string {
  return decodeURIComponent(value);
}

function withThemeId(data: DocumentData, docId: string): DocumentData {
  return { ...data, themeId: data.themeId || docId };
}

function withPrayerId(data: DocumentData, docId: string): DocumentData {
  return { ...data, prayerId: data.prayerId || docId };
}

function stripProtectedThemeFields(updates: DocumentData): DocumentData {
  const payload = { ...updates };
  delete payload.themeId;
  delete payload.createdAt;
  return payload;
}

function stripProtectedPrayerFields(updates: DocumentData): DocumentData {
  const payload = { ...updates };
  delete payload.prayerId;
  delete payload.themeId;
  delete payload.createdAt;
  return payload;
}

// GET /admin/themes - List all themes
themeRoutes.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('prayerThemes').orderBy('menuOrder', 'asc').get();
    const themes = snap.docs.map(doc => withThemeId(doc.data(), doc.id));
    res.status(200).json({ themes });
  } catch (error) {
    logger.error({ error }, 'Error listing themes');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/themes/:themeId - Get a specific theme
themeRoutes.get('/:themeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const db = getFirestore();
    const doc = await db.collection('prayerThemes').doc(themeId).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Theme ${themeId} not found` });
      return;
    }

    res.status(200).json({ theme: withThemeId(doc.data()!, doc.id) });
  } catch (error) {
    logger.error({ error }, 'Error fetching theme');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/themes/:themeId - Create a theme
themeRoutes.post('/:themeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const payload = req.body;

    if (!payload.displayName || !payload.category || payload.menuOrder === undefined) {
      res.status(400).json({ error: 'displayName, category, and menuOrder are required' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId);
    const doc = await docRef.get();

    if (doc.exists) {
      res.status(409).json({ error: `Theme ${themeId} already exists. Use PUT to update.` });
      return;
    }

    await docRef.set({
      ...payload,
      themeId,
      available: payload.available ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.status(201).json({ status: 'success', message: `Theme ${themeId} created` });
  } catch (error) {
    logger.error({ error }, 'Error creating theme');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /admin/themes/:themeId - Update a theme
themeRoutes.put('/:themeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const updates = stripProtectedThemeFields(req.body);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No update payload provided' });
      return;
    }

    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Theme ${themeId} not found. Use POST to create.` });
      return;
    }

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const updatedDoc = await docRef.get();
    res.status(200).json({
      status: 'success',
      message: `Theme ${themeId} updated`,
      theme: withThemeId(updatedDoc.data()!, updatedDoc.id),
    });
  } catch (error) {
    logger.error({ error }, 'Error updating theme');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/themes/:themeId - Delete a theme recursively
themeRoutes.delete('/:themeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const db = getFirestore();
    const docRef = db.collection('prayerThemes').doc(themeId);

    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: `Theme ${themeId} not found` });
      return;
    }

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

// GET /admin/themes/:themeId/prayers - List all prayers in a theme
themeRoutes.get('/:themeId/prayers', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const db = getFirestore();
    const snap = await db
      .collection('prayerThemes')
      .doc(themeId)
      .collection('prayers')
      .orderBy('index', 'asc')
      .get();
    const prayers = snap.docs.map(doc => withPrayerId(doc.data(), doc.id));
    res.status(200).json({ prayers });
  } catch (error) {
    logger.error({ error }, 'Error listing prayers');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/themes/:themeId/prayers/:prayerId - Get a specific prayer
themeRoutes.get('/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const prayerId = decodeParam(req.params.prayerId as string);
    const db = getFirestore();
    const doc = await db
      .collection('prayerThemes')
      .doc(themeId)
      .collection('prayers')
      .doc(prayerId)
      .get();

    if (!doc.exists) {
      res.status(404).json({ error: `Prayer ${prayerId} not found` });
      return;
    }

    res.status(200).json({ prayer: withPrayerId(doc.data()!, doc.id) });
  } catch (error) {
    logger.error({ error }, 'Error fetching prayer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/themes/:themeId/prayers/:prayerId - Create a prayer
themeRoutes.post('/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const prayerId = decodeParam(req.params.prayerId as string);
    const payload = req.body;

    if (!payload.title || payload.index === undefined) {
      res.status(400).json({ error: 'title and index are required' });
      return;
    }

    const db = getFirestore();
    const themeRef = db.collection('prayerThemes').doc(themeId);
    const themeDoc = await themeRef.get();

    if (!themeDoc.exists) {
      res.status(404).json({ error: `Theme ${themeId} not found` });
      return;
    }

    const docRef = themeRef.collection('prayers').doc(prayerId);
    const doc = await docRef.get();

    if (doc.exists) {
      res.status(409).json({ error: `Prayer ${prayerId} already exists. Use PUT to update.` });
      return;
    }

    await docRef.set({
      ...payload,
      prayerId,
      themeId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.status(201).json({ status: 'success', message: `Prayer ${prayerId} created` });
  } catch (error) {
    logger.error({ error }, 'Error creating prayer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /admin/themes/:themeId/prayers/:prayerId - Update a prayer
themeRoutes.put('/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const prayerId = decodeParam(req.params.prayerId as string);
    const updates = stripProtectedPrayerFields(req.body);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No update payload provided' });
      return;
    }

    const db = getFirestore();
    const docRef = db
      .collection('prayerThemes')
      .doc(themeId)
      .collection('prayers')
      .doc(prayerId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: `Prayer ${prayerId} not found. Use POST to create.` });
      return;
    }

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const updatedDoc = await docRef.get();
    res.status(200).json({
      status: 'success',
      message: `Prayer ${prayerId} updated`,
      prayer: withPrayerId(updatedDoc.data()!, updatedDoc.id),
    });
  } catch (error) {
    logger.error({ error }, 'Error updating prayer');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/themes/:themeId/prayers/:prayerId - Delete a prayer
themeRoutes.delete('/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const themeId = decodeParam(req.params.themeId as string);
    const prayerId = decodeParam(req.params.prayerId as string);
    const db = getFirestore();
    const docRef = db
      .collection('prayerThemes')
      .doc(themeId)
      .collection('prayers')
      .doc(prayerId);

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
