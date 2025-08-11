// src/components/AppRouter.jsx
import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useOrganization } from '../contexts/OrganizationContext'
import { getSubdomain } from '../utils/subdomain'

// Import existing components
import UploadAndJsonView from './UploadAndJsonView'
import Projects from '../pages/Projects'
import Login from '../pages/Login'
import AdminDashboard from '../pages/adminpage/AdminDashboard'
import PrivateRoute from './PrivateRoute'

// Landing page component (for main domain)
const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to Pic2Data
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Transform your technical drawings into actionable data
      </p>
      <div className="space-x-4">
        <button 
          onClick={() => window.location.href = '/app'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Get Started
        </button>
        <button 
          onClick={() => window.location.href = '/admin'}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Admin Login
        </button>
      </div>
    </div>
  </div>
)

export default function AppRouter() {
  const { organization, loading } = useOrganization()
  const [routingMode, setRoutingMode] = useState(null)

  useEffect(() => {
    const hostname = window.location.hostname
    const subdomain = getSubdomain(hostname)
    
    console.log('🚀 AppRouter: Determining routing mode...', { hostname, subdomain, organization })

    if (loading) return

    if (subdomain === 'admin') {
      setRoutingMode('ADMIN')
    } else if (subdomain && organization && organization.type !== 'PLATFORM_ADMIN') {
      setRoutingMode('ORGANIZATION')
    } else if (!subdomain) {
      setRoutingMode('MAIN_SITE')
    } else {
      setRoutingMode('NOT_FOUND')
    }
  }, [organization, loading])

  if (loading || !routingMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading Pic2Data...</p>
        </div>
      </div>
    )
  }

  // Admin Dashboard (admin.pic2data.local)
  if (routingMode === 'ADMIN') {
    console.log('👑 Routing to: Admin Dashboard')
    return (
      <Routes>
        <Route path="*" element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } />
      </Routes>
    )
  }

  // Organization App (mantox.pic2data.local, finecom.pic2data.local)
  if (routingMode === 'ORGANIZATION') {
    console.log('🏢 Routing to: Organization App for', organization.name)
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
              </div>
              <nav className="flex space-x-4">
                <a href="/app" className="text-blue-600 hover:text-blue-800">Analysis</a>
                <a href="/projektit" className="text-gray-600 hover:text-gray-800">Projects</a>
              </nav>
            </div>
          </div>
        </div>

        {/* Organization Routes */}
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={
            <PrivateRoute>
              <UploadAndJsonView />
            </PrivateRoute>
          } />
          <Route path="/projektit" element={
            <PrivateRoute>
              <Projects />
            </PrivateRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </div>
    )
  }

  // Main Site (pic2data.local)
  if (routingMode === 'MAIN_SITE') {
    console.log('🌐 Routing to: Main Site')
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={
          <PrivateRoute>
            <UploadAndJsonView />
          </PrivateRoute>
        } />
        <Route path="/projektit" element={
          <PrivateRoute>
            <Projects />
          </PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  // 404 - Organization not found
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
        <p className="text-gray-600 mb-8">The subdomain you're looking for doesn't exist.</p>
        <a href="http://pic2data.local:5173" className="text-blue-600 hover:text-blue-800">
          Go to main site
        </a>
      </div>
    </div>
  )
}