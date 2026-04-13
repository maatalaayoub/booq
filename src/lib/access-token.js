import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

/**
 * Create a signed access token (Node.js only — used in API routes).
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
 * Verify a signed access token (Node.js only — used in API routes).
 */
export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string' || !SECRET) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  if (Date.now() - ts > 60 * 60 * 1000) return false;

  const expected = createHmac('sha256', SECRET)
    .update(`site_access:${timestamp}`)
    .digest('hex');

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
