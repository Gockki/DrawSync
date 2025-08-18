import React from 'react';
import { BarChart3, Package, Weight, Ruler, Activity, Target, Info } from 'lucide-react';

export default function SteelSummaryPanel({ data, materiaalilista, yhteenveto, liitokset }) {
  if (!materiaalilista || materiaalilista.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Yhteenveto</h3>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Ei dataa yhteenvetoa varten</p>
        </div>
      </div>
    );
  }

  // Lasketut tilastot
  const stats = {
    totalWeight: yhteenveto?.kokonaispaino_kg || 0,
    totalLength: yhteenveto?.kokonaispituus_m || 0,
    profileTypes: yhteenveto?.profiilityyppien_lkm || 0,
    uniqueProfiles: yhteenveto?.eri_profiileja || 0,
    weldingLength: yhteenveto?.hitsisaumojen_pituus_m || 0,
    averageConfidence: yhteenveto?.keskimääräinen_luottamus || 0,
    totalItems: materiaalilista.length,
    weightPerMeter: (yhteenveto?.kokonaispaino_kg || 0) / (yhteenveto?.kokonaispituus_m || 1)
  };

  // Materiaalijakauma
  const materialDistribution = materiaalilista?.reduce((acc, material) => {
    const type = material.profiili?.match(/^([A-Z]+)/)?.[1] || 'OTHER';
    if (!acc[type]) acc[type] = { count: 0, weight: 0, items: 0 };
    acc[type].count += material.kappaleet || 0;
    acc[type].weight += material.kokonaispaino_kg || 0;
    acc[type].items += 1;
    return acc;
  }, {}) || {};

  // Materiaalien järjestys painon mukaan
  const sortedMaterials = Object.entries(materialDistribution)
    .sort(([,a], [,b]) => b.weight - a.weight);

  // Varmuustasot
  const confidenceLevels = {
    high: materiaalilista.filter(m => (m.luottamus || 0) >= 0.9).length,
    medium: materiaalilista.filter(m => (m.luottamus || 0) >= 0.7 && (m.luottamus || 0) < 0.9).length,
    low: materiaalilista.filter(m => (m.luottamus || 0) < 0.7).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-gray-900">Yhteenveto</h3>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
          {stats.totalItems} nimikettä
        </span>
      </div>

      {/* Pääindikaattorit */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Weight className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Kokonaispaino</span>
          </div>
          <p className="text-3xl font-bold text-blue-900 mb-1">
            {stats.totalWeight.toFixed(1)} kg
          </p>
          <p className="text-sm text-blue-600">
            {stats.weightPerMeter.toFixed(1)} kg/m
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Kokonaispituus</span>
          </div>
          <p className="text-3xl font-bold text-green-900 mb-1">
            {stats.totalLength.toFixed(1)} m
          </p>
          <p className="text-sm text-green-600">
            {stats.totalItems} nimikettä
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Profiilityypit</span>
          </div>
          <p className="text-3xl font-bold text-purple-900 mb-1">
            {stats.profileTypes}
          </p>
          <p className="text-sm text-purple-600">
            {stats.uniqueProfiles} eri profiilia
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Tunnistusvarmuus</span>
          </div>
          <p className="text-3xl font-bold text-orange-900 mb-1">
            {(stats.averageConfidence * 100).toFixed(0)}%
          </p>
          <p className="text-sm text-orange-600">
            keskimäärin
          </p>
        </div>
      </div>

      {/* Profiilijakauma */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Profiilijakauma
        </h4>
        
        <div className="space-y-4">
          {sortedMaterials.map(([type, data]) => {
            const percentage = (data.weight / stats.totalWeight) * 100;
            return (
              <div key={type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{type}-profiilit</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {data.weight.toFixed(1)} kg
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{data.count} kpl yhteensä</span>
                  <span>{data.items} nimikettä</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Laatutiedot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Tunnistuslaatu</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Korkea varmuus (≥90%):</span>
              <span className="font-medium text-green-600">{confidenceLevels.high} kpl</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Keskiverto (70-89%):</span>
              <span className="font-medium text-yellow-600">{confidenceLevels.medium} kpl</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Matala (70%):</span>
              <span className="font-medium text-red-600">{confidenceLevels.low} kpl</span>
            </div>
          </div>
          
          {confidenceLevels.low > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Huomio</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                {confidenceLevels.low} nimikkeellä matala tunnistusvarmuus. Suosittlemme manuaalista tarkistusta.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Rakennetiedot</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Projektin numero:</span>
              <span className="font-medium">{data?.perustiedot?.projekti_numero || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rakenteen nimi:</span>
              <span className="font-medium">{data?.perustiedot?.rakenteen_nimi || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Materiaaliluokka:</span>
              <span className="font-medium">{data?.perustiedot?.materiaaliluokka || 'S355'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mittakaava:</span>
              <span className="font-medium">{data?.perustiedot?.mittakaava || '-'}</span>
            </div>
            {stats.weldingLength > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Hitsisaumat:</span>
                <span className="font-medium">{stats.weldingLength.toFixed(1)} m</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Liitokset */}
      {liitokset && liitokset.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            Liitokset ({liitokset.length} kpl)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liitokset.map((liitos, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900 capitalize">{liitos.tyyppi}</span>
                  <span className="text-sm font-medium text-blue-600">{liitos.määrä} kpl</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{liitos.kuvaus}</p>
                <div className="text-xs text-gray-500 space-y-1">
                  {liitos.hitsipituus_mm && (
                    <div>Hitsipituus: {liitos.hitsipituus_mm} mm</div>
                  )}
                  {liitos.pulttikoko && (
                    <div>Pulttikoko: {liitos.pulttikoko}</div>
                  )}
                  {liitos.liitettävät_profiilit && (
                    <div>Profiilit: {liitos.liitettävät_profiilit.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Huomiot */}
      {data?.huomiot && data.huomiot.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-4">Analyysitiedot</h4>
          <div className="space-y-2">
            {data.huomiot.map((huomio, index) => (
              <div key={index} className="text-sm text-blue-800">
                • {huomio}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}