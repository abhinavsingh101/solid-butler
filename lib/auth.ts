import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export type SessionPayload = JWTPayload & {
  userId: string
  username: string
}

function getJwtKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is missing')
  }
  return new TextEncoder().encode(secret)
}

export async function encryptSession(payload: { userId: string; username: string }): Promise<string> {
  const key = getJwtKey()

  return new SignJWT({ userId: payload.userId, username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const key = getJwtKey()
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })

    if (typeof payload.userId !== 'string' || typeof payload.username !== 'string') {
      return null
    }

    return payload as SessionPayload
  } catch {
    return null
  }
}
