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
import { getIndustryConfig } from '../utils/aiPrompts'
import NavigationHeader from './NavigationHeader'
import ProjectsShortcut from './ProjectsShortcut'
import UploadSection from './UploadSection'
import ImagePreview from './ImagePreview'
import StatusOverview from './StatusOverview'
import TabNavigation from './TabNavigation'
import { apiClient } from "../utils/apiClient"

// ✅ COATING KOMPONENTIT (säilyvät muuttumattomina)
import PerustiedotPanel from './PerustiedotPanel'
import MitatPanel from './MitatPanel'
import PintaAlaPanel from './PintaAlaPanel'
import PalveluPanel from './PalveluPanel'
import Hinnoittelupanel from './Hinnoittelupanel'

// ✅ STEEL KOMPONENTIT (uudet lisäykset)
import SteelPerustiedotPanel from './SteelPerustiedotPanel'
import SteelMaterialListPanel from './SteelMaterialListPanel'
import SteelSummaryPanel from './SteelSummaryPanel'
import SimpleMaterialDetectionPanel from './SimpleMaterialDetectionPanel'

// ✅ YHTEISET KOMPONENTIT
import NotesPanel from './NotesPanel'
import ManualSurfaceAreaModel from './ManualSurfaceAreaModel'
import ActionButtons from './ActionButtons'
import StatusBadge from './StatusBadge'
import FakeProgressOverlay from "./FakeProgressOverlay"

