// ============================================
// UploadSection.jsx - KORJATTU VERSIO
// ============================================
import React from "react";
import { Upload, FileText, BarChart3, ExternalLink } from "lucide-react";

export default function UploadSection({ file, previewUrl, fileType, loading, onDrop, onFileSelect, onAnalyze }) {
  
  const isPDF = fileType === 'pdf';

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Lataa piirustus
          </h2>
        </div>
        <div className="p-6">
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
              file
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="text-6xl mb-4">📁</div>
            <p className="font-semibold mb-2 text-gray-700">Vedä tiedosto tähän</p>
            <p className="text-sm text-gray-500 mb-4">tai</p>
            <label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={e => {
                  const sel = e.target.files?.[0];
                  if (sel) onFileSelect(sel, URL.createObjectURL(sel));
                }}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg font-medium text-gray-700 transition-all duration-200 cursor-pointer">
                <FileText className="h-4 w-4" /> Valitse tiedosto
              </span>
            </label>
          </div>

          {/* Tiedostotiedot + Avaa linkki */}
          {file && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className={`h-8 w-8 ${isPDF ? 'text-red-600' : 'text-blue-600'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{file.name}</p>
                    {isPDF && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">PDF</span>}
                  </div>
                  <p className="text-sm text-gray-500">{(file.size/1024/1024).toFixed(1)} MB</p>
                </div>
                
                {/* Avaa uudessa ikkunassa -nappi */}
                {previewUrl && (
                  <button
                    onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    title="Avaa tiedosto uudessa ikkunassa"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Avaa
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={onAnalyze}
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
                <BarChart3 className="h-4 w-4" /> Analysoi piirustus
              </>
            )}
          </button>
        </div>
      </div>

      {/* ✅ ERILLINEN PREVIEW-ALUE (poistettu ImagePreview-riippuvuus) */}
      {previewUrl && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {isPDF ? <FileText className="h-5 w-5 text-red-600" /> : <FileText className="h-5 w-5 text-blue-600" />}
                Esikatselu {isPDF && '(PDF)'}
              </h3>
              
              {/* Avaa uudessa ikkunassa -nappi otsikossa */}
              <button
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                title="Avaa koko näkymässä uudessa ikkunassa"
              >
                <ExternalLink className="h-4 w-4" />
                Avaa uudessa ikkunassa
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {isPDF ? (
              // PDF: Näytä klikkattava alue
              <div 
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                className="cursor-pointer group border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg p-8 text-center transition-all"
              >
                <FileText className="h-16 w-16 mx-auto mb-4 text-red-600 group-hover:text-red-700" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">PDF-piirustus</h4>
                <p className="text-gray-600 mb-4">
                  {file?.name || 'Piirustustiedosto'}
                </p>
                <p className="text-blue-600 font-medium flex items-center justify-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Klikkaa avataksesi PDF uudessa ikkunassa
                </p>
              </div>
            ) : (
              // Kuva: Näytä esikatselu + klikkattava
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto rounded-lg shadow-sm cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                  title="Klikkaa avataksesi koko koossa"
                />
                <div className="text-center">
                  <button
                    onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Avaa koko koossa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}