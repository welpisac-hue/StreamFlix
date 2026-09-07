/**
 * Lightweight string obfuscation for client bundles.
 * Not a substitute for server-side secrets — slows casual reverse engineering.
 */

const KEY = 0x5a

/** Encode a plaintext string into a numeric payload for source hiding. */
export function encodeString(input: string): number[] {
  const out: number[] = []
  for (let i = 0; i < input.length; i++) {
    out.push(input.charCodeAt(i) ^ KEY ^ (i % 37))
  }
  return out
}

/** Decode an obfuscated payload at runtime. */
export function decodeString(encoded: number[]): string {
  let result = ''
  for (let i = 0; i < encoded.length; i++) {
    result += String.fromCharCode(encoded[i]! ^ KEY ^ (i % 37))
  }
  return result
}

/** One-shot AES-GCM helpers for encrypting sensitive server payloads. */
export async function encryptAesGcm(
  plaintext: string,
  secret: string
): Promise<string> {
  const { createHash, createCipheriv, randomBytes } = await import('crypto')
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export async function decryptAesGcm(
  payload: string,
  secret: string
): Promise<string> {
  const { createHash, createDecipheriv } = await import('crypto')
  const raw = Buffer.from(payload, 'base64url')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const data = raw.subarray(28)
  const key = createHash('sha256').update(secret).digest()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8'
  )
}
