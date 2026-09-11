import { users, sessions } from '@/lib/store'
import { getSessionToken } from '@/lib/auth'

export async function GET(request: Request) {
  const token = getSessionToken(request)
  const userId = token ? sessions.get(token) : undefined
  const user = userId ? users.get(userId) : undefined
  if (!user) return Response.json({ user: null })
  return Response.json({ user: { id: user.id, name: user.name, email: user.email } })
}
