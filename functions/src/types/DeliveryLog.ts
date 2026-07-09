import type { Timestamp } from 'firebase-admin/firestore';

export type DeliveryLogStatus = 'sent' | 'failed' | 'permanently_failed' | 'skipped' | 'dispatched';
export type DeliveryPipelineStage = 'dispatcher' | 'worker';

/** Latest Twilio carrier status from status callback webhook. */
export type TwilioDeliveryStatus =
  | 'accepted'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'read';

/**
 * deliveryLogs/{logId}
 *
 * Operational log of outbound message attempts. Written by dispatchers and workers.
 * Ephemeral by default (expiresAt); admins can pin entries to keep them longer.
 */
export interface DeliveryLog {
  userId: string;
  type:
    | 'ASK'
    | 'SEEK'
    | 'KNOCK'
    | 'JOURNAL'
    | 'QUEST'
    | 'WATCH'
    | 'QUIZ'
    | 'PROGRESS'
    | 'MORNING_CARD'
    | 'REMINDER'
    | 'CHECKIN';

  status: DeliveryLogStatus;
  stage: DeliveryPipelineStage;

  deliveryId?: string;
  skipReason?: string;
  error?: string;
  twilioSid?: string;
  /** Latest status from Twilio status callback (delivered, failed, etc.). */
  twilioStatus?: TwilioDeliveryStatus;
  twilioErrorCode?: string;
  twilioErrorMessage?: string;
  twilioStatusAt?: Date | Timestamp;
  metadata?: Record<string, unknown>;

  sentAt: Date | Timestamp;
  /** Auto-purge after this time unless pinned (dashboard retention). */
  expiresAt?: Date | Timestamp;
  pinned?: boolean;
}

/**
 * dispatchRuns/{runId}
 *
 * One row per minuteTick duty cycle — aggregate view for the admin dashboard.
 */
export interface DispatchRun {
  duty: 'morning' | 'reminder' | 'quest';
  eligible: number;
  dispatched: number;
  leaseBlocked: number;
  publishErrors: number;
  startedAt: Date | Timestamp;
  completedAt: Date | Timestamp;
  expiresAt?: Date | Timestamp;
}

export const DELIVERY_LOG_RETENTION_DAYS = 30;
