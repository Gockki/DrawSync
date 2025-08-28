// src/contexts/OrganizationContext.jsx - PÄIVITETTY LISENSSILOGIIKALLA
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { db } from '../services/database'
import { getSubdomain } from '../utils/subdomain'

const OrganizationContext = createContext()

async function getOrganizationFromSubdomain(subdomain) {
  if (!subdomain) return null
  
  console.log('Checking subdomain:', subdomain)
  
  if (subdomain === 'admin') {
    return 'PLATFORM_ADMIN'
  }
  
  try {
    const organization = await db.getOrganizationBySlug(subdomain)
    
    if (organization) {
      console.log('Found organization for subdomain:', organization.name)
      return organization
    }
    
    console.log('No organization found for subdomain:', subdomain)
    return null
    
  } catch (error) {
    console.error('Error fetching organization:', error)
    return null
  }
}

export function OrganizationProvider({ children }) {
  const [user, setUser] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      console.log('Initializing auth with license checks...')
      
      // Try current session
      let { data: { user }, error } = await supabase.auth.getUser()
      
      if (!user) {
        // Jos ei käyttäjää, tarkista subdomain ja ohjaa login-sivulle
        const hostname = window.location.hostname
        const subdomain = getSubdomain(hostname)
        
        if (subdomain && subdomain !== 'admin') {
          // Organization subdomain mutta ei kirjautunut käyttäjä → login
          setLoading(false)
          return
        }
      }
      
      if (error || !user) {
        // Main site tai admin - näytä login
        setLoading(false)
        return
      }

      console.log('User authenticated:', user.email)
      setUser(user)

      // Check subdomain first
      const hostname = window.location.hostname
      const subdomain = getSubdomain(hostname)
      
      console.log('Current subdomain:', subdomain)

      // Get organization from subdomain
      const subdomainOrg = await getOrganizationFromSubdomain(subdomain)
      
      if (subdomainOrg === 'PLATFORM_ADMIN') {
        // Platform admin - no license checks needed
        setOrganization({ type: 'PLATFORM_ADMIN' })
        setLoading(false)
        return
      }

      if (subdomainOrg) {
        console.log('Found subdomain organization:', subdomainOrg.name)
        
        // LISENSSILOGIIKKA: Tarkista voiko käyttäjä kirjautua
        const canLogin = await db.canUserLoginToOrganization(user.id, subdomainOrg.id)
        if (!canLogin) {
          console.log('User cannot login: Invalid license or no access')
          
          // Näytä virheilmoitus ja ohjaa kirjautumissivulle
          setOrganization({ 
            type: 'LICENSE_ERROR',
            error: 'INVALID_LICENSE',
            message: 'Organisaation lisenssi on vanhentunut tai sinulla ei ole käyttöoikeutta'
          })
          setLoading(false)
          return
        }

        // Hae käyttäjän rooli (sisältää jo lisenssin tarkistuksen)
        const userRole = await db.getUserRoleInOrganization(user.id, subdomainOrg.id)
        if (!userRole) {
          console.log('No valid role found (license or access denied)')
          setOrganization({ 
            type: 'ACCESS_DENIED',
            error: 'NO_ACCESS',
            message: 'Sinulla ei ole käyttöoikeutta tähän organisaatioon'
          })
          setLoading(false)
          return
        }

        // Hae lisenssin tiedot näyttämistä varten
        const license = await db.getOrganizationLicense(subdomainOrg.id)

        const orgWithRoleAndLicense = {
          ...subdomainOrg,
          userRole,
          license
        }

        console.log('Organization access granted:', { 
          org: subdomainOrg.name, 
          role: userRole,
          license: license?.license_type 
        })

        setOrganization(orgWithRoleAndLicense)
        setOrganizations([subdomainOrg])
        setLoading(false)
        return
      }

      // Fallback: Get user's organizations (no subdomain)
      console.log('No subdomain organization - fetching user organizations...')
      const userOrganizations = await db.getUserOrganizations(user.id)
      console.log('User organizations found:', userOrganizations.length)
      
      setOrganizations(userOrganizations)

      if (userOrganizations.length > 0) {
        // Lisää ensimmäisen organisaation lisenssin tiedot
        const license = await db.getOrganizationLicense(userOrganizations[0].id)
        const userRole = await db.getUserRoleInOrganization(user.id, userOrganizations[0].id)
        
        setOrganization({
          ...userOrganizations[0],
          userRole,
          license
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('Auth initialization failed:', error)
      setLoading(false)
    }
  }

  const switchOrganization = async (orgId) => {
    const org = organizations.find(o => o.id === orgId)
    if (org && user) {
      // Tarkista voiko käyttäjä vaihtaa tähän organisaatioon
      const canAccess = await db.canUserLoginToOrganization(user.id, org.id)
      if (!canAccess) {
        alert('Organisaation lisenssi on vanhentunut tai sinulla ei ole käyttöoikeutta')
        return
      }

      // Hae rooli ja lisenssi
      const userRole = await db.getUserRoleInOrganization(user.id, org.id)
      const license = await db.getOrganizationLicense(org.id)
      
      setOrganization({
        ...org,
        userRole,
        license
      })
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