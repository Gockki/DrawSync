// src/components/UploadAndJsonView.jsx

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { 
  COATING_OPTIONS, 
  getBatchDiscount, 
  getUrgencyMultiplier, 
  calculatePretreatmentCost,
  ADDITIONAL_COSTS,
  getDeliveryTime 
} from '../utils/coatingOptions'
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
import ActionButtons from './ActionButtons'
import StatusBadge from './StatusBadge'
import FakeProgressOverlay from "./FakeProgressOverlay";
import { Upload, FileText, Eye, Package, Calculator, Ruler, TrendingUp, Palette } from 'lucide-react'
import { sendQuoteEmail } from "../utils/sendQuote";
import { buildQuoteHtml } from "../utils/buildQuoteHtml";
import aiEmpty from '../assets/ai-empty.svg'
import { useOrganization } from "../contexts/OrganizationContext"
import { db } from "../services/database"



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
  const [fakeDone, setFakeDone] = useState(false);
  const [overlayRunId, setOverlayRunId] = useState(0);

  // Service selections
  const [selectedCoating, setSelectedCoating] = useState('')
  const [selectedVariant, setSelectedVariant] = useState('')
  const [batchSize, setBatchSize] = useState('')
  const [urgency, setUrgency] = useState('normaali')
  const [pretreatments, setPretreatments] = useState([])
  const [pricing, setPricing] = useState(null)
  const { organization, user } = useOrganization()

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
  if (!organization || !user) return
  
  try {
    // Hae kaikki käyttäjän projektit ja etsi oikea ID
    const projects = await db.getDrawings(organization.id, user.id)
    const project = projects.find(p => p.id === projectId)
    
    if (project) {
      setData(project.gpt_analysis)
      setEditedData(project.gpt_analysis?.perustiedot || {})
      setPreviewUrl(project.image_url)
      setSavedDrawingId(project.id)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    }
  } catch (error) {
    console.error('Load project error:', error)
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
        const setupCost = ADDITIONAL_COSTS.setupCost
        const pretreatCost = calculatePretreatmentCost(pretreatments, m2)
        const coatPrice = coating.basePrice * variant.priceMultiplier
        const coatCost = m2 * coatPrice
        const subtotal = setupCost + pretreatCost + coatCost
        const discount = subtotal * getBatchDiscount(batchSize)
        const afterDisc = subtotal - discount
        const urgentMult = getUrgencyMultiplier(urgency)
        const afterUrgency = afterDisc * urgentMult
        const vat = afterUrgency * ADDITIONAL_COSTS.vatRate
        
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
          pretreatments: [...pretreatments],
          deliveryTime: getDeliveryTime(selectedCoating, urgency, batchSize)
        })
      }
    } else {
      setPricing(null)
    }
  }, [data, editedData, selectedCoating, selectedVariant, batchSize, urgency, pretreatments])

  // Handlers
  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile, URL.createObjectURL(droppedFile))
    }
  }

  const handleFileSelect = (f, url) => {
    setFile(f)
    setPreviewUrl(url)
  }

  const handleUpload = async () => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)

    setOverlayRunId((n) => n + 1); 
    setLoading(true)
    setFakeDone(false)

    const start = performance.now()
    try {
      await new Promise(requestAnimationFrame);
      const res = await fetch('http://localhost:8000/process', { 
        method: 'POST', 
        body: form 
      })
      const json = await res.json()
      
      if (json.success) {
        setData(json)
        setEditedData(json.perustiedot || {})
        setSuccess(true)
        setTimeout(() => setSuccess(false), 4000)
      } else {
        throw new Error(json.error || 'Analyysi epäonnistui')
      }
    } catch (err) {
      console.error(err)
      alert(`Virhe analysoinnissa: ${err.message}`)
      setFakeDone(true);
    } finally {
      // ÄLÄ sulje overlaytä tässä – anna sen mennä 100% ja kutsua onFinish
      const MIN_MS = 3000
      const elapsed = performance.now() - start
      const waitLeft = Math.max(0, MIN_MS - elapsed)
      setTimeout(() => setFakeDone(true), waitLeft)
    }
  }

  // Jos data valmistuu nopeasti mutta fakeDone ei ole ehtinyt päivittyä, pakota valmistuminen
  useEffect(() => {
    if (loading && data && !fakeDone) setFakeDone(true)
  }, [data, loading, fakeDone])

  const handleFieldEdit = (field, val) =>
    setEditedData(prev => ({ ...prev, [field]: val }))

  const handleManualSurfaceArea = () => {
    if (!isNaN(manualSurfaceArea) && manualSurfaceArea) {
      setData(prev => ({
        ...prev,
        pinta_ala_analyysi: {
          ...prev?.pinta_ala_analyysi,
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

  const generateQuote = async () => {
  if (!pricing) {
    alert('Valitse ensin palvelu hinnoittelua varten!');
    return;
  }

  // Kysy vastaanottaja nopeasti (UI pysyy ennallaan)
  const defaultTo = import.meta.env.VITE_DEFAULT_QUOTE_TO || 'jere@mantox.fi';
  const to = window.prompt('Vastaanottajan sähköposti', defaultTo);
  if (!to) return;

  try {
    // Rakenna HTML ja lähetä
    const html = buildQuoteHtml({ pricing, data });
    const subject = `Tarjous – ${data?.perustiedot?.tuotenimi || data?.perustiedot?.tuotekoodi || 'Mantox'}`;

    const resp = await sendQuoteEmail({
      to,
      cc: [],
      subject,
      html,
      replyTo: 'jere@mantox.fi' // halutessa muuta
    });

    if (resp?.ok) {
      alert(`Tarjous lähetetty: ${resp.id}`);
    } else {
      alert('Lähetys epäonnistui (tuntematon virhe).');
    }
  } catch (e) {
    console.error(e);
    alert(`Lähetys epäonnistui: ${e.message}`);
  }
};


const handleSaveProject = async () => {
  if (!data || !file || !organization || !user) {
    alert('Ei tallennettavaa dataa!')
    return
  }
  
  setSaving(true)
  try {
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    
    const { error: upErr } = await supabase.storage
      .from('drawings')
      .upload(path, file)
    if (upErr) throw upErr
    
    const { data: urlData } = supabase.storage
      .from('drawings')
      .getPublicUrl(path)
    
    const drawingData = {
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
    
    const saved = await db.saveDrawing(organization.id, user.id, drawingData)
    
    setSavedDrawingId(saved.id)
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
    { 
      id: 'perustiedot', 
      name: 'Perustiedot', 
      icon: Package,
      enabled: !!data 
    },
    { 
      id: 'mitat', 
      name: 'Mitat', 
      icon: Ruler,
      enabled: !!data?.mitat 
    },
    { 
      id: 'pinta-ala', 
      name: 'Pinta-ala', 
      icon: TrendingUp,
      enabled: !!data?.pinta_ala_analyysi 
    },
    { 
      id: 'palvelu', 
      name: 'Palvelu', 
      icon: Palette,
      enabled: !!data 
    },
    { 
      id: 'hinnoittelu', 
      name: 'Hinnoittelu', 
      icon: Calculator,
      enabled: !!pricing 
    },
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
            onFileSelect={handleFileSelect}
            onAnalyze={handleUpload} 
          />
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {data ? (
            <>
              <StatusOverview 
                success={data.success !== false}
                filename={file?.name || 'Tuntematon'}
                hasMeasurement={!!data.mitat}
                pricing={pricing} 
              />

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
                <MitatPanel mitat={data.mitat} />
              }
              {activeTab === 'pinta-ala' &&
                <PintaAlaPanel
                  pintaAla={data.pinta_ala_analyysi}
                  pricing={pricing}
                  onManualClick={() => setShowManualInput(true)}
                />
              }
              {activeTab === 'palvelu' &&
                <PalveluPanel
                  COATING_OPTIONS={COATING_OPTIONS}
                  selectedCoating={selectedCoating}
                  onSelectCoating={setSelectedCoating}
                  selectedVariant={selectedVariant}
                  onSelectVariant={setSelectedVariant}
                  batchSize={batchSize}
                  onSelectBatchSize={setBatchSize}
                  urgency={urgency}
                  onSelectUrgency={setUrgency}
                  pretreatments={pretreatments}
                  onPretreatmentChange={handlePretreatmentChange}
                />
              }
              {activeTab === 'hinnoittelu' &&
                <Hinnoittelupanel
                  pricing={pricing}
                  urgency={urgency}
                />
              }

              <NotesPanel notes={data.huomiot || data.notes} />

              <ActionButtons
                onSaveProject={handleSaveProject}
                onGenerateQuote={generateQuote}
                disabledSave={!data || !file || saving}
                disabledQuote={!pricing}
                saving={saving}
                saveSuccess={saveSuccess}
                pricing={pricing}
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
                  visible={showManualInput}
                  manualArea={manualSurfaceArea}
                  onChange={setManualSurfaceArea}
                  onSave={handleManualSurfaceArea}
                  onClose={() => setShowManualInput(false)}
                />
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-16 text-center">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
  <img
    src={aiEmpty}
    alt="AI-analyysi"
    className="h-12 w-12 object-contain select-none"
    draggable="false"
  />
</div>

              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Ei analyysituloksia
              </h3>
              <p className="text-xl text-gray-600 mb-8">
                Lataa ja analysoi piirustus nähdäksesi tulokset
              </p>
              <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>PDF, PNG, JPG</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>GPT-5</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span>Automaattinen hinnoittelu</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay siirretty gridin ulkopuolelle */}
      <FakeProgressOverlay
        key={overlayRunId}
        open={loading}
        complete={fakeDone}
        onFinish={() => { setLoading(false); setFakeDone(false); }}
        gif="/loaders/analysis.gif"
        message="Analysoidaan piirustusta…"
        minMs={3000}
        finishDuration={600}
      />
    </div>
  )
}
