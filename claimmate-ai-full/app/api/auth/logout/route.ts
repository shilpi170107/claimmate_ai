import { sessions } from '@/lib/store'
import { getSessionToken, clearSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  const token = getSessionToken(request)
  if (token) sessions.delete(token)
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
}
