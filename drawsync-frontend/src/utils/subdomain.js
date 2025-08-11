// src/utils/subdomain.js

export const getSubdomain = (hostname) => {
  console.log('🌐 Current hostname:', hostname)
  
  // Development (.local)
  if (hostname.includes('.local')) {
    const parts = hostname.split('.')
    const subdomain = parts[0] === 'pic2data' ? null : parts[0]
    console.log('🔍 Local subdomain detected:', subdomain)
    return subdomain
  }
  
  // Production (pic2data.fi tai pic2data.com - future)
  if (hostname.includes('pic2data')) {
    const parts = hostname.split('.')
    const subdomain = parts.length > 2 ? parts[0] : null
    console.log('🔍 Production subdomain detected:', subdomain)
    return subdomain
  }
  
  // Localhost fallback (localhost:5173)
  console.log('🔍 Localhost fallback - no subdomain')
  return null
}

export const getOrganizationFromSubdomain = async (subdomain) => {
  if (!subdomain) {
    console.log('📝 No subdomain - returning null')
    return null
  }
  
  if (subdomain === 'admin') {
    console.log('👑 Admin subdomain detected')
    return 'PLATFORM_ADMIN'
  }
  
  try {
    console.log('🏢 Looking up organization for slug:', subdomain)
    const organization = await db.getOrganizationBySlug(subdomain)
    console.log('📊 Organization found:', organization?.name || 'Not found')
    return organization
  } catch (error) {
    console.error('❌ Error fetching organization:', error)
    return null
  }
}

// Debug helper
export const debugSubdomain = () => {
  const hostname = window.location.hostname
  const subdomain = getSubdomain(hostname)
  console.log('🚀 Subdomain Debug:', {
    hostname,
    subdomain,
    fullUrl: window.location.href
  })
  return { hostname, subdomain }
}