/**
 * Secure password hashing using expo-crypto (SHA-256 + random salt).
 * Replaces bcryptjs which can't access crypto on React Native.
 */
import * as Crypto from 'expo-crypto';

/**
 * Hash a plaintext password.
 * Returns a string in the form "saltHex:hash".
 */
export async function hashPassword(password) {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltHex + password,
  );

  return `${saltHex}:${hash}`;
}

/**
 * Compare a plaintext password against a stored hash.
 * Returns true if they match.
 */
export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [saltHex, expectedHash] = storedHash.split(':');

  const computedHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltHex + password,
  );

  return computedHash === expectedHash;
}
