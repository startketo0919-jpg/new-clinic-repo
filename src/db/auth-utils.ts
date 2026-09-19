import crypto from 'crypto';

/**
 * Creates a cryptographically secure salted PBKDF2 hash of a password.
 * Stored format: pbkdf2:<salt>:<hash>
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored PBKDF2 hash.
 * Also supports graceful fallback for legacy hashes if any exist.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const originalHash = parts[2];
    const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(hashToVerify, 'hex'));
    } catch {
      return false;
    }
  }

  // Graceful fallback during migration
  return storedHash === password;
}

export interface TokenPayload {
  id: string;
  username: string;
  role: string;
  email?: string;
  exp: number; // Unix timestamp in seconds
}

const AUTH_SECRET = process.env.SESSION_SECRET || 'khc-super-secret-auth-key-salt-924219762788';

/**
 * Generates an HMAC-SHA256 cryptographically signed session token for authenticated users.
 * Valid for 7 days. Format: <base64urlPayload>.<base64urlSignature>
 */
export function generateAuthToken(user: { id: string; username: string; role: string; email?: string }): string {
  const payload: TokenPayload = {
    id: String(user.id),
    username: user.username,
    role: user.role,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${signature}`;
}

/**
 * Cryptographically verifies an auth token using timing-safe comparison and checks expiration.
 * Returns decoded payload if authentic and valid, or null if tampered/expired.
 */
export function verifyAuthToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadBase64).digest('base64url');

  try {
    const isSigValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!isSigValid) return null;

    const payload: TokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
