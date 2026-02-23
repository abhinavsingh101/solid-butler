import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
    if (!secretKey) throw new Error('JWT_SECRET is missing')
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(key)
}

export async function decrypt(input: string): Promise<any> {
    if (!secretKey) throw new Error('JWT_SECRET is missing')
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        })
        return payload
    } catch (error) {
        return null
    }
}
