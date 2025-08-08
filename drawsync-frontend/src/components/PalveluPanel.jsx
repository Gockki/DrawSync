import React from "react";
import { Palette } from "lucide-react";

export default function PalveluPanel({
  COATING_OPTIONS,
  selectedCoating,
  onSelectCoating,
  selectedVariant,
  onSelectVariant,
  batchSize,
  onSelectBatchSize,
  urgency,
  onSelectUrgency,
  pretreatments,
  onPretreatmentChange,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Palette className="h-6 w-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-gray-900">Valitse palvelu</h3>
      </div>

      <div className="grid gap-6">
        {/* Pinnoitetyyppi */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
          <label className="text-base font-semibold text-gray-900 mb-3 block">
            Pinnoitetyyppi
          </label>
          <select
            value={selectedCoating}
            onChange={(e) => onSelectCoating(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Valitse pinnoite...</option>
            {Object.entries(COATING_OPTIONS).map(([key, opt]) => (
              <option key={key} value={key}>
                {opt.name}
              </option>
            ))}
          </select>

          {selectedCoating && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-1">
              <p>
                <strong>Kuvaus:</strong>{" "}
                {COATING_OPTIONS[selectedCoating].description}
              </p>
              <p>
                <strong>Maksimikoko:</strong>{" "}
                {COATING_OPTIONS[selectedCoating].maxSize}
              </p>
              <p>
                <strong>Perushinta:</strong>{" "}
                {COATING_OPTIONS[selectedCoating].basePrice} €/m²
              </p>
            </div>
          )}
        </div>

        {/* Variantti */}
        {selectedCoating && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <label className="text-base font-semibold text-gray-900 mb-3 block">
              Pinnoitevariantti
            </label>
            <select
              value={selectedVariant}
              onChange={(e) => onSelectVariant(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Valitse variantti...</option>
              {COATING_OPTIONS[selectedCoating].variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.thickness})
                </option>
              ))}
            </select>

            {selectedVariant && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
                {(() => {
                  const v = COATING_OPTIONS[selectedCoating].variants.find(
                    (x) => x.id === selectedVariant
                  );
                  const price = (
                    COATING_OPTIONS[selectedCoating].basePrice *
                    v.priceMultiplier
                  ).toFixed(2);
                  return (
                    <>
                      <p>
                        <strong>Valittu:</strong> {v.name}
                      </p>
                      <p>
                        <strong>Paksuus:</strong> {v.thickness}
                      </p>
                      <p>
                        <strong>Hinta:</strong> {price} €/m²
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Sarjakoko & kiireellisyys */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
            <label className="text-base font-semibold text-gray-900 mb-3 block">
              Sarjakoko
            </label>
            <select
              value={batchSize}
              onChange={(e) => onSelectBatchSize(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Valitse...</option>
              <option value="1-10">1-10 kpl (Prototyyppi)</option>
              <option value="11-50">11-50 kpl –5%</option>
              <option value="51-200">51-200 kpl –10%</option>
              <option value="201-1000">201-1000 kpl –15%</option>
              <option value="1000+">1000+ kpl –20%</option>
            </select>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
            <label className="text-base font-semibold text-gray-900 mb-3 block">
              Kiireellisyys
            </label>
            <select
              value={urgency}
              onChange={(e) => onSelectUrgency(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="normaali">Normaali (7-14 päivää)</option>
              <option value="kiireellinen">Kiireellinen (3-5 päivää) +20%</option>
              <option value="express">Express (1-2 päivää) +50%</option>
            </select>
          </div>
        </div>

        {/* Esikäsittely */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
          <label className="text-base font-semibold text-gray-900 mb-4 block">
            Esikäsittely
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries({
              rasvanpoisto: "Rasvanpoisto (+3 €/m²)",
              peittaus: "Peittaus (+5 €/m²)",
              hiekkapuhallus: "Hiekkapuhallus (+8 €/m²)",
            }).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border hover:bg-white cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={pretreatments.includes(key)}
                  onChange={(e) =>
                    onPretreatmentChange(key, e.target.checked)
                  }
                  className="w-4 h-4 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
