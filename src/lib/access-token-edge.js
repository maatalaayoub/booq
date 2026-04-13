const SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

/**
 * Verify a signed access token using Web Crypto API (Edge Runtime compatible).
 */
export async function verifyAccessTokenEdge(token) {
  if (!token || typeof token !== 'string' || !SECRET) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  // Check expiry (1 hour)
  if (Date.now() - ts > 60 * 60 * 1000) return false;

  // Recompute HMAC using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`site_access:${timestamp}`)
  );

  const expected = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
