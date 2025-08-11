import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setIsLoading(true)
  let result

  if (isLogin) {
    result = await supabase.auth.signInWithPassword({ email, password })
    
    if (result.error) {
      setError(result.error.message)
      setIsLoading(false)
      return
    }

    console.log('🔐 Login successful, navigating in 500ms...')
    
    setTimeout(() => {
      console.log('🚀 Attempting navigation to /app')
      window.location.href = '/app'
}, 500)
      
    } else {
      result = await supabase.auth.signUp({ email, password })

      if (result.error) {
        setError(result.error.message)
        setIsLoading(false)
        return
      }

      if (result.data.user && !result.data.user.confirmed_at) {
        alert("Rekisteröinti onnistui! Tarkista sähköpostisi ja vahvista tilisi.")
        setIsLoading(false)
        return
      }

      setTimeout(() => {
        navigate('/app')
      }, 500)
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
              src="/src/assets/mantox-logo-musta.png"
              alt="Mantox Logo"
              className="relative h-14"
            />
          </div>
          <div className="w-full h-[2px] bg-[#ff5757] rounded mt-3"></div>
        </div>

        {/* Sähköposti */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/90">Sähköposti</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-white/30 bg-white/10 text-white placeholder-white/60 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
            placeholder="nimi@example.com"
          />
        </div>

        {/* Salasana */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/90">Salasana</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-white/30 bg-white/10 text-white placeholder-white/60 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
            placeholder="********"
          />
        </div>

        {/* Virheilmoitus */}
        {error && (
          <div className="bg-[#ffe5e5] text-[#ff5757] text-sm px-3 py-2 rounded">
            {error}
          </div>
        )}

        {/* Kirjaudu-painike */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-white text-[#737373] font-semibold rounded-md hover:bg-[#ff5757]/90 transition disabled:opacity-50"
        >
          {isLoading ? 'Kirjaudutaan...' : (isLogin ? 'Kirjaudu' : 'Rekisteröidy')}
        </button>

        {/* Vaihtolinkki */}
        <p
          className="text-sm text-center text-white/80 hover:text-[#ff5757] underline cursor-pointer transition"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? 'Eikö sinulla ole tunnusta? Rekisteröidy'
            : 'Onko sinulla tunnus? Kirjaudu sisään'}
        </p>
      </form>
    </div>
  )
}