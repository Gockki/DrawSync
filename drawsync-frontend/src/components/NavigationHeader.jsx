// src/components/NavigationHeader.jsx

import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import mantoxLogo from '../assets/mantox-logo.png'
import { getSubdomain } from '../utils/subdomain'
import { 
  Upload, 
  FolderOpen, 
  LogOut, 
  Home,
  Plus,
  BarChart3
} from 'lucide-react'

export default function NavigationHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  
    const handleLogout = async () => {
    await supabase.auth.signOut()
    
    // Redirect organisaation mukaan
    const hostname = window.location.hostname
    const subdomain = getSubdomain(hostname)
    
    if (subdomain && subdomain !== 'admin') {
      // Organization subdomain → stay in same subdomain but go to login
      window.location.href = `/login`
    } else if (subdomain === 'admin') {
      // Admin → main site login
      window.location.href = 'http://pic2data.local:5173/login'
    } else {
      // Main site → main site login
      navigate('/login')
    }
  }
  
  const isActive = (path) => location.pathname === path
  
  return (
    <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 text-white shadow-xl border-b-4 border-red-500">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo ja brändi */}
<div className="flex items-center gap-4">
  {/* varaa logolle kiinteä leveys */}
  <div className="relative h-12 w-[160px] overflow-visible shrink-0">
    <img
      src={mantoxLogo}
      alt="Mantox Solutions"
      onClick={() => navigate('/app')}
      className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-auto object-contain cursor-pointer select-none [transform-origin:left] scale-[3.7]"
    />
  </div>

  <div className="border-l border-gray-400 pl-4">
    <p className="text-gray-200 text-lg font-medium">Pinnoitusanalyysi</p>
    <p className="text-gray-300 text-sm">AI-pohjainen piirustusanalyysi</p>
  </div>
</div>

          
          {/* Navigaatiolinkit */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/app') 
                  ? 'bg-gray-900/50 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Uusi analyysi</span>
            </button>
            
            <button
              onClick={() => navigate('/projektit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/projektit') 
                  ? 'bg-gray-900/50 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Projektit</span>
            </button>
            
            <div className="w-px h-8 bg-gray-500 mx-2" />
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-500 rounded-lg transition-all duration-200 text-white font-medium shadow-lg"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Kirjaudu ulos</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}