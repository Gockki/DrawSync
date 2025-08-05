import { useState, useEffect } from "react"
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Upload, FileText, BarChart3, LogOut, CheckCircle2, AlertTriangle, Package, Ruler, TrendingUp, Palette, Calculator, Save, FileDown, Edit3, DollarSign, X } from "lucide-react"

// Pinnoitevaihtoehdot
const COATING_OPTIONS = {
  "sahkosinkitys": {
    name: "Sähkösinkitys",
    description: "5-25 μm sinkkikerros teräskappaleelle",
    maxSize: "500 kg | 2750 x 1100 x 600 mm",
    basePrice: 15,
    variants: [
      { id: "kelta", name: "Keltapassivointi", priceMultiplier: 1.2, thickness: "5-25 μm" },
      { id: "sini", name: "Sinipassivointi", priceMultiplier: 1.0, thickness: "5-25 μm" },
      { id: "musta", name: "Mustapassivointi", priceMultiplier: 1.1, thickness: "5-25 μm" }
    ]
  },
  "anodisointi": {
    name: "Anodisointi/Eloksointi", 
    description: "5-30 μm hapetettu alumiinikerros",
    maxSize: "100 kg | 1100 x 1000 x 300 mm",
    basePrice: 20,
    variants: [
      { id: "luonnon", name: "Luonnonväri (hopeanharmaa)", priceMultiplier: 1.0, thickness: "5-30 μm" },
      { id: "musta", name: "Musta-anodisointi", priceMultiplier: 1.25, thickness: "5-30 μm" },
      { id: "sininen", name: "Siniväri", priceMultiplier: 1.25, thickness: "5-30 μm" }
    ]
  },
  "kemiallinen_nikkeli": {
    name: "Kemiallinen nikkeli",
    description: "Räätälöitävät funktionaaliset ominaisuudet", 
    maxSize: "100 kg | 500 x 500 x 150 mm",
    basePrice: 30,
    variants: [
      { id: "musta", name: "Mustanikkeli (kova, kulutuskestävä)", priceMultiplier: 1.5, thickness: "5-25 μm" },
      { id: "korkea_p", name: "Korkeafosforinen nikkeli", priceMultiplier: 1.2, thickness: "5-25 μm" },
      { id: "matala_p", name: "Matalafosforinen nikkeli", priceMultiplier: 1.0, thickness: "5-25 μm" }
    ]
  }
}

// Hinnoittelufunktiot
const getBatchDiscount = (batchSize) => {
  const discounts = {
    "1-10": 0,
    "11-50": 0.05,
    "51-200": 0.10,
    "201-1000": 0.15,
    "1000+": 0.20
  }
  return discounts[batchSize] || 0
}

const getUrgencyMultiplier = (urgency) => {
  const multipliers = {
    "normaali": 1.0,
    "kiireellinen": 1.2,
    "express": 1.5
  }
  return multipliers[urgency] || 1.0
}

const calculatePretreatmentCost = (pretreatments, surfaceM2) => {
  const costs = {
    "rasvanpoisto": 3,
    "peittaus": 5,
    "hiekkapuhallus": 8
  }
  
  return pretreatments.reduce((total, treatment) => {
    return total + (costs[treatment] || 0) * surfaceM2
  }, 0)
}

