/**
 * Quest CRUD smoke test as an editor staff role.
 *
 * Usage:
 *   node test/admin/scripts/test-quest-crud-editor.mjs
 *
 * Auth options (first match wins):
 *   FIREBASE_ID_TOKEN — use an existing editor ID token (from browser devtools)
 *   GOOGLE_APPLICATION_CREDENTIALS — service account JSON with signBlob
 *   GOOGLE_IMPERSONATE_SERVICE_ACCOUNT — impersonate Firebase admin SA (default below)
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const API_BASE = process.env.ADMIN_API_URL
  || 'https://us-central1-askwhatsappbot.cloudfunctions.net/adminApi/admin';
const FIREBASE_API_KEY = process.env.FIREBASE_WEB_API_KEY
  || 'AIzaSyDZISc2LT1X_EArnuLqzW-cvRyGvbvMjqI';
const TEST_WEEK = String(process.env.TEST_QUEST_WEEK || '9999');
const IMPERSONATE_SA = process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT
  || 'firebase-adminsdk-fbsvc@askwhatsappbot.iam.gserviceaccount.com';

if (!process.env.FIREBASE_ID_TOKEN && !process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT) {
  process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT = IMPERSONATE_SA;
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'askwhatsappbot',
    serviceAccountId: IMPERSONATE_SA,
  });
}

const db = getFirestore();
const auth = getAuth();

async function findEditorStaff() {
  const snap = await db.collection('staff').where('role', '==', 'editor').where('status', '==', 'active').limit(1).get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    return { uid: doc.id, ...doc.data() };
  }

  const anySnap = await db.collection('staff').where('role', '==', 'editor').limit(1).get();
  if (!anySnap.empty) {
    const doc = anySnap.docs[0];
    return { uid: doc.id, ...doc.data() };
  }

  return null;
}

async function getIdTokenForUid(uid) {
  const customToken = await auth.createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to exchange custom token (${res.status})`);
  }
  return data.idToken;
}

function questPayload(overrides = {}) {
  return {
    weekNumber: Number(TEST_WEEK),
    status: 'draft',
    levelTracker: 'EDITOR TEST',
    weeklyChapterSpan: 'Genesis 1-3',
    weekIntro: 'Editor CRUD test quest',
    introImageUrl: 'https://via.placeholder.com/600x400?text=Editor+Test',
    days: {
      monday: { readingPortion: 'Genesis 1', mondayEncouragement: 'Test monday' },
    },
    ...overrides,
  };
}

async function api(method, path, token, body, base = API_BASE) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function assertStatus(label, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: expected ${expected}, got ${actual}`);
  if (!pass) {
    console.log('  response:', JSON.stringify(arguments[3] || {}, null, 2));
    process.exitCode = 1;
  }
}

async function cleanup(token, base = API_BASE) {
  const del = await api('DELETE', `/quests/${TEST_WEEK}`, token, undefined, base);
  if (del.status === 200) {
    console.log(`Cleanup: deleted test week ${TEST_WEEK}`);
  } else if (del.status === 403) {
    console.log(`Cleanup skipped: editor cannot delete (403) — week ${TEST_WEEK} may remain`);
  } else if (del.status === 404) {
    console.log(`Cleanup: week ${TEST_WEEK} not found`);
  } else {
    console.log(`Cleanup warning: DELETE returned ${del.status}`, del.json);
  }
}

async function main() {
  const useBypass = process.env.USE_AUTH_BYPASS === 'true';
  const apiBase = process.env.ADMIN_API_URL
    || (useBypass ? 'http://localhost:8787/admin' : API_BASE);

  let token;
  if (useBypass) {
    token = 'test-token';
    console.log('Using auth bypass (editor role via ADMIN_AUTH_BYPASS_ROLE)');
  } else {
    const editor = await findEditorStaff();
    if (!editor) {
      console.error('No editor staff found in Firestore `staff` collection.');
      process.exit(1);
    }
    console.log(`Using editor: ${editor.name || editor.email} (${editor.uid})`);
    token = process.env.FIREBASE_ID_TOKEN || await getIdTokenForUid(editor.uid);
  }

  await cleanup(token, apiBase);

  const list = await api('GET', '/quests?limit=5&page=1', token, undefined, apiBase);
  assertStatus('LIST quests', list.status, 200, list.json);

  const createDraft = await api('POST', `/quests/${TEST_WEEK}`, token, questPayload(), apiBase);
  assertStatus('CREATE draft quest', createDraft.status, 201, createDraft.json);

  const getOne = await api('GET', `/quests/${TEST_WEEK}`, token, undefined, apiBase);
  assertStatus('READ quest', getOne.status, 200, getOne.json);

  const updateDraft = await api('PUT', `/quests/${TEST_WEEK}`, token, {
    weekIntro: 'Updated by editor test',
    status: 'draft',
  }, apiBase);
  assertStatus('UPDATE draft quest', updateDraft.status, 200, updateDraft.json);

  const publishAttempt = await api('PUT', `/quests/${TEST_WEEK}`, token, { status: 'published' }, apiBase);
  assertStatus('PUBLISH quest as editor (should fail)', publishAttempt.status, 403, publishAttempt.json);

  const createPublished = await api('POST', `/quests/${Number(TEST_WEEK) + 1}`, token, questPayload({
    weekNumber: Number(TEST_WEEK) + 1,
    status: 'published',
  }), apiBase);
  assertStatus('CREATE published quest as editor (should fail)', createPublished.status, 403, createPublished.json);
  if (createPublished.status === 403) {
    await api('DELETE', `/quests/${Number(TEST_WEEK) + 1}`, token, undefined, apiBase);
  }

  const deleteAttempt = await api('DELETE', `/quests/${TEST_WEEK}`, token, undefined, apiBase);
  assertStatus('DELETE quest as editor (should fail)', deleteAttempt.status, 403, deleteAttempt.json);

  console.log('\nEditor quest CRUD test complete.');
  if (deleteAttempt.status === 403) {
    console.log(`Note: test quest week ${TEST_WEEK} remains as draft — delete requires superadmin.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