import { Upload, FileText, Eye, Package, Calculator, Ruler, TrendingUp, Palette, AlertTriangle } from 'lucide-react'
import { sendQuoteEmail } from "../utils/sendQuote"
import { buildQuoteHtml } from "../utils/buildQuoteHtml"
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
  const [fakeDone, setFakeDone] = useState(false)
  const [fileType, setFileType] = useState(null)

  // Service selections (coating-spesifiset)
  const [selectedCoating, setSelectedCoating] = useState('')
  const [selectedVariant, setSelectedVariant] = useState('')
  const [batchSize, setBatchSize] = useState('')
  const [urgency, setUrgency] = useState('normaali')
  const [pretreatments, setPretreatments] = useState([])
  const [pricing, setPricing] = useState(null)
  const { organization, user } = useOrganization()

  // ✅ Get industry configuration
  const industryConfig = organization ? 
    getIndustryConfig(organization.industry_type) : 
    getIndustryConfig('coating')

  // Helper function to convert organization industry to canonical format
  const toCanonicalIndustry = (orgType) => {
    const mapping = {
      'coating': 'coating',
      'steel': 'steel', 
      'machining': 'machining',
      'pinnoitus': 'coating',
      'teräs': 'steel',
      'koneistus': 'machining'
    }
    return mapping[orgType] || 'coating'
  }

  // Load project from session storage
  useEffect(() => {
    const projectId = sessionStorage.getItem('loadProjectId')
    if (projectId) {
      sessionStorage.removeItem('loadProjectId')
      loadProject(projectId)
    }
  }, [])

  const loadProject = async (projectId) => {
    try {
      setLoading(true)
      const { data: project, error } = await supabase
        .from('drawings')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error

      // Simuloi tiedoston lataus
      if (project.image_url) {
        setPreviewUrl(project.image_url)
        setFile({ name: project.filename, fromDatabase: true })
      }

      // Lataa GPT-analyysi
      if (project.gpt_analysis) {
        setData(project.gpt_analysis)
        setEditedData(project.gpt_analysis.perustiedot || {})
        setSavedDrawingId(projectId)
      }
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      console.error('Project load failed:', err)
      alert(`Projektin lataus epäonnistui: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }



useEffect(() => {
  if (selectedCoating && selectedVariant && data?.pinta_ala_analyysi?.pinta_ala_cm2 && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining') {
    const coating = COATING_OPTIONS[selectedCoating]  //Korjattu objekti-käyttö
    
    if (!coating) {
      setPricing(null)
      return
    }
    
    const variant = coating.variants?.find(v => v.id === selectedVariant)
    
    if (coating && variant) {
      const surfaceAreaCm2 = data.pinta_ala_analyysi.pinta_ala_cm2
      const surfaceAreaM2 = surfaceAreaCm2 / 10000
      
      const basePrice = coating.basePrice * variant.priceMultiplier
      const coatingCost = surfaceAreaM2 * basePrice
      
      const batchDiscount = getBatchDiscount(batchSize)
      const urgencyMultiplier = getUrgencyMultiplier(urgency)
      const pretreatmentCost = calculatePretreatmentCost(pretreatments, surfaceAreaM2)
      
      const setupCost = ADDITIONAL_COSTS?.setupCost || 50.00
      
      const subtotal = setupCost + coatingCost + pretreatmentCost
      const batchDiscountAmount = subtotal * batchDiscount
      const afterDiscount = subtotal - batchDiscountAmount
      const urgencyAmount = afterDiscount * (urgencyMultiplier - 1)
      const afterDiscountAndUrgency = afterDiscount + urgencyAmount
      
      const vat = afterDiscountAndUrgency * 0.24
      const total = afterDiscountAndUrgency + vat

      setPricing({
        coating: coating.name,
        variant: variant.name,
        surfaceAreaCm2: surfaceAreaCm2,
        surfaceAreaM2: surfaceAreaM2,
        weight: data?.perustiedot?.paino_kg || 0,
        basePrice: basePrice,
        coatingCost: coatingCost,
        coatingPricePerM2: basePrice,
        setupCost: setupCost,
        pretreatmentCost: pretreatmentCost,
        batchDiscount: batchDiscountAmount,
        batchDiscountPercent: Math.round(batchDiscount * 100),
        urgencyMultiplier: urgencyMultiplier,
        urgencyAmount: urgencyAmount,
        subtotal: subtotal,
        afterDiscountAndUrgency: afterDiscountAndUrgency,
        vat: vat,
        total: total,
        deliveryTime: getDeliveryTime(selectedCoating, urgency, batchSize)
      })
    }
  } else {
    setPricing(null)
  }
}, [selectedCoating, selectedVariant, batchSize, urgency, pretreatments, data, organization])

  const handleDrop = (e) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      setFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleFileSelect = (selectedFile, url) => {
  setFile(selectedFile) // KORJATTU: oli selectedFilefile
  setPreviewUrl(url)

  const detectedFileType = selectedFile.type.startsWith('image/') ? 'image' : 
                          selectedFile.type === 'application/pdf' ? 'pdf' : 'unknown'
  setFileType(detectedFileType)
}

  

const handleUpload = async () => {
  if (!file || !organization) return

  const form = new FormData()
  form.append('file', file)
  form.append('industry_type', toCanonicalIndustry(organization?.industry_type))

  setLoading(true)
  setFakeDone(false)

  const start = performance.now()
  try {
    await new Promise(requestAnimationFrame)
    
    // ✅ KÄYTÄ KORJATTUA API CLIENTIA
const json = await apiClient.post('/process', form)

// Siedetään eri vastausmuodot:
//  - { success: true, ... }
//  - { ok: true, result: {...} }
//  - { ...payload... } (suora payload)
const payload = (json && typeof json === 'object')
  ? (json.result ?? json)
  : {}

const success =
  (json && json.success === true) ||
  (json && json.ok === true && json.result != null) ||
  (payload && Object.keys(payload).length > 0) // fallback: jos saadaan suoraan käyttökelpoinen payload

if (success) {
  setData(payload)
  setEditedData(payload.perustiedot ?? {})
  setSuccess(true)
  setTimeout(() => setSuccess(false), 4000)
} else {
  const msg = json?.error || json?.detail || 'Analyysi epäonnistui'
  throw new Error(msg)
}

  } catch (err) {
    console.error('Upload error:', err)
    
    // ✅ PAREMPI VIRHEENKÄSITTELY JWT:lle
    if (err.message.includes('Not authenticated')) {
      alert('Kirjautumisesi on vanhentunut. Kirjaudu uudelleen.')
      // Ohjaa login sivulle
      navigate('/login')
    } else if (err.message.includes('Access denied')) {
      alert('Ei käyttöoikeutta organisaatioon')
    } else if (err.message.includes('401')) {
      alert('Autentikointi epäonnistui. Kirjaudu uudelleen.')
      navigate('/login')
    } else {
      alert(`Virhe analysoinnissa: ${err.message}`)
    }
    
    setFakeDone(true)
  } finally {
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

const generateQuote = async (recipientEmail, emailSubject, emailMessage) => {
  if (!pricing) {
    throw new Error('Valitse ensin palvelu hinnoittelua varten!')
  }

  // Tarkista että sähköposti on annettu
  if (!recipientEmail || !recipientEmail.trim()) {
    throw new Error('Sähköpostiosoite on pakollinen')
  }

  try {
    // Rakenna HTML viesti
    const html = buildQuoteHtml({ pricing, data })
    
    // Käytä vain annettua sähköpostia - EI fallbackia
    const to = recipientEmail.trim()
    const subject = emailSubject || `Tarjous – ${data?.perustiedot?.tuotenimi || data?.perustiedot?.tuotekoodi || 'Mantox'}`
    
    // Combine custom message with HTML quote
    let finalHtml = html
    if (emailMessage) {
      finalHtml = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#111;white-space:pre-line;margin-bottom:24px;">${emailMessage}</div>${html}`
    }

    const resp = await sendQuoteEmail({
      to,
      cc: [],
      subject,
      html: finalHtml,
      replyTo: 'noreply@wisuron.fi'  // Käytä wisuron.fi osoitetta
    })

    if (resp?.ok) {
      alert(`Tarjous lähetetty: ${resp.id}`)
    } else {
      throw new Error('Lähetys epäonnistui (tuntematon virhe).')
    }
  } catch (err) {
    console.error('Quote generation error:', err)
    throw err
  }
}

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
      
      // ✅ INDUSTRY-SPESIFINEN TALLENNUS
      let drawingData
      
