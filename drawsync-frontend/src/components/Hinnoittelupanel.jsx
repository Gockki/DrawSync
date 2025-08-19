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
          Siirry "Palvelu"-välilehdelle valitaksesi pinnoitteen
        </p>
      </div>
    );
  }

  // ✅ TURVALLISET DEFAULT ARVOT
  const safePricing = {
    surfaceAreaCm2: pricing.surfaceAreaCm2 || 0,
    surfaceAreaM2: pricing.surfaceAreaM2 || 0,
    weight: pricing.weight || 0,
    coating: pricing.coating || 'Tuntematon',
    variant: pricing.variant || 'Tuntematon',
    setupCost: pricing.setupCost || 0,
    pretreatmentCost: pricing.pretreatmentCost || 0,
    coatingCost: pricing.coatingCost || 0,
    coatingPricePerM2: pricing.coatingPricePerM2 || 0,
    subtotal: pricing.subtotal || 0,
    batchDiscount: pricing.batchDiscount || 0,
    batchDiscountPercent: pricing.batchDiscountPercent || 0,
    urgencyMultiplier: pricing.urgencyMultiplier || 1,
    urgencyAmount: pricing.urgencyAmount || 0,
    afterDiscountAndUrgency: pricing.afterDiscountAndUrgency || 0,
    vat: pricing.vat || 0,
    total: pricing.total || 0
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
              {safePricing.surfaceAreaCm2.toFixed(0)} cm² ({safePricing.surfaceAreaM2.toFixed(4)} m²)
            </p>
          </div>
          <div>
            <label className="text-gray-600 block mb-1">Paino</label>
            <p className="font-semibold">{safePricing.weight.toFixed(1)} kg</p>
          </div>
          <div>
            <label className="text-gray-600 block mb-1">Palvelu</label>
            <p className="font-semibold">{safePricing.coating}</p>
            <p className="text-xs text-gray-500">{safePricing.variant}</p>
          </div>
          <div>
            <label className="text-gray-600 block mb-1">Sarjakoko</label>
            <p className="font-semibold">
              {safePricing.batchDiscountPercent > 0 ? `${safePricing.batchDiscountPercent}% alennus` : "Ei alennusta"}
            </p>
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
              <span>{safePricing.setupCost.toFixed(2)} €</span>
            </div>
            
            {safePricing.pretreatmentCost > 0 && (
              <div className="flex justify-between py-2 border-b border-green-200">
                <span>Esikäsittelyt:</span>
                <span>{safePricing.pretreatmentCost.toFixed(2)} €</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-b border-green-200">
              <span>{safePricing.coating}:</span>
              <span>
                {safePricing.coatingCost.toFixed(2)} € ({safePricing.coatingPricePerM2.toFixed(2)} €/m²)
              </span>
            </div>
            
            <div className="flex justify-between py-3 border-t-2 border-green-300 font-semibold">
              <span>Välisumma:</span>
              <span>{safePricing.subtotal.toFixed(2)} €</span>
            </div>
            
            {safePricing.batchDiscount > 0 && (
              <div className="flex justify-between py-2 text-green-700">
                <span>Sarjakoko-alennus (-{safePricing.batchDiscountPercent}%):</span>
                <span>-{safePricing.batchDiscount.toFixed(2)} €</span>
              </div>
            )}
            
            {safePricing.urgencyMultiplier !== 1 && (
              <div className="flex justify-between py-2 text-red-600">
                <span>
                  Kiireellisyys (+{((safePricing.urgencyMultiplier - 1) * 100).toFixed(0)}%):
                </span>
                <span>+{safePricing.urgencyAmount.toFixed(2)} €</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 font-semibold border-b border-green-200">
              <span>Yhteensä (alv 0%):</span>
              <span>{safePricing.afterDiscountAndUrgency.toFixed(2)} €</span>
            </div>
            
            <div className="flex justify-between py-2">
              <span>ALV 24%:</span>
              <span>{safePricing.vat.toFixed(2)} €</span>
            </div>
            
            <div className="flex justify-between py-4 border-t-4 border-green-400 text-xl font-bold bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg px-4">
              <span>KOKONAISHINTA:</span>
              <span>{safePricing.total.toFixed(2)} €</span>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-600 space-y-1">
            <p>📅 Toimitusaika: {pricing.deliveryTime ? 
              `${pricing.deliveryTime.min}-${pricing.deliveryTime.max} päivää` : 
              '7-14 päivää'} ({urgency || 'normaali'})</p>
            <p>⏰ Voimassaolo: 30 päivää | 💳 Maksuehto: 14 pv netto</p>
          </div>
        </div>
      </div>
    </div>
  );
}