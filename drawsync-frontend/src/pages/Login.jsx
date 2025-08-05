import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    let result

    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else {
      result = await supabase.auth.signUp({ email, password })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      navigate('/app') // ohjaa pääsivulle
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f3f4f6'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 0 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>
          {isLogin ? 'Kirjaudu sisään' : 'Luo tunnus'}
        </h2>

        <label style={{ fontWeight: '500' }}>Sähköposti</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />

        <label style={{ fontWeight: '500' }}>Salasana</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <button type="submit" style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          {isLogin ? 'Kirjaudu' : 'Rekisteröidy'}
        </button>

        <p
          style={{ marginTop: '16px', textAlign: 'center', cursor: 'pointer', color: '#3b82f6' }}
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Eikö sinulla ole tunnusta? Rekisteröidy' : 'Onko sinulla tunnus? Kirjaudu sisään'}
        </p>
      </form>
    </div>
  )
}
