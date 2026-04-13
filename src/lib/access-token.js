import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

if (!SECRET) {
  console.warn('[Access Token] ACCESS_TOKEN_SECRET is not set');
}

/**
 * Create a signed access token that can't be forged without the secret.
 * Format: timestamp.signature
 */
export function createAccessToken() {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', SECRET)
    .update(`site_access:${timestamp}`)
    .digest('hex');
  return `${timestamp}.${signature}`;
}

/**
 * Verify a signed access token.
 * Returns true if the token is valid and not expired (1 hour).
 */
export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string' || !SECRET) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  // Check expiry (1 hour)
  if (Date.now() - ts > 60 * 60 * 1000) return false;

  // Recompute and compare using timing-safe comparison
  const expected = createHmac('sha256', SECRET)
    .update(`site_access:${timestamp}`)
    .digest('hex');

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
