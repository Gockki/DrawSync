// src/utils/apiClient.js - KORJATTU JWT AUTH
import { supabase } from '../supabaseClient'

class ApiClient {
  constructor() {
    this.baseUrl = 'http://localhost:8000'
  }

  // ✅ Helper: Hae JWT token Supabase sessiosta
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    return {
      'Authorization': `Bearer ${session.access_token}`
    }
  }

  // ✅ POST method for FormData (kuten /process endpoint)
  async post(endpoint, formData) {
    try {
      const headers = await this.getAuthHeaders()
      
      console.log('🔑 Making authenticated request:', {
        endpoint,
        hasToken: !!headers.Authorization,
        tokenPreview: headers.Authorization?.substring(0, 20) + '...'
      })

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      })

      console.log('📡 API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error response:', errorText)
        
        if (response.status === 401) {
          throw new Error('Not authenticated')
        } else if (response.status === 403) {
          throw new Error('Access denied')
        } else {
          throw new Error(`API Error ${response.status}: ${errorText}`)
        }
      }

      return response.json()
    } catch (error) {
      console.error('🚨 ApiClient.post error:', error)
      throw error
    }
  }

  // ✅ GET method
  async get(endpoint) {
    try {
      const headers = await this.getAuthHeaders()

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error('🚨 ApiClient.get error:', error)
      throw error
    }
  }

  // ✅ JSON POST method
  async postJson(endpoint, data) {
    try {
      const headers = await this.getAuthHeaders()
      headers['Content-Type'] = 'application/json'

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error('🚨 ApiClient.postJson error:', error)
      throw error
    }
  }
}

// ✅ Export singleton instance
export const apiClient = new ApiClient()

// ✅ Legacy compatibility
export default apiClient