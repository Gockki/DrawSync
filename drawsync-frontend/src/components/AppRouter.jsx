// src/components/AppRouter.jsx - PÄIVITETTY LISENSSILOGIIKALLA
import { Routes, Route, Navigate } from 'react-router-dom'
import { useOrganization } from '../contexts/OrganizationContext'
import { getSubdomain } from '../utils/subdomain'

// Pages
import Login from '../pages/Login'
import Join from '../pages/Join'
import AuthCallback from '../pages/AuthCallback'
import UploadAndJsonView from '../pages/UploadAndJsonView'
import ProjectsPage from '../pages/ProjectsPage'
import TeamManagement from '../pages/TeamManagement'
import AdminDashboard from '../pages/adminpage/AdminDashboard'
import MainSite from '../pages/MainSite'
import PrivateRoute from './PrivateRoute'
import LicenseErrorPage from '../pages/LicenseErrorPage'

export default function AppRouter() {
  const { organization, loading } = useOrganization()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Tarkistetaan käyttöoikeuksia...</p>
        </div>
      </div>
    )
  }

  // Determine routing mode
  const hostname = window.location.hostname
  const subdomain = getSubdomain(hostname)
  let routingMode = 'MAIN_SITE'

  if (subdomain === 'admin') {
    routingMode = 'ADMIN'
  } else if (subdomain && subdomain !== 'admin') {
    if (organization) {
      if (organization.type === 'LICENSE_ERROR' || organization.type === 'ACCESS_DENIED') {
        routingMode = 'LICENSE_ERROR'
      } else {
        routingMode = 'ORGANIZATION'
      }
    } else {
      routingMode = 'ORGANIZATION_LOGIN'
    }
  }

  console.log('Routing mode determined:', routingMode, { subdomain, organization })

  // LICENSE ERROR ROUTING
  if (routingMode === 'LICENSE_ERROR') {
    console.log('License error detected:', organization.error)
    return (
      <Routes>
        <Route path="*" element={<LicenseErrorPage error={organization} />} />
      </Routes>
    )
  }

  // MAIN SITE
  if (routingMode === 'MAIN_SITE') {
    console.log('Routing to: Main Site')
    return (
      <Routes>
        <Route path="/" element={<MainSite />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/app" element={
          <PrivateRoute>
            <UploadAndJsonView />
          </PrivateRoute>
        } />
      </Routes>
    )
  }

  // ADMIN DASHBOARD
  if (routingMode === 'ADMIN') {
    console.log('Routing mode: ADMIN detected')
    return (
      <Routes>
        <Route path="*" element={<AdminDashboard />} />
      </Routes>
    )
  }

  // ORGANIZATION LOGIN
  if (routingMode === 'ORGANIZATION_LOGIN') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // ORGANIZATION APP
  if (routingMode === 'ORGANIZATION') {
    if (!organization) {
      return <Navigate to="/login" replace />
    }
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Organization Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">{organization.name}</h1>
                <span className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {organization.industry_type}
                </span>
                
                {/* LISENSSISTATUKSEN NÄYTTÖ */}
                {organization.license && (
                  <div className="ml-3 flex items-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      organization.license.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : organization.license.status === 'trial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {organization.license.status === 'active' && 'Aktiivinen'}
                      {organization.license.status === 'trial' && 'Kokeiluversio'}
                      {organization.license.status === 'expired' && 'Vanhentunut'}
                      {organization.license.status === 'suspended' && 'Keskeytetty'}
                    </span>
                    
                    {organization.license.license_type && (
                      <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                        {organization.license.license_type.charAt(0).toUpperCase() + organization.license.license_type.slice(1)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <nav className="flex space-x-4">
                <a href="/app" className="text-blue-600 hover:text-blue-800">Analytiikka</a>
                <a href="/projektit" className="text-gray-600 hover:text-gray-800">Tarjoukset</a>
                
                {organization?.userRole === 'owner' && (
                  <a href="/team" className="text-gray-600 hover:text-gray-800">Team</a>
                )}
              </nav>
            </div>
          </div>
        </div>
        
        {/* Routes */}
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={
            <PrivateRoute>
              <UploadAndJsonView />
            </PrivateRoute>
          } />
          <Route path="/projektit" element={
            <PrivateRoute>
              <ProjectsPage />
            </PrivateRoute>
          } />
          <Route path="/team" element={
            <PrivateRoute>
              <TeamManagement />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </div>
    )
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
        <p className="text-gray-600 mb-8">The subdomain you're looking for doesn't exist.</p>
        <a 
          href="http://pic2data.local:5173" 
          className="text-blue-600 hover:text-blue-800"
        >
          Go to main site
        </a>
      </div>
    </div>
  )
}