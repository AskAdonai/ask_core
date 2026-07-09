import type { NextFunction } from 'express';
import {
  requireAtLeastRole,
  requireSuperAdmin,
  type AuthedRequest,
} from '../../src/admin/middleware/authMiddleware';
import { allRoles, staffByRole } from './fixtures/staff';
import { mockResponse } from './helpers/mockResponse';

function runMiddleware(
  middleware: (req: AuthedRequest, res: ReturnType<typeof mockResponse>, next: NextFunction) => void,
  role: keyof typeof staffByRole | undefined,
) {
  const req = {
    staff: role ? staffByRole[role] : undefined,
    authUid: role ? staffByRole[role].uid : undefined,
  } as AuthedRequest;
  const res = mockResponse();
  const next = jest.fn();
  middleware(req, res, next);
  return { req, res, next };
}

describe('admin auth middleware', () => {
  describe('requireAtLeastRole(editor)', () => {
    const guard = requireAtLeastRole('editor');

    it.each(allRoles)('allows %s', (role) => {
      const { next, res } = runMiddleware(guard, role);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks when staff is missing', () => {
      const { next, res } = runMiddleware(guard, undefined);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'editor role required' });
    });
  });

  describe('requireAtLeastRole(superEditor)', () => {
    const guard = requireAtLeastRole('superEditor');

    it('allows superEditor and superadmin', () => {
      for (const role of ['superEditor', 'superadmin'] as const) {
        const { next } = runMiddleware(guard, role);
        expect(next).toHaveBeenCalled();
      }
    });

    it('blocks editor', () => {
      const { next, res } = runMiddleware(guard, 'editor');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'superEditor role required' });
    });
  });

  describe('requireAtLeastRole(superadmin)', () => {
    const guard = requireAtLeastRole('superadmin');

    it('allows only superadmin', () => {
      const { next } = runMiddleware(guard, 'superadmin');
      expect(next).toHaveBeenCalled();
    });

    it.each(['editor', 'superEditor'] as const)('blocks %s', (role) => {
      const { next, res } = runMiddleware(guard, role);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'superadmin role required' });
    });
  });

  describe('requireSuperAdmin', () => {
    it('allows superadmin', () => {
      const { next } = runMiddleware(requireSuperAdmin, 'superadmin');
      expect(next).toHaveBeenCalled();
    });

    it.each(['editor', 'superEditor'] as const)('blocks %s', (role) => {
      const { next, res } = runMiddleware(requireSuperAdmin, role);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Super admin required' });
    });
  });
});
