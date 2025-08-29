// src/pages/Login.jsx - TURVALLISUUSKORJATTU VERSIO
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import wisuronLogo from '../assets/Wisuron logo.svg 


export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  // ❌ POISTETTU: const [isLogin, setIsLogin] = useState(true)
  // ❌ POISTETTU: rekisteröitymis-toggle
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // ✅ VAIN LOGIN - ei rekisteröitymistä!
    try {
      const result = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (result.error) {
        setError(result.error.message)
        setIsLoading(false)
        return
      }

      // Onnistunut kirjautuminen
      setTimeout(() => {
        window.location.href = '/app'
      }, 500)
      
    } catch (error) {
      console.error('Login failed:', error)
      setError('Kirjautuminen epäonnistui')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-gradient-to-br from-[#999] via-[#777] to-[#555] text-white w-full max-w-md min-w-[320px] rounded-xl shadow-lg p-10 space-y-6"
      >
        {/* Logo ja otsikko */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-white/60 to-transparent rounded-md blur-sm"></div>
<img
  src={wisuronLogo}
  alt="Wisuron Logo"
  className="relative h-14"
/>
          </div>
          <div className="w-full h-[2px] bg-[#ff5757] rounded mt-3"></div>
        </div>

        {/* Otsikko */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Kirjaudu sisään</h1>
          <p className="text-white/80 text-sm">Syötä tunnuksesi päästäksesi järjestelmään</p>
        </div>

        {/* Sähköposti */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/90">
            Sähköposti
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-white/30 bg-white/10 text-white placeholder-white/60 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
            placeholder="nimi@example.com"
            disabled={isLoading}
          />
        </div>

        {/* Salasana */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/90">
            Salasana
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-white/30 bg-white/10 text-white placeholder-white/60 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
            placeholder="********"
            disabled={isLoading}
          />
        </div>

        {/* Virheilmoitus */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 text-sm px-3 py-2 rounded">
            {error}
          </div>
        )}

        {/* Kirjaudu-painike */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-white text-[#737373] font-semibold rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Kirjaudutaan...' : 'Kirjaudu sisään'}
        </button>

        {/* ❌ POISTETTU: Rekisteröidy-linkki */}
        {/* ✅ LISÄTTY: Contact info */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <p className="text-center text-sm text-white/70 mb-2">
            Tarvitsetko käyttöoikeuden?
          </p>
          <div className="text-center space-y-2">
            <a 
              href="mailto:admin@wisuron.fi" 
              className="block text-sm text-blue-200 hover:text-blue-100 underline transition-colors"
            >
              📧 Ota yhteyttä ylläpitoon
            </a>
            <p className="text-xs text-white/60">
              Uudet käyttäjät tarvitsevat kutsun organisaation ylläpitäjältä
            </p>
          </div>
        </div>

        {/* Unohtunut salasana */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              if (email) {
                supabase.auth.resetPasswordForEmail(email)
                alert('Salasanan palautusohje lähetetty sähköpostiin')
              } else {
                alert('Syötä sähköpostiosoite ensin')
              }
            }}
            className="text-sm text-blue-200 hover:text-blue-100 underline transition-colors"
          >
            Unohditko salasanan?
          </button>
        </div>
      </form>
    </div>
  )
}