import { canPublishRole } from '../../src/admin/utils/staffAttribution';
import { allRoles } from './fixtures/staff';

describe('canPublishRole', () => {
  it('allows superEditor and superadmin', () => {
    expect(canPublishRole('superEditor')).toBe(true);
    expect(canPublishRole('superadmin')).toBe(true);
  });

  it('denies editor', () => {
    expect(canPublishRole('editor')).toBe(false);
  });

  it('denies missing role', () => {
    expect(canPublishRole(undefined)).toBe(false);
  });

  it.each(allRoles)('matches publish matrix for %s', (role) => {
    const expected = role === 'superEditor' || role === 'superadmin';
    expect(canPublishRole(role)).toBe(expected);
  });
});
