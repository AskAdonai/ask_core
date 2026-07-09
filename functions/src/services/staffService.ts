import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Staff, StaffAuthProvider, StaffRole, StaffStatus } from '../types/Staff';
import { STAFF_COLLECTION } from '../types/Staff';

const db = () => getFirestore();

const toStaff = (uid: string, data: FirebaseFirestore.DocumentData): Staff => ({
  uid,
  email: String(data.email ?? ''),
  name: String(data.name ?? ''),
  role: data.role as StaffRole,
  status: data.status as StaffStatus,
  authProvider: data.authProvider as StaffAuthProvider,
  googleLinked: Boolean(data.googleLinked),
  invitedBy: data.invitedBy ?? null,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  lastSeenAt: data.lastSeenAt,
});

export const listStaff = async (): Promise<Staff[]> => {
  const snap = await db().collection(STAFF_COLLECTION).orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => toStaff(doc.id, doc.data()));
};

export const getStaffByUid = async (uid: string): Promise<Staff | null> => {
  const snap = await db().collection(STAFF_COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return toStaff(snap.id, snap.data()!);
};

export const touchStaffLastSeen = async (uid: string): Promise<void> => {
  await db().collection(STAFF_COLLECTION).doc(uid).set(
    { lastSeenAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
};

export interface CreateStaffInput {
  email: string;
  name: string;
  role: StaffRole;
  password?: string;
  status?: StaffStatus;
  invitedBy?: string;
}

const resolveAuthProvider = (
  providers: Array<{ providerId: string }>,
): { authProvider: StaffAuthProvider; googleLinked: boolean } => {
  const ids = new Set(providers.map((p) => p.providerId));
  const hasPassword = ids.has('password');
  const hasGoogle = ids.has('google.com');

  if (hasPassword && hasGoogle) return { authProvider: 'both', googleLinked: true };
  if (hasGoogle) return { authProvider: 'google', googleLinked: true };
  return { authProvider: 'email', googleLinked: false };
};

/**
 * Creates a staff directory profile.
 *
 * If Firebase Auth already has this email (e.g. prior Google sign-in) but there
 * is no staff doc yet, links that existing Auth user instead of failing with
 * "email already exists".
 */
export const createStaffMember = async (input: CreateStaffInput): Promise<Staff> => {
  const auth = getAuth();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password?.trim() || undefined;
  const status = input.status ?? (password ? 'active' : 'invited');

  let userRecord;
  let linkedExistingAuth = false;

  try {
    userRecord = await auth.getUserByEmail(email);
    linkedExistingAuth = true;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : undefined;
    if (code !== 'auth/user-not-found') {
      throw error;
    }
  }

  if (linkedExistingAuth && userRecord) {
    const existingStaff = await getStaffByUid(userRecord.uid);
    if (existingStaff) {
      const alreadyExists = new Error('An account with this email already exists.');
      (alreadyExists as Error & { code?: string }).code = 'auth/email-already-exists';
      throw alreadyExists;
    }

    const updates: {
      displayName: string;
      disabled: boolean;
      password?: string;
    } = {
      displayName: name || userRecord.displayName || email,
      disabled: status === 'suspended',
    };
    if (password) {
      updates.password = password;
    }

    userRecord = await auth.updateUser(userRecord.uid, updates);
  } else {
    const createRequest: {
      email: string;
      displayName: string;
      disabled: boolean;
      password?: string;
    } = {
      email,
      displayName: name,
      disabled: status === 'suspended',
    };
    if (password) {
      createRequest.password = password;
    }
    userRecord = await auth.createUser(createRequest);
  }

  const { authProvider, googleLinked } = resolveAuthProvider(userRecord.providerData);

  const staff: Omit<Staff, 'uid'> = {
    email,
    name: name || userRecord.displayName || email,
    role: input.role,
    status,
    authProvider,
    googleLinked,
    invitedBy: input.invitedBy ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db().collection(STAFF_COLLECTION).doc(userRecord.uid).set(staff);
  return { uid: userRecord.uid, ...staff };
};

export interface UpdateStaffInput {
  name?: string;
  role?: StaffRole;
  status?: StaffStatus;
}

export const updateStaffMember = async (uid: string, input: UpdateStaffInput): Promise<Staff> => {
  const auth = getAuth();
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updates.name = input.name;
  if (input.role !== undefined) updates.role = input.role;
  if (input.status !== undefined) updates.status = input.status;

  await db().collection(STAFF_COLLECTION).doc(uid).set(updates, { merge: true });

  if (input.name !== undefined) {
    await auth.updateUser(uid, { displayName: input.name });
  }
  if (input.status !== undefined) {
    await auth.updateUser(uid, { disabled: input.status === 'suspended' });
  }

  const staff = await getStaffByUid(uid);
  if (!staff) throw new Error('Staff not found after update');
  return staff;
};

export const revokeStaffMember = async (uid: string): Promise<void> => {
  const auth = getAuth();
  await db().collection(STAFF_COLLECTION).doc(uid).set(
    { status: 'suspended', updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  await auth.updateUser(uid, { disabled: true });
};

export const resetStaffPassword = async (uid: string, password: string): Promise<void> => {
  await getAuth().updateUser(uid, { password });
};

export const staffCount = async (): Promise<number> => {
  const snap = await db().collection(STAFF_COLLECTION).count().get();
  return snap.data().count;
};

export const serializeStaffForApi = (staff: Staff) => ({
  uid: staff.uid,
  email: staff.email,
  name: staff.name,
  role: staff.role,
  status: staff.status,
  authProvider: staff.authProvider,
  googleLinked: staff.googleLinked,
  invitedBy: staff.invitedBy ?? null,
  lastSeen: staff.lastSeenAt instanceof Date
    ? staff.lastSeenAt.toISOString()
    : staff.lastSeenAt?.toDate?.()?.toISOString?.() ?? new Date(0).toISOString(),
});
