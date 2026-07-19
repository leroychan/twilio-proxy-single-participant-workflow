export function getBaseUrl(context: {
  DOMAIN_NAME?: string;
  SERVICE_BASE_URL?: string;
}): string {
  const override = context.SERVICE_BASE_URL;
  if (override && override.trim() !== '') {
    return override.trim().replace(/\/+$/, '');
  }
  const domain = context.DOMAIN_NAME || '';
  const scheme = domain.startsWith('localhost') ? 'http' : 'https';
  return `${scheme}://${domain}`;
}

export function resolveRealNumber(
  lookupMapJson: string | undefined,
  defaultNumber: string | undefined,
  digits: string | undefined
): string {
  if (digits && lookupMapJson) {
    try {
      const map = JSON.parse(lookupMapJson) as Record<string, string>;
      if (typeof map[digits] === 'string' && map[digits].length > 0) {
        return map[digits];
      }
    } catch {
      // fall through to default
    }
  }
  return defaultNumber ?? '';
}
