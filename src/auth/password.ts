const ITERATIONS = 100_000;
const SALT_LEN = 16;
const KEY_LEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const key = await derive(password, salt);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(key)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromHex(parts[2]!);
  const expected = fromHex(parts[3]!);
  const actual = await derive(password, salt, iterations);
  if (actual.byteLength !== expected.byteLength) return false;
  const left = new Uint8Array(actual);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i]! ^ expected[i]!;
  return diff === 0;
}

async function derive(password: string, salt: Uint8Array, iterations = ITERATIONS): Promise<ArrayBuffer> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    KEY_LEN * 8,
  );
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
