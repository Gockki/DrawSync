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
  
  // ✅ PRODUCTION DOMAIN - wisuron.fi
  if (cleanHost.includes('.wisuron.fi') || cleanHost === 'wisuron.fi') {
    if (cleanHost === 'wisuron.fi') {
      console.log('📍 Main wisuron.fi domain (no subdomain)')
      return null
    }
    
    const parts = cleanHost.split('.')
    if (parts.length >= 2) {
      const rawSubdomain = parts[0]
      
      // Map wisuron.fi subdomains to database slugs
      const subdomainMap = {
        'mantox': 'mantox',
        'terstesti': 'terstesti-oy',
        'admin': 'admin'
      }
      
      const mappedSubdomain = subdomainMap[rawSubdomain] || rawSubdomain
      console.log(`📍 Wisuron subdomain: ${rawSubdomain} → ${mappedSubdomain}`)
      return mappedSubdomain
    }
  }
  
  // ✅ HOSTING PATTERNS - dynaamiset domainit
  
  // Vercel deployment patterns (fallback for existing deployments)
  if (cleanHost.includes('.vercel.app')) {
    const parts = cleanHost.split('.')
    if (parts.length >= 3) {
      // Special mappings for current Vercel deployment
      const urlMap = {
        'draw-sync-nu': 'mantox',  // Main deployment → Mantox
        'terstesti-draw-sync-nu': 'terstesti-oy',  // TeräsTesti domain
        'admin-draw-sync-nu': 'admin',  // Admin domain
        'mantox-drawsync': 'mantox',
        'testiyritys-drawsync': 'testi-yritys-oy'
      }
      
      const vercelName = parts[0]
      if (urlMap[vercelName]) {
        console.log('📍 Vercel mapped subdomain:', urlMap[vercelName])
        return urlMap[vercelName]
      }
      
      // Fallback: first part before dash
      const subdomain = parts[0].split('-')[0]
      console.log('📍 Vercel fallback subdomain:', subdomain)
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
  
  // ✅ GENERIC CUSTOM DOMAIN SUPPORT
  const parts = cleanHost.split('.')
  if (parts.length >= 3) {
    // Exclude common prefixes
    const subdomain = parts[0]
    if (!['www', 'api', 'mail', 'ftp'].includes(subdomain)) {
      console.log('📍 Generic custom domain subdomain:', subdomain)
      return subdomain
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
      isWisuron: hostname.includes('.wisuron.fi') || hostname === 'wisuron.fi',
      isCustomDomain: !hostname.includes('.local') && 
                      !hostname.includes('.vercel.app') && 
                      !hostname.includes('.railway.app') &&
                      !hostname.includes('localhost') &&
                      !hostname.includes('.wisuron.fi') &&
                      hostname !== 'wisuron.fi',
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
  } else if (hostname.includes('.wisuron.fi') || hostname === 'wisuron.fi') {
    return 'production'
  } else {
    return 'production'
  }
}