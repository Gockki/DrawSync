// src/pages/AuthCallback.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { db } from '../services/database'

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
      // 1. Hae auth parametrit URL:sta
      const access_token = searchParams.get('access_token')
      const refresh_token = searchParams.get('refresh_token')
      const type = searchParams.get('type')
      
      if (type === 'signup') {
        setMessage('Email confirmed successfully! Setting up your account...')
        
        // 2. Supabase hoitaa automaattisesti session
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) throw error
        if (!user) throw new Error('User not found after confirmation')
        
        console.log('✅ User confirmed:', user.id)
        
        // 3. Tarkista onko käyttäjällä pending invitation
        // (Voit tallentaa invitation token localStorageen Join.jsx:ssä)
        const invitationToken = localStorage.getItem('pending_invitation_token')
        
        if (invitationToken) {
          console.log('✅ Processing pending invitation:', invitationToken)
          await db.acceptInvitation(invitationToken, user.id)
          localStorage.removeItem('pending_invitation_token')
          
          setStatus('success')
          setMessage('Account confirmed and invitation accepted! Redirecting...')
          
          setTimeout(() => {
            window.location.href = '/app'
          }, 2000)
        } else {
          setStatus('success')
          setMessage('Account confirmed! Redirecting...')
          
          setTimeout(() => {
            window.location.href = '/app'
          }, 2000)
        }
        
      } else {
        // Muut auth callback tyypit (password reset jne.)
        setStatus('success')
        setMessage('Redirecting...')
        setTimeout(() => {
          navigate('/app')
        }, 1000)
      }
      
    } catch (error) {
      console.error('Auth callback failed:', error)
      setStatus('error')
      setMessage(`Error: ${error.message}`)
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