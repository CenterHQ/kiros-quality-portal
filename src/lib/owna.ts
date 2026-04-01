const API_BASE = 'https://api.owna.com.au'
export const DEMO_CENTRE_ID = '580583630ead9d0af4be45f7'

export async function ownaFetch(path: string): Promise<any> {
  const url = `${API_BASE}${path}`
  const res = await fetch('/api/owna-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'GET', url }),
  })
  if (!res.ok) throw new Error(`OWNA API error: ${res.status}`)
  return res.json()
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export function mondayOfWeek(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
