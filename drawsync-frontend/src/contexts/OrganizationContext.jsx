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
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
  try {
    console.log('🔄 OrganizationContext: Initializing auth...')
    
    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('❌ No user found')
      setLoading(false)
      return
    }

    console.log('👤 User found:', user.email)
    setUser(user)

    // Check subdomain first
    const hostname = window.location.hostname
    const subdomain = getSubdomain(hostname)
    const subdomainOrg = await getOrganizationFromSubdomain(subdomain)
    
    if (subdomainOrg === 'PLATFORM_ADMIN') {
      console.log('👑 Platform admin mode')
      setOrganization({ type: 'PLATFORM_ADMIN' })
      setLoading(false)
      return
    }

    if (subdomainOrg) {
      console.log('🏢 Subdomain organization found:', subdomainOrg.name)
      setOrganization(subdomainOrg)
      setOrganizations([subdomainOrg])
      setLoading(false)
      return
    }

    // Fallback: Get user's organizations (no subdomain)
    console.log('📋 No subdomain - loading user organizations...')
    const userOrganizations = await db.getUserOrganizations(user.id)
    setOrganizations(userOrganizations)

    // Set default organization (first one)
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