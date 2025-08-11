// src/services/database.js
import { supabase } from '../supabaseClient'

class DatabaseService {
  constructor() {
    this.supabase = supabase
  }

  // ✅ KORJATTU getUsersInOrganization (poista toinen versio!)
  async getUsersInOrganization(organizationId) {
    const { data, error } = await this.supabase
      .from('user_organization_access')
      .select('*')  // ← Pelkkä * ilman auth.users joinia
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data
  }

  // ✅ LISÄÄ PUUTTUVA getUserRoleInOrganization
  async getUserRoleInOrganization(userId, organizationId) {
    console.log('🔍 getUserRoleInOrganization called with:', { userId, organizationId })
    const { data, error } = await this.supabase
      .from('user_organization_access')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()
    console.log('📊 Database query result:', { data, error })
    
    if (error) {
      console.log('No role found for user in organization:', error.message)
      return null
    }
    console.log('✅ Role found:', data.role)
    return data.role
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
    const { data, error } = await this.supabase
      .from('invitations')
      .insert({
        organization_id: organizationId,
        email_address: email.toLowerCase(),
        role,
        invited_by: invitedBy
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
    const { data, error } = await this.supabase
      .from('invitations')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single()
    
    if (error) return null
    return data
  }

  async acceptInvitation(token, userId) {
    const { data, error } = await this.supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('token', token)
      .select()
    
    if (error) throw new Error(error.message)
    
    const invitation = data[0]
    
    // Add user to organization
    const { error: accessError } = await this.supabase
      .from('user_organization_access')
      .insert({
        user_id: userId,
        organization_id: invitation.organization_id,
        role: invitation.role,
        status: 'active'
      })
    
    if (accessError) throw new Error(accessError.message)
    
    return invitation
  }

  async deleteInvitation(invitationId) {
    const { error } = await this.supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)
    
    if (error) throw new Error(error.message)
    return true
  }

  // Organizations
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
    const { data, error } = await this.supabase
      .from('organizations')
      .insert({
        name: orgData.name,
        slug: orgData.slug,
        industry_type: orgData.industry_type || 'pinnoitus',
        contact_email: orgData.contact_email,
        subscription_plan: orgData.subscription_plan || 'trial',
        ui_settings: orgData.ui_settings || {},
        pricing_config: orgData.pricing_config || {}
      })
      .select()
    
    if (error) throw new Error(error.message)
    return data[0]
  }

  async deleteOrganization(orgId) {
    const { error } = await this.supabase
      .from('organizations')
      .delete()
      .eq('id', orgId)
    
    if (error) throw new Error(error.message)
    return true
  }

  async getOrganization(orgId) {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
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
    
    if (error) return null
    return data
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
    return data?.map(access => access.organization) || []
  }

  // Drawings with organization context
  async getDrawings(organizationId, userId) {
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

  async updateDrawing(drawingId, updateData) {
    const { data, error } = await this.supabase
      .from('drawings')
      .update(updateData)
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

// Singleton instance
export const db = new DatabaseService()
export default db