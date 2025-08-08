import React from "react";
import { Package } from "lucide-react";
import EditableField from "./EditableField";

export default function PerustiedotPanel({ data, editedData, onFieldSave }) {
  const pd = data.perustiedot || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-gray-900">Perustiedot</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tuotetiedot */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🏷️ Tuotetiedot
          </h4>
          <div className="space-y-1">
            <EditableField
              label="Tuotekoodi"
              value={editedData.tuotekoodi ?? pd.tuotekoodi}
              onSave={(v) => onFieldSave("tuotekoodi", v)}
            />
            <EditableField
              label="Tuotenimi"
              value={editedData.tuotenimi ?? pd.tuotenimi}
              onSave={(v) => onFieldSave("tuotenimi", v)}
            />
            <EditableField
              label="Materiaali"
              value={editedData.materiaali ?? pd.materiaali}
              onSave={(v) => onFieldSave("materiaali", v)}
            />
            <EditableField
              label="Paino"
              unit="kg"
              value={editedData.paino_kg ?? pd.paino_kg}
              onSave={(v) => onFieldSave("paino_kg", v)}
            />
          </div>
        </div>

        {/* Prosessitiedot */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            ⚙️ Prosessitiedot
          </h4>
          <div className="space-y-1">
            <EditableField
              label="Loppuasiakas"
              value={editedData.loppuasiakas ?? pd.loppuasiakas}
              onSave={(v) => onFieldSave("loppuasiakas", v)}
            />
            <EditableField
              label="Pinnoite"
              value={editedData.pinnoite ?? pd.pinnoite}
              onSave={(v) => onFieldSave("pinnoite", v)}
            />
            <EditableField
              label="Pintakarheus"
              value={editedData.pintakarheus_ra ?? pd.pintakarheus_ra}
              onSave={(v) => onFieldSave("pintakarheus_ra", v)}
            />
            <EditableField
              label="Eräkoko"
              value={editedData.eräkoko ?? pd.eräkoko}
              onSave={(v) => onFieldSave("eräkoko", v)}
            />
          </div>
        </div>
      </div>
    </div>
);
}
