export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed: ${res.status} ${text}`)
  }
  return res.json()
}