if (organization.industry_type === 'steel') {
  drawingData = {
    filename: file.name,
    image_url: urlData.publicUrl,
    product_code: editedData.projekti_numero || data.perustiedot?.projekti_numero || null,
    product_name: editedData.rakenteen_nimi || data.perustiedot?.rakenteen_nimi || null,
    material: editedData.materiaaliluokka || data.perustiedot?.materiaaliluokka || null,
    
    // KORJAUS: Steel ei käytä painoja - aseta null
    weight_kg: null,
    
    // KORJAUS: Steel ei käytä pinta-alaa - aseta null  
    surface_area_cm2: null,
    
    // Säilytetään olemassa olevat sarakkeet
    ocr_data: data.processing_info || {},
    gpt_analysis: data // Tämä sisältää kaiken steel-spesifisen datan
  }
} else {
  // Coating-tallennus säilyy täsmälleen samana
  drawingData = {
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

  //  Dynamic tab definitions based on industry
  const tabs = industryConfig.tabs.map(tab => ({
    ...tab,
    icon: getTabIcon(tab.id),
    enabled: getTabEnabled(tab.id)
  }))

  // Helper function to get tab icons
  function getTabIcon(tabId) {
    const icons = {
      perustiedot: Package,
      mitat: Ruler,
      'pinta-ala': TrendingUp,
      palvelu: Palette,
      hinnoittelu: Calculator,
      materiaalilista: FileText,
      tarkistettavaa: AlertTriangle,
      ostolista: Eye,
      toleranssit: Ruler,
      operaatiot: Package
    }
    return icons[tabId] || Package
  }

  //  KORJATTU: Helper function to check if tab is enabled
  function getTabEnabled(tabId) {
    switch (tabId) {
      case 'perustiedot':
        return !!data
      
      //  COATING-TABIT: Toimivat kun EI ole steel/machining
      case 'mitat':
        return !!data?.mitat && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining'
      case 'pinta-ala':
        return !!data?.pinta_ala_analyysi && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining'
      case 'palvelu':
        return !!data && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining'
      case 'hinnoittelu':
        return !!pricing && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining'
      
      //  STEEL-TABIT: Vain steel-organisaatioissa  
      case 'materiaalilista':
        return !!data?.materiaalilista && organization?.industry_type === 'steel'
      case 'tarkistettavaa':
        return !!data?.materiaalilista && organization?.industry_type === 'steel'
      case 'ostolista':
        return !!data?.materiaalilista && organization?.industry_type === 'steel'
      
      //  MACHINING-TABIT
      case 'toleranssit':
        return !!data?.toleranssit && organization?.industry_type === 'machining'
      case 'operaatiot':
        return !!data?.koneistusoperaatiot && organization?.industry_type === 'machining'
      
      default:
        return false
    }
  }

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
            fileType={fileType}
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

              {/*  KORJATTU: INDUSTRY-SPESIFISET PANEELIT */}
              
              {/* PERUSTIEDOT - Industry-spesifinen */}
              {activeTab === 'perustiedot' && (
                organization?.industry_type === 'steel' ? (
                  <SteelPerustiedotPanel
                    data={data}
                    editedData={editedData}
                    onFieldSave={handleFieldEdit}
                  />
                ) : (
                  <PerustiedotPanel
                    data={data}
                    editedData={editedData}
                    onFieldSave={handleFieldEdit}
                  />
                )
              )}

              {/*  COATING-TABIT - Korjattu: Renderöidään kun EI ole steel/machining */}
              {activeTab === 'mitat' && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining' && (
                <MitatPanel mitat={data.mitat} />
              )}

              {activeTab === 'pinta-ala' && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining' && (
                <PintaAlaPanel
                  pintaAla={data.pinta_ala_analyysi}
                  pricing={pricing}
                  onManualClick={() => setShowManualInput(true)}
                />
              )}

              {activeTab === 'palvelu' && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining' && (
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
              )}

              {activeTab === 'hinnoittelu' && organization?.industry_type !== 'steel' && organization?.industry_type !== 'machining' && (
                <Hinnoittelupanel
                  pricing={pricing}
                  urgency={urgency}
                />
              )}

              {/*  STEEL-TABIT - Vain steel-organisaatioissa */}
              {activeTab === 'materiaalilista' && organization?.industry_type === 'steel' && (
                <SteelMaterialListPanel
                  data={data}
                  editedData={editedData}
                  onFieldSave={handleFieldEdit}
                />
              )}

              {activeTab === 'tarkistettavaa' && organization?.industry_type === 'steel' && (
                <SimpleMaterialDetectionPanel
                  data={data}
                  editedData={editedData}
                  onFieldSave={handleFieldEdit}
                />
              )}

              {activeTab === 'ostolista' && organization?.industry_type === 'steel' && (
                <SteelSummaryPanel
                  data={data}
                  materiaalilista={data?.materiaalilista}
                  yhteenveto={data?.yhteenveto}
                  liitokset={data?.liitokset}
                />
              )}

              {/*  MACHINING-TABIT - Tulevaisuudessa */}
              {activeTab === 'toleranssit' && organization?.industry_type === 'machining' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Toleranssi-analyysi</h3>
                  <p className="text-gray-500">Tulossa pian...</p>
                </div>
              )}

              {activeTab === 'operaatiot' && organization?.industry_type === 'machining' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Operaatio-analyysi</h3>
                  <p className="text-gray-500">Tulossa pian...</p>
                </div>
              )}

              {/* YHTEISET KOMPONENTIT */}
              <NotesPanel notes={data.huomiot || data.notes} />

              <ActionButtons
                onSaveProject={handleSaveProject}
                onGenerateQuote={generateQuote}
                disabledSave={!data || !file || saving}
                disabledQuote={!pricing}
                saving={saving}
                saveSuccess={saveSuccess}
                pricing={pricing}
                analysisData={data}
                organization={organization}
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
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
              <img src={aiEmpty} alt="AI Analysis" className="w-24 h-24 mx-auto mb-6 opacity-50" />
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                {organization?.industry_type === 'steel' ? 'Teräsrakenne-analyysi' : 
                organization?.industry_type === 'machining' ? 'Koneistusanalyysi' :
                'Pinnoitusanalyysi'}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {organization?.industry_type === 'steel' ? 
                  'Lataa teräsrakennepiirustus analysoidaksesi materiaalilistan ja laskettava ostotarpeita.' :
                organization?.industry_type === 'machining' ?
                  'Lataa koneistuspiirustus analysoidaksesi toleranssit ja työoperaatiot.' :
                  'Lataa pinnoitettavan tuotteen piirustus saadaksesi tarkan pinta-ala-analyysin ja hintatarjouksen.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Overlay */}
      {(loading || !fakeDone) && (
        <FakeProgressOverlay
          open={loading}
          complete={!!data}
          onFinish={() => setLoading(false)}
          message={organization?.industry_type === 'steel' ? 
            'Analysoidaan teräsrakennetta...' :
            organization?.industry_type === 'machining' ?
            'Analysoidaan koneistuspiirustusta...' :
            'Analysoidaan pinnoituspiirustusta...'}
        />
      )}

      {/* Manual Surface Area Modal */}
      {showManualInput && (
        <ManualSurfaceAreaModel
          value={manualSurfaceArea}
          onChange={setManualSurfaceArea}
          onSave={handleManualSurfaceArea}
          onCancel={() => setShowManualInput(false)}
        />
      )}
    </div>
  )
}