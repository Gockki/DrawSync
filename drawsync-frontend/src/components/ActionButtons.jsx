// src/components/ActionButtons.jsx
import React from "react";
import { Save, FileDown } from "lucide-react";

export default function ActionButtons({
  onSaveProject,
  onGenerateQuote,
  disabledSave,
  disabledQuote,
  saving,
  saveSuccess,
  pricing,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-end gap-4">
      <button
        onClick={onSaveProject}
        disabled={disabledSave}
        className={`flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg transition-all duration-200 shadow-sm ${
          saveSuccess
            ? "bg-green-100 text-green-800 border border-green-200 cursor-not-allowed"
            : disabledSave
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
        }`}
      >
        <Save className="h-4 w-4" />
        {saving
          ? "Tallennetaan..."
          : saveSuccess
          ? "✅ Tallennettu"
          : "Tallenna"}
      </button>

      <button
        onClick={onGenerateQuote}
        disabled={disabledQuote}
        className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 shadow-lg ${
          !disabledQuote
            ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-green-200"
            : "bg-gray-400 text-gray-200 cursor-not-allowed"
        }`}
      >
        <FileDown className="h-4 w-4" />
        Luo virallinen tarjous
      </button>
    </div>
);
}
