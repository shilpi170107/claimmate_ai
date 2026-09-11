import { store, readiness } from '@/lib/store'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')
  const claimId = String(formData.get('claimId') ?? 'CLM-2026-10428')
  const docName = String(formData.get('docName') ?? 'Document')

  if (!(file instanceof File)) {
    return Response.json({ error: 'A file is required.' }, { status: 400 })
  }

  const claim = store.get(claimId)
  if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 })

  let confidence = 80
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (apiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          system:
            'You are a document intake classifier for an insurance claims app. Respond with ONLY a JSON object: {"confidence": <integer 0-100>}. Estimate how plausibly a file with the given name and type matches the declared document category. Be reasonably generous for a demo, but lower the score for an obvious mismatch (for example a .txt file declared as a medical report).',
          messages: [
            {
              role: 'user',
              content: `File name: ${file.name}\nFile type: ${file.type || 'unknown'}\nFile size: ${file.size} bytes\nDeclared document category: ${docName}`,
            },
          ],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data?.content?.find((b: any) => b.type === 'text')?.text ?? ''
        const match = text.match(/\{[\s\S]*\}/)
        const parsed = match ? JSON.parse(match[0]) : {}
        if (typeof parsed.confidence === 'number') {
          confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)))
        }
      } else {
        console.error('[v0] document classify error:', res.status, await res.text())
      }
    } catch (error) {
      console.error('[v0] document classify error:', error)
    }
  }

  const status = confidence >= 80 ? 'Verified' : 'Low quality'
  const doc = claim.documents.find((d) => d.name === docName) ?? claim.documents.find((d) => d.status === 'Required')

  if (doc) {
    doc.status = status
    doc.confidence = confidence
    doc.uploadedAt = new Date().toISOString()
  }

  return Response.json({ claim, readiness: readiness(claim), document: doc ?? null })
}
