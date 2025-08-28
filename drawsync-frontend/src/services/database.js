// src/services/database.js - PÄIVITETTY LISENSSILOGIIKALLA
import { supabase } from '../supabaseClient'

class DatabaseService {
  constructor() {
    this.supabase = supabase
  }

  // ================================
  // LISENSSILOGIIKKA
  // ================================

  async checkOrganizationLicense(organizationId) {
    try {
      const { data, error } = await this.supabase
        .rpc('check_organization_license', { org_id: organizationId })
      
      if (error) {
        console.error('License check failed:', error)
        return false
      }
      
      console.log('License check result:', { organizationId, isValid: data })
      return data
    } catch (error) {
      console.error('License check error:', error)
      return false
    }
  }

  async canUserLoginToOrganization(userId, organizationId) {
    try {
      console.log('🔍 canUserLoginToOrganization params:', { userId, organizationId })
      const { data, error } = await this.supabase
        .rpc('can_user_login_to_organization', { 
          user_id: userId, 
          org_id: organizationId 
        })

      console.log('🔍 RPC raw response:', { data, error })
      
      if (error) {
        console.error('User login check failed:', error)
        return false
      }
      
      console.log('User login check:', { userId, organizationId, canLogin: data })
      return data
    } catch (error) {
      console.error('User login check error:', error)
      return false
    }
  }

  async getOrganizationLicense(organizationId) {
    const { data, error } = await this.supabase
      .from('organization_licenses')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()
    
    if (error) {
      console.error('Failed to get organization license:', error)
      return null
    }
    
    return data
  }

  async createOrganizationLicense(licenseData) {
    const { data, error } = await this.supabase
      .from('organization_licenses')
      .insert(licenseData)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }

  async updateOrganizationLicense(organizationId, updates) {
    const { data, error } = await this.supabase
      .from('organization_licenses')
      .update(updates)
      .eq('organization_id', organizationId)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }

  async getOrganizationsWithLicenses() {
    const { data, error } = await this.supabase
      .from('organizations_with_licenses')
      .select('*')
      .order('org_created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data
  }

  // ================================
  // ALKUPERÄISET METODIT (SÄILYTETTY)
  // ================================

  async getUsersInOrganization(organizationId) {
    const { data, error } = await this.supabase
      .from('user_organization_access')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data
  }

  async getUserRoleInOrganization(userId, organizationId) {
    console.log('getUserRoleInOrganization called with:', { userId, organizationId })
    
    // 1. Hae käyttäjän rooli
    const { data: roleData, error: roleError } = await this.supabase
      .from('user_organization_access')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle()
    
    console.log('Role query result:', { data: roleData, error: roleError })
    
    if (roleError) {
      console.log('Role query error:', roleError.message)
      return null
    }
    
    if (!roleData) {
      console.log('No role found for user in organization')
      return null
    }
    
    // 2. Tarkista organisaation lisenssi
    const hasValidLicense = await this.checkOrganizationLicense(organizationId)
    if (!hasValidLicense) {
      console.log('Organization license is invalid or expired')
      return null
    }
    
    console.log('Role found with valid license:', roleData.role)
    return roleData.role
  }

  async removeUserFromOrganization(userId, organizationId) {
    const { error } = await this.supabase
      .from('user_organization_access')
      .update({ status: 'inactive' })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
    
    if (error) throw new Error(error.message)
    return true
  }

  // Invitation management
  async createInvitation(organizationId, email, role = 'user', invitedBy) {
    // Tarkista organisaation lisenssi
    const hasValidLicense = await this.checkOrganizationLicense(organizationId)
    if (!hasValidLicense) {
      throw new Error('Cannot send invitations: Organization license is invalid or expired')
    }

    const expiresAt = new Date(Date.now() + 7*24*60*60*1000).toISOString()
    const token = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)

    const { data, error } = await this.supabase
      .from('invitations')
      .insert({
        organization_id: organizationId,
        email_address: email.toLowerCase(),
        role,
        invited_by: invitedBy,
        status: 'pending',
        expires_at: expiresAt,
        token
      })
      .select()

    if (error) throw new Error(error.message)
    return data[0]
  }

  async getInvitations(organizationId) {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data
  }

