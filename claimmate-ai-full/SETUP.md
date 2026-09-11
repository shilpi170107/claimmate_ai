# What changed

1. **AI chat now actually works.** `app/api/chat/route.ts` calls the Anthropic
   Claude API directly instead of an unconfigured AI gateway model. It also
   grounds every answer in the real, live claim state (readiness score,
   which documents are missing, etc).
2. **Real backend added.** `lib/store.ts` is a small in-memory claims store.
   Two new API routes read and write it:
   - `GET/POST /api/claims` — fetch the active claim, or start a brand new one.
   - `POST /api/documents` — upload a file for a specific document slot;
     Claude checks the file name/type against the declared document category
     and marks it Verified or Low quality with a real confidence score.
3. **The UI is now driven by that backend**, not hardcoded arrays:
   - The hero dashboard, the Overview tab, and the Documents tab all read
     live claim + readiness data.
   - "Start a claim" in the Get started modal creates a fresh claim via the
     API and switches you into the Documents tab.
   - Clicking the upload zone opens a real file picker and posts to
     `/api/documents`; the document list and readiness score update with
     the AI's actual response.

## One-time setup

Add your Anthropic API key as an environment variable — this is the only
step required to make the AI features work:

1. Get a key from https://console.anthropic.com/settings/keys
2. Locally: create a `.env.local` file in the project root with:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. On Vercel: Project → Settings → Environment Variables → add
   `ANTHROPIC_API_KEY` with the same value, then redeploy.

Without this key, the chat and document-verification endpoints return a
clear "not configured yet" message instead of failing silently.

## Known limitation

The claims store in `lib/store.ts` is in-memory. On Vercel's serverless
functions this resets whenever a function cold-starts, so claim data
won't persist long-term. For a real production backend, swap that file
for a database call (Postgres via Vercel Postgres/Supabase, etc.) — the
API route shapes (`GET/POST /api/claims`, `POST /api/documents`) can stay
exactly the same.

## Sign in / sign up

Real email + password accounts, backed by `lib/store.ts`'s in-memory
`users`/`sessions` maps:
- `POST /api/auth/signup` — creates an account, hashes the password
  (scrypt, per-user salt), starts a session, sets an `HttpOnly` cookie.
- `POST /api/auth/login` — verifies the password, starts a session.
- `POST /api/auth/logout` — clears the session.
- `GET /api/auth/me` — returns the signed-in user, read by the nav bar
  on page load.

Same in-memory caveat as claims: accounts reset on a serverless cold
start. Swap `lib/store.ts`'s `users`/`sessions` maps for a real
database table when you need accounts to persist. The "connect with a
specialist" hand-off is still a demo-only modal — no live agent
routing behind it.

## Deploying to Vercel via GitHub

1. Unzip this project, then from inside the folder:
   ```
   git init
   git add .
   git commit -m "ClaimMate AI with backend"
   ```
2. Create a new empty repo on GitHub, then push:
   ```
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```
3. On https://vercel.com, "Add New Project" → import that repo → it
   auto-detects Next.js, no build settings needed.
4. Before or right after the first deploy, add the `ANTHROPIC_API_KEY`
   environment variable (Project → Settings → Environment Variables),
   then redeploy so it takes effect.
