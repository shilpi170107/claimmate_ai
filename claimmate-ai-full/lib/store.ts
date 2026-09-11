export type DocStatus = 'Verified' | 'Required' | 'Low quality'

export type DocumentItem = {
  id: string
  name: string
  status: DocStatus
  confidence: number
  uploadedAt: string
}

export type Claim = {
  id: string
  type: string
  status: string
  createdAt: string
  documents: DocumentItem[]
}

const REQUIRED_DOCS = ['Hospital Bill', 'Discharge Summary', 'Prescription', 'Medical Report']

export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  salt: string
  createdAt: string
}

const globalUsers = globalThis as unknown as {
  __claimmateUsers?: Map<string, User>
  __claimmateSessions?: Map<string, string>
}
if (!globalUsers.__claimmateUsers) globalUsers.__claimmateUsers = new Map()
if (!globalUsers.__claimmateSessions) globalUsers.__claimmateSessions = new Map()
export const users = globalUsers.__claimmateUsers
export const sessions = globalUsers.__claimmateSessions

function seedClaim(): Claim {
  const now = new Date().toISOString()
  return {
    id: 'CLM-2026-10428',
    type: 'Health insurance',
    status: 'Under review',
    createdAt: now,
    documents: [
      { id: 'd1', name: 'Hospital Bill', status: 'Verified', confidence: 97, uploadedAt: now },
      { id: 'd2', name: 'Discharge Summary', status: 'Required', confidence: 0, uploadedAt: '' },
      { id: 'd3', name: 'Prescription', status: 'Verified', confidence: 94, uploadedAt: now },
      { id: 'd4', name: 'Medical Report', status: 'Low quality', confidence: 71, uploadedAt: now },
    ],
  }
}

// Persist across hot-reloads in dev. On Vercel serverless this resets on
// cold start — swap this module for a real database (Postgres, Supabase,
// etc.) when you need data to survive restarts.
const globalStore = globalThis as unknown as { __claimmateStore?: Map<string, Claim> }
if (!globalStore.__claimmateStore) {
  globalStore.__claimmateStore = new Map([[
    'CLM-2026-10428',
    seedClaim(),
  ]])
}
export const store = globalStore.__claimmateStore

export function readiness(claim: Claim) {
  const total = claim.documents.length
  const verified = claim.documents.filter((d) => d.status === 'Verified').length
  const documentsComplete = total === 0 ? 0 : Math.round((verified / total) * 100)
  const coverageMatch = 92
  const overall = Math.round((coverageMatch + documentsComplete) / 2)
  const risk = overall > 85 ? 'Low' : overall > 60 ? 'Medium' : 'High'
  return { overall, coverageMatch, documentsComplete, risk, verified, total }
}

export function createClaim(type: string): Claim {
  const id = `CLM-2026-${Math.floor(10000 + Math.random() * 89999)}`
  const claim: Claim = {
    id,
    type,
    status: 'Intake',
    createdAt: new Date().toISOString(),
    documents: REQUIRED_DOCS.map((name, i) => ({
      id: `d${i}`,
      name,
      status: 'Required',
      confidence: 0,
      uploadedAt: '',
    })),
  }
  store.set(id, claim)
  return claim
}
