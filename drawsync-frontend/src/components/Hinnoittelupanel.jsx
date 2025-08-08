import React from "react";
import { Calculator } from "lucide-react";

export default function Hinnoittelupanel({ pricing, urgency }) {
  if (!pricing) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-6">💰</div>
        <h4 className="text-xl font-semibold text-gray-900 mb-3">
          Valitse palvelu hinnoittelua varten
        </h4>
        <p className="text-gray-600">
          Siirry “Palvelu”-välilehdelle valitaksesi pinnoitteen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-gray-900">Hinnoittelulaskelma</h3>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4">📋 Tuotetiedot</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="text-gray-600 block mb-1">Pinta-ala</label>
            <p className="font-semibold">
              {pricing.surfaceAreaCm2} cm² ({pricing.surfaceAreaM2} m²)
            </p>
          </div>
          <div>
            <label className="text-gray-600 block mb-1">Paino</label>
            <p className="font-semibold">{pricing.weight} kg</p>
          </div>
          <div>
            <label className="text-gray-600 block mb-1">Palvelu</label>
            <p className="font-semibold">{pricing.coating}</p>
            <p className="text-xs text-gray-500">{pricing.variant}</p>
          </div>
          <div>
            <label className="text-gray-600 block mb-1">Sarjakoko</label>
            <p className="font-semibold">{pricing.batchDiscountPercent ? null : "Ei valittu"}</p>
          </div>
        </div>
      </div>

      {/* Detailed calc */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 text-center">
          <h4 className="text-xl font-bold">💰 Hintalaskelma</h4>
        </div>
        <div className="p-8">
          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between py-2 border-b border-green-200">
              <span>Asetuskustannus:</span>
              <span>{pricing.setupCost.toFixed(2)} €</span>
            </div>
            {pricing.pretreatmentCost > 0 && (
              <div className="flex justify-between py-2 border-b border-green-200">
                <span>Esikäsittelyt:</span>
                <span>{pricing.pretreatmentCost.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-green-200">
              <span>{pricing.coating}:</span>
              <span>
                {pricing.coatingCost.toFixed(2)} € (
                {pricing.coatingPricePerM2} €/m²)
              </span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-green-300 font-semibold">
              <span>Välisumma:</span>
              <span>{pricing.subtotal.toFixed(2)} €</span>
            </div>
            {pricing.batchDiscount > 0 && (
              <div className="flex justify-between py-2 text-green-700">
                <span>
                  Sarjakoko-alennus (-{pricing.batchDiscountPercent}%):
                </span>
                <span>-{pricing.batchDiscount.toFixed(2)} €</span>
              </div>
            )}
            {pricing.urgencyMultiplier !== 1 && (
              <div className="flex justify-between py-2 text-red-600">
                <span>
                  Kiireellisyys (+{((pricing.urgencyMultiplier - 1) * 100).toFixed(0)}%
                  ):
                </span>
                <span>
                  +{(pricing.total - pricing.afterDiscountAndUrgency).toFixed(2)} €
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 font-semibold border-b border-green-200">
              <span>Yhteensä (alv 0%):</span>
              <span>{pricing.afterDiscountAndUrgency.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between py-2">
              <span>ALV 24%:</span>
              <span>{pricing.vat.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between py-4 border-t-4 border-green-400 text-xl font-bold bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg px-4">
              <span>KOKONAISHINTA:</span>
              <span>{pricing.total.toFixed(2)} €</span>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-gray-600 space-y-1">
            <p>📅 Toimitusaika: 7-14 päivää ({urgency})</p>
            <p>⏰ Voimassaolo: 30 päivää | 💳 Maksuehto: 14 pv netto</p>
          </div>
        </div>
      </div>
    </div>
  );
}
