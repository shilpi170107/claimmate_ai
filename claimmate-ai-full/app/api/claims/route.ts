import { store, readiness, createClaim } from '@/lib/store'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') ?? 'CLM-2026-10428'
  const claim = store.get(id)
  if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 })
  return Response.json({ claim, readiness: readiness(claim) })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const type = typeof body?.type === 'string' && body.type.trim() ? body.type : 'Health insurance'
  const claim = createClaim(type)
  return Response.json({ claim, readiness: readiness(claim) }, { status: 201 })
}
