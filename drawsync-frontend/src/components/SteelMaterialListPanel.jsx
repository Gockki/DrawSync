import React, { useState } from "react";
import { Package, Weight, Ruler, TrendingUp, AlertTriangle, CheckCircle, Eye } from "lucide-react";

export default function SteelMaterialListPanel({ data, editedData, onFieldSave }) {
  const [sortBy, setSortBy] = useState('paino'); // 'paino', 'profiili', 'luottamus', 'maininnat'
  const materiaalilista = data.materiaalilista || [];

  // Järjestä materiaalit
  const sortedMaterials = [...materiaalilista].sort((a, b) => {
    switch (sortBy) {
      case 'paino':
        return (b.kokonaispaino_kg || 0) - (a.kokonaispaino_kg || 0);
      case 'profiili':
        return a.profiili?.localeCompare(b.profiili) || 0;
      case 'maininnat':
        return (b.maininnat_kuvassa || 0) - (a.maininnat_kuvassa || 0);
      case 'luottamus':
        return (b.luottamus || 0) - (a.luottamus || 0);
      default:
        return 0;
    }
  });

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4" />;
    if (confidence >= 0.6) return <Eye className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  if (materiaalilista.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Materiaalilista</h3>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Ei materiaaleja löydetty analyysistä</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Materiaalilista</h3>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
            {materiaalilista.length} materiaalia
          </span>
        </div>

        {/* Järjestysvalinnat */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Järjestä:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="paino">Painon mukaan</option>
            <option value="profiili">Profiilin mukaan</option>
            <option value="maininnat">Mainintojen mukaan</option>
            <option value="luottamus">Luottamuksen mukaan</option>
          </select>
        </div>
      </div>

      {/* Materiaalit listana */}
      <div className="space-y-4">
        {sortedMaterials.map((material, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                {/* Profiilitieto */}
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600 mb-1">
                    {material.profiili || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {material.kuvaus || 'Ei kuvausta'}
                  </div>
                </div>

                {/* Pääinfo */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Mainintoja</div>
                      <div className="font-semibold text-lg">
                        {material.maininnat_kuvassa || 'N/A'} kpl
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Pituus</div>
                      <div className="font-semibold">
                        {material.pituus_mm ? `${material.pituus_mm} mm` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Paino/m</div>
                      <div className="font-semibold">
                        {material.kg_per_m ? `${material.kg_per_m} kg/m` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Kokonaispaino</div>
                      <div className="font-bold text-lg text-green-600">
                        {material.kokonaispaino_kg ? `${material.kokonaispaino_kg.toFixed(1)} kg` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Luottamus-indikaattori */}
              {material.luottamus && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(material.luottamus)}`}>
                  {getConfidenceIcon(material.luottamus)}
                  <span>{(material.luottamus * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            {/* Lisätiedot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <div className="text-xs text-gray-500 mb-1">Materiaali</div>
                <div className="text-sm font-medium">
                  {material.materiaali || 'Ei määritelty'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Sijainti</div>
                <div className="text-sm">
                  {material.sijainti_kuvassa || 'Ei määritelty'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Tunnistustapa</div>
                <div className="text-sm">
                  {material.tunnistustapa || 'Google OCR'}
                </div>
              </div>
            </div>

            {/* Kokonaispituus jos määritelty */}
            {material.kokonaispituus_m && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">Kokonaispituus:</span> {material.kokonaispituus_m.toFixed(1)} m
                  {material.mainintojen_lkm && (
                    <span className="text-gray-600 ml-2">
                      (mainintoja: {material.mainintojen_lkm})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Huomiot jos olemassa */}
            {material.huomiot && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>Huomio:</strong> {material.huomiot}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Yhteenveto */}
      {data.yhteenveto && (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">📊 Materiaalien yhteenveto</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600 mb-1">Profiilityypit</div>
              <div className="font-bold text-lg text-blue-600">
                {data.yhteenveto.profiilityyppien_lkm || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Mainintoja yhteensä</div>
              <div className="font-bold text-lg text-green-600">
                {data.yhteenveto.yhteensä_mainintoja || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Kokonaispaino</div>
              <div className="font-bold text-lg text-purple-600">
                {data.yhteenveto.kokonaispaino_kg ? `${data.yhteenveto.kokonaispaino_kg.toFixed(1)} kg` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Kokonaispituus</div>
              <div className="font-bold text-lg text-orange-600">
                {data.yhteenveto.kokonaispituus_m ? `${data.yhteenveto.kokonaispituus_m.toFixed(1)} m` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insinöörin tarkistettavaa */}
      {data.insinöörin_tarkistettavaa && data.insinöörin_tarkistettavaa.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Insinöörin tarkistettavaa ({data.insinöörin_tarkistettavaa.length} kohtaa)
          </h4>
          <ul className="space-y-2">
            {data.insinöörin_tarkistettavaa.map((item, index) => (
              <li key={index} className="text-orange-800 text-sm flex items-start gap-2">
                <span className="text-orange-600 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analyysin huomiot */}
      {data.huomiot && data.huomiot.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-3">💡 Analyysin huomiot</h4>
          <ul className="space-y-2">
            {data.huomiot.map((huomio, index) => (
              <li key={index} className="text-blue-800 text-sm flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{huomio}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}