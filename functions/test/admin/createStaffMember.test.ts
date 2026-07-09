/**
 * createStaffMember: links orphan Firebase Auth users into the staff directory.
 */
const mockGetUserByEmail = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateUser = jest.fn();
const mockStaffGet = jest.fn();
const mockStaffSet = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUserByEmail: mockGetUserByEmail,
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
  }),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: mockStaffGet,
        set: mockStaffSet,
      }),
    }),
  }),
  FieldValue: { serverTimestamp: jest.fn() },
}));

import { createStaffMember } from '../../src/services/staffService';

describe('createStaffMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStaffSet.mockResolvedValue(undefined);
  });

  it('links an existing Auth user that has no staff profile', async () => {
    mockGetUserByEmail.mockResolvedValue({
      uid: 'auth-uid-1',
      email: 'saviorisrael@gmail.com',
      displayName: 'SAVIOUR ISRAEL',
      providerData: [{ providerId: 'google.com' }],
    });
    mockStaffGet.mockResolvedValue({ exists: false });
    mockUpdateUser.mockResolvedValue({
      uid: 'auth-uid-1',
      email: 'saviorisrael@gmail.com',
      displayName: 'savior',
      providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
    });

    const staff = await createStaffMember({
      email: 'saviorisrael@gmail.com',
      name: 'savior',
      role: 'editor',
      password: 'TempPass12',
      status: 'active',
      invitedBy: 'admin-uid',
    });

    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockUpdateUser).toHaveBeenCalledWith(
      'auth-uid-1',
      expect.objectContaining({
        displayName: 'savior',
        password: 'TempPass12',
        disabled: false,
      }),
    );
    expect(mockStaffSet).toHaveBeenCalled();
    expect(staff.uid).toBe('auth-uid-1');
    expect(staff.authProvider).toBe('both');
    expect(staff.googleLinked).toBe(true);
  });

  it('throws when Auth user already has a staff profile', async () => {
    mockGetUserByEmail.mockResolvedValue({
      uid: 'auth-uid-1',
      email: 'saviorisrael@gmail.com',
      displayName: 'SAVIOUR ISRAEL',
      providerData: [{ providerId: 'google.com' }],
    });
    mockStaffGet.mockResolvedValue({
      exists: true,
      id: 'auth-uid-1',
      data: () => ({
        email: 'saviorisrael@gmail.com',
        name: 'SAVIOUR ISRAEL',
        role: 'editor',
        status: 'active',
        authProvider: 'google',
        googleLinked: true,
      }),
    });

    await expect(
      createStaffMember({
        email: 'saviorisrael@gmail.com',
        name: 'savior',
        role: 'editor',
      }),
    ).rejects.toMatchObject({ code: 'auth/email-already-exists' });

    expect(mockStaffSet).not.toHaveBeenCalled();
  });

  it('creates a new Auth user when email is unknown', async () => {
    mockGetUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
    mockCreateUser.mockResolvedValue({
      uid: 'new-uid',
      email: 'new@example.com',
      displayName: 'New Staff',
      providerData: [{ providerId: 'password' }],
    });

    const staff = await createStaffMember({
      email: 'new@example.com',
      name: 'New Staff',
      role: 'editor',
      password: 'TempPass12',
    });

    expect(mockCreateUser).toHaveBeenCalled();
    expect(staff.uid).toBe('new-uid');
    expect(staff.authProvider).toBe('email');
  });
});
