import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Pinnoitevaihtoehdot asiakkaan palveluiden mukaan
const COATING_OPTIONS = {
  "sahkosinkitys": {
    name: "Sähkösinkitys",
    description: "5-25 μm sinkkikerros teräskappaleelle",
    maxSize: "500 kg | 2750 x 1100 x 600 mm",
    basePrice: 15, // €/m²
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
    basePrice: 20, // €/m²
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
    basePrice: 30, // €/m²
    variants: [
      { id: "musta", name: "Mustanikkeli (kova, kulutuskestävä)", priceMultiplier: 1.5, thickness: "5-25 μm" },
      { id: "korkea_p", name: "Korkeafosforinen nikkeli", priceMultiplier: 1.2, thickness: "5-25 μm" },
      { id: "matala_p", name: "Matalafosforinen nikkeli", priceMultiplier: 1.0, thickness: "5-25 μm" }
    ]
  },
  "kuparointi": {
    name: "Kuparointi",
    description: "Sähkönjohtava pinnoite ja aluspinnoite",
    maxSize: "Kysy erikseen",
    basePrice: 12, // €/m²
    variants: [
      { id: "alkalinen", name: "Alkalinen kupari (aluspinnoite)", priceMultiplier: 0.8, thickness: "5-15 μm" },
      { id: "hapan", name: "Hapankupari (tasoittava)", priceMultiplier: 1.2, thickness: "10-25 μm" }
    ]
  }
};

// Hinnoittelufunktiot
const getBatchDiscount = (batchSize) => {
  const discounts = {
    "1-10": 0,
    "11-50": 0.05,
    "51-200": 0.10,
    "201-1000": 0.15,
    "1000+": 0.20
  };
  return discounts[batchSize] || 0;
};

const getUrgencyMultiplier = (urgency) => {
  const multipliers = {
    "normaali": 1.0,
    "kiireellinen": 1.2,
    "express": 1.5
  };
  return multipliers[urgency] || 1.0;
};

const calculatePretreatmentCost = (pretreatments, surfaceM2) => {
  const costs = {
    "rasvanpoisto": 3, // €/m²
    "peittaus": 5, // €/m²
    "hiekkapuhallus": 8 // €/m²
  };
  
  return pretreatments.reduce((total, treatment) => {
    return total + (costs[treatment] || 0) * surfaceM2;
  }, 0);
};

// Muokattava kenttä -komponentti
const EditableField = ({ label, value, unit, onSave, editable = true }) => {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    onSave(localValue);
    setEditing(false);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid #e5e7eb'
    }}>
      <span style={{ fontSize: '14px', color: '#6b7280' }}>{label}</span>
      {editing ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            style={{
              padding: '4px 8px',
              border: '1px solid #374151',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            autoFocus
          />
          <button onClick={handleSave} style={{ cursor: 'pointer' }}>✓</button>
          <button onClick={() => setEditing(false)} style={{ cursor: 'pointer' }}>✗</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '600' }}>
            {value || 'Ei määritelty'} {unit}
          </span>
          {editable && (
            <button 
              onClick={() => setEditing(true)} 
              style={{ cursor: 'pointer', background: 'none', border: 'none' }}
            >
              ✏️
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Status-merkki komponentti
const StatusBadge = ({ type, text }) => {
  const colors = {
    success: { bg: '#d1fae5', text: '#065f46' },
    warning: { bg: '#fed7aa', text: '#92400e' },
    error: { bg: '#fee2e2', text: '#991b1b' },
    info: { bg: '#dbeafe', text: '#1e40af' }
  };

  const style = colors[type] || colors.info;

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: style.bg,
      color: style.text
    }}>
      {text}
    </span>
  );
};

