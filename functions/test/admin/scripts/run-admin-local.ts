/**
 * Local admin API server for RBAC smoke tests.
 *
 * Usage:
 *   ADMIN_AUTH_BYPASS=true ADMIN_AUTH_BYPASS_ROLE=editor npx ts-node test/admin/scripts/run-admin-local.ts
 */
import { loadLocalEnv } from '../../../src/config/loadLocalEnv';
import { initializeApp, getApps } from 'firebase-admin/app';

loadLocalEnv();

async function main() {
  const { createAdminApp } = await import('../../../src/admin/adminApp');

  const PORT = parseInt(process.env.ADMIN_LOCAL_PORT || '8787', 10);

  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'askwhatsappbot',
    });
  }

  const app = createAdminApp();

  app.listen(PORT, () => {
    const role = process.env.ADMIN_AUTH_BYPASS_ROLE || '(real Firebase auth)';
    console.log(`Admin API listening on http://localhost:${PORT}/admin`);
    console.log(`Auth bypass: ${process.env.ADMIN_AUTH_BYPASS === 'true' ? `on (${role})` : 'off'}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
