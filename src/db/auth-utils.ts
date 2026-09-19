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
