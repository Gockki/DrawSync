// src/components/JWTDebug.jsx - LISÄÄ TÄMÄ TILAPÄISESTI DEBUG:IA VARTEN
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function JWTDebug() {
  const [debugInfo, setDebugInfo] = useState({})

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Session data
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // 2. User data  
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        // 3. Token details
        let tokenInfo = null
        if (session?.access_token) {
          try {
            // Decode JWT payload (unsafe decode for debugging)
            const base64Url = session.access_token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            )
            
            tokenInfo = {
              payload: JSON.parse(jsonPayload),
              tokenLength: session.access_token.length,
              tokenPreview: session.access_token.substring(0, 50) + '...',
              expiresAt: new Date(JSON.parse(jsonPayload).exp * 1000).toLocaleString()
            }
          } catch (e) {
            tokenInfo = { error: `Token decode failed: ${e.message}` }
          }
        }

        setDebugInfo({
          timestamp: new Date().toLocaleTimeString(),
          session: session ? 'EXISTS' : 'NULL',
          sessionError: sessionError?.message || 'None',
          user: user ? 'EXISTS' : 'NULL', 
          userError: userError?.message || 'None',
          userEmail: user?.email || 'N/A',
          userId: user?.id || 'N/A',
          tokenInfo,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
        })

      } catch (error) {
        setDebugInfo({
          error: error.message,
          timestamp: new Date().toLocaleTimeString()
        })
      }
    }

    checkAuth()

    // Listen auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 AUTH EVENT:', event, session ? 'session exists' : 'no session')
        checkAuth()
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="fixed bottom-4 left-4 bg-black text-white p-4 rounded text-xs max-w-lg max-h-96 overflow-y-auto">
      <h3 className="font-bold text-yellow-400 mb-2">🐛 JWT DEBUG</h3>
      
      <div className="space-y-2">
        <div><strong>Time:</strong> {debugInfo.timestamp}</div>
        <div><strong>Session:</strong> <span className="text-green-400">{debugInfo.session}</span></div>
        <div><strong>User:</strong> <span className="text-green-400">{debugInfo.user}</span></div>
        <div><strong>Email:</strong> {debugInfo.userEmail}</div>
        
        {debugInfo.sessionError && debugInfo.sessionError !== 'None' && (
          <div><strong>Session Error:</strong> <span className="text-red-400">{debugInfo.sessionError}</span></div>
        )}
        
        {debugInfo.userError && debugInfo.userError !== 'None' && (
          <div><strong>User Error:</strong> <span className="text-red-400">{debugInfo.userError}</span></div>
        )}

        <div><strong>Supabase URL:</strong> {debugInfo.supabaseUrl}</div>
        <div><strong>Has Anon Key:</strong> {debugInfo.hasAnonKey ? 'YES' : 'NO'}</div>
        
        {debugInfo.tokenInfo && (
          <div className="mt-2 p-2 bg-gray-800 rounded">
            <div className="text-yellow-400 font-bold">JWT Token Info:</div>
            {debugInfo.tokenInfo.error ? (
              <div className="text-red-400">{debugInfo.tokenInfo.error}</div>
            ) : (
              <>
                <div><strong>Length:</strong> {debugInfo.tokenInfo.tokenLength}</div>
                <div><strong>Preview:</strong> {debugInfo.tokenInfo.tokenPreview}</div>
                <div><strong>Expires:</strong> {debugInfo.tokenInfo.expiresAt}</div>
                <div><strong>User ID:</strong> {debugInfo.tokenInfo.payload?.sub}</div>
                <div><strong>Email:</strong> {debugInfo.tokenInfo.payload?.email}</div>
                <div><strong>Audience:</strong> {debugInfo.tokenInfo.payload?.aud}</div>
                <div><strong>Issuer:</strong> {debugInfo.tokenInfo.payload?.iss}</div>
                <div><strong>Algorithm:</strong> {debugInfo.tokenInfo.payload?.alg}</div>
              </>
            )}
          </div>
        )}

        {debugInfo.error && (
          <div className="text-red-400">
            <strong>Error:</strong> {debugInfo.error}
          </div>
        )}
      </div>
    </div>
  )
}