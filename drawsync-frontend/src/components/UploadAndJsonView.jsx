import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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


  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/');
    };
    checkSession();
  }, []);

  // ... kaikki muu koodi jatkuu tästä

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [activeTab, setActiveTab] = useState('perustiedot');
  const [manualSurfaceArea, setManualSurfaceArea] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    }
  };
  const navigate = useNavigate()

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigate('/')
}
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
  // TÄHÄN PITÄÄ LISÄTÄ generateQuote funktio!
  const generateQuote = () => {
    console.log("Tarjous data:", { ...data, edited: editedData });
    alert("Tarjous luotu! (Tässä voisi avata PDF tai lähettää sähköposti)");
  };
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
            top: '20px',
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
            {data ? (
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
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Menetelmä</p>
                      <p style={{ fontWeight: '600' }}>{data.processing_info?.method || 'tuntematon'}</p>
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
                    {['perustiedot', 'mitat', 'pinta-ala', 'prosessi'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          backgroundColor: activeTab === tab ? 'white' : 'transparent',
                          borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                          fontWeight: activeTab === tab ? '600' : '400',
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {tab === 'pinta-ala' ? 'Pinta-ala' : tab}
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
                              ✅ {data.pinta_ala_analyysi.pinta_ala_cm2} cm²
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
                            }}>
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

                    {/* Prosessi Tab */}
                    {activeTab === 'prosessi' && (
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                          Prosessitiedot (Manuaalinen syöttö)
                        </h3>
                        
                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                              Ripustustiheys
                            </label>
                            <select style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px'
                            }}>
                              <option>Valitse...</option>
                              <option>Harva (50 kpl/tanko)</option>
                              <option>Normaali (120 kpl/tanko)</option>
                              <option>Tiivis (200 kpl/tanko)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                              Käsittelyohjelma
                            </label>
                            <select style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px'
                            }}>
                              <option>Valitse...</option>
                              <option>A1 - Alumiini perus</option>
                              <option>A2 - Alumiini vahva</option>
                              <option>S1 - Teräs perus</option>
                              <option>S2 - Teräs vahva</option>
                            </select>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                              Ripustintyyppi
                            </label>
                            <select style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px'
                            }}>
                              <option>Valitse...</option>
                              <option>Aaltolankakoukku</option>
                              <option>C-koukku</option>
                              <option>Erikoisripustin</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  marginTop: '24px',
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'flex-end'
                }}>
                  <button style={{
                    padding: '12px 24px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    Tallenna luonnos
                  </button>
                  <button 
                    onClick={generateQuote}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Luo tarjous
                  </button>
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