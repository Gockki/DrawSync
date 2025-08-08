import React from "react";
import { X } from "lucide-react";

export default function ManualSurfaceAreaModal({
  visible,
  manualArea,
  onChange,
  onSave,
  onClose,
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl flex justify-between items-center">
          <h3 className="text-lg font-semibold">Syötä pinta-ala manuaalisesti</h3>
          <button onClick={onClose} className="text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <label htmlFor="manualArea" className="block text-base font-medium text-gray-900 mb-2">
            Pinta-ala (cm²)
          </label>
          <input
            id="manualArea"
            type="number"
            value={manualArea}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Esim. 156.5"
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Peruuta
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-200"
            >
              Tallenna
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
