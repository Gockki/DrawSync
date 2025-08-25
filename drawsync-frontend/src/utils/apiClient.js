// src/utils/apiClient.js
import { supabase } from '../supabaseClient'

// --- helpers ---
async function parseJsonSafely(response) {
  const text = await response.text()
  if (!text) return {}
  try { return JSON.parse(text) ?? {} } catch { return { raw: text } }
}

function joinUrl(base, path) {
  const b = base?.replace(/\/+$/, '') ?? ''
  const p = path?.replace(/^\/+/, '') ?? ''
  return `${b}/${p}`
}

function detectBaseUrl() {
  // 1) Vite/Vercel env (PROD/preview)
  const fromEnv =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL)
  if (fromEnv) return fromEnv

  // 2) Dev fallback: jos frontti pyörii Viten portissa 5173 → api oletetaan 8000
  if (typeof window !== 'undefined' && window.location?.port === '5173') {
    return window.location.origin.replace(':5173', ':8000')
  }

  // 3) Viimeinen fallback (paikallinen)
  return 'http://localhost:8000'
}

export class ApiClient {
  constructor() {
    this.baseUrl = detectBaseUrl()
  }

  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not authenticated')
    return { Authorization: `Bearer ${session.access_token}` }
  }

  async tryRefreshAndRetry(url, init) {
    try {
      // yritä hiljainen refresh kerran
      await supabase.auth.refreshSession()
      const headers = await this.getAuthHeaders()
      const retryInit = { ...init, headers: { ...(init.headers || {}), ...headers } }
      return await fetch(url, retryInit)
    } catch {
      return null
    }
  }

  // --- perus request ---
  async request(method, endpoint, { headers = {}, body } = {}) {
    const auth = await this.getAuthHeaders()
    const url = joinUrl(this.baseUrl, endpoint)
    let res = await fetch(url, { method, headers: { ...auth, ...headers }, body })

    if (res.status === 401) {
      const retried = await this.tryRefreshAndRetry(url, { method, headers, body })
      if (retried) res = retried
    }

    const data = await parseJsonSafely(res)
    if (!res.ok) {
      const msg = data?.detail || data?.error || data?.raw || res.statusText || `HTTP ${res.status}`
      if (res.status === 401) throw new Error('Not authenticated')
      if (res.status === 403) throw new Error('Access denied')
      throw new Error(msg)
    }
    return data
  }

  async get(endpoint) {
    return this.request('GET', endpoint)
  }

  async post(endpoint, formData) {
    return this.request('POST', endpoint, { body: formData })
  }

  async postJson(endpoint, payload) {
    const headers = { 'Content-Type': 'application/json' }
    return this.request('POST', endpoint, { headers, body: JSON.stringify(payload) })
  }
}

// singleton
export const apiClient = new ApiClient()
export default apiClient
