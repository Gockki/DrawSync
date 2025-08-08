// =====================================
// File: src/components/UploadSection.jsx
// =====================================
import React from "react";
import { Upload, FileText, BarChart3 } from "lucide-react";

export default function UploadSection({ file, previewUrl, loading, onDrop, onFileSelect, onAnalyze }) {
  return (
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

          {file && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size/1024/1024).toFixed(1)} MB</p>
                </div>
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

      {previewUrl && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-6 pb-4">
            <h3 className="text-lg font-semibold text-gray-900">Esikatselu</h3>
          </div>
          <div className="p-6">
            <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-lg shadow-sm" />
          </div>
        </div>
      )}
    </div>
  );
}