export default function UploadAndJsonView() {
  const navigate = useNavigate();
  
  // Tiedosto ja analyysi
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editedData, setEditedData] = useState({});
  
  // UI state
  const [activeTab, setActiveTab] = useState('perustiedot');
  const [manualSurfaceArea, setManualSurfaceArea] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Palveluvalinnat
  const [selectedCoating, setSelectedCoating] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const [urgency, setUrgency] = useState('normaali');
  const [pretreatments, setPretreatments] = useState([]);
  
  // Hinnoittelu
  const [pricing, setPricing] = useState(null);

  // Autentikointi
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/');
    };
    checkSession();
  }, [navigate]);

  // Reaktiivinen hinnoittelu
  useEffect(() => {
    if (data?.pinta_ala_analyysi?.pinta_ala_cm2 && selectedCoating && selectedVariant) {
      const surfaceAreaCm2 = data.pinta_ala_analyysi.pinta_ala_cm2;
      const surfaceAreaM2 = surfaceAreaCm2 / 10000;
      const weight = editedData.paino_kg || data.perustiedot?.paino_kg || 0;
      
      const coating = COATING_OPTIONS[selectedCoating];
      const variant = coating.variants.find(v => v.id === selectedVariant);
      
      if (coating && variant) {
        const setupCost = 50; // Kiinteä asetuskustannus
        const pretreatmentCost = calculatePretreatmentCost(pretreatments, surfaceAreaM2);
        const coatingPricePerM2 = coating.basePrice * variant.priceMultiplier;
        const coatingCost = surfaceAreaM2 * coatingPricePerM2;
        
        const subtotal = setupCost + pretreatmentCost + coatingCost;
        const batchDiscount = subtotal * getBatchDiscount(batchSize);
        const urgencyMultiplier = getUrgencyMultiplier(urgency);
        const afterDiscountAndUrgency = (subtotal - batchDiscount) * urgencyMultiplier;
        const vat = afterDiscountAndUrgency * 0.24;
        const total = afterDiscountAndUrgency + vat;
        
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
        });
      }
    } else {
      setPricing(null);
    }
  }, [data, editedData, selectedCoating, selectedVariant, batchSize, urgency, pretreatments]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setSuccess(false);
    
    try {
      const res = await fetch("http://localhost:8000/process", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      setData(json);
      setEditedData(json.perustiedot || {});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldEdit = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
      }));
      setShowManualInput(false);
      setManualSurfaceArea('');
    }
  };

  const handlePretreatmentChange = (treatment, checked) => {
    if (checked) {
      setPretreatments(prev => [...prev, treatment]);
    } else {
      setPretreatments(prev => prev.filter(t => t !== treatment));
    }
  };

  const generateQuote = () => {
    if (!pricing) {
      alert("Valitse ensin palvelu hinnoittelua varten!");
      return;
    }

    const quoteNumber = `FIN-${Date.now().toString().slice(-6)}`;
    const quoteDate = new Date().toLocaleDateString('fi-FI');
    
    const quoteText = `
╔════════════════════════════════════════╗
║             TARJOUS                                             ║
║          Tarjous: ${quoteNumber}                               ║
║          Päivämäärä: ${quoteDate}                             ║
╚════════════════════════════════════════╝

TUOTETIEDOT:
• Tuotekoodi: ${editedData.tuotekoodi || data?.perustiedot?.tuotekoodi || 'Ei määritelty'}
• Materiaali: ${editedData.materiaali || data?.perustiedot?.materiaali || 'Ei määritelty'}
• Paino: ${pricing.weight} kg
• Pinta-ala: ${pricing.surfaceAreaCm2} cm² (${pricing.surfaceAreaM2} m²)

VALITTU PALVELU:
• ${pricing.coating} - ${pricing.variant}
• Sarjakoko: ${batchSize || 'Ei määritelty'}
• Kiireellisyys: ${urgency}
${pretreatments.length > 0 ? `• Esikäsittelyt: ${pretreatments.join(', ')}` : ''}

HINNOITTELU:
• Asetuskustannus:        ${pricing.setupCost.toFixed(2)} €
${pricing.pretreatmentCost > 0 ? `• Esikäsittelyt:         ${pricing.pretreatmentCost.toFixed(2)} €` : ''}
• ${pricing.coating}:     ${pricing.coatingCost.toFixed(2)} € (${pricing.coatingPricePerM2} €/m²)
                        ─────────
• Yhteensä:              ${pricing.subtotal.toFixed(2)} €
${pricing.batchDiscount > 0 ? `• Sarjakoko-alennus:     -${pricing.batchDiscount.toFixed(2)} € (-${pricing.batchDiscountPercent}%)` : ''}
${pricing.urgencyMultiplier !== 1 ? `• Kiireellisyys-lisä:    +${((pricing.urgencyMultiplier - 1) * 100).toFixed(0)}%` : ''}
• Yhteensä (alv 0%):     ${pricing.afterDiscountAndUrgency.toFixed(2)} €
• ALV 24%:               ${pricing.vat.toFixed(2)} €
                        ═════════
• KOKONAISHINTA:         ${pricing.total.toFixed(2)} €

TOIMITUSAIKA: 7-14 päivää (${urgency})
VOIMASSAOLO: 30 päivää
MAKSUEHTO: 14 päivää netto
    `;

    alert(quoteText);
    
    // Tallenna tarjous
    const quoteData = {
      quote: { number: quoteNumber, date: quoteDate },
      data,
      editedData,
      pricing,
      selections: { selectedCoating, selectedVariant, batchSize, urgency, pretreatments }
    };
    
    const savedQuotes = JSON.parse(localStorage.getItem('finecom_quotes') || '[]');
    savedQuotes.push(quoteData);
    localStorage.setItem('finecom_quotes', JSON.stringify(savedQuotes));
    
    console.log("Tarjous tallennettu:", quoteData);
  };

  // Määritä mitkä välilehdet ovat käytettävissä
  const hasAnalysisData = data && data.success;
  const hasSurfaceArea = data?.pinta_ala_analyysi?.pinta_ala_cm2;
  const hasServiceSelected = selectedCoating && selectedVariant;
  const canShowPricing = hasSurfaceArea && hasServiceSelected;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Logout button */}
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 100,
        }}>
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Kirjaudu ulos
          </button>
        </div>

        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>DrawSync - Pinnoitusanalyysi</h1>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>Lataa tekninen piirustus ja saa automaattinen analyysi</p>
        </div>

        {/* Success notification */}
        {success && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span>✓</span>
            Analyysi valmis!
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth >= 1024 ? '400px 1fr' : '1fr', gap: '24px' }}>
          
          {/* Left Column - Upload */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb'
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Lataa piirustus</h2>
              </div>
              
              <div style={{ padding: '20px' }}>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                  <p style={{ fontWeight: '500', marginBottom: '8px' }}>
                    Vedä tiedosto tähän
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    tai
                  </p>
                  
                  <label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const selectedFile = e.target.files[0];
                        setFile(selectedFile);
                        setPreviewUrl(URL.createObjectURL(selectedFile));
                      }}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Valitse tiedosto
                    </span>
                  </label>
                </div>

                {file && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '24px' }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '500', fontSize: '14px' }}>{file.name}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: !file || loading ? '#d1d5db' : '#10b981',
                    color: 'white',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: !file || loading ? 'not-allowed' : 'pointer',
                    border: 'none',
                    fontSize: '16px'
                  }}
                >
                  {loading ? "Analysoidaan..." : "Analysoi piirustus"}
                </button>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div style={{
                marginTop: '24px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Esikatselu</h3>
                </div>
                <div style={{ padding: '20px' }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '6px'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div>
            {hasAnalysisData ? (
              <>
                {/* Status Overview */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tila</p>
                      <StatusBadge 
                        type={data.success ? 'success' : 'error'} 
                        text={data.success ? 'Onnistui' : 'Virhe'} 
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tiedosto</p>
                      <p style={{ fontWeight: '600' }}>{data.filename}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Prosessi</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <StatusBadge type="success" text="Tunnista" />
                        {hasSurfaceArea && <StatusBadge type="success" text="Mittaa" />}
                        {hasServiceSelected && <StatusBadge type="success" text="Valittu" />}
                        {canShowPricing && <StatusBadge type="success" text="Hinnoittelu" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'flex',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb'
                  }}>
                    {[
                      { id: 'perustiedot', name: 'Perustiedot', enabled: true },
                      { id: 'mitat', name: 'Mitat', enabled: hasAnalysisData },
                      { id: 'pinta-ala', name: 'Pinta-ala', enabled: hasAnalysisData },
                      { id: 'palvelu', name: 'Palvelu', enabled: hasSurfaceArea },
                      { id: 'hinnoittelu', name: 'Hinnoittelu', enabled: canShowPricing }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => tab.enabled && setActiveTab(tab.id)}
                        disabled={!tab.enabled}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                          borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : 'none',
                          fontWeight: activeTab === tab.id ? '600' : '400',
                          cursor: tab.enabled ? 'pointer' : 'not-allowed',
                          opacity: tab.enabled ? 1 : 0.5,
                          color: tab.enabled ? 'inherit' : '#9ca3af'
                        }}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: '24px' }}>
                    {/* Perustiedot Tab */}
                    {activeTab === 'perustiedot' && data?.perustiedot && (
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                          Perustiedot
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                          <div>
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
                          <div>
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
                    )}

                    {/* Mitat Tab */}
                    {activeTab === 'mitat' && data?.mitat && (
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Mitat</h3>
                        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
                          <p style={{ fontWeight: '600', marginBottom: '8px' }}>Ulkomitat (mm)</p>
                          <div style={{ display: 'flex', gap: '24px' }}>
                            <div>
                              <span style={{ color: '#6b7280', fontSize: '14px' }}>Pituus: </span>
                              <span style={{ fontWeight: '600' }}>{data.mitat.ulkomitat_mm?.pituus || 'Ei määritelty'}</span>
                            </div>
                            <div>
                              <span style={{ color: '#6b7280', fontSize: '14px' }}>Leveys: </span>
                              <span style={{ fontWeight: '600' }}>{data.mitat.ulkomitat_mm?.leveys || 'Ei määritelty'}</span>
                            </div>
                            <div>
                              <span style={{ color: '#6b7280', fontSize: '14px' }}>Korkeus: </span>
                              <span style={{ fontWeight: '600' }}>{data.mitat.ulkomitat_mm?.korkeus || 'Ei määritelty'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {data.mitat.reiät && data.mitat.reiät.length > 0 && (
                          <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '6px' }}>
                            <p style={{ fontWeight: '600', marginBottom: '8px' }}>Reiät</p>
                            {data.mitat.reiät.map((reikä, idx) => (
                              <div key={idx}>
                                Ø{reikä.halkaisija_mm}mm × {reikä.määrä} kpl
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pinta-ala Tab */}
                    {activeTab === 'pinta-ala' && data?.pinta_ala_analyysi && (
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Pinta-ala-analyysi</h3>
                        
                        {data.pinta_ala_analyysi.pinta_ala_cm2 ? (
                          <div style={{
                            backgroundColor: '#d1fae5',
                            border: '1px solid #10b981',
                            borderRadius: '8px',
                            padding: '20px',
                            marginBottom: '16px'
                          }}>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#065f46' }}>
                              ✅ {data.pinta_ala_analyysi.pinta_ala_cm2} cm² ({(data.pinta_ala_analyysi.pinta_ala_cm2 / 10000).toFixed(4)} m²)
                            </p>
                            <p style={{ color: '#065f46', marginTop: '8px' }}>
                              {data.pinta_ala_analyysi.laskelma}
                            </p>
                            <StatusBadge 
                              type="info" 
                              text={`Varmuus: ${data.pinta_ala_analyysi.varmuus}`} 
                            />
                          </div>
                        ) : (
                          <div style={{
                            backgroundColor: '#fee2e2',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            padding: '20px',
                            marginBottom: '16px'
                          }}>
                            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#991b1b' }}>
                              ⚠️ Pinta-alaa ei voitu laskea
                            </p>
                            <p style={{ color: '#991b1b', marginTop: '8px' }}>
                              {data.pinta_ala_analyysi.laskelma}
                            </p>
                            {data.pinta_ala_analyysi.puuttuvat_tiedot?.length > 0 && (
                              <div style={{ marginTop: '12px' }}>
                                <p style={{ fontWeight: '600', color: '#991b1b' }}>Puuttuvat tiedot:</p>
                                <ul style={{ marginTop: '4px', marginLeft: '20px' }}>
                                  {data.pinta_ala_analyysi.puuttuvat_tiedot.map((tieto, idx) => (
                                    <li key={idx} style={{ color: '#991b1b' }}>{tieto}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <button 
                              onClick={() => setShowManualInput(true)}
                              style={{
                                marginTop: '16px',
                                padding: '8px 16px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              Syötä manuaalisesti
                            </button>
                          </div>
                        )}

                        {/* Manuaalinen syöttö modal */}
                        {showManualInput && (
                          <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100
                          }}>
                            <div style={{
                              backgroundColor: 'white',
                              padding: '24px',
                              borderRadius: '8px',
                              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                              maxWidth: '400px',
                              width: '100%'
                            }}>
                              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                                Syötä pinta-ala manuaalisesti
                              </h3>
                              <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                  Pinta-ala (cm²)
                                </label>
                                <input
                                  type="number"
                                  value={manualSurfaceArea}
                                  onChange={(e) => setManualSurfaceArea(e.target.value)}
                                  placeholder="Esim. 156.5"
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '16px'
                                  }}
                                  autoFocus
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => {
                                    setShowManualInput(false);
                                    setManualSurfaceArea('');
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'white',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Peruuta
                                </button>
                                <button
                                  onClick={handleManualSurfaceArea}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Tallenna
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {data.geometria_arvio && (
                          <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '6px' }}>
                            <p style={{ fontWeight: '600', marginBottom: '8px' }}>Geometria-arvio</p>
                            <p>
                              <span style={{ fontWeight: '600' }}>Luokka:</span> {data.geometria_arvio.luokka}
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                              {data.geometria_arvio.perustelu}
                            </p>
                            <p style={{ marginTop: '8px' }}>
                              <span style={{ fontWeight: '600' }}>Tyyppi:</span> {data.geometria_arvio.kappaleen_tyyppi}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Palvelu Tab */}
                    {activeTab === 'palvelu' && (
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                          Valitse palvelu
                        </h3>
                        
                        <div style={{ display: 'grid', gap: '20px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                              Pinnoitetyyppi
                            </label>
                            <select 
                              value={selectedCoating}
                              onChange={(e) => {
                                setSelectedCoating(e.target.value);
                                setSelectedVariant(''); // Reset variant when coating changes
                              }}
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '16px'
                              }}
                            >
                              <option value="">Valitse pinnoite...</option>
                              {Object.entries(COATING_OPTIONS).map(([key, coating]) => (
                                <option key={key} value={key}>{coating.name}</option>
                              ))}
                            </select>
                            
                            {selectedCoating && (
                              <div style={{ 
                                marginTop: '12px', 
                                padding: '16px', 
                                backgroundColor: '#f9fafb', 
                                borderRadius: '6px',
                                fontSize: '14px'
                              }}>
                                <p><strong>Kuvaus:</strong> {COATING_OPTIONS[selectedCoating].description}</p>
                                <p><strong>Maksimikoko:</strong> {COATING_OPTIONS[selectedCoating].maxSize}</p>
                                <p><strong>Perushinta:</strong> {COATING_OPTIONS[selectedCoating].basePrice} €/m²</p>
                              </div>
                            )}
                          </div>

                          {selectedCoating && (
                            <div>
                              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Pinnoitevariantti
                              </label>
                              <select 
                                value={selectedVariant}
                                onChange={(e) => setSelectedVariant(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '16px'
                                }}
                              >
                                <option value="">Valitse variantti...</option>
                                {COATING_OPTIONS[selectedCoating].variants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.name} ({variant.thickness})
                                  </option>
                                ))}
                              </select>
                              
                              {selectedVariant && (
                                <div style={{ 
                                  marginTop: '12px', 
                                  padding: '16px', 
                                  backgroundColor: '#dbeafe', 
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}>
                                  {(() => {
                                    const variant = COATING_OPTIONS[selectedCoating].variants.find(v => v.id === selectedVariant);
                                    const finalPrice = (COATING_OPTIONS[selectedCoating].basePrice * variant.priceMultiplier).toFixed(2);
                                    return (
                                      <>
                                        <p><strong>Valittu:</strong> {variant.name}</p>
                                        <p><strong>Paksuus:</strong> {variant.thickness}</p>
                                        <p><strong>Hinta:</strong> {finalPrice} €/m²</p>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                              Sarjakoko
                            </label>
                            <select 
                              value={batchSize}
                              onChange={(e) => setBatchSize(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '16px'
                              }}
                            >
                              <option value="">Valitse...</option>
                              <option value="1-10">1-10 kpl (Prototyyppi)</option>
                              <option value="11-50">11-50 kpl (Pieni sarja) -5%</option>
                              <option value="51-200">51-200 kpl (Keskisarja) -10%</option>
                              <option value="201-1000">201-1000 kpl (Suuri sarja) -15%</option>
                              <option value="1000+">1000+ kpl (Massatuotanto) -20%</option>
                            </select>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                              Kiireellisyys
                            </label>
                            <select 
                              value={urgency}
                              onChange={(e) => setUrgency(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '16px'
                              }}
                            >
                              <option value="normaali">Normaali (7-14 päivää)</option>
                              <option value="kiireellinen">Kiireellinen (3-5 päivää) +20%</option>
                              <option value="express">Express (1-2 päivää) +50%</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                              Esikäsittely
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={pretreatments.includes('rasvanpoisto')}
                                  onChange={(e) => handlePretreatmentChange('rasvanpoisto', e.target.checked)}
                                />
                                <span>Rasvanpoisto (+3 €/m²)</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={pretreatments.includes('peittaus')}
                                  onChange={(e) => handlePretreatmentChange('peittaus', e.target.checked)}
                                />
                                <span>Peittaus (hapan) (+5 €/m²)</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={pretreatments.includes('hiekkapuhallus')}
                                  onChange={(e) => handlePretreatmentChange('hiekkapuhallus', e.target.checked)}
                                />
                                <span>Hiekkapuhallus (+8 €/m²)</span>
                              </label>
                            </div>
                          </div>

                          {/* Live Preview */}
                          {pricing && (
                            <div style={{
                              marginTop: '20px',
                              padding: '16px',
                              backgroundColor: '#f0f9ff',
                              border: '1px solid #0ea5e9',
                              borderRadius: '8px'
                            }}>
                              <h4 style={{ margin: '0 0 12px 0', color: '#0369a1' }}>💰 Hinta-arvio</h4>
                              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                                <strong>Pinta-ala:</strong> {pricing.surfaceAreaCm2} cm² ({pricing.surfaceAreaM2} m²)
                              </p>
                              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                                <strong>Arvioitu hinta:</strong> <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>{pricing.total} €</span>
                              </p>
                              <p style={{ margin: '4px 0', fontSize: '12px', color: '#6b7280' }}>
                                Tarkempi erittely "Hinnoittelu"-välilehdellä
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hinnoittelu Tab */}
                    {activeTab === 'hinnoittelu' && (
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                          Hinnoittelu
                        </h3>
                        
                        {pricing ? (
                          <div>
                            {/* Yhteenveto */}
                            <div style={{
                              backgroundColor: '#f9fafb',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '20px',
                              marginBottom: '24px'
                            }}>
                              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Tuotetiedot</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px' }}>
                                <div>
                                  <span style={{ color: '#6b7280' }}>Pinta-ala: </span>
                                  <span style={{ fontWeight: '600' }}>{pricing.surfaceAreaCm2} cm² ({pricing.surfaceAreaM2} m²)</span>
                                </div>
                                <div>
                                  <span style={{ color: '#6b7280' }}>Paino: </span>
                                  <span style={{ fontWeight: '600' }}>{pricing.weight} kg</span>
                                </div>
                                <div>
                                  <span style={{ color: '#6b7280' }}>Palvelu: </span>
                                  <span style={{ fontWeight: '600' }}>{pricing.coating} - {pricing.variant}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#6b7280' }}>Sarjakoko: </span>
                                  <span style={{ fontWeight: '600' }}>{batchSize || 'Ei valittu'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Hintalaskelma */}
                            <div style={{
                              backgroundColor: 'white',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '24px'
                            }}>
                              <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', textAlign: 'center' }}>HINTALASKELMA</h4>
                              
                              <div style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.6' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                  <span>Asetuskustannus:</span>
                                  <span>{pricing.setupCost.toFixed(2)} €</span>
                                </div>
                                
                                {pricing.pretreatmentCost > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span>Esikäsittelyt:</span>
                                    <span>{pricing.pretreatmentCost.toFixed(2)} €</span>
                                  </div>
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                  <span>{pricing.coating}:</span>
                                  <span>{pricing.coatingCost.toFixed(2)} € ({pricing.coatingPricePerM2} €/m²)</span>
                                </div>
                                
                                <div style={{ borderTop: '1px solid #d1d5db', margin: '8px 0', padding: '4px 0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                                    <span>Välisumma:</span>
                                    <span>{pricing.subtotal.toFixed(2)} €</span>
                                  </div>
                                </div>
                                
                                {pricing.batchDiscount > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#059669' }}>
                                    <span>Sarjakoko-alennus (-{pricing.batchDiscountPercent}%):</span>
                                    <span>-{pricing.batchDiscount.toFixed(2)} €</span>
                                  </div>
                                )}
                                
                                {pricing.urgencyMultiplier !== 1 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#dc2626' }}>
                                    <span>Kiireellisyys-lisä (+{((pricing.urgencyMultiplier - 1) * 100).toFixed(0)}%):</span>
                                    <span>+{((pricing.afterDiscountAndUrgency / pricing.urgencyMultiplier - pricing.afterDiscountAndUrgency) * -1).toFixed(2)} €</span>
                                  </div>
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: '600' }}>
                                  <span>Yhteensä (alv 0%):</span>
                                  <span>{pricing.afterDiscountAndUrgency.toFixed(2)} €</span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                  <span>ALV 24%:</span>
                                  <span>{pricing.vat.toFixed(2)} €</span>
                                </div>
                                
                                <div style={{ 
                                  borderTop: '2px solid #374151', 
                                  margin: '12px 0 8px 0', 
                                  padding: '8px 0',
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  fontSize: '18px',
                                  fontWeight: 'bold',
                                  backgroundColor: '#f9fafb'
                                }}>
                                  <span>KOKONAISHINTA:</span>
                                  <span style={{ color: '#059669' }}>{pricing.total.toFixed(2)} €</span>
                                </div>
                              </div>
                              
                              <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                                <p>Toimitusaika: 7-14 päivää ({urgency})</p>
                                <p>Voimassaolo: 30 päivää | Maksuehto: 14 päivää netto</p>
                              </div>
                            </div>

                            {/* Luo tarjous -nappi */}
                            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                              <button
                                onClick={generateQuote}
                                style={{
                                  padding: '16px 32px',
                                  backgroundColor: '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '18px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}
                              >
                                📄 Luo virallinen tarjous
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            padding: '48px',
                            color: '#6b7280'
                          }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                            <p>Valitse ensin palvelu "Palvelu"-välilehdeltä nähdäksesi hinnoittelun</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Huomiot */}
                {data?.huomiot && data.huomiot.length > 0 && (
                  <div style={{
                    marginTop: '24px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px' }}>⚠️ Huomiot</p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {data.huomiot.map((huomio, idx) => (
                        <li key={idx} style={{ fontSize: '14px' }}>{huomio}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '48px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  Ei analyysituloksia
                </h3>
                <p style={{ color: '#6b7280' }}>
                  Lataa ja analysoi piirustus nähdäksesi tulokset
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}