import type { Context, Next } from 'hono'
import { UnauthorizedError } from '@tahu/core'

/**
 * JWT + API Key authentication middleware.
 * Checks Authorization: Bearer <token> or X-API-Key header.
 */
export async function auth(c: Context, next: Next) {
  const apiKey = c.req.header('x-api-key')
  if (apiKey && apiKey === c.env.API_KEY) {
    c.set('authType', 'apikey')
    return next()
  }

  const authHeader = c.req.header('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const payload = await verifyJwt(token, c.env.JWT_SECRET)
      c.set('authType', 'jwt')
      c.set('userId', payload.sub)
      return next()
    } catch {
      throw new UnauthorizedError('Invalid or expired token')
    }
  }

  throw new UnauthorizedError('Authentication required')
}

async function verifyJwt(token: string, secret: string): Promise<{ sub: string }> {
  // Simple HMAC-based JWT verification (no external deps needed for Workers)
  const [headerB64, payloadB64, signatureB64] = token.split('.')
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Invalid token format')
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(signatureB64),
    encoder.encode(`${headerB64}.${payloadB64}`),
  )

  if (!valid) throw new Error('Invalid signature')

  return JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)))
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
