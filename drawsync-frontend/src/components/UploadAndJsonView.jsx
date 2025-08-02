import { useState } from "react";

export default function UploadAndJsonView() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      padding: '16px'
    },
    maxWidth: {
      width: '100%',
      margin: '0'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '32px'
    },
    gridLg: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '32px'
    },
    card: {
      backgroundColor: 'white',
      border: '2px solid #374151',
      borderRadius: '4px',
      boxShadow: 'none'
    },
    cardHeader: {
      borderBottom: '2px solid #374151',
      padding: '12px 16px',
      backgroundColor: '#f8fafc'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#111827',
      margin: 0
    },
    cardContent: {
      padding: '16px'
    },
    dropZone: {
      border: '2px solid #374151',
      borderRadius: '4px',
      padding: '24px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      backgroundColor: '#ffffff'
    },
    dropZoneHover: {
      backgroundColor: '#f8fafc'
    },
    uploadIcon: {
      fontSize: '48px',
      marginBottom: '16px',
      color: '#9ca3af'
    },
    uploadText: {
      color: '#374151',
      fontWeight: '500',
      marginBottom: '8px',
      fontSize: '16px'
    },
    uploadSubtext: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '16px'
    },
    button: {
      backgroundColor: '#374151',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      border: '2px solid #374151',
      fontSize: '14px',
      fontWeight: '600'
    },
    buttonHover: {
      backgroundColor: '#1f2937'
    },
    primaryButton: {
      backgroundColor: '#374151',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      border: '2px solid #374151',
      fontSize: '16px',
      fontWeight: '600',
      width: '100%',
      marginTop: '16px'
    },
    primaryButtonDisabled: {
      opacity: '0.5',
      cursor: 'not-allowed'
    },
    fileInfo: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: '#ffffff',
      border: '2px solid #374151',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    fileIcon: {
      fontSize: '20px',
      color: '#6b7280'
    },
    fileName: {
      fontWeight: '500',
      color: '#111827'
    },
    fileSize: {
      fontSize: '14px',
      color: '#6b7280'
    },
    previewImage: {
      maxHeight: '320px',
      width: '100%',
      objectFit: 'contain',
      border: '1px solid #e5e7eb',
      borderRadius: '6px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px'
    },
    infoCard: {
      border: '2px solid #374151',
      borderRadius: '4px',
      padding: '12px',
      backgroundColor: '#ffffff'
    },
    infoLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.025em'
    },
    infoValue: {
      marginTop: '4px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#111827'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      backgroundColor: '#374151',
      borderBottom: '2px solid #374151',
      color: 'white'
    },
    tableHeaderCell: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: 'white',
      textTransform: 'uppercase',
      letterSpacing: '0.025em'
    },
    tableRow: {
      borderBottom: '1px solid #374151'
    },
    tableRowHover: {
      backgroundColor: '#f9fafb'
    },
    tableCell: {
      padding: '12px 16px',
      fontSize: '14px'
    },
    tableCellHeader: {
      fontWeight: '500',
      color: '#111827'
    },
    tableCellRegular: {
      color: '#374151'
    },
    emptyState: {
      padding: '48px',
      textAlign: 'center'
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '16px',
      color: '#9ca3af'
    },
    emptyTitle: {
      fontSize: '18px',
      fontWeight: '500',
      color: '#111827',
      marginBottom: '8px'
    },
    emptyText: {
      color: '#6b7280'
    },
    notification: {
      position: 'fixed',
      top: '16px',
      right: '16px',
      backgroundColor: '#059669',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '6px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    successIcon: {
      color: '#10b981',
      fontSize: '18px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Success notification */}
        {success && (
          <div style={styles.notification}>
            <span style={styles.successIcon}>✓</span>
            Piirustuksen jäsennys valmis
          </div>
        )}

        <div style={window.innerWidth >= 1024 ? styles.gridLg : styles.grid}>
          {/* Upload Section */}
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Lataa piirustus</h2>
              </div>
              
              <div style={styles.cardContent}>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  style={styles.dropZone}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = styles.dropZoneHover.backgroundColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = styles.dropZone.backgroundColor;
                  }}
                >
                  <div style={styles.uploadIcon}>📁</div>
                  <p style={styles.uploadText}>
                    Vedä tiedosto tähän tai klikkaa valitaksesi
                  </p>
                  <p style={styles.uploadSubtext}>PNG, JPG, PDF</p>
                  
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
                    <span 
                      style={styles.button}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = styles.buttonHover.backgroundColor;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = styles.button.backgroundColor;
                      }}
                    >
                      Valitse tiedosto
                    </span>
                  </label>
                </div>

                {file && (
                  <div style={styles.fileInfo}>
                    <span style={styles.fileIcon}>📄</span>
                    <div>
                      <p style={styles.fileName}>{file.name}</p>
                      <p style={styles.fileSize}>
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  style={{
                    ...styles.primaryButton,
                    ...((!file || loading) ? styles.primaryButtonDisabled : {})
                  }}
                  onMouseEnter={(e) => {
                    if (!file || loading) return;
                    e.target.style.backgroundColor = styles.buttonHover.backgroundColor;
                  }}
                  onMouseLeave={(e) => {
                    if (!file || loading) return;
                    e.target.style.backgroundColor = styles.primaryButton.backgroundColor;
                  }}
                >
                  {loading ? "Käsitellään..." : "Käsittele piirustus"}
                </button>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Esikatselu</h3>
                </div>
                <div style={styles.cardContent}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={styles.previewImage}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div style={styles.grid}>
            {data ? (
              <>
                {/* Drawing Info */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Piirustuksen tiedot</h2>
                  </div>
                  <div style={styles.cardContent}>
                    <div style={styles.infoGrid}>
                      {Object.entries(data.drawing_info || {}).map(([key, value]) => (
                        <div key={key} style={styles.infoCard}>
                          <dt style={styles.infoLabel}>
                            {key}
                          </dt>
                          <dd style={styles.infoValue}>
                            {value || '—'}
                          </dd>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Parts List */}
                <div style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Osaluettelo</h2>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          {['Osa', 'Määrä', 'Materiaali', 'Paino', 'Standardi', 'Kovuus', 'Pintakarkeus', 'Toleranssi'].map((header) => (
                            <th key={header} style={styles.tableHeaderCell}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.parts_list?.map((part, idx) => (
                          <tr 
                            key={idx} 
                            style={styles.tableRow}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = styles.tableRowHover.backgroundColor;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <td style={{...styles.tableCell, ...styles.tableCellHeader}}>{part.osa}</td>
                            <td style={{...styles.tableCell, ...styles.tableCellRegular}}>{part.määrä}</td>
                            <td style={{...styles.tableCell, ...styles.tableCellRegular}}>{part.materiaali}</td>
                            <td style={{...styles.tableCell, ...styles.tableCellRegular}}>{part.paino}</td>
                            <td style={{...styles.tableCell, ...styles.tableCellRegular}}>{part.standardi}</td>
                            <td style={{...styles.tableCell, ...styles.tableCellRegular}}>{part.kovuus}</td>
                            <td style={{...styles.tableCell, ...styles.tableCellRegular}}>{part.pintakarheus}</td>
                            <td style={{...styles.tableCell, ...styles.tableCellRegular}}>{part.toleranssi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.card}>
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>⚠️</div>
                  <h3 style={styles.emptyTitle}>
                    Ei dataa
                  </h3>
                  <p style={styles.emptyText}>
                    Lataa ja käsittele piirustus nähdäksesi tulokset
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}