// UI Komponentit
const StatusBadge = ({ type, text, className = "" }) => {
  const colors = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200"
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[type] || colors.info} ${className}`}>
      {text}
    </span>
  )
}

const EditableField = ({ label, value, unit = "", onSave, editable = true }) => {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleSave = () => {
    onSave(localValue)
    setEditing(false)
  }

  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button 
            onClick={handleSave} 
            className="text-green-600 hover:text-green-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button 
            onClick={() => {
              setEditing(false)
              setLocalValue(value)
            }} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {value || 'Ei määritelty'} {unit}
          </span>
          {editable && (
            <button 
              onClick={() => setEditing(true)}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ModernDrawSyncApp() {
  const navigate = useNavigate()
  
  // States
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [editedData, setEditedData] = useState({})
  const [activeTab, setActiveTab] = useState('perustiedot')
  const [manualSurfaceArea, setManualSurfaceArea] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  
  // Palveluvalinnat
  const [selectedCoating, setSelectedCoating] = useState('')
  const [selectedVariant, setSelectedVariant] = useState('')
  const [batchSize, setBatchSize] = useState('')
  const [urgency, setUrgency] = useState('normaali')
  const [pretreatments, setPretreatments] = useState([])
  const [pricing, setPricing] = useState(null)

  // Auth check
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) navigate('/')
    }
    checkSession()
  }, [navigate])

  // Hinnoittelu
  useEffect(() => {
    if (data?.pinta_ala_analyysi?.pinta_ala_cm2 && selectedCoating && selectedVariant) {
      const surfaceAreaCm2 = data.pinta_ala_analyysi.pinta_ala_cm2
      const surfaceAreaM2 = surfaceAreaCm2 / 10000
      const weight = editedData.paino_kg || data.perustiedot?.paino_kg || 0
      
      const coating = COATING_OPTIONS[selectedCoating]
      const variant = coating.variants.find(v => v.id === selectedVariant)
      
      if (coating && variant) {
        const setupCost = 50
        const pretreatmentCost = calculatePretreatmentCost(pretreatments, surfaceAreaM2)
        const coatingPricePerM2 = coating.basePrice * variant.priceMultiplier
        const coatingCost = surfaceAreaM2 * coatingPricePerM2
        
        const subtotal = setupCost + pretreatmentCost + coatingCost
        const batchDiscount = subtotal * getBatchDiscount(batchSize)
        const urgencyMultiplier = getUrgencyMultiplier(urgency)
        const afterDiscountAndUrgency = (subtotal - batchDiscount) * urgencyMultiplier
        const vat = afterDiscountAndUrgency * 0.24
        const total = afterDiscountAndUrgency + vat
        
        setPricing({
          surfaceAreaCm2,
          surfaceAreaM2: parseFloat(surfaceAreaM2.toFixed(4)),
          weight,
          coating: coating.name,
          variant: variant.name,
          coatingPricePerM2: parseFloat(coatingPricePerM2.toFixed(2)),
          setupCost,
          pretreatmentCost: parseFloat(pretreatmentCost.toFixed(2)),
          coatingCost: parseFloat(coatingCost.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          batchDiscount: parseFloat(batchDiscount.toFixed(2)),
          batchDiscountPercent: getBatchDiscount(batchSize) * 100,
          urgencyMultiplier,
          afterDiscountAndUrgency: parseFloat(afterDiscountAndUrgency.toFixed(2)),
          vat: parseFloat(vat.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          pretreatments: [...pretreatments]
        })
      }
    } else {
      setPricing(null)
    }
  }, [data, editedData, selectedCoating, selectedVariant, batchSize, urgency, pretreatments])

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)
      setPreviewUrl(URL.createObjectURL(droppedFile))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const handleUpload = async () => {
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    setLoading(true)
    setSuccess(false)
    
    try {
      const res = await fetch("http://localhost:8000/process", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      setData(json)
      setEditedData(json.perustiedot || {})
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      console.error("Error uploading file:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldEdit = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleManualSurfaceArea = () => {
    if (manualSurfaceArea && !isNaN(manualSurfaceArea)) {
      setData(prev => ({
        ...prev,
        pinta_ala_analyysi: {
          ...prev.pinta_ala_analyysi,
          pinta_ala_cm2: parseFloat(manualSurfaceArea),
          laskelma: "Manuaalisesti syötetty",
          varmuus: "manuaalinen"
        }
      }))
      setShowManualInput(false)
      setManualSurfaceArea('')
    }
  }

  const handlePretreatmentChange = (treatment, checked) => {
    if (checked) {
      setPretreatments(prev => [...prev, treatment])
    } else {
      setPretreatments(prev => prev.filter(t => t !== treatment))
    }
  }

  const generateQuote = () => {
    if (!pricing) {
      alert("Valitse ensin palvelu hinnoittelua varten!")
      return
    }

    const quoteNumber = `FIN-${Date.now().toString().slice(-6)}`
    const quoteDate = new Date().toLocaleDateString('fi-FI')
    
    alert(`Tarjous ${quoteNumber} luotu! Kokonaishinta: ${pricing.total.toFixed(2)} €`)
  }

  // Välilehtien määritys
  const tabs = [
    { id: 'perustiedot', name: 'Perustiedot', icon: Package, enabled: true },
    { id: 'mitat', name: 'Mitat', icon: Ruler, enabled: !!data },
    { id: 'pinta-ala', name: 'Pinta-ala', icon: TrendingUp, enabled: !!data },
    { id: 'palvelu', name: 'Palvelu', icon: Palette, enabled: !!data?.pinta_ala_analyysi?.pinta_ala_cm2 },
    { id: 'hinnoittelu', name: 'Hinnoittelu', icon: Calculator, enabled: !!pricing }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Success notification */}
      {success && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-50 border border-green-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Analyysi valmis!</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 text-white shadow-xl border-b-4 border-red-500">
        <div className="container mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/src/assets/mantox-logo.png" 
                alt="Mantox Solutions" 
                className="h-12 w-auto"
              />
              <div className="border-l border-gray-400 pl-4">
                <p className="text-gray-200 text-lg font-medium">Pinnoitusanalyysi</p>
                <p className="text-gray-300 text-sm">AI-pohjainen piirustusanalyysi</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-500 rounded-lg transition-all duration-200 text-white font-medium shadow-lg"
            >
              <LogOut className="h-4 w-4" />
              Kirjaudu ulos
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
          
          {/* Left Column - Upload */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-6 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  Lataa piirustus
                </h2>
              </div>
              
              <div className="p-6">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                    file 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-6xl mb-4">📁</div>
                  <p className="font-semibold mb-2 text-gray-700">
                    Vedä tiedosto tähän
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    tai
                  </p>
                  
                  <label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0]
                        if (selectedFile) {
                          setFile(selectedFile)
                          setPreviewUrl(URL.createObjectURL(selectedFile))
                        }
                      }}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg font-medium text-gray-700 transition-all duration-200 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Valitse tiedosto
                    </span>
                  </label>
                </div>

                {file && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className={`w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                    !file || loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      Analysoidaan...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4" />
                      Analysoi piirustus
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-6 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Esikatselu</h3>
                </div>
                <div className="p-6">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {data ? (
              <>
                {/* Status Overview */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2 block">
                        Tila
                      </label>
                      <StatusBadge 
                        type={data.success ? 'success' : 'error'} 
                        text={data.success ? 'Onnistui' : 'Virhe'} 
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2 block">
                        Tiedosto
                      </label>
                      <p className="font-semibold text-gray-900 truncate">{data.filename}</p>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2 block">
                        Prosessi vaiheet
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        <StatusBadge type="success" text="OCR" />
                        <StatusBadge type="success" text="Vision" />
                        {data.pinta_ala_analyysi?.pinta_ala_cm2 && <StatusBadge type="success" text="Mittaus" />}
                        {pricing && <StatusBadge type="success" text="Hinnoittelu" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Tabs */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                    <nav className="flex space-x-1 p-1" role="tablist">
                      {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                          <button
                            key={tab.id}
                            onClick={() => tab.enabled && setActiveTab(tab.id)}
                            disabled={!tab.enabled}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                              activeTab === tab.id
                                ? 'bg-white shadow-sm text-blue-700 border-b-2 border-blue-600'
                                : tab.enabled
                                ? 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.name}</span>
                          </button>
                        )
                      })}
                    </nav>
                  </div>

                  <div className="p-6">
                    {/* Perustiedot Tab */}
                    {activeTab === 'perustiedot' && data?.perustiedot && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <Package className="h-6 w-6 text-blue-600" />
                          <h3 className="text-2xl font-bold text-gray-900">Perustiedot</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Tuotetiedot */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              🏷️ Tuotetiedot
                            </h4>
                            <div className="space-y-1">
                              <EditableField
                                label="Tuotekoodi"
                                value={editedData.tuotekoodi || data.perustiedot.tuotekoodi}
                                onSave={(val) => handleFieldEdit('tuotekoodi', val)}
                              />
                              <EditableField
                                label="Tuotenimi"
                                value={editedData.tuotenimi || data.perustiedot.tuotenimi}
                                onSave={(val) => handleFieldEdit('tuotenimi', val)}
                              />
                              <EditableField
                                label="Materiaali"
                                value={editedData.materiaali || data.perustiedot.materiaali}
                                onSave={(val) => handleFieldEdit('materiaali', val)}
                              />
                              <EditableField
                                label="Paino"
                                value={editedData.paino_kg || data.perustiedot.paino_kg}
                                unit="kg"
                                onSave={(val) => handleFieldEdit('paino_kg', val)}
                              />
                            </div>
                          </div>
                          
                          {/* Prosessitiedot */}
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              ⚙️ Prosessitiedot
                            </h4>
                            <div className="space-y-1">
                              <EditableField
                                label="Loppuasiakas"
                                value={editedData.loppuasiakas || data.perustiedot.loppuasiakas}
                                onSave={(val) => handleFieldEdit('loppuasiakas', val)}
                              />
                              <EditableField
                                label="Pinnoite"
                                value={editedData.pinnoite || data.perustiedot.pinnoite}
                                onSave={(val) => handleFieldEdit('pinnoite', val)}
                              />
                              <EditableField
                                label="Pintakarheus"
                                value={editedData.pintakarheus_ra || data.perustiedot.pintakarheus_ra}
                                onSave={(val) => handleFieldEdit('pintakarheus_ra', val)}
                              />
                              <EditableField
                                label="Eräkoko"
                                value={editedData.eräkoko || data.perustiedot.eräkoko}
                                onSave={(val) => handleFieldEdit('eräkoko', val)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mitat Tab */}
                    {activeTab === 'mitat' && data?.mitat && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <Ruler className="h-6 w-6 text-blue-600" />
                          <h3 className="text-2xl font-bold text-gray-900">Mitat</h3>
                        </div>
                        
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            📏 Ulkomitat (mm)
                          </h4>
                          <div className="grid grid-cols-3 gap-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-purple-700 mb-1">
                                {data.mitat.ulkomitat_mm?.pituus || '—'}
                              </div>
                              <label className="text-sm text-gray-600">Pituus</label>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-purple-700 mb-1">
                                {data.mitat.ulkomitat_mm?.leveys || '—'}
                              </div>
                              <label className="text-sm text-gray-600">Leveys</label>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-purple-700 mb-1">
                                {data.mitat.ulkomitat_mm?.korkeus || '—'}
                              </div>
                              <label className="text-sm text-gray-600">Korkeus</label>
                            </div>
                          </div>
                        </div>
                        
                        {data.mitat.reiät && data.mitat.reiät.length > 0 && (
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              🔄 Reiät
                            </h4>
                            <div className="space-y-3">
                              {data.mitat.reiät.map((reikä, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white/50 rounded-lg p-3">
                                  <span className="font-medium">Halkaisija Ø{reikä.halkaisija_mm}mm</span>
                                  <span className="font-bold text-orange-700">{reikä.määrä} kpl</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pinta-ala Tab */}
                    {activeTab === 'pinta-ala' && data?.pinta_ala_analyysi && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <TrendingUp className="h-6 w-6 text-blue-600" />
                          <h3 className="text-2xl font-bold text-gray-900">Pinta-ala-analyysi</h3>
                        </div>
                        
                        {data.pinta_ala_analyysi.pinta_ala_cm2 ? (
                          <>
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center">
                              <div className="flex items-center justify-center gap-4 mb-4">
                                <CheckCircle2 className="h-12 w-12 text-green-600" />
                                <div>
                                  <div className="text-4xl font-bold text-green-700">
                                    {data.pinta_ala_analyysi.pinta_ala_cm2} cm²
                                  </div>
                                  <div className="text-lg text-green-600">
                                    ({(data.pinta_ala_analyysi.pinta_ala_cm2 / 10000).toFixed(4)} m²)
                                  </div>
                                </div>
                              </div>
                              <p className="text-green-700 mb-4">
                                {data.pinta_ala_analyysi.laskelma}
                              </p>
                              <StatusBadge 
                                type="success" 
                                text={`Varmuus: ${data.pinta_ala_analyysi.varmuus}`} 
                              />
                            </div>
                            
                            {pricing && (
                              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                  <DollarSign className="h-5 w-5 text-blue-600" />
                                  Hinta-arvio
                                </h4>
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-blue-700 mb-2">
                                    {pricing.total.toFixed(2)} €
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {pricing.coating} - {pricing.variant}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                              <AlertTriangle className="h-8 w-8 text-red-600 mt-1" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-red-800 mb-2">
                                  Pinta-alaa ei voitu laskea
                                </h4>
                                <p className="text-red-700 mb-4">
                                  {data.pinta_ala_analyysi.laskelma}
                                </p>
                                {data.pinta_ala_analyysi.puuttuvat_tiedot?.length > 0 && (
                                  <div className="mb-4">
                                    <label className="text-sm font-medium text-red-800">Puuttuvat tiedot:</label>
                                    <ul className="list-disc list-inside mt-1 text-sm text-red-700">
                                      {data.pinta_ala_analyysi.puuttuvat_tiedot.map((tieto, idx) => (
                                        <li key={idx}>{tieto}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <button 
                                  onClick={() => setShowManualInput(true)}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                                >
                                  Syötä manuaalisesti
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {data.geometria_arvio && (
                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
                            <h4 className="font-semibold text-gray-900 mb-4">🎯 Geometria-arvio</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-600">Luokka</label>
                                <p className="font-semibold text-indigo-700">{data.geometria_arvio.luokka}</p>
                              </div>
                              <div>
                                <label className="text-sm text-gray-600">Tyyppi</label>
                                <p className="font-semibold text-indigo-700">{data.geometria_arvio.kappaleen_tyyppi}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-3 italic">
                              {data.geometria_arvio.perustelu}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Palvelu Tab */}
                    {activeTab === 'palvelu' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <Palette className="h-6 w-6 text-blue-600" />
                          <h3 className="text-2xl font-bold text-gray-900">Valitse palvelu</h3>
                        </div>
                        
                        <div className="grid gap-6">
                          <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
                            <label className="text-base font-semibold text-gray-900 mb-3 block">
                              Pinnoitetyyppi
                            </label>
                            <select 
                              value={selectedCoating}
                              onChange={(e) => {
                                setSelectedCoating(e.target.value)
                                setSelectedVariant('')
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            >
                              <option value="">Valitse pinnoite...</option>
                              {Object.entries(COATING_OPTIONS).map(([key, coating]) => (
                                <option key={key} value={key}>{coating.name}</option>
                              ))}
                            </select>
                            
                            {selectedCoating && (
                              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="space-y-2 text-sm">
                                  <p><strong>Kuvaus:</strong> {COATING_OPTIONS[selectedCoating].description}</p>
                                  <p><strong>Maksimikoko:</strong> {COATING_OPTIONS[selectedCoating].maxSize}</p>
                                  <p><strong>Perushinta:</strong> {COATING_OPTIONS[selectedCoating].basePrice} €/m²</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {selectedCoating && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                              <label className="text-base font-semibold text-gray-900 mb-3 block">
                                Pinnoitevariantti
                              </label>
                              <select 
                                value={selectedVariant}
                                onChange={(e) => setSelectedVariant(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="">Valitse variantti...</option>
                                {COATING_OPTIONS[selectedCoating].variants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.name} ({variant.thickness})
                                  </option>
                                ))}
                              </select>
                              
                              {selectedVariant && (
                                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                                  {(() => {
                                    const variant = COATING_OPTIONS[selectedCoating].variants.find(v => v.id === selectedVariant)
                                    const finalPrice = (COATING_OPTIONS[selectedCoating].basePrice * variant.priceMultiplier).toFixed(2)
                                    return (
                                      <div className="space-y-2 text-sm">
                                        <p><strong>Valittu:</strong> {variant.name}</p>
                                        <p><strong>Paksuus:</strong> {variant.thickness}</p>
                                        <p><strong>Hinta:</strong> {finalPrice} €/m²</p>
                                      </div>
                                    )
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                              <label className="text-base font-semibold text-gray-900 mb-3 block">
                                Sarjakoko
                              </label>
                              <select 
                                value={batchSize}
                                onChange={(e) => setBatchSize(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="">Valitse...</option>
                                <option value="1-10">1-10 kpl (Prototyyppi)</option>
                                <option value="11-50">11-50 kpl (Pieni sarja) -5%</option>
                                <option value="51-200">51-200 kpl (Keskisarja) -10%</option>
                                <option value="201-1000">201-1000 kpl (Suuri sarja) -15%</option>
                                <option value="1000+">1000+ kpl (Massatuotanto) -20%</option>
                              </select>
                            </div>
                            
                            <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
                              <label className="text-base font-semibold text-gray-900 mb-3 block">
                                Kiireellisyys
                              </label>
                              <select 
                                value={urgency}
                                onChange={(e) => setUrgency(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="normaali">Normaali (7-14 päivää)</option>
                                <option value="kiireellinen">Kiireellinen (3-5 päivää) +20%</option>
                                <option value="express">Express (1-2 päivää) +50%</option>
                              </select>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                            <label className="text-base font-semibold text-gray-900 mb-4 block">
                              Esikäsittely
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <label className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border border-purple-200 hover:bg-white cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={pretreatments.includes('rasvanpoisto')}
                                  onChange={(e) => handlePretreatmentChange('rasvanpoisto', e.target.checked)}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium">Rasvanpoisto (+3 €/m²)</span>
                              </label>
                              <label className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border border-purple-200 hover:bg-white cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={pretreatments.includes('peittaus')}
                                  onChange={(e) => handlePretreatmentChange('peittaus', e.target.checked)}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium">Peittaus (hapan) (+5 €/m²)</span>
                              </label>
                              <label className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border border-purple-200 hover:bg-white cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={pretreatments.includes('hiekkapuhallus')}
                                  onChange={(e) => handlePretreatmentChange('hiekkapuhallus', e.target.checked)}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium">Hiekkapuhallus (+8 €/m²)</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hinnoittelu Tab */}
                    {activeTab === 'hinnoittelu' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                          <Calculator className="h-6 w-6 text-blue-600" />
                          <h3 className="text-2xl font-bold text-gray-900">Hinnoittelu</h3>
                        </div>
                        
                        {pricing ? (
                          <>
                            {/* Tuotetiedot */}
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
                              <h4 className="font-semibold text-gray-900 mb-4">📋 Tuotetiedot</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <label className="text-gray-600 block mb-1">Pinta-ala</label>
                                  <p className="font-semibold">{pricing.surfaceAreaCm2} cm² ({pricing.surfaceAreaM2} m²)</p>
                                </div>
                                <div>
                                  <label className="text-gray-600 block mb-1">Paino</label>
                                  <p className="font-semibold">{pricing.weight} kg</p>
                                </div>
                                <div>
                                  <label className="text-gray-600 block mb-1">Palvelu</label>
                                  <p className="font-semibold">{pricing.coating}</p>
                                  <p className="text-xs text-gray-500">{pricing.variant}</p>
                                </div>
                                <div>
                                  <label className="text-gray-600 block mb-1">Sarjakoko</label>
                                  <p className="font-semibold">{batchSize || 'Ei valittu'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Hintalaskelma */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg overflow-hidden">
                              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 text-center">
                                <h4 className="text-xl font-bold">💰 HINTALASKELMA</h4>
                              </div>
                              <div className="p-8">
                                <div className="space-y-4 font-mono text-sm">
                                  <div className="flex justify-between py-2 border-b border-green-200">
                                    <span>Asetuskustannus:</span>
                                    <span className="font-semibold">{pricing.setupCost.toFixed(2)} €</span>
                                  </div>
                                  
                                  {pricing.pretreatmentCost > 0 && (
                                    <div className="flex justify-between py-2 border-b border-green-200">
                                      <span>Esikäsittelyt:</span>
                                      <span className="font-semibold">{pricing.pretreatmentCost.toFixed(2)} €</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between py-2 border-b border-green-200">
                                    <span>{pricing.coating}:</span>
                                    <span className="font-semibold">{pricing.coatingCost.toFixed(2)} € ({pricing.coatingPricePerM2} €/m²)</span>
                                  </div>
                                  
                                  <div className="flex justify-between py-3 border-t-2 border-green-300 font-semibold">
                                    <span>Välisumma:</span>
                                    <span>{pricing.subtotal.toFixed(2)} €</span>
                                  </div>
                                  
                                  {pricing.batchDiscount > 0 && (
                                    <div className="flex justify-between py-2 text-green-700">
                                      <span>Sarjakoko-alennus (-{pricing.batchDiscountPercent}%):</span>
                                      <span className="font-semibold">-{pricing.batchDiscount.toFixed(2)} €</span>
                                    </div>
                                  )}
                                  
                                  {pricing.urgencyMultiplier !== 1 && (
                                    <div className="flex justify-between py-2 text-red-600">
                                      <span>Kiireellisyys-lisä (+{((pricing.urgencyMultiplier - 1) * 100).toFixed(0)}%):</span>
                                      <span className="font-semibold">+{((pricing.afterDiscountAndUrgency / pricing.urgencyMultiplier - pricing.afterDiscountAndUrgency) * -1).toFixed(2)} €</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between py-2 font-semibold border-b border-green-200">
                                    <span>Yhteensä (alv 0%):</span>
                                    <span>{pricing.afterDiscountAndUrgency.toFixed(2)} €</span>
                                  </div>
                                  
                                  <div className="flex justify-between py-2">
                                    <span>ALV 24%:</span>
                                    <span className="font-semibold">{pricing.vat.toFixed(2)} €</span>
                                  </div>
                                  
                                  <div className="flex justify-between py-4 border-t-4 border-green-400 text-xl font-bold bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg px-4">
                                    <span>KOKONAISHINTA:</span>
                                    <span className="text-green-700">{pricing.total.toFixed(2)} €</span>
                                  </div>
                                </div>
                                
                                <div className="mt-6 text-center text-sm text-gray-600 space-y-1">
                                  <p>📅 Toimitusaika: 7-14 päivää ({urgency})</p>
                                  <p>⏰ Voimassaolo: 30 päivää | 💳 Maksuehto: 14 päivää netto</p>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                            <div className="text-6xl mb-6">💰</div>
                            <h4 className="text-xl font-semibold text-gray-900 mb-3">
                              Valitse palvelu hinnoittelua varten
                            </h4>
                            <p className="text-gray-600">
                              Siirry "Palvelu"-välilehdelle valitaksesi pinnoitteen ja nähdäksesi hinnoittelun
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-4">
                  <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-all duration-200 shadow-sm">
                    <Save className="h-4 w-4" />
                    Tallenna luonnos
                  </button>
                  <button 
                    onClick={generateQuote}
                    disabled={!pricing}
                    className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 shadow-lg ${
                      pricing 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-green-200' 
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                  >
                    <FileDown className="h-4 w-4" />
                    Luo virallinen tarjous
                  </button>
                </div>

                {/* Huomiot */}
                {data?.huomiot && data.huomiot.length > 0 && (
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-300 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-yellow-800 mb-3">⚠️ Huomiot</h4>
                        <ul className="space-y-2">
                          {data.huomiot.map((huomio, idx) => (
                            <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                              <span className="text-yellow-600 mt-1">•</span>
                              <span>{huomio}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-16 text-center">
                <div className="text-8xl mb-8"></div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Ei analyysituloksia
                </h3>
                <p className="text-xl text-gray-600">
                  Lataa ja analysoi piirustus nähdäksesi tulokset
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Surface Area Input Modal */}
      {showManualInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
              <h3 className="text-lg font-semibold">Syötä pinta-ala manuaalisesti</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="manualArea" className="block text-base font-medium text-gray-900 mb-2">
                    Pinta-ala (cm²)
                  </label>
                  <input
                    id="manualArea"
                    type="number"
                    value={manualSurfaceArea}
                    onChange={(e) => setManualSurfaceArea(e.target.value)}
                    placeholder="Esim. 156.5"
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowManualInput(false)
                    setManualSurfaceArea('')
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Peruuta
                </button>
                <button 
                  onClick={handleManualSurfaceArea}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-200"
                >
                  Tallenna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}