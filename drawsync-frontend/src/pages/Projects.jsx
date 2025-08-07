import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"
import { FileText, CalendarDays, Eye } from "lucide-react"

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProjects = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate("/")
        return
      }

      const { data, error } = await supabase
        .from("drawings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Virhe haettaessa projekteja:", error)
      } else {
        setProjects(data || [])
      }

      setLoading(false)
    }

    fetchProjects()
  }, [navigate])

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Ladataan projekteja...</div>
  }

  if (projects.length === 0) {
    return <div className="p-6 text-center text-gray-600">Ei tallennettuja projekteja.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Omat projektit</h1>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-white border border-gray-200 rounded-xl shadow hover:shadow-md transition p-4 flex flex-col justify-between"
          >
            <div>
              <img
                src={proj.image_url}
                alt={proj.filename}
                className="w-full h-40 object-contain mb-4 bg-gray-100 rounded"
              />
              <h2 className="text-lg font-semibold text-gray-800 truncate">{proj.product_name || "Nimetön tuote"}</h2>
              <p className="text-sm text-gray-500">{proj.product_code}</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {new Date(proj.created_at).toLocaleDateString("fi-FI")}
              </span>
              <a
                href={`/app?id=${proj.id}`} // esim. jos haluat avata projektin uudelleen
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                <Eye className="w-4 h-4" />
                Avaa
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
