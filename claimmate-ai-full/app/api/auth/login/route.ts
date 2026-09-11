import crypto from 'crypto'
import { users, sessions } from '@/lib/store'
import { verifyPassword, createSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const user = [...users.values()].find((u) => u.email === email)
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return Response.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }

  const token = crypto.randomUUID()
  sessions.set(token, user.id)

  return Response.json(
    { user: { id: user.id, name: user.name, email: user.email } },
    { headers: { 'Set-Cookie': createSessionCookie(token) } },
  )
}
