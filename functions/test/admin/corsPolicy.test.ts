import { isAdminOriginAllowed, parseAllowedAdminOrigins } from '../../src/admin/corsPolicy';

describe('admin CORS policy', () => {
  const allowed = parseAllowedAdminOrigins('https://dashboard.askadonai.com');

  it('parses a single production origin', () => {
    expect(allowed).toEqual(['https://dashboard.askadonai.com']);
  });

  it('allows the dashboard origin regardless of casing', () => {
    expect(isAdminOriginAllowed('https://Dashboard.askadonai.com', allowed)).toBe(true);
    expect(isAdminOriginAllowed('https://dashboard.askadonai.com/', allowed)).toBe(true);
  });

  it('rejects other domains', () => {
    expect(isAdminOriginAllowed('https://askadonai.com', allowed)).toBe(false);
    expect(isAdminOriginAllowed('https://ask.elastrocloud.com', allowed)).toBe(false);
    expect(isAdminOriginAllowed('http://localhost:3000', allowed)).toBe(false);
    expect(isAdminOriginAllowed('https://evil.example.com', allowed)).toBe(false);
  });

  it('allows requests without an Origin header (non-browser clients)', () => {
    expect(isAdminOriginAllowed(undefined, allowed)).toBe(true);
  });

  it('rejects browser origins when allowlist is empty', () => {
    expect(isAdminOriginAllowed('https://dashboard.askadonai.com', [])).toBe(false);
  });
});
