// ─── SHARED SANITIZATION & VALIDATION HELPERS ──────────────────────────────────

/**
 * Strip HTML tags, control characters; trim and limit length.
 * Use for server-side / final validation.
 */
export function sanitizeText(value) {
  if (!value || typeof value !== 'string') return value;
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 500);
}

/**
 * Strip HTML tags and control characters only (no trim / length limit).
 * Safe for client-side onChange handlers where trimming breaks typing flow.
 */
export function sanitizeInput(value) {
  if (!value) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Allow only digits, +, -, spaces, parentheses; trim and limit length.
 */
export function sanitizePhone(value) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/[^0-9+\-\s()]/g, '').trim().slice(0, 30);
}

/**
 * Validate and normalize lat/lng. Returns { latitude, longitude } or null.
 */
export function validCoord(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la === 0 && lo === 0) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { latitude: la, longitude: lo };
}
