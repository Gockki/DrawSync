// src/contexts/OrganizationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { db } from '../services/database'

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
      // Get current user
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        setLoading(false)
        return
      }

      setUser(user)

      // Get user's organizations
      const userOrganizations = await db.getUserOrganizations(user.id)
      setOrganizations(userOrganizations)

      // Set default organization (first one for now)
      if (userOrganizations.length > 0) {
        setOrganization(userOrganizations[0])
      }

      setLoading(false)
    } catch (error) {
      console.error('Failed to initialize auth:', error)
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