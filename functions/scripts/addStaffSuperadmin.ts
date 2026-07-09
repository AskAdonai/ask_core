/**
 * Add or promote a staff member to superadmin by email.
 *
 * Usage:
 *   STAFF_EMAIL=you@example.com STAFF_NAME="Your Name" npx ts-node scripts/addStaffSuperadmin.ts
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { STAFF_COLLECTION } from '../src/types/Staff';

const email = (process.env.STAFF_EMAIL || 'askadonaiapp@gmail.com').trim().toLowerCase();
const name = (process.env.STAFF_NAME || 'Ask Adonai App').trim();

initializeApp();

async function main(): Promise<void> {
  const auth = getAuth();
  const db = getFirestore();

  const existingStaff = await db
    .collection(STAFF_COLLECTION)
    .where('email', '==', email)
    .limit(1)
    .get();

  if (!existingStaff.empty) {
    const doc = existingStaff.docs[0];
    await doc.ref.set(
      {
        role: 'superadmin',
        status: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`Updated existing staff ${doc.id} (${email}) to superadmin`);
    return;
  }

  let uid: string;
  let googleLinked = false;
  let authProvider: 'email' | 'google' = 'email';

  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    googleLinked = user.providerData.some((p) => p.providerId === 'google.com');
    authProvider = googleLinked ? 'google' : 'email';
    console.log(`Found Firebase Auth user ${uid}`);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') {
      throw error;
    }
    const created = await auth.createUser({
      email,
      displayName: name,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`Created Firebase Auth user ${uid} (set password via reset or sign in with Google)`);
  }

  await db.collection(STAFF_COLLECTION).doc(uid).set({
    email,
    name,
    role: 'superadmin',
    status: 'active',
    authProvider,
    googleLinked,
    invitedBy: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`Created staff superadmin ${uid} for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
