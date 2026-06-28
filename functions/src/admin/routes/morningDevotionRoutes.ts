import { Router, Request, Response } from 'express';
import {
  buildMorningDevotionPreview,
  listMorningDevotionCards,
} from '../../services/morningDevotionAdminService';
import pino from 'pino';

const logger = pino();
const morningDevotionRoutes = Router();

const parseOptionalInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * @swagger
 * tags:
 *   - Morning Devotion
 * /morning-devotion/preview:
 *   get:
 *     summary: Preview the composed morning devotion message for a journey day
 *     tags: [Morning Devotion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: journeyStage
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: journeyDayIndex
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *       - in: query
 *         name: streak
 *         schema:
 *           type: integer
 *       - in: query
 *         name: vineStage
 *         schema:
 *           type: string
 *       - in: query
 *         name: activeKnockTheme
 *         schema:
 *           type: string
 *       - in: query
 *         name: knockPrayerIndex
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Composed preview matching the morning cron worker output
 *       400:
 *         description: Missing or invalid query parameters
 *       500:
 *         description: Internal Server Error
 */
morningDevotionRoutes.get('/preview', async (req: Request, res: Response): Promise<void> => {
  try {
    const journeyStage = parseOptionalInt(req.query.journeyStage);
    const journeyDayIndex = parseOptionalInt(req.query.journeyDayIndex);

    if (!journeyStage || !journeyDayIndex) {
      res.status(400).json({
        error: 'journeyStage and journeyDayIndex query parameters are required',
      });
      return;
    }

    if (journeyStage < 1 || journeyStage > 9 || journeyDayIndex < 1) {
      res.status(400).json({ error: 'Invalid journeyStage or journeyDayIndex' });
      return;
    }

    const result = await buildMorningDevotionPreview({
      journeyStage,
      journeyDayIndex,
      name: typeof req.query.name === 'string' ? req.query.name : undefined,
      streak: parseOptionalInt(req.query.streak),
      vineStage: typeof req.query.vineStage === 'string'
        ? req.query.vineStage as 'Grafted' | 'Rooted' | 'Growing' | 'Blooming' | 'Fruitful'
        : undefined,
      activeKnockTheme: typeof req.query.activeKnockTheme === 'string'
        ? req.query.activeKnockTheme
        : undefined,
      knockPrayerIndex: parseOptionalInt(req.query.knockPrayerIndex),
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Error building morning devotion preview');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * tags:
 *   - Morning Devotion
 * /morning-devotion/cards:
 *   get:
 *     summary: List journey prayer cards with completeness status for the admin grid
 *     tags: [Morning Devotion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: journeyStage
 *         schema:
 *           type: integer
 *         description: Optional filter by journey stage (1-9)
 *     responses:
 *       200:
 *         description: Cards with field-level readiness for morning send
 *       500:
 *         description: Internal Server Error
 */
morningDevotionRoutes.get('/cards', async (req: Request, res: Response): Promise<void> => {
  try {
    const journeyStage = parseOptionalInt(req.query.journeyStage);
    const result = await listMorningDevotionCards(journeyStage);
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Error listing morning devotion cards');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default morningDevotionRoutes;
