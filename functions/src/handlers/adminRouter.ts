import { Router, Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();
const adminRouter = Router();

// Middleware to verify Firebase Auth JWT
const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // In test environment, skip strict verification if running local jest
    if (process.env.NODE_ENV === 'test' && token === 'test-token') {
      (req as any).user = { uid: 'test-admin' };
      return next();
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    logger.warn({ error }, 'Unauthorized access attempt to admin API');
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

adminRouter.use(requireAuth);


// GET /admin/quiz/:week - Get the quiz for a specific week
adminRouter.get('/quiz/:week', async (req: Request, res: Response): Promise<void> => {
  try {
    const week = req.params.week as string;
    const db = getFirestore();
    const doc = await db.collection('questContent').doc(week).get();

    if (!doc.exists) {
      res.status(404).json({ error: `Quest content for week ${week} not found` });
      return;
    }

    const data = doc.data();
    res.status(200).json({ weekNumber: data?.weekNumber, quizQuestions: data?.quizQuestions || [] });
  } catch (error) {
    logger.error({ error }, 'Error fetching quiz');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/quiz/:week - Set or overwrite the quiz questions for a week
adminRouter.post('/quiz/:week', async (req: Request, res: Response): Promise<void> => {
  try {
    const week = req.params.week as string;
    const { quizQuestions } = req.body;

    if (!Array.isArray(quizQuestions)) {
      res.status(400).json({ error: 'quizQuestions must be an array' });
      return;
    }

    const db = getFirestore();
    await db.collection('questContent').doc(week).set(
      {
        quizQuestions,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true } // Merge true so we don't overwrite weekTitle, videoLinks, etc.
    );

    res.status(200).json({ status: 'success', message: `Quiz questions updated for week ${week}` });
  } catch (error) {
    logger.error({ error }, 'Error updating quiz');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /admin/quiz/:week - Alias for POST for RESTful compliance
adminRouter.put('/quiz/:week', async (req: Request, res: Response): Promise<void> => {
  try {
    const week = req.params.week as string;
    const { quizQuestions } = req.body;

    if (!Array.isArray(quizQuestions)) {
      res.status(400).json({ error: 'quizQuestions must be an array' });
      return;
    }

    const db = getFirestore();
    await db.collection('questContent').doc(week).set(
      {
        quizQuestions,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    res.status(200).json({ status: 'success', message: `Quiz questions updated for week ${week}` });
  } catch (error) {
    logger.error({ error }, 'Error updating quiz');
    res.status(500).json({ error: 'Internal server error' });
  }
});



// DELETE /admin/quiz/:week - Delete the quiz questions for a week
adminRouter.delete('/quiz/:week', async (req: Request, res: Response): Promise<void> => {
  try {
    const week = req.params.week as string;
    const db = getFirestore();

    await db.collection('questContent').doc(week).set(
      {
        quizQuestions: [],
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    res.status(200).json({ status: 'success', message: `Quiz questions deleted for week ${week}` });
  } catch (error) {
    logger.error({ error }, 'Error deleting quiz');
    res.status(500).json({ error: 'Internal server error' });
  }
});







// ── USER MANAGEMENT ENDPOINTS ─────────────────────────────────────────────────

// GET /admin/users - List all users (basic details)
adminRouter.get('/users', async (req: Request, res: Response): Promise<void> => {
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

// GET /admin/users/:phone - Get a specific user's full details
adminRouter.get('/users/:phone', async (req: Request, res: Response): Promise<void> => {
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

// PUT /admin/users/:phone - Update a user's details
adminRouter.put('/users/:phone', async (req: Request, res: Response): Promise<void> => {
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

// DELETE /admin/users/:phone - Delete a user recursively
adminRouter.delete('/users/:phone', async (req: Request, res: Response): Promise<void> => {
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


// POST /admin/users - Create a new user
adminRouter.post('/users', async (req: Request, res: Response): Promise<void> => {
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




// ── THEME & PRAYER MANAGEMENT ENDPOINTS ──────────────────────────────────────

// GET /admin/themes - List all themes
adminRouter.get('/themes', async (req: Request, res: Response): Promise<void> => {
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

// GET /admin/themes/:themeId - Get a specific theme
adminRouter.get('/themes/:themeId', async (req: Request, res: Response): Promise<void> => {
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

// POST /admin/themes/:themeId - Create a theme
adminRouter.post('/themes/:themeId', async (req: Request, res: Response): Promise<void> => {
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

// PUT /admin/themes/:themeId - Update a theme
adminRouter.put('/themes/:themeId', async (req: Request, res: Response): Promise<void> => {
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

// DELETE /admin/themes/:themeId - Delete a theme recursively
adminRouter.delete('/themes/:themeId', async (req: Request, res: Response): Promise<void> => {
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

// GET /admin/themes/:themeId/prayers - List all prayers in a theme
adminRouter.get('/themes/:themeId/prayers', async (req: Request, res: Response): Promise<void> => {
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

// GET /admin/themes/:themeId/prayers/:prayerId - Get a specific prayer
adminRouter.get('/themes/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
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

// POST /admin/themes/:themeId/prayers/:prayerId - Create a prayer
adminRouter.post('/themes/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
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

// PUT /admin/themes/:themeId/prayers/:prayerId - Update a prayer
adminRouter.put('/themes/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
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

// DELETE /admin/themes/:themeId/prayers/:prayerId - Delete a prayer
adminRouter.delete('/themes/:themeId/prayers/:prayerId', async (req: Request, res: Response): Promise<void> => {
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

export default adminRouter;
