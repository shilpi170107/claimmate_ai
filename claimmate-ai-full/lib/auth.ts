import crypto from 'crypto'

const SESSION_COOKIE = 'claimmate_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex')
  const a = Buffer.from(check)
  const b = Buffer.from(hash)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function createSessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? ''
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  return match ? match[1] : null
}
