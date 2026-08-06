const encoder = new TextEncoder();
const passwordAlgorithm = 'pbkdf2-sha256';
const passwordIterations = 100_000;
const legacyPasswordIterations = 210_000;
const passwordKeyLengthBits = 256;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export function createToken(bytes = 32) {
  const tokenBytes = new Uint8Array(bytes);
  crypto.getRandomValues(tokenBytes);
  return bytesToHex(tokenBytes);
}

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export function createSalt() {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToHex(salt);
}

async function derivePasswordHash(password: string, salt: string, iterations: number) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBytes(salt),
      iterations,
    },
    baseKey,
    passwordKeyLengthBits,
  );

  return bytesToHex(new Uint8Array(bits));
}

function formatPasswordHash(hash: string, iterations: number) {
  return `${passwordAlgorithm}$${iterations}$${hash}`;
}

function parsePasswordHash(storedHash: string) {
  const [algorithm, iterationsValue, hash] = storedHash.split('$');
  const iterations = Number(iterationsValue);

  if (algorithm === passwordAlgorithm && Number.isInteger(iterations) && iterations > 0 && hash) {
    return { hash, iterations };
  }

  return { hash: storedHash, iterations: legacyPasswordIterations };
}

export async function hashPassword(password: string, salt = createSalt()) {
  const hash = await derivePasswordHash(password, salt, passwordIterations);

  return {
    hash: formatPasswordHash(hash, passwordIterations),
    salt,
  };
}

export async function verifyPassword(password: string, expectedHash: string, salt: string) {
  const parsedHash = parsePasswordHash(expectedHash);

  try {
    const result = await derivePasswordHash(password, salt, parsedHash.iterations);
    return result === parsedHash.hash;
  } catch {
    return false;
  }
}
