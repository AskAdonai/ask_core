import * as functions from '@google-cloud/functions-framework';
import { getFirestore } from 'firebase-admin/firestore';
import { claimExecutionLease, LEASE_DURATION_MS } from '../utils/executionLease';
import { safePubSubPublish } from '../utils/pubsub';
import { randomUUID } from 'crypto';
import pino from 'pino';

const logger = pino();
const MORNING_TOPIC = process.env.PUBSUB_TOPIC_MORNING_SEND || 'morning-send-topic';
const REMINDER_TOPIC = process.env.PUBSUB_TOPIC_REMINDER_SEND || 'reminder-send-topic';
const QUEST_TOPIC = process.env.PUBSUB_TOPIC_QUEST_SEND || 'quest-send-topic';

// ─────────────────────────────────────────────────────────────────────────────
// minuteTick — single Cloud Event handler triggered every minute by one
//              Cloud Scheduler job publishing to the "minute-tick" Pub/Sub topic.
//
// Replaces the three separate handlers:
//   processMorningDispatch   → duty A below
//   processReminderDispatch  → duty B below
//   reconcileStuckJobs       → duty C below
//
// All three duties run in parallel (Promise.allSettled) so a slow Firestore
// query in one duty cannot delay the others. Individual errors per duty are
// caught and logged without aborting the rest of the tick.
// ─────────────────────────────────────────────────────────────────────────────

functions.cloudEvent('minuteTick', async (_cloudEvent: any) => {
  const db = getFirestore();
  const now = new Date();

  const [morningResult, reminderResult, questResult, reconcileResult] = await Promise.allSettled([
    dispatchMorning(db, now),
    dispatchReminders(db, now),
    dispatchQuest(db, now),
    reconcileStuckLeases(db),
  ]);

  // Surface any top-level duty failures
  if (morningResult.status === 'rejected') {
    logger.error({ error: morningResult.reason }, '[minuteTick] Morning dispatch failed');
  }
  if (reminderResult.status === 'rejected') {
    logger.error({ error: reminderResult.reason }, '[minuteTick] Reminder dispatch failed');
  }
  if (questResult.status === 'rejected') {
    logger.error({ error: questResult.reason }, '[minuteTick] Quest dispatch failed');
  }
  if (reconcileResult.status === 'rejected') {
    logger.error({ error: reconcileResult.reason }, '[minuteTick] Lease reconciliation failed');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Duty A — Morning card dispatch
// Finds all non-paused users whose nextSendAt has passed and publishes a
// morning-send job to Pub/Sub. The execution lease prevents double-dispatch
// when the cron ticks overlap with a slow prior invocation.
// ─────────────────────────────────────────────────────────────────────────────

async function dispatchMorning(db: FirebaseFirestore.Firestore, now: Date): Promise<void> {
  const snapshot = await db.collection('users')
    .where('paused', '==', false)
    .where('nextSendAt', '<=', now)
    .select() // Optimize: only fetch document IDs
    .get();

  let dispatched = 0;
  const chunkSize = 50;
  
  for (let i = 0; i < snapshot.docs.length; i += chunkSize) {
    const chunk = snapshot.docs.slice(i, i + chunkSize);
    await Promise.allSettled(chunk.map(async (doc) => {
      const claimed = await claimExecutionLease('users', doc.id);
      if (claimed) {
        // Embed a UUID delivery token so the worker can reject Pub/Sub retries.
        const deliveryId = randomUUID();
        await safePubSubPublish(MORNING_TOPIC, { userId: doc.id, deliveryId });
        dispatched++;
        logger.info({ userId: doc.id, deliveryId }, '[morning] Job dispatched');
      }
    }));
  }

  if (dispatched > 0) logger.info({ dispatched }, '[morning] Dispatch cycle complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Duty B — Evening reminder dispatch
// Finds all non-paused users whose nextReminderAt has passed and publishes a
// reminder job to Pub/Sub.
// ─────────────────────────────────────────────────────────────────────────────

async function dispatchReminders(db: FirebaseFirestore.Firestore, now: Date): Promise<void> {
  const snapshot = await db.collection('users')
    .where('paused', '==', false)
    .where('nextReminderAt', '<=', now)
    .select() // Optimize: only fetch document IDs
    .get();

  let dispatched = 0;
  const chunkSize = 50;

  for (let i = 0; i < snapshot.docs.length; i += chunkSize) {
    const chunk = snapshot.docs.slice(i, i + chunkSize);
    await Promise.allSettled(chunk.map(async (doc) => {
      const claimed = await claimExecutionLease('users', doc.id);
      if (claimed) {
        const deliveryId = randomUUID();
        await safePubSubPublish(REMINDER_TOPIC, { userId: doc.id, deliveryId });
        dispatched++;
        logger.info({ userId: doc.id, deliveryId }, '[reminder] Job dispatched');
      }
    }));
  }

  if (dispatched > 0) logger.info({ dispatched }, '[reminder] Dispatch cycle complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Duty D — Quest dispatch
// Finds all active quest users whose nextQuestAt has passed and publishes a
// quest job to Pub/Sub.
// ─────────────────────────────────────────────────────────────────────────────

async function dispatchQuest(db: FirebaseFirestore.Firestore, now: Date): Promise<void> {
  const snapshot = await db.collection('users')
    .where('paused', '==', false)
    .where('questActive', '==', true)
    .where('nextQuestAt', '<=', now)
    .select() // Optimize: only fetch document IDs
    .get();

  let dispatched = 0;
  const chunkSize = 50;

  for (let i = 0; i < snapshot.docs.length; i += chunkSize) {
    const chunk = snapshot.docs.slice(i, i + chunkSize);
    await Promise.allSettled(chunk.map(async (doc) => {
      const claimed = await claimExecutionLease('users', doc.id);
      if (claimed) {
        const deliveryId = randomUUID();
        await safePubSubPublish(QUEST_TOPIC, { userId: doc.id, deliveryId });
        dispatched++;
        logger.info({ userId: doc.id, deliveryId }, '[quest] Job dispatched');
      }
    }));
  }

  if (dispatched > 0) logger.info({ dispatched }, '[quest] Dispatch cycle complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Duty C — Stale lease reconciliation
// Releases execution leases that are older than LEASE_DURATION_MS so that
// users are never permanently locked due to a crashed worker invocation.
// Null leases are excluded (already released — nothing to reconcile).
// ─────────────────────────────────────────────────────────────────────────────

async function reconcileStuckLeases(db: FirebaseFirestore.Firestore): Promise<void> {
  const staleThreshold = new Date(Date.now() - LEASE_DURATION_MS);

  const snapshot = await db.collection('users')
    .where('lockedUntil', '>', new Date(0))   // excludes null / missing
    .where('lockedUntil', '<=', staleThreshold)
    .select() // Optimize: only fetch document IDs
    .get();

  if (snapshot.empty) return;

  let released = 0;
  let failed = 0;
  const chunkSize = 50;

  for (let i = 0; i < snapshot.docs.length; i += chunkSize) {
    const chunk = snapshot.docs.slice(i, i + chunkSize);
    await Promise.allSettled(chunk.map(async (doc) => {
      try {
        await doc.ref.update({ lockedUntil: null, updatedAt: new Date() });
        released++;
        logger.info({ userId: doc.id }, '[reconcile] Stale lease released');
      } catch (error) {
        failed++;
        logger.error({ userId: doc.id, error }, '[reconcile] Failed to release stale lease — will retry next tick');
      }
    }));
  }

  logger.info({ released, failed }, '[reconcile] Cycle complete');
}
