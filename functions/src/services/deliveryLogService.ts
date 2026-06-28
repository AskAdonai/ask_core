import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  DELIVERY_LOG_RETENTION_DAYS,
  type DeliveryLog,
  type DeliveryLogStatus,
  type DeliveryPipelineStage,
  type DispatchRun,
  type TwilioDeliveryStatus,
} from '../types/DeliveryLog';

const retentionMs = DELIVERY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const defaultExpiresAt = (): Date => new Date(Date.now() + retentionMs);

export interface WriteDeliveryLogInput {
  userId: string;
  type: DeliveryLog['type'];
  status: DeliveryLogStatus;
  stage: DeliveryPipelineStage;
  deliveryId?: string;
  skipReason?: string;
  error?: string;
  twilioSid?: string;
  metadata?: Record<string, unknown>;
  pinned?: boolean;
}

export const writeDeliveryLog = async (input: WriteDeliveryLogInput): Promise<string> => {
  const db = getFirestore();
  const sentAt = new Date();
  const doc: DeliveryLog = {
    ...input,
    sentAt,
    expiresAt: input.pinned ? undefined : defaultExpiresAt(),
    pinned: input.pinned ?? false,
  };

  const ref = await db.collection('deliveryLogs').add(doc);
  return ref.id;
};

export const writeDispatchRun = async (
  run: Omit<DispatchRun, 'startedAt' | 'completedAt' | 'expiresAt'> & {
    startedAt: Date;
    completedAt: Date;
  },
): Promise<string> => {
  const db = getFirestore();
  const ref = await db.collection('dispatchRuns').add({
    ...run,
    expiresAt: defaultExpiresAt(),
  });
  return ref.id;
};

export interface ListDeliveryLogsFilters {
  type?: DeliveryLog['type'];
  status?: DeliveryLogStatus;
  userId?: string;
  since?: Date;
  limit?: number;
}

export const listDeliveryLogs = async (
  filters: ListDeliveryLogsFilters = {},
): Promise<{ logs: Array<DeliveryLog & { id: string }> }> => {
  const db = getFirestore();
  const limit = Math.min(filters.limit ?? 100, 500);

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
    db.collection('deliveryLogs');

  if (filters.type) query = query.where('type', '==', filters.type);
  if (filters.status) query = query.where('status', '==', filters.status);
  if (filters.userId) query = query.where('userId', '==', filters.userId);

  query = query.orderBy('sentAt', 'desc').limit(limit);

  const snap = await query.get();
  let logs = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as DeliveryLog) }));

  if (filters.since) {
    const sinceMs = filters.since.getTime();
    logs = logs.filter(log => {
      const sentAt = log.sentAt instanceof Timestamp
        ? log.sentAt.toDate()
        : new Date(log.sentAt as Date);
      return sentAt.getTime() >= sinceMs;
    });
  }

  return { logs };
};

export interface MorningDeliverySummary {
  date: string;
  dispatched: number;
  sent: number;
  failed: number;
  skipped: number;
  dispatchRuns: number;
  totalEligible: number;
  totalLeaseBlocked: number;
  recentFailures: Array<DeliveryLog & { id: string }>;
}

export const getMorningDeliverySummary = async (
  dateStr?: string,
): Promise<MorningDeliverySummary> => {
  const db = getFirestore();
  const dayStart = dateStr
    ? new Date(`${dateStr}T00:00:00.000Z`)
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [logsSnap, runsSnap] = await Promise.all([
    db.collection('deliveryLogs')
      .where('type', '==', 'MORNING_CARD')
      .where('sentAt', '>=', dayStart)
      .where('sentAt', '<', dayEnd)
      .orderBy('sentAt', 'desc')
      .limit(500)
      .get(),
    db.collection('dispatchRuns')
      .where('duty', '==', 'morning')
      .where('startedAt', '>=', dayStart)
      .where('startedAt', '<', dayEnd)
      .orderBy('startedAt', 'desc')
      .limit(200)
      .get(),
  ]);

  const logs = logsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as DeliveryLog) }));

  const summary: MorningDeliverySummary = {
    date: dayStart.toISOString().slice(0, 10),
    dispatched: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    dispatchRuns: runsSnap.size,
    totalEligible: 0,
    totalLeaseBlocked: 0,
    recentFailures: [],
  };

  for (const log of logs) {
    if (log.status === 'dispatched') summary.dispatched += 1;
    if (log.status === 'sent') summary.sent += 1;
    if (log.status === 'failed') summary.failed += 1;
    if (log.status === 'skipped') summary.skipped += 1;
    if (log.status === 'failed') summary.recentFailures.push(log);
  }

  for (const doc of runsSnap.docs) {
    const run = doc.data() as DispatchRun;
    summary.totalEligible += run.eligible ?? 0;
    summary.totalLeaseBlocked += run.leaseBlocked ?? 0;
  }

  summary.recentFailures = summary.recentFailures.slice(0, 20);
  return summary;
};

