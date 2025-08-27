import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { db } from '../services/database'
import { getSubdomain } from '../utils/subdomain'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Processing your confirmation...')

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      // 1. Hae user auth data
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      if (!user) throw new Error('User not found after confirmation')
      
      console.log('✅ User confirmed:', user.id)
      setMessage('Email confirmed! Processing invitation...')

      // 2. Hae invitation context (multiple sources)
      let invitationContext = null
      
      // Try localStorage first
      const localData = localStorage.getItem('pending_invitation')
      if (localData) {
        invitationContext = JSON.parse(localData)
        console.log('✅ Found invitation context in localStorage:', invitationContext)
      }
      
      // Try sessionStorage
      if (!invitationContext) {
        const sessionData = sessionStorage.getItem('pending_invitation')
        if (sessionData) {
          invitationContext = JSON.parse(sessionData)
          console.log('✅ Found invitation context in sessionStorage:', invitationContext)
        }
      }
      
      // Try cookie
      if (!invitationContext) {
        const cookies = document.cookie.split(';')
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === 'pending_invitation' && value) {
            try {
              invitationContext = JSON.parse(decodeURIComponent(value))
              console.log('✅ Found invitation context in cookie:', invitationContext)
              break
            } catch (e) {
              console.error('Failed to parse cookie:', e)
            }
          }
        }
      }

      // 3. Jos invitation context löytyy → hyväksy invitation
      if (invitationContext) {
        console.log('✅ Processing invitation context:', invitationContext)
        setMessage('Accepting invitation and setting up organization access...')
        
        try {
          await db.acceptInvitation(invitationContext.token, user.id)
          console.log('✅ Invitation accepted successfully!')
          
          // Siivoa tallennetut tiedot
          localStorage.removeItem('pending_invitation')
          sessionStorage.removeItem('pending_invitation')
          document.cookie = 'pending_invitation=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.wisuron.fi; path=/'
          
          setStatus('success')
          setMessage('Welcome to the team! Redirecting to your organization...')
          
          // Redirect organisaation app:iin
          setTimeout(() => {
            window.location.href = `https://${invitationContext.organizationSlug}.wisuron.fi/app`
          }, 2000)
          
        } catch (inviteError) {
          console.error('❌ Failed to accept invitation:', inviteError)
          setStatus('error')
          setMessage(`Failed to process invitation: ${inviteError.message}`)
        }
        
      } else {
        // 4. Ei invitation contextia → normaali redirect
        console.log('ℹ️ No invitation context found, normal auth callback')
        
        const hostname = window.location.hostname
        const subdomain = getSubdomain(hostname)
        
        setStatus('success')
        setMessage('Account confirmed! Redirecting...')
        
        setTimeout(() => {
          if (subdomain) {
            // Jos ollaan jo subdomainilla, mene app:iin
            window.location.href = '/app'
          } else {
            // Pääsivulta, mene pääsivun app:iin
            navigate('/app')
          }
        }, 1500)
      }
      
    } catch (error) {
      console.error('❌ Auth callback failed:', error)
      setStatus('error')
      setMessage(`Authentication error: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
        )}
        
        {status === 'success' && (
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        
        {status === 'error' && (
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {status === 'processing' && 'Processing...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Error'}
        </h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
