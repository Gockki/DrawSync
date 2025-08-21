// src/utils/subdomain.js - KORJATTU HOSTINGIIN
import { db } from '../services/database'

export const getSubdomain = (hostname) => {
  console.log('🔍 Parsing subdomain from:', hostname)
  
  // Remove port numbers
  const cleanHost = hostname.split(':')[0]
  
  // Development patterns
  if (cleanHost.includes('.local')) {
    const parts = cleanHost.split('.')
    if (parts.length >= 3 && parts[1] === 'pic2data') {
      const subdomain = parts[0]
      console.log('📍 Development subdomain:', subdomain)
      return subdomain === 'pic2data' ? null : subdomain
    }
  }
  
  // ✅ HOSTING PATTERNS - dynaamiset domainit
  
  // Vercel deployment: app.vercel.app, mantox-app.vercel.app 
  if (cleanHost.includes('.vercel.app')) {
    const parts = cleanHost.split('.')
    if (parts.length >= 3) {
      // mantox-app.vercel.app → mantox
      const subdomain = parts[0].split('-')[0]
      console.log('📍 Vercel subdomain:', subdomain)
      return subdomain
    }
  }
  
  // Railway deployment: app.railway.app, mantox-api.railway.app
  if (cleanHost.includes('.railway.app')) {
    const parts = cleanHost.split('.')
    if (parts.length >= 3) {
      const subdomain = parts[0].split('-')[0]
      console.log('📍 Railway subdomain:', subdomain)
      return subdomain
    }
  }
  
  // ✅ CUSTOM DOMAIN SUPPORT (kun domain tulee)
  // app.yourdomain.com, mantox.yourdomain.com
  const parts = cleanHost.split('.')
  if (parts.length >= 3) {
    // Exclude common prefixes
    const subdomain = parts[0]
    if (!['www', 'api', 'mail', 'ftp', 'admin'].includes(subdomain)) {
      console.log('📍 Custom domain subdomain:', subdomain)
      return subdomain
    }
  }
  
  // ✅ SPECIFIC DOMAIN SUPPORT (backward compatibility)
  if (cleanHost.includes('pic2data')) {
    const parts = cleanHost.split('.')
    if (parts.length >= 3) {
      const subdomain = parts[0]
      console.log('📍 Pic2data subdomain:', subdomain)
      return subdomain === 'pic2data' ? null : subdomain
    }
  }
  
  // No subdomain found
  console.log('📍 No subdomain found for:', cleanHost)
  return null
}

export const getOrganizationFromSubdomain = async (subdomain) => {
  if (!subdomain) {
    console.log('📍 No subdomain provided')
    return null
  }
  
  if (subdomain === 'admin') {
    console.log('📍 Admin subdomain detected')
    return 'PLATFORM_ADMIN'
  }
  
  try {
    console.log('🔍 Fetching organization for subdomain:', subdomain)
    const organization = await db.getOrganizationBySlug(subdomain)
    
    if (organization) {
      console.log('✅ Organization found:', organization.name)
    } else {
      console.log('❌ Organization not found for:', subdomain)
    }
    
    return organization
  } catch (error) {
    console.error('❌ Error fetching organization:', error)
    return null
  }
}

// ✅ UNIVERSAL DEBUG HELPER
export const debugSubdomain = () => {
  const hostname = window.location.hostname
  const subdomain = getSubdomain(hostname)
  
  const debug = {
    hostname,
    subdomain,
    url: window.location.href,
    patterns: {
      isLocal: hostname.includes('.local'),
      isVercel: hostname.includes('.vercel.app'),
      isRailway: hostname.includes('.railway.app'),
      isCustomDomain: !hostname.includes('.local') && 
                      !hostname.includes('.vercel.app') && 
                      !hostname.includes('.railway.app') &&
                      !hostname.includes('localhost'),
      parts: hostname.split('.')
    }
  }
  
  console.log('🔍 Subdomain debug:', debug)
  return debug
}

// ✅ ENVIRONMENT DETECTION
export const getEnvironment = () => {
  const hostname = window.location.hostname
  
  if (hostname.includes('.local') || hostname.includes('localhost')) {
    return 'development'
  } else if (hostname.includes('.vercel.app') || hostname.includes('.railway.app')) {
    return 'staging'
  } else {
    return 'production'
  }
}