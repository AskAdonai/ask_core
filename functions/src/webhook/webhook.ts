/**
 * Barrel re-export for backward compatibility.
 * All new code should import from webhookRouter.ts or webhookApp.ts directly.
 */
export { handleWebhookRequest } from './webhookRouter';
export { createWebhookApp, createApp } from './webhookApp';
