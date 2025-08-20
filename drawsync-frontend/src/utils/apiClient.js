import { supabase } from '../supabaseClient'

/**
 * Authenticated API client joka lisää automaattisesti JWT tokenin
 */
class ApiClient {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL
  }

  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()

    console.log('🔍 Debug session:', session ? 'Found' : 'Not found')
    console.log('🔍 Access token exists:', !!session?.access_token)
    
    if (!session?.access_token) {
        console.error('❌ No access token in session')
      throw new Error('Not authenticated')
    }

    // Debug token
  console.log('🔍 Token preview:', session.access_token.substring(0, 50) + '...')
  console.log('🔍 User ID:', session.user?.id)
  console.log('🔍 Email:', session.user?.email)

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  async post(endpoint, data, options = {}) {
    const headers = await this.getAuthHeaders()
    
    // Jos FormData (file upload), poista Content-Type antaen browserin asettaa sen
    if (data instanceof FormData) {
      delete headers['Content-Type']
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: { ...headers, ...options.headers },
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async get(endpoint, options = {}) {
    const headers = await this.getAuthHeaders()

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: { ...headers, ...options.headers },
      ...options
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }
}

// Singleton instance
export const apiClient = new ApiClient()