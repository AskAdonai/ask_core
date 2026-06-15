import { getFirestore } from 'firebase-admin/firestore';
import pino from 'pino';

const logger = pino();

/**
 * How long a single worker invocation is expected to hold the lease.
 *
 * Set conservatively below the GCF Gen2 default timeout (60 s) and well
 * above typical Twilio + Firestore round-trip latency (< 5 s).
 * The reconciler in dispatchers.ts clears leases older than LEASE_DURATION_MS,
 * so both values must stay in sync.
 */
export const LEASE_DURATION_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Claims an execution lease on a Firestore document using a transaction.
 *
 * A document is claimable when:
 *   - lockedUntil is null / missing (never locked, or previously released), OR
 *   - lockedUntil is in the past (stale lock from a prior crash).
 *
 * Returns true if the lease was successfully claimed, false if already locked.
 */
export const claimExecutionLease = async (
  collectionName: string,
  docId: string,
  leaseDurationMs = LEASE_DURATION_MS
): Promise<boolean> => {
  const db = getFirestore();
  const docRef = db.collection(collectionName).doc(docId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return false;

      const data = doc.data()!;
      const now = Date.now();

      // lockedUntil === null means the document was explicitly released — always claimable.
      // lockedUntil in the future means another worker is still active — reject.
      if (data.lockedUntil && data.lockedUntil.toMillis() > now) {
        logger.debug({ docId, lockedUntil: data.lockedUntil.toDate() }, 'Lease already held — skipping');
        return false;
      }

      transaction.update(docRef, {
        lockedUntil: new Date(now + leaseDurationMs),
        updatedAt: new Date(),
      });

      return true;
    });
  } catch (error) {
    logger.error({ error, docId }, `Failed to claim lease for ${collectionName}/${docId}`);
    return false;
  }
};

/**
 * Releases a previously claimed execution lease.
 */
export const releaseExecutionLease = async (collectionName: string, docId: string): Promise<void> => {
  const db = getFirestore();
  await db.collection(collectionName).doc(docId).update({
    lockedUntil: null,
    updatedAt: new Date(),
  });
};
