// src/components/UploadAndJsonView.jsx

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import NavigationHeader from './NavigationHeader'
import ProjectsShortcut from './ProjectsShortcut'
import UploadSection from './UploadSection'
import ImagePreview from './ImagePreview'
import StatusOverview from './StatusOverview'
import TabNavigation from './TabNavigation'
import PerustiedotPanel from './PerustiedotPanel'
import MitatPanel from './MitatPanel'
import PintaAlaPanel from './PintaAlaPanel'
import PalveluPanel from './PalveluPanel'
import Hinnoittelupanel from './Hinnoittelupanel'
import NotesPanel from './NotesPanel'
import ManualSurfaceAreaModel from './ManualSurfaceAreaModel'
import ActionButtons from './ActionButtoms'
import StatusBadge from './StatusBadge'

// --- pinnoitevaihtoehdot, getBatchDiscount, getUrgencyMultiplier, calculatePretreatmentCost ---
// (Copy exactly what you already have in your big file here)

export default function UploadAndJsonView() {
  const navigate = useNavigate()

  // Core states
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [data, setData] = useState(null)
  const [editedData, setEditedData] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedDrawingId, setSavedDrawingId] = useState(null)
  const [activeTab, setActiveTab] = useState('perustiedot')
  const [manualSurfaceArea, setManualSurfaceArea] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  // Service selections
  const [selectedCoating, setSelectedCoating] = useState('')
  const [selectedVariant, setSelectedVariant] = useState('')
  const [batchSize, setBatchSize] = useState('')
  const [urgency, setUrgency] = useState('normaali')
  const [pretreatments, setPretreatments] = useState([])
  const [pricing, setPricing] = useState(null)

  // AUTH + load project
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/')
    })
    const pid = sessionStorage.getItem('loadProjectId')
    if (pid) {
      loadProject(pid)
      sessionStorage.removeItem('loadProjectId')
    }
  }, [navigate])

  const loadProject = async (projectId) => {
    const { data: project, error } = await supabase
      .from('drawings')
      .select('*')
      .eq('id', projectId)
      .single()
    if (!error && project) {
      setData(project.gpt_analysis)
      setEditedData(project.gpt_analysis?.perustiedot || {})
      setPreviewUrl(project.image_url)
      setSavedDrawingId(project.id)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    }
  }

  // Pricing effect
  useEffect(() => {
    if (data?.pinta_ala_analyysi?.pinta_ala_cm2 && selectedCoating && selectedVariant) {
      const cm2 = data.pinta_ala_analyysi.pinta_ala_cm2
      const m2 = cm2 / 10000
      const weight = editedData.paino_kg || data.perustiedot?.paino_kg || 0
      const coating = COATING_OPTIONS[selectedCoating]
      const variant = coating.variants.find(v => v.id === selectedVariant)

      if (coating && variant) {
        const setupCost = 50
        const pretreatCost = calculatePretreatmentCost(pretreatments, m2)
        const coatPrice = coating.basePrice * variant.priceMultiplier
        const coatCost = m2 * coatPrice
        const subtotal = setupCost + pretreatCost + coatCost
        const discount = subtotal * getBatchDiscount(batchSize)
        const afterDisc = subtotal - discount
        const urgentMult = getUrgencyMultiplier(urgency)
        const afterUrgency = afterDisc * urgentMult
        const vat = afterUrgency * 0.24
        setPricing({
          surfaceAreaCm2: cm2,
          surfaceAreaM2: parseFloat(m2.toFixed(4)),
          weight,
          coating: coating.name,
          variant: variant.name,
          coatingPricePerM2: parseFloat(coatPrice.toFixed(2)),
          setupCost,
          pretreatmentCost: parseFloat(pretreatCost.toFixed(2)),
          coatingCost: parseFloat(coatCost.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          batchDiscount: parseFloat(discount.toFixed(2)),
          batchDiscountPercent: getBatchDiscount(batchSize) * 100,
          urgencyMultiplier: urgentMult,
          afterDiscountAndUrgency: parseFloat(afterUrgency.toFixed(2)),
          vat: parseFloat(vat.toFixed(2)),
          total: parseFloat((afterUrgency + vat).toFixed(2)),
          pretreatments: [...pretreatments]
        })
      }
    } else {
      setPricing(null)
    }
  }, [data, editedData, selectedCoating, selectedVariant, batchSize, urgency, pretreatments])

  // Handlers
  const handleFileSelect = (f) => {
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/process', { method: 'POST', body: form, })
      const json = await res.json()
      setData(json)
      setEditedData(json.perustiedot || {})
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldEdit = (field, val) =>
    setEditedData(prev => ({ ...prev, [field]: val }))

  const handleManualSurfaceArea = () => {
    if (!isNaN(manualSurfaceArea) && manualSurfaceArea) {
      setData(prev => ({
        ...prev,
        pinta_ala_analyysi: {
          ...prev.pinta_ala_analyysi,
          pinta_ala_cm2: parseFloat(manualSurfaceArea),
          laskelma: 'Manuaalisesti syötetty',
          varmuus: 'manuaalinen'
        }
      }))
      setShowManualInput(false)
      setManualSurfaceArea('')
    }
  }

  const handlePretreatmentChange = (t, checked) => {
    setPretreatments(prev => checked
      ? [...prev, t]
      : prev.filter(x => x !== t))
  }

  const generateQuote = () => {
    if (!pricing) return alert('Valitse ensin palvelu hinnoittelua varten!')
    const num = `FIN-${Date.now().toString().slice(-6)}`
    alert(`Tarjous ${num} luotu! Kokonaishinta: ${pricing.total.toFixed(2)} €`)
  }

  const handleSaveProject = async () => {
    if (!data || !file) return alert('Ei tallennettavaa dataa!')
    setSaving(true)
    try {
      const { data: { user }, error: uErr } = await supabase.auth.getUser()
      if (uErr || !user) throw new Error('Kirjaudu uudelleen')
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('drawings').upload(path, file)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('drawings').getPublicUrl(path)
      const drawingData = {
        user_id: user.id,
        filename: file.name,
        image_url: urlData.publicUrl,
        product_code: editedData.tuotekoodi || data.perustiedot?.tuotekoodi || null,
        product_name: editedData.tuotenimi || data.perustiedot?.tuotenimi || null,
        material: editedData.materiaali || data.perustiedot?.materiaali || null,
        weight_kg: parseFloat(editedData.paino_kg || data.perustiedot?.paino_kg) || null,
        surface_area_cm2: data.pinta_ala_analyysi?.pinta_ala_cm2 || null,
        ocr_data: data.processing_info || {},
        gpt_analysis: data
      }
      const { data: saved, error: dbErr } = await supabase
        .from('drawings')
        .insert(drawingData)
        .select()
      if (dbErr) throw dbErr
      setSavedDrawingId(saved[0].id)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err) {
      console.error(err)
      alert(`Tallennus epäonnistui: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Tab definitions
  const tabs = [
    { id: 'perustiedot', name: 'Perustiedot' },
    { id: 'mitat', name: 'Mitat' },
    { id: 'pinta-ala', name: 'Pinta-ala' },
    { id: 'palvelu', name: 'Palvelu' },
    { id: 'hinnoittelu', name: 'Hinnoittelu' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <NavigationHeader />
      <ProjectsShortcut />

      {/* Containers */}
      <div className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">

        {/* Left: Upload + Preview */}
        <div className="space-y-6">
          <UploadSection
          file={file}
          previewUrl={previewUrl}
          loading={loading}
          onDrop={handleDrop}
          onFileSelect={(f, url) => {
            setFile(f)
            setPreviewUrl(url)
        }}
        onAnalyze={handleUpload} 
        />
      </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {data ? (
            <>
              <StatusOverview data={data} pricing={pricing} />

              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
              />

              {/* Panels */}
              {activeTab === 'perustiedot' &&
                <PerustiedotPanel
                  data={data}
                  editedData={editedData}
                  onFieldSave={handleFieldEdit}
                />
              }
              {activeTab === 'mitat' &&
                <MitatPanel data={data} />
              }
              {activeTab === 'pinta-ala' &&
                <PintaAlaPanel
                  data={data}
                  onManualTrigger={() => setShowManualInput(true)}
                />
              }
              {activeTab === 'palvelu' &&
                <PalveluPanel
                  data={data}
                  coatings={COATING_OPTIONS}
                  selectedCoating={selectedCoating}
                  onSelectCoating={setSelectedCoating}
                  selectedVariant={selectedVariant}
                  onSelectVariant={setSelectedVariant}
                  batchSize={batchSize}
                  onSelectBatch={setBatchSize}
                  urgency={urgency}
                  onSelectUrgency={setUrgency}
                  pretreatments={pretreatments}
                  onPretreatmentChange={handlePretreatmentChange}
                />
              }
              {activeTab === 'hinnoittelu' &&
                <Hinnoittelupanel
                  pricing={pricing}
                  generateQuote={generateQuote}
                />
              }

              <NotesPanel data={data} />

              <ActionButtons
                onSave={handleSaveProject}
                saving={saving}
                savedDrawingId={savedDrawingId}
                onCreateQuote={generateQuote}
                quoteEnabled={!!pricing}
              />

              {saveSuccess && (
                <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-2">
                  <StatusBadge type="success" text="Projekti tallennettu!" />
                </div>
              )}
              {success && (
                <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-2">
                  <StatusBadge type="success" text={savedDrawingId ? 'Projekti ladattu!' : 'Analyysi valmis!'} />
                </div>
              )}

              {showManualInput && (
                <ManualSurfaceAreaModel
                  manualValue={manualSurfaceArea}
                  onChange={setManualSurfaceArea}
                  onSave={handleManualSurfaceArea}
                  onCancel={() => setShowManualInput(false)}
                />
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-16 text-center">
              <div className="text-8xl mb-8">📊</div>
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
  )
}