export const pinDeliveryLog = async (logId: string): Promise<void> => {
  const db = getFirestore();
  await db.collection('deliveryLogs').doc(logId).update({
    pinned: true,
    expiresAt: FieldValue.delete(),
  });
};

export const purgeExpiredDeliveryLogs = async (): Promise<number> => {
  const db = getFirestore();
  const now = new Date();
  const snap = await db.collection('deliveryLogs')
    .where('expiresAt', '<=', now)
    .limit(200)
    .get();

  if (snap.empty) return 0;

  const batch = db.batch();
  snap.docs.forEach(doc => {
    const data = doc.data() as DeliveryLog;
    if (!data.pinned) batch.delete(doc.ref);
  });
  await batch.commit();
  return snap.size;
};

export const isDuplicateDelivery = async (
  userId: string,
  deliveryId: string,
  field: 'lastMorningDeliveryId' | 'lastReminderDeliveryId' | 'lastQuestDeliveryId',
): Promise<boolean> => {
  const db = getFirestore();
  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) return true;
  return snap.data()?.[field] === deliveryId;
};

export const markDeliveryProcessed = async (
  userId: string,
  deliveryId: string,
  field: 'lastMorningDeliveryId' | 'lastReminderDeliveryId' | 'lastQuestDeliveryId',
): Promise<void> => {
  const db = getFirestore();
  await db.collection('users').doc(userId).update({
    [field]: deliveryId,
    updatedAt: new Date(),
  });
};

export interface TwilioStatusCallbackPayload {
  messageSid: string;
  messageStatus: string;
  errorCode?: string;
  errorMessage?: string;
  to: string;
  from: string;
}

const normalizeTwilioStatus = (status: string): TwilioDeliveryStatus | undefined => {
  const normalized = status.toLowerCase() as TwilioDeliveryStatus;
  const allowed: TwilioDeliveryStatus[] = [
    'accepted', 'queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'read',
  ];
  return allowed.includes(normalized) ? normalized : undefined;
};

/** Records a Twilio status callback and links it to deliveryLogs by messageSid. */
export const recordTwilioStatusCallback = async (
  payload: TwilioStatusCallbackPayload,
): Promise<{ eventId: string; deliveryLogId?: string }> => {
  const db = getFirestore();
  const twilioStatus = normalizeTwilioStatus(payload.messageStatus);
  const receivedAt = new Date();

  const logsSnap = await db.collection('deliveryLogs')
    .where('twilioSid', '==', payload.messageSid)
    .limit(1)
    .get();

  const deliveryLogId = logsSnap.empty ? undefined : logsSnap.docs[0].id;

  const eventRef = await db.collection('twilioStatusEvents').add({
    messageSid: payload.messageSid,
    messageStatus: twilioStatus ?? payload.messageStatus,
    errorCode: payload.errorCode || undefined,
    errorMessage: payload.errorMessage || undefined,
    to: payload.to,
    from: payload.from,
    deliveryLogId,
    receivedAt,
    expiresAt: defaultExpiresAt(),
  });

  if (deliveryLogId && twilioStatus) {
    const logRef = db.collection('deliveryLogs').doc(deliveryLogId);
    const updates: Record<string, unknown> = {
      twilioStatus,
      twilioStatusAt: receivedAt,
    };

    if (payload.errorCode) updates.twilioErrorCode = payload.errorCode;
    if (payload.errorMessage) updates.twilioErrorMessage = payload.errorMessage;

    if (twilioStatus === 'failed' || twilioStatus === 'undelivered') {
      updates.status = 'failed';
      updates.error = payload.errorMessage || `Twilio status: ${twilioStatus}`;
    }

    await logRef.update(updates);
  }

  return { eventId: eventRef.id, deliveryLogId };
};
