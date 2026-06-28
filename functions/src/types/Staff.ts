import type { Timestamp } from 'firebase-admin/firestore';

export type StaffRole = 'superadmin' | 'superEditor' | 'editor';
export type StaffStatus = 'active' | 'invited' | 'suspended';
export type StaffAuthProvider = 'email' | 'google' | 'both';

/**
 * staff/{uid}
 *
 * Dashboard admin accounts. Document ID matches Firebase Auth UID.
 * Passwords live in Firebase Auth only — never in Firestore.
 */
export interface Staff {
  uid: string;
  email: string;
  name: string;
  role: StaffRole;
  status: StaffStatus;
  authProvider: StaffAuthProvider;
  googleLinked: boolean;
  invitedBy?: string | null;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  lastSeenAt?: Timestamp | Date;
}

export const STAFF_COLLECTION = 'staff';
