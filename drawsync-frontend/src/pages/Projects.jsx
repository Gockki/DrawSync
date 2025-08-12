import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"
import NavigationHeader from "../components/NavigationHeader";
import { useOrganization } from "../contexts/OrganizationContext"
import { db } from "../services/database"
import { 
  FileText, 
  CalendarDays, 
  Eye, 
  Trash2, 
  Search, 
  Package,
  Ruler,
  Grid,
  List,
  Download,
  Plus,
  Filter
} from "lucide-react"

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [sortBy, setSortBy] = useState("created_at")
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const navigate = useNavigate()
  const { organization, user } = useOrganization()

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    // Suodatus ja järjestys
    let filtered = projects.filter(proj => 
      proj.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.material?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Järjestä
    filtered.sort((a, b) => {
      switch(sortBy) {
        case "created_at":
          return new Date(b.created_at) - new Date(a.created_at)
        case "product_name":
          return (a.product_name || "").localeCompare(b.product_name || "")
        case "surface_area":
          return (b.surface_area_cm2 || 0) - (a.surface_area_cm2 || 0)
        default:
          return 0
      }
    })

    setFilteredProjects(filtered)
  }, [projects, searchTerm, sortBy])

  // Projects.jsx - fetchProjects funktio
const fetchProjects = async () => {
  if (!organization || !user) {
    setLoading(false)
    return
  }

  try {
    const data = await db.getDrawings(organization.id, user.id)
    setProjects(data || [])
  } catch (error) {
    console.error("Virhe haettaessa projekteja:", error)
    setProjects([])
  }

  setLoading(false)
}

const handleDelete = async (id) => {
  console.log('🗑️ Deleting project:', id)
  
  const { error } = await supabase
    .from("drawings")
    .delete()
    .eq("id", id)


  
  if (!error) {
    
    await fetchProjects()  // ← Lisää await!
    
    setDeleteConfirm(null)
  } else {
    console.error('Delete failed:', error)
    alert('Poisto epäonnistui: ' + error.message)
  }
}

  const openProject = (projectId) => {
    sessionStorage.setItem('loadProjectId', projectId)
    navigate('/app')
  }

  const exportToCSV = () => {
    const headers = ["Tuotekoodi", "Tuotenimi", "Materiaali", "Paino (kg)", "Pinta-ala (cm²)", "Päivämäärä"]
    const rows = filteredProjects.map(p => [
      p.product_code || "",
      p.product_name || "",
      p.material || "",
      p.weight_kg || "",
      p.surface_area_cm2 || "",
      new Date(p.created_at).toLocaleDateString("fi-FI")
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `projektit_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <NavigationHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600">Ladataan projekteja...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <NavigationHeader />

      {/* Projektienhallinta header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Omat analyysit</h1>
              <p className="text-sm text-gray-600">
                {filteredProjects.length} {filteredProjects.length === 1 ? 'analyysi' : 'analyysia'} yhteensä
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Uusi projekti -nappi */}
              <button
                onClick={() => navigate('/app')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Uusi tarjous
              </button>

              {/* Haku */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Hae projekteista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              {/* Järjestys */}
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="created_at">Uusin ensin</option>
                <option value="product_name">Nimen mukaan</option>
                <option value="surface_area">Pinta-alan mukaan</option>
              </select>

              {/* Näkymätila */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                  title="Ruudukkonäkymä"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                  title="Listanäkymä"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Vie CSV */}
              {filteredProjects.length > 0 && (
                <button 
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Vie CSV</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              {searchTerm ? "Ei hakutuloksia" : "Ei tallennettuja projekteja"}
            </h2>
            <p className="text-gray-500 mb-6">
              {searchTerm ? "Kokeile eri hakusanoja" : "Aloita lataamalla ja analysoimalla piirustus"}
            </p>
            {!searchTerm && (
              <button 
                onClick={() => navigate('/app')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              >
                Luo ensimmäinen tarjous
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid näkymä */
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                {/* Kuva */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  <img
                    src={proj.image_url}
                    alt={proj.filename}
                    className="w-full h-full object-contain"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      onClick={() => openProject(proj.id)}
                      className="p-3 bg-white rounded-full hover:bg-blue-50 transition-colors"
                      title="Avaa analyysi"
                    >
                      <Eye className="h-5 w-5 text-blue-600" />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(proj.id)}
                      className="p-3 bg-white rounded-full hover:bg-red-50 transition-colors"
                      title="Poista analyysi"
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate" title={proj.product_name}>
                    {proj.product_name || "Nimetön tuote"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{proj.product_code || "Ei tuotekoodia"}</p>
                  
                  <div className="space-y-2 text-xs text-gray-600">
                    {proj.material && (
                      <div className="flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        <span className="truncate">{proj.material}</span>
                      </div>
                    )}
                    {proj.surface_area_cm2 && (
                      <div className="flex items-center gap-2">
                        <Ruler className="h-3 w-3" />
                        <span>{proj.surface_area_cm2} cm²</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3 w-3" />
                      <span>{new Date(proj.created_at).toLocaleDateString("fi-FI")}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List näkymä */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kuva
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tuote
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Materiaali
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pinta-ala
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Päivämäärä
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toiminnot
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <img
                          src={proj.image_url}
                          alt={proj.filename}
                          className="h-12 w-12 object-contain rounded bg-gray-100"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {proj.product_name || "Nimetön"}
                          </div>
                          <div className="text-sm text-gray-500">{proj.product_code || "-"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {proj.material || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {proj.surface_area_cm2 ? `${proj.surface_area_cm2} cm²` : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(proj.created_at).toLocaleDateString("fi-FI")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openProject(proj.id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Avaa analyysi"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(proj.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Poista analyysi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Poista projekti?
            </h3>
            <p className="text-gray-600 mb-6">
              Tätä toimintoa ei voi perua. Projekti poistetaan pysyvästi.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Peruuta
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Poista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}