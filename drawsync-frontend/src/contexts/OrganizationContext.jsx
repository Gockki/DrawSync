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

useEffect(() => {
  const handleLocationChange = () => {
    
    initializeAuth()
  }
  
  // Listen URL changes
  window.addEventListener('popstate', handleLocationChange)
  
  return () => {
    window.removeEventListener('popstate', handleLocationChange)
  }
}, [])

const initializeAuth = async () => {

  try {

    // 1. Try current session
    let { data: { user }, error } = await supabase.auth.getUser()

    
    if (!user) {
      
      const hostname = window.location.hostname
      const subdomain = getSubdomain(hostname)
      
      if (subdomain && subdomain !== 'admin') {

        setLoading(false)
        return
      }
    }
    
    if (error || !user) {

      setLoading(false)
      return
    }


    setUser(user)

    // Check subdomain first
    const hostname = window.location.hostname
    const subdomain = getSubdomain(hostname)



    const subdomainOrg = await getOrganizationFromSubdomain(subdomain)

    
    if (subdomainOrg === 'PLATFORM_ADMIN') {

      setOrganization({ type: 'PLATFORM_ADMIN' })
      setLoading(false)
      return
    }

    if (subdomainOrg) {

      
      // ✅ HAE USER:N ROOLI ORGANISAATIOSSA


      const userRole = await db.getUserRoleInOrganization(user.id, subdomainOrg.id)

      const orgWithRole = {
    ...subdomainOrg,
    userRole 
  }

      setOrganization(orgWithRole)
      setOrganizations([subdomainOrg])
      setLoading(false)
      return
    }

    // Fallback: Get user's organizations (no subdomain)

    const userOrganizations = await db.getUserOrganizations(user.id)
    setOrganizations(userOrganizations)

    if (userOrganizations.length > 0) {

      setOrganization(userOrganizations[0])
    }

    setLoading(false)
  } catch (error) {

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