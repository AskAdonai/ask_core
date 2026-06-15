import { initializeApp } from 'firebase-admin/app';
import * as functions from '@google-cloud/functions-framework';
import { createWebhookApp } from './webhook/webhookApp';
import { createAdminApp } from './admin/adminApp';
import { createDocsApp } from './docs/docsApp';

initializeApp();

const webhookExpressApp = createWebhookApp();
const adminExpressApp = createAdminApp();
const docsExpressApp = createDocsApp();

// ── HTTP webhook ────────────────────────────────────────────────────────────
// Twilio POSTs inbound WhatsApp messages here.
functions.http('whatsappWebhook', webhookExpressApp);

// ── HTTP Admin API ──────────────────────────────────────────────────────────
// Dashboard API endpoints isolated from webhook traffic.
functions.http('adminApi', adminExpressApp);

// ── HTTP API Documentation ──────────────────────────────────────────────────
// Swagger UI docs isolated in their own function.
functions.http('docsApi', docsExpressApp);



// ── Scheduled dispatcher (single minuteTick — all duties) ───────────────────
// Cloud Scheduler: "* * * * *" → publishes to "minute-tick" Pub/Sub topic.
// Handles morning sends, evening reminders, and stale lease reconciliation.
import './cron/dispatchers';

// ── Pub/Sub workers ─────────────────────────────────────────────────────────
import './cron/workers';

