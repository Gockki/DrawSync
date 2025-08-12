// src/utils/subdomain.js
import { db } from '../services/database'
export const getSubdomain = (hostname) => {

  
  // Development (.local)
  if (hostname.includes('.local')) {
    const parts = hostname.split('.')
    const subdomain = parts[0] === 'pic2data' ? null : parts[0]

    return subdomain
  }
  
  // Production (pic2data.fi tai pic2data.com - future)
  if (hostname.includes('pic2data')) {
    const parts = hostname.split('.')
    const subdomain = parts.length > 2 ? parts[0] : null

    return subdomain
  }
  
  // Localhost fallback (localhost:5173)

  return null
}

export const getOrganizationFromSubdomain = async (subdomain) => {
  if (!subdomain) {

    return null
  }
  
  if (subdomain === 'admin') {

    return 'PLATFORM_ADMIN'
  }
  
  try {

    const organization = await db.getOrganizationBySlug(subdomain)

    return organization
  } catch (error) {

    return null
  }
}

// Debug helper
export const debugSubdomain = () => {
  const hostname = window.location.hostname
  const subdomain = getSubdomain(hostname)
  
  return { hostname, subdomain }
}