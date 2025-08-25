import { supabase } from '../supabaseClient'

async function parseJsonSafely(response) {
  const text = await response.text()
  if (!text) return {}
  try { return JSON.parse(text) ?? {} } catch { return { raw: text } }
}

class ApiClient {
  constructor() {
    this.baseUrl = 'http://localhost:8000'
  }
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not authenticated')
    return { 'Authorization': `Bearer ${session.access_token}` }
  }
  async post(endpoint, formData) {
    const headers = await this.getAuthHeaders()
    const res = await fetch(`${this.baseUrl}${endpoint}`, { method: 'POST', headers, body: formData })
    const data = await parseJsonSafely(res)
    if (!res.ok) {
      const msg = data?.detail || data?.error || data?.raw || res.statusText
      if (res.status === 401) throw new Error('Not authenticated')
      if (res.status === 403) throw new Error('Access denied')
      throw new Error(msg || `API Error ${res.status}`)
    }
    return data
  }
  async get(endpoint) {
    const headers = await this.getAuthHeaders()
    const res = await fetch(`${this.baseUrl}${endpoint}`, { method: 'GET', headers })
    const data = await parseJsonSafely(res)
    if (!res.ok) {
      const msg = data?.detail || data?.error || data?.raw || res.statusText
      throw new Error(msg || `API Error ${res.status}`)
    }
    return data
  }
  async postJson(endpoint, payload) {
    const headers = await this.getAuthHeaders()
    headers['Content-Type'] = 'application/json'
    const res = await fetch(`${this.baseUrl}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(payload) })
    const data = await parseJsonSafely(res)
    if (!res.ok) {
      const msg = data?.detail || data?.error || data?.raw || res.statusText
      throw new Error(msg || `API Error ${res.status}`)
    }
    return data
  }
}
export const apiClient = new ApiClient()
export default apiClient
