function normalizeOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/$/, '');
}

export function parseAllowedAdminOrigins(raw?: string): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

/**
 * Returns true when the request may proceed.
 * Requests without an Origin header (curl, server-to-server) are allowed.
 * Browser requests must match an entry in the allowlist exactly.
 */
export function isAdminOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.length === 0) {
    return false;
  }

  return allowedOrigins.includes(normalizeOrigin(origin));
}
