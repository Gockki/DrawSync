import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { db } from '../services/database'
import { Check, AlertCircle, Users } from 'lucide-react'

export default function Join() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const orgSlug = searchParams.get('org')  // ← Uusi parameter

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    console.log('🔍 Join page params:', { token, orgSlug })
    
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }
    
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    try {
      const invitationData = await db.getInvitationByToken(token)
      
      if (!invitationData) {
        setError('Invitation not found or expired')
        return
      }

      setInvitation(invitationData)
      setFormData(prev => ({ ...prev, email: invitationData.email_address }))
    } catch (error) {
      console.error('Failed to load invitation:', error)
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsRegistering(true)

    try {
      // ✅ 1. Tallenna invitation context ennen rekisteröintiä
      const invitationContext = {
        token: token,
        organizationSlug: orgSlug || invitation.organization.slug,
        organizationId: invitation.organization_id,
        role: invitation.role,
        email: formData.email,
        timestamp: Date.now()
      }
      
      // Tallenna multiple storage locations
      localStorage.setItem('pending_invitation', JSON.stringify(invitationContext))
      sessionStorage.setItem('pending_invitation', JSON.stringify(invitationContext))
      
      // Tallenna myös cookie (cross-subdomain)
      const expiryDate = new Date()
      expiryDate.setTime(expiryDate.getTime() + (24 * 60 * 60 * 1000)) // 24h
      document.cookie = `pending_invitation=${encodeURIComponent(JSON.stringify(invitationContext))}; expires=${expiryDate.toUTCString()}; domain=.wisuron.fi; path=/`

      console.log('✅ Invitation context saved:', invitationContext)

      // ✅ 2. Rekisteröinti - ÄLYKÄS emailRedirectTo
      const targetOrgUrl = `https://${invitationContext.organizationSlug}.wisuron.fi/auth/callback`
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: targetOrgUrl  // ← SUORAAN ORGANISAATION SUBDOMAINILLE!
        }
      })

      if (authError) throw authError
      const user = authData.user
      if (!user) throw new Error('Registration failed')

      console.log('✅ User registered:', user.id)

      // ✅ 3. Jos EI tarvita email confirmation → hyväksy heti
      if (user.email_confirmed_at) {
        console.log('✅ User already confirmed, accepting invitation immediately')
        
        await db.acceptInvitation(token, user.id)
        
        // Siivoa tallennetut tiedot
        localStorage.removeItem('pending_invitation')
        sessionStorage.removeItem('pending_invitation')
        document.cookie = 'pending_invitation=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.wisuron.fi; path=/'
        
        setError('')
        alert('Registration and invitation successful! Redirecting to your organization...')
        
        setTimeout(() => {
          window.location.href = `https://${invitationContext.organizationSlug}.wisuron.fi/app`
        }, 2000)
        
      } else {
        // ✅ 4. Email confirmation tarvitaan
        setError('')
        alert(`Registration successful! Please check your email and click the confirmation link. 
        
The confirmation link will redirect you directly to your organization at ${invitationContext.organizationSlug}.wisuron.fi`)
      }

    } catch (error) {
      console.error('Registration failed:', error)
      
      // Siivoa virhetilanteessa
      localStorage.removeItem('pending_invitation')
      sessionStorage.removeItem('pending_invitation')
      document.cookie = 'pending_invitation=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.wisuron.fi; path=/'
      
      setError(error.message)
    } finally {
      setIsRegistering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/" className="text-blue-600 hover:text-blue-800">
            Go to main site
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Join {invitation?.organization?.name}
          </h1>
          <p className="text-gray-600">
            You've been invited to join the team as a <strong>{invitation?.role}</strong>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Choose a password (min. 6 characters)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
              disabled={isRegistering}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm your password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isRegistering}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isRegistering || !formData.password || !formData.confirmPassword}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRegistering && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            {isRegistering ? 'Creating Account...' : 'Join Team'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            By joining, you agree to access {invitation?.organization?.name}'s projects and data.
          </p>
        </div>
      </div>
    </div>
  )
}