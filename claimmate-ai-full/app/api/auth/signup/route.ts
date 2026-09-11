import crypto from 'crypto'
import { users, sessions } from '@/lib/store'
import { hashPassword, createSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!name || !email || !password || password.length < 6) {
    return Response.json(
      { error: 'Enter a name, email, and a password of at least 6 characters.' },
      { status: 400 },
    )
  }

  const exists = [...users.values()].some((u) => u.email === email)
  if (exists) {
    return Response.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const { hash, salt } = hashPassword(password)
  const id = crypto.randomUUID()
  users.set(id, { id, name, email, passwordHash: hash, salt, createdAt: new Date().toISOString() })

  const token = crypto.randomUUID()
  sessions.set(token, id)

  return Response.json(
    { user: { id, name, email } },
    { status: 201, headers: { 'Set-Cookie': createSessionCookie(token) } },
  )
}
