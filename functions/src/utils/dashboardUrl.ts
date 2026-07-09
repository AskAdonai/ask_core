/**
 * Canonical dashboard origin for auth redirects and email links.
 */
export function resolveDashboardOrigin(): string {
  const configured =
    process.env.DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const origins = (process.env.ALLOWED_ADMIN_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const production = origins.find(
    (o) => o.startsWith('https://') && !o.includes('localhost'),
  );

  return production || 'https://dashboard.askadonai.com';
}

export function resolveDashboardLoginUrl(): string {
  return `${resolveDashboardOrigin()}/login`;
}
