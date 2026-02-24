import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { decryptSession, encryptSession } from '../../lib/auth'

const originalJwtSecret = process.env.JWT_SECRET

describe('auth helpers', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only'
  })

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET
      return
    }
    process.env.JWT_SECRET = originalJwtSecret
  })

  it('encrypts and decrypts a session payload', async () => {
    const token = await encryptSession({ userId: 'user_1', username: 'abhinav' })
    const payload = await decryptSession(token)

    expect(payload).not.toBeNull()
    expect(payload?.userId).toBe('user_1')
    expect(payload?.username).toBe('abhinav')
  })

  it('returns null for invalid tokens', async () => {
    const payload = await decryptSession('invalid-token')
    expect(payload).toBeNull()
  })

  it('throws on encrypt when JWT secret is missing', async () => {
    delete process.env.JWT_SECRET
    await expect(encryptSession({ userId: 'user_1', username: 'abhinav' })).rejects.toThrow('JWT_SECRET is missing')
  })

  it('returns null on decrypt when JWT secret is missing', async () => {
    delete process.env.JWT_SECRET
    const payload = await decryptSession('anything')
    expect(payload).toBeNull()
  })
})
