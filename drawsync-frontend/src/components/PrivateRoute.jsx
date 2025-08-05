import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { supabase } from "../supabaseClient"

const PrivateRoute = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
  }, [])

  if (loading) return <div>Ladataan...</div>

  return session ? children : <Navigate to="/" />
}

export default PrivateRoute
