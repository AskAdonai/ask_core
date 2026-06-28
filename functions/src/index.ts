import { initializeApp } from 'firebase-admin/app';
import * as functions from '@google-cloud/functions-framework';
import { createWebhookApp } from './webhook/webhookApp';
import { createAdminApp } from './admin/adminApp';

initializeApp();

const webhookExpressApp = createWebhookApp();
const adminExpressApp = createAdminApp();

// ── HTTP webhook ────────────────────────────────────────────────────────────
// Twilio POSTs inbound WhatsApp messages here.
functions.http('whatsappWebhook', webhookExpressApp);

// ── HTTP Admin API ──────────────────────────────────────────────────────────
// Dashboard API endpoints isolated from webhook traffic.
functions.http('adminApi', adminExpressApp);

// ── Scheduled dispatcher (single minuteTick — all duties) ───────────────────
// Cloud Scheduler: "* * * * *" → publishes to "minute-tick" Pub/Sub topic.
// Handles morning sends, evening reminders, and stale lease reconciliation.
import './cron/dispatchers';

// ── Pub/Sub workers ─────────────────────────────────────────────────────────
import './cron/workers';

