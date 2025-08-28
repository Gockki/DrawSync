// src/pages/LicenseErrorPage.jsx
import { supabase } from '../supabaseClient'
import {
  ShieldX,
  AlertTriangle,
  Mail,
  LogOut,
  RefreshCw, // ← korvattu Refresh2 -> RefreshCw
  Clock,
} from 'lucide-react'

export default function LicenseErrorPage({ error }) {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const getErrorInfo = () => {
    switch (error?.error) {
      case 'INVALID_LICENSE':
        return {
          icon: <ShieldX className="h-16 w-16 text-red-500" />,
          title: 'Lisenssi vanhentunut',
          description: 'Organisaation lisenssi on vanhentunut tai keskeytetty.',
          href: 'mailto:admin@wisuron.fi?subject=Lisenssi vanhentunut',
          label: 'Ota yhteyttä ylläpitoon',
        }

      case 'NO_ACCESS':
        return {
          icon: <AlertTriangle className="h-16 w-16 text-yellow-500" />,
          title: 'Ei käyttöoikeutta',
          description: 'Sinulla ei ole käyttöoikeutta tähän organisaatioon.',
          href: 'mailto:admin@wisuron.fi?subject=Käyttöoikeuspyyntö',
          label: 'Pyydä käyttöoikeutta',
        }

      case 'TRIAL_EXPIRED':
        return {
          icon: <Clock className="h-16 w-16 text-orange-500" />,
          title: 'Kokeilujakso päättynyt',
          description: 'Organisaation kokeilujakso on päättynyt.',
          href: 'mailto:sales@wisuron.fi?subject=Lisenssin tilaus',
          label: 'Tilaa lisenssi',
        }

      default:
        return {
          icon: <AlertTriangle className="h-16 w-16 text-gray-500" />,
          title: 'Käyttöoikeus estetty',
          description: error?.message || 'Tuntematon virhe.',
          href: 'mailto:support@wisuron.fi?subject=Käyttöoikeusongelma',
          label: 'Ota yhteyttä tukeen',
        }
    }
  }

  const errorInfo = getErrorInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">{errorInfo.icon}</div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{errorInfo.title}</h1>

          <p className="text-gray-600 mb-8 leading-relaxed">{errorInfo.description}</p>

          <div className="mb-8">
            <a
              href={errorInfo.href}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" />
              {errorInfo.label}
            </a>
          </div>

          <div className="border-t pt-6 space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Päivitä sivu
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Kirjaudu ulos
            </button>
          </div>

          <div className="mt-8 pt-6 border-t">
            <p className="text-xs text-gray-500 leading-relaxed">
              Jos uskot tämän olevan virhe, ota yhteyttä järjestelmän ylläpitoon. Mainitse virheen tyyppi:{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{error?.error || 'UNKNOWN'}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