  async getInvitationByToken(token) {
    console.log('Looking for invitation with token:', token)
    
    const { data, error } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')

    console.log('Query result:', { data, error, count: data?.length })

    if (error) {
      console.log('Query error:', error.message)
      return null
    }
    if (!data || data.length === 0) {
      console.log('No invitations found')
      return null
    }

    const invitation = data[0]
    console.log('Found invitation:', invitation)

    // Robust expiry tarkistus
    const now = new Date()
    let expiresAt = null

    if (invitation.expires_at) {
      const d = new Date(invitation.expires_at)
      if (!Number.isNaN(d.getTime())) expiresAt = d
    }
    if (!expiresAt && invitation.created_at) {
      const d = new Date(invitation.created_at)
      if (!Number.isNaN(d.getTime())) {
        expiresAt = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }
    if (!expiresAt || expiresAt < now) {
      console.log('Invitation expired (computed)', { expiresAt, now })
      return null
    }

    // Lataa organisaatio
    try {
      const { data: orgData, error: orgError } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', invitation.organization_id)
        .single()

      if (!orgError && orgData) {
        invitation.organization = orgData
        console.log('Added organization:', orgData.name)
      }
    } catch (orgError) {
      console.error('Failed to load organization:', orgError)
    }

    return invitation
  }

  async acceptInvitation(token, userId) {
    console.log('acceptInvitation called with:', { token, userId })
    
    const invitation = await this.getInvitationByToken(token)
    console.log('Found invitation:', invitation)
    
    if (!invitation) {
      throw new Error('Invitation not found or expired')
    }

    // Tarkista organisaation lisenssi
    const canJoin = await this.canUserLoginToOrganization(userId, invitation.organization_id)
    if (!canJoin) {
      throw new Error('Cannot accept invitation: Organization license is invalid or expired')
    }
    
    try {
      // Päivitä invitation
      const { data: inviteUpdate, error: inviteError } = await this.supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('token', token)
        .eq('status', 'pending')
        .select()
      
      if (inviteError) {
        console.error('Failed to update invitation:', inviteError)
        throw new Error(`Failed to accept invitation: ${inviteError.message}`)
      }
      
      if (!inviteUpdate || inviteUpdate.length === 0) {
        throw new Error('Invitation already accepted or expired')
      }
      
      console.log('Invitation updated:', inviteUpdate[0])
      
      // Luo user_organization_access merkintä
      const { data: accessData, error: accessError } = await this.supabase
        .from('user_organization_access')
        .insert({
          user_id: userId,
          organization_id: invitation.organization_id,
          role: invitation.role,
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
      
      if (accessError) {
        console.error('Failed to create user access:', accessError)
        throw new Error(`Failed to grant organization access: ${accessError.message}`)
      }
      
      console.log('User access created:', accessData[0])
      return invitation
      
    } catch (error) {
      console.error('acceptInvitation failed:', error)
      throw error
    }
  }

  async deleteInvitation(invitationId) {
    const { error } = await this.supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)
    
    if (error) throw new Error(error.message)
    return true
  }

  // Organization management
  async getAllOrganizations() {
    const { data, error } = await this.supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        industry_type,
        contact_email,
        subscription_plan,
        subscription_status,
        created_at
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data
  }

  async createOrganization(orgData) {
    const { data: org, error: orgError } = await this.supabase
      .from('organizations')
      .insert({
        name: orgData.name,
        slug: orgData.slug,
        industry_type: orgData.industry_type,
        contact_email: orgData.contact_email,
        subscription_plan: orgData.subscription_plan || 'basic',
        ui_settings: orgData.ui_settings || {},
        pricing_config: orgData.pricing_config || {}
      })
      .select()
      .single()
    
    if (orgError) throw new Error(orgError.message)

    // Luo oletuslisenssi uudelle organisaatiolle
    try {
      await this.createOrganizationLicense({
        organization_id: org.id,
        license_type: orgData.licenseType || 'basic',
        status: orgData.licenseStatus || 'trial',
        max_users: orgData.maxUsers || 5,
        starts_at: new Date().toISOString(),
        expires_at: orgData.expiresAt || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        trial_ends_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        monthly_price: orgData.monthlyPrice || 29.99,
        yearly_price: orgData.yearlyPrice || 299.90,
        notes: 'Automaattisesti luotu uudelle organisaatiolle',
        created_by: orgData.created_by
      })
      console.log('Default license created for new organization')
    } catch (licenseError) {
      console.error('Failed to create default license:', licenseError)
    }
    
    return org
  }

  async deleteOrganization(organizationId) {
    const { error } = await this.supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)
    
    if (error) throw new Error(error.message)
    return true
  }

  async getOrganization(organizationId) {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }

  async getOrganizationBySlug(slug) {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()
    
    return error ? null : data
  }

  async getUserOrganizations(userId) {
    const { data, error } = await this.supabase
      .from('user_organization_access')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
    
    if (error) throw new Error(error.message)
    
    // Suodata vain organisaatiot joilla on voimassa oleva lisenssi
    const validOrganizations = []
    for (const item of data || []) {
      const hasValidLicense = await this.checkOrganizationLicense(item.organization.id)
      if (hasValidLicense) {
        validOrganizations.push(item.organization)
      }
    }
    
    return validOrganizations
  }

  // Drawing management
  async getDrawings(organizationId, userId) {
    const hasValidLicense = await this.checkOrganizationLicense(organizationId)
    if (!hasValidLicense) {
      throw new Error('Cannot access drawings: Organization license is invalid or expired')
    }

    const { data, error } = await this.supabase
      .from('drawings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data
  }

  async saveDrawing(organizationId, userId, drawingData) {
    const hasValidLicense = await this.checkOrganizationLicense(organizationId)
    if (!hasValidLicense) {
      throw new Error('Cannot save drawing: Organization license is invalid or expired')
    }

    const { data, error } = await this.supabase
      .from('drawings')
      .insert({
        ...drawingData,
        organization_id: organizationId,
        user_id: userId
      })
      .select()
    
    if (error) throw new Error(error.message)
    return data[0]
  }

  async updateDrawing(drawingId, updates) {
    const { data, error } = await this.supabase
      .from('drawings')
      .update(updates)
      .eq('id', drawingId)
      .select()
    
    if (error) throw new Error(error.message)
    return data[0]
  }

  async deleteDrawing(drawingId) {
    const { error } = await this.supabase
      .from('drawings')
      .delete()
      .eq('id', drawingId)
    
    if (error) throw new Error(error.message)
    return true
  }
}

export const db = new DatabaseService()