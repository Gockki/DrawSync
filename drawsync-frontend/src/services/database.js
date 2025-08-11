// src/services/database.js
import { supabase } from '../supabaseClient'

class DatabaseService {
  constructor() {
    this.supabase = supabase
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
  
  // Hae user_count ja project_count erikseen jokaiselle orgille
  const enrichedData = await Promise.all(
    data.map(async (org) => {
      // Count users
      const { count: userCount } = await this.supabase
        .from('user_organization_access')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'active')
      
      // Count projects
      const { count: projectCount } = await this.supabase
        .from('drawings')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
      
      return {
        ...org,
        user_count: userCount || 0,
        project_count: projectCount || 0
      }
    })
  )
  
  return enrichedData
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
  // TODO: Add safety checks (no users, no projects)
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
    
    if (error) return null // Not found
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