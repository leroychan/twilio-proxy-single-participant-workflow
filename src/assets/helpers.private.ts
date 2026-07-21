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

/**
 * Resolve the destination ("other party") number for a call.
 *
 * LOOKUP_MAP entries may be either format:
 *   - Bidirectional pair (preferred): `"code": ["+partyA", "+partyB"]`.
 *     One code links two parties. The `from` (caller) is matched against the
 *     pair and the OTHER party's number is returned, so the same code connects
 *     A→B and B→A. If the caller is neither party, we fall back to the default.
 *   - One-directional (legacy): `"code": "+number"`. Returns the number
 *     regardless of caller.
 *
 * Falls back to `defaultNumber` when the code is unknown, the caller is not in
 * the pair, or the JSON is malformed.
 */
export function resolveRealNumber(
  lookupMapJson: string | undefined,
  defaultNumber: string | undefined,
  digits: string | undefined,
  from: string | undefined
): string {
  if (digits && lookupMapJson) {
    try {
      const map = JSON.parse(lookupMapJson) as Record<string, unknown>;
      const entry = map[digits];

      // Bidirectional pair: return whichever party is not the caller.
      if (Array.isArray(entry)) {
        const parties = entry.filter(
          (n): n is string => typeof n === 'string' && n.length > 0
        );
        if (parties.length === 2 && from) {
          if (from === parties[0]) return parties[1];
          if (from === parties[1]) return parties[0];
        }
        // caller is not part of this pair → fall through to default
      } else if (typeof entry === 'string' && entry.length > 0) {
        // Legacy one-directional mapping.
        return entry;
      }
    } catch {
      // fall through to default
    }
  }
  return defaultNumber ?? '';
}
