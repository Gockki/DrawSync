import React from "react";
import { Building, Calendar, User, Ruler } from "lucide-react";
import EditableField from "./EditableField";

export default function SteelPerustiedotPanel({ data, editedData, onFieldSave }) {
  // Steel-datan perustiedot - backend palauttaa eri kentät kuin coating
  const pd = data.perustiedot || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Building className="h-6 w-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-gray-900">Projektin perustiedot</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projektitiedot */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🏗️ Projektitiedot
          </h4>
          <div className="space-y-4">
            <EditableField
              label="Projektin numero"
              value={editedData.projekti_numero ?? pd.projekti_numero}
              onSave={(v) => onFieldSave("projekti_numero", v)}
              placeholder="esim. 5825-507"
            />
            <EditableField
              label="Rakenteen nimi"
              value={editedData.rakenteen_nimi ?? pd.rakenteen_nimi}
              onSave={(v) => onFieldSave("rakenteen_nimi", v)}
              placeholder="esim. AURINKOSUOJASÄLEIKKÖ"
            />
            <EditableField
              label="Materiaaliluokka"
              value={editedData.materiaaliluokka ?? pd.materiaaliluokka}
              onSave={(v) => onFieldSave("materiaaliluokka", v)}
              placeholder="esim. S355J2"
            />
          </div>
        </div>

        {/* Piirustustiedot */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📐 Piirustustiedot
          </h4>
          <div className="space-y-4">
            <EditableField
              label="Mittakaava"
              value={editedData.mittakaava ?? pd.mittakaava}
              onSave={(v) => onFieldSave("mittakaava", v)}
              placeholder="esim. 1:75, 1:25"
            />
            <EditableField
              label="Piirtäjä"
              value={editedData.piirtäjä ?? pd.piirtäjä}
              onSave={(v) => onFieldSave("piirtäjä", v)}
              placeholder="Piirtäjän nimi"
            />
            <EditableField
              label="Päivämäärä"
              value={editedData.päivämäärä ?? pd.päivämäärä}
              onSave={(v) => onFieldSave("päivämäärä", v)}
              placeholder="esim. 4.10.2024"
            />
          </div>
        </div>
      </div>

      {/* Yhteenveto */}
      {data.yhteenveto && (
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📊 Projektin yhteenveto
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.yhteenveto.kokonaispaino_kg?.toFixed(1) || '0'} kg
              </div>
              <div className="text-sm text-gray-600">Kokonaispaino</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.yhteenveto.kokonaispituus_m?.toFixed(1) || '0'} m
              </div>
              <div className="text-sm text-gray-600">Kokonaispituus</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.yhteenveto.profiilityyppien_lkm || '0'}
              </div>
              <div className="text-sm text-gray-600">Profiilityypit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.yhteenveto.eri_profiileja || '0'}
              </div>
              <div className="text-sm text-gray-600">Eri profiileja</div>
            </div>
          </div>
        </div>
      )}

      {/* Huomiot */}
      {data.huomiot && data.huomiot.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h4 className="font-semibold text-yellow-800 mb-3">💡 Analyysitiedot</h4>
          <ul className="space-y-2">
            {data.huomiot.map((huomio, index) => (
              <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>{huomio}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}