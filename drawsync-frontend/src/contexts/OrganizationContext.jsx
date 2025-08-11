// src/contexts/OrganizationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { db } from '../services/database'
import { getSubdomain, getOrganizationFromSubdomain } from '../utils/subdomain'

const OrganizationContext = createContext()

export const OrganizationProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🚀 [DEBUG] OrganizationContext useEffect triggered')
    initializeAuth()
  }, [window.location.hostname])

useEffect(() => {
  const handleLocationChange = () => {
    console.log('🔄 Location changed, reinitializing auth...')
    initializeAuth()
  }
  
  // Listen URL changes
  window.addEventListener('popstate', handleLocationChange)
  
  return () => {
    window.removeEventListener('popstate', handleLocationChange)
  }
}, [])

const initializeAuth = async () => {
    console.log('🚀 [DEBUG] initializeAuth CALLED')
    console.log('🌍 Current URL:', window.location.href)
  try {
    console.log('🔄 OrganizationContext: Initializing auth...')
    console.log('🌍 Window location:', window.location.hostname, window.location.pathname)
    // 1. Try current session
    let { data: { user }, error } = await supabase.auth.getUser()
    console.log('🔍 Auth check result:', { user: user?.email, error })
    
    if (!user) {
      console.log('❌ No user - early return')
      const hostname = window.location.hostname
      const subdomain = getSubdomain(hostname)
      
      if (subdomain && subdomain !== 'admin') {
        console.log('🔄 No session in subdomain, checking main domain...')
        console.log('❌ No session found, need to login')
        setLoading(false)
        return
      }
    }
    
    if (error || !user) {
      console.log('❌ No user found - early return')
      console.log('❌ No user found')
      setLoading(false)
      return
    }

    console.log('👤 User found:', user.email)
    setUser(user)

    // Check subdomain first
    const hostname = window.location.hostname
    const subdomain = getSubdomain(hostname)
    console.log('🌐 Current subdomain:', subdomain)

    console.log('🔍 About to call getOrganizationFromSubdomain...')
    const subdomainOrg = await getOrganizationFromSubdomain(subdomain)
    console.log('🏢 Organization from subdomain:', subdomainOrg)
    
    if (subdomainOrg === 'PLATFORM_ADMIN') {
      console.log('👑 Platform admin mode')
      setOrganization({ type: 'PLATFORM_ADMIN' })
      setLoading(false)
      return
    }

    if (subdomainOrg) {
      console.log('🏢 Subdomain organization found:', subdomainOrg.name)
      console.log('🔍 About to get user role...')
      
      // ✅ HAE USER:N ROOLI ORGANISAATIOSSA
      console.log('🔍 Getting user role for user:', user.id, 'in org:', subdomainOrg.id)

      const userRole = await db.getUserRoleInOrganization(user.id, subdomainOrg.id)
      console.log('👤 User role in organization:', userRole, 'for user:', user.id, 'in org:', subdomainOrg.id)
      const orgWithRole = {
    ...subdomainOrg,
    userRole 
  }
      console.log('📊 Final organization object:', orgWithRole)
      setOrganization(orgWithRole)
      setOrganizations([subdomainOrg])
      setLoading(false)
      return
    }

    // Fallback: Get user's organizations (no subdomain)
    console.log('📋 No subdomain - loading user organizations...')
    const userOrganizations = await db.getUserOrganizations(user.id)
    setOrganizations(userOrganizations)

    if (userOrganizations.length > 0) {
      console.log('✅ Setting default org:', userOrganizations[0].name)
      setOrganization(userOrganizations[0])
    }

    setLoading(false)
  } catch (error) {
    console.error('💥 OrganizationContext error:', error)
    setLoading(false)
  }
}

  const switchOrganization = (orgId) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setOrganization(org)
    }
  }

  const value = {
    user,
    organization,
    organizations,
    loading,
    switchOrganization,
    refresh: initializeAuth
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}