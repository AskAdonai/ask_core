import type { Staff, StaffRole } from '../../../src/types/Staff';

function makeStaff(role: StaffRole, suffix: string): Staff {
  return {
    uid: `${role}-uid`,
    email: `${role}@ask.local`,
    name: `Test ${role}`,
    role,
    status: 'active',
    authProvider: 'email',
    googleLinked: false,
  };
}

export const staffByRole: Record<StaffRole, Staff> = {
  editor: makeStaff('editor', '1'),
  superEditor: makeStaff('superEditor', '2'),
  superadmin: makeStaff('superadmin', '3'),
};

export const allRoles: StaffRole[] = ['editor', 'superEditor', 'superadmin'];
