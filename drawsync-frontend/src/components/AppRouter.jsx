// src/components/AppRouter.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useOrganization } from '../contexts/OrganizationContext'
import { getSubdomain } from '../utils/subdomain'

// Sivut/komponentit – HUOM: täsmälliset polut ja .jsx -päätteet
import Login from '../pages/Login.jsx'
import Join from '../pages/Join.jsx'
import AuthCallback from '../pages/AuthCallback.jsx'
import UploadAndJsonView from '../components/UploadAndJsonView.jsx'
import Projects from '../pages/Projects.jsx'
import OrganizationAdmin from '../pages/OrganizationAdmin.jsx'
import AdminDashboard from '../pages/adminpage/AdminDashboard.jsx'
import PrivateRoute from './PrivateRoute.jsx'
import LicenseErrorPage from '../pages/LicenseErrorPage.jsx'

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

  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const subdomain = getSubdomain(hostname)

  // Reititysmoodi domainin mukaan
  // MAIN_SITE (ei subdomain), ADMIN (admin.*), ORGANIZATION_LOGIN (org ilman sessiota), ORGANIZATION (org + sessio)
  let routingMode = 'MAIN_SITE'
  if (subdomain === 'admin') {
    routingMode = 'ADMIN'
  } else if (subdomain) {
    if (organization?.type === 'LICENSE_ERROR' || organization?.type === 'ACCESS_DENIED') {
      routingMode = 'LICENSE_ERROR'
    } else {
      routingMode = organization ? 'ORGANIZATION' : 'ORGANIZATION_LOGIN'
    }
  }

  // Lisenssivirhe
  if (routingMode === 'LICENSE_ERROR') {
    return (
      <Routes>
        <Route path="*" element={<LicenseErrorPage error={organization} />} />
      </Routes>
    )
  }

  // PÄÄSIVU (ei subdomainia) – ohjataan loginin kautta /app:iin
  if (routingMode === 'MAIN_SITE') {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <UploadAndJsonView />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // ADMIN
  if (routingMode === 'ADMIN') {
    return (
      <Routes>
        <Route path="*" element={<AdminDashboard />} />
      </Routes>
    )
  }

  // ORGANISAATION LOGIN (subdomain, mutta ei sessiota)
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

  // ORGANISAATION APP (subdomain + sessio)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{organization?.name || 'Organisaatio'}</h1>
              {organization?.industry_type && (
                <span className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {organization.industry_type}
                </span>
              )}
              {organization?.license && (
                <div className="ml-3 flex items-center">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      organization.license.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : organization.license.status === 'trial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {organization.license.status === 'active' && 'Aktiivinen'}
                    {organization.license.status === 'trial' && 'Kokeiluversio'}
                    {organization.license.status === 'expired' && 'Vanhentunut'}
                    {organization.license.status === 'suspended' && 'Keskeytetty'}
                  </span>
                  {organization.license.license_type && (
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                      {organization.license.license_type.charAt(0).toUpperCase() +
                        organization.license.license_type.slice(1)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <nav className="flex space-x-4">
              <a href="/app" className="text-blue-600 hover:text-blue-800">
                Analytiikka
              </a>
              <a href="/projektit" className="text-gray-600 hover:text-gray-800">
                Tarjoukset
              </a>
              {organization?.userRole === 'owner' && (
                <a href="/team" className="text-gray-600 hover:text-gray-800">
                  Team
                </a>
              )}
            </nav>
          </div>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <UploadAndJsonView />
            </PrivateRoute>
          }
        />
        <Route
          path="/projektit"
          element={
            <PrivateRoute>
              <Projects />
            </PrivateRoute>
          }
        />
        <Route
          path="/team"
          element={
            <PrivateRoute>
              <OrganizationAdmin />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </div>
  )
}
