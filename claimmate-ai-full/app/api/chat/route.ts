import { store, readiness } from '@/lib/store'

const baseSystemPrompt = `You are ClaimMate AI, a careful insurance claims assistant. Help users understand health insurance policies and prepare claims in plain language. Never guarantee approval, coverage, settlement amounts, or legal outcomes. Clearly distinguish general guidance from a final insurer decision. Ask for missing context when needed. Use the demo policy context: hospitalization over 24 hours is generally covered when supported by a discharge summary and itemized bill. Mention that documents should not include unnecessary sensitive information.`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const claimId = typeof body?.claimId === 'string' ? body.claimId : 'CLM-2026-10428'
    const claim = store.get(claimId)
    const r = claim ? readiness(claim) : null

    const apiMessages = messages
      .filter((m: any) => m && typeof m.text === 'string')
      .slice(-12)
      .map((m: any) => ({ role: m.from === 'ai' ? 'assistant' : 'user', content: m.text }))

    if (apiMessages.length === 0) {
      return Response.json({ error: 'A question is required.' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'The assistant is not configured yet. Add an ANTHROPIC_API_KEY environment variable in your project settings.' },
        { status: 503 },
      )
    }

    const claimContext = claim
      ? `Claim ${claim.id} (${claim.type}), status: ${claim.status}. Readiness ${r!.overall}%, documents complete ${r!.documentsComplete}%, submission risk ${r!.risk}. Documents: ${claim.documents
          .map((d) => `${d.name}: ${d.status}`)
          .join(', ')}.`
      : 'No active claim on file.'

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: `${baseSystemPrompt}\n\nCurrent claim context:\n${claimContext}`,
        messages: apiMessages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[v0] Anthropic API error:', res.status, errText)
      return Response.json({ error: 'The assistant is temporarily unavailable. Please try again shortly.' }, { status: 503 })
    }

    const data = await res.json()
    const text = data?.content?.find((b: any) => b.type === 'text')?.text ?? "Sorry, I couldn't generate a response."
    return Response.json({ text })
  } catch (error) {
    console.error('[v0] ClaimMate assistant error:', error)
    return Response.json({ error: 'The assistant is temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }
}
