import express, { type Router } from 'express';
import type { StaffRole } from '../../../src/types/Staff';
import type { AuthedRequest } from '../../../src/admin/middleware/authMiddleware';
import { staffByRole } from '../fixtures/staff';

export function mountWithStaff(router: Router, role: StaffRole) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const staff = staffByRole[role];
    const authed = req as AuthedRequest;
    authed.staff = staff;
    authed.authUid = staff.uid;
    next();
  });
  app.use(router);
  return app;
}
