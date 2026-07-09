import type { Staff } from '../../types/Staff';
import type { ContentAuthor } from '../../types/ContentAuthor';

export type { ContentAuthor };

export function authorFromStaff(staff?: Staff): ContentAuthor | undefined {
  if (!staff) return undefined;
  return {
    uid: staff.uid,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  };
}

export function canPublishRole(role?: Staff['role']): boolean {
  return role === 'superadmin' || role === 'superEditor';
}
