import React from "react";
import { Ruler } from "lucide-react";

export default function MitatPanel({ mitat }) {
  const m = mitat || {};
  const u = m.ulkomitat_mm || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Ruler className="h-6 w-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-gray-900">Mitat</h3>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          📏 Ulkomitat (mm)
        </h4>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-700 mb-1">
              {u.pituus ?? "—"}
            </div>
            <label className="text-sm text-gray-600">Pituus</label>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-700 mb-1">
              {u.leveys ?? "—"}
            </div>
            <label className="text-sm text-gray-600">Leveys</label>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-700 mb-1">
              {u.korkeus ?? "—"}
            </div>
            <label className="text-sm text-gray-600">Korkeus</label>
          </div>
        </div>
      </div>

      {m.reiät?.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🔄 Reiät
          </h4>
          <div className="space-y-3">
            {m.reiät.map((r, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-white/50 rounded-lg p-3"
              >
                <span className="font-medium">
                  Halkaisija Ø{r.halkaisija_mm}mm
                </span>
                <span className="font-bold text-orange-700">{r.määrä} kpl</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
