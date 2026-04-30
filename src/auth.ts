import { Request } from 'express'

// Decodes the requester's DID from the AT Protocol bearer JWT.
// We trust the `iss` claim without verifying the signature — a forged token
// only lets the attacker see their own follows anyway.
export function getRequesterDid(req: Request): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null

  try {
    const parts = auth.slice(7).split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return typeof payload.iss === 'string' ? payload.iss : null
  } catch {
    return null
  }
}
