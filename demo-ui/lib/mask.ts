// Mask the middle of a phone number for display. Keeps a leading prefix and the
// last two digits: "+15551112222" -> "+1555•••••22". Short values (<= 5 chars)
// are returned as-is; empty values render as an em dash.
export function maskNumber(n?: string): string {
  if (!n) return '—';
  if (n.length <= 5) return n;
  const prefix = n.slice(0, 5);
  const last2 = n.slice(-2);
  const hidden = '•'.repeat(Math.max(0, n.length - 7));
  return `${prefix}${hidden}${last2}`;
}
