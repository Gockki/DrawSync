import React from "react";
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function PintaAlaPanel({
  pintaAla,
  pricing,
  onManualClick,
}) {
  const p = pintaAla || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-6 w-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-gray-900">
          Pinta-ala-analyysi
        </h3>
      </div>

      {p.pinta_ala_cm2 ? (
        <>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <div className="text-4xl font-bold text-green-700">
                  {p.pinta_ala_cm2} cm²
                </div>
                <div className="text-lg text-green-600">
                  {(p.pinta_ala_cm2 / 10000).toFixed(4)} m²
                </div>
              </div>
            </div>
            <p className="text-green-700 mb-4">{p.laskelma}</p>
            <StatusBadge
              type="success"
              text={`Varmuus: ${p.varmuus}`}
            />
          </div>

          {pricing && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Hinta-arvio
              </h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {pricing.total.toFixed(2)} €
                </div>
                <p className="text-sm text-gray-600">
                  {pricing.coating} – {pricing.variant}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-8 w-8 text-red-600 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 mb-2">
                Pinta-alaa ei voitu laskea
              </h4>
              <p className="text-red-700 mb-4">{p.laskelma}</p>
              <button
                onClick={onManualClick}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Syötä manuaalisesti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
