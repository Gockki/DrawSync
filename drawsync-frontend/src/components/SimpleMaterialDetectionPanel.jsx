import React, { useState } from "react";
import { Package, AlertTriangle, Eye, CheckCircle, Search } from "lucide-react";

export default function SimpleMaterialDetectionPanel({ data, editedData, onFieldSave }) {
  const [sortBy, setSortBy] = useState('maininnat'); // 'maininnat', 'profiili'
  const materiaalilista = data.materiaalilista || [];
  const insinöörinTarkistettavaa = data.insinöörin_tarkistettavaa || [];

  // Järjestä materiaalit
  const sortedMaterials = [...materiaalilista].sort((a, b) => {
    switch (sortBy) {
      case 'maininnat':
        return (b.maininnat_kuvassa || 0) - (a.maininnat_kuvassa || 0);
      case 'profiili':
        return a.profiili?.localeCompare(b.profiili) || 0;
      default:
        return 0;
    }
  });

  const getConfidenceColor = (material) => {
    const hasLength = material.selkeä_pituus_mm;
    const mentions = material.maininnat_kuvassa || 0;
    
    if (hasLength && mentions > 0) return 'border-green-200 bg-green-50';
    if (mentions > 0) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  const getConfidenceIcon = (material) => {
    const hasLength = material.selkeä_pituus_mm;
    const mentions = material.maininnat_kuvassa || 0;
    
    if (hasLength && mentions > 0) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (mentions > 0) return <Search className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  if (materiaalilista.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Materiaalien tunnistus</h3>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Ei materiaaleja tunnistettu analyysistä</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Materiaalien tunnistus</h3>
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
            <option value="maininnat">Mainintojen mukaan</option>
            <option value="profiili">Profiilin mukaan</option>
          </select>
        </div>
      </div>

      {/* Materiaalit listana */}
      <div className="space-y-4">
        {sortedMaterials.map((material, index) => (
          <div key={index} className={`border-2 rounded-xl p-6 ${getConfidenceColor(material)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                {/* Profiilitieto */}
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600 mb-1">
                    {material.profiili || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1 justify-center">
                    {getConfidenceIcon(material)}
                    <span className="text-xs text-gray-500">
                      {material.selkeä_pituus_mm ? 'Pituus OK' : 'Tarkista pituus'}
                    </span>
                  </div>
                </div>

                {/* Pääinfo */}
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Mainintoja kuvassa</div>
                      <div className="font-bold text-2xl text-blue-600">
                        {material.maininnat_kuvassa || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        OCR-tunnistus
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Selkeä pituus</div>
                      <div className="font-semibold text-lg">
                        {material.selkeä_pituus_mm ? 
                          `${material.selkeä_pituus_mm} mm` : 
                          'Ei tiedossa'
                        }
                      </div>
                      {material.epävarma_pituus_mm && (
                        <div className="text-xs text-orange-600">
                          Epävarma: {material.epävarma_pituus_mm} mm
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Sijainti</div>
                      <div className="text-sm">
                        {material.sijainti_kuvassa || 'Ei määritelty'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Huomiot */}
            {material.huomiot && (
              <div className="mt-3 p-3 bg-white/70 rounded-lg border">
                <div className="text-sm font-medium text-gray-700 mb-1">Huomiot:</div>
                <div className="text-sm text-gray-600">{material.huomiot}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Yhteenveto */}
      {data.yhteenveto && (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">📊 Tunnistuksen yhteenveto</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.yhteenveto.profiilityyppien_lkm || materiaalilista.length}
              </div>
              <div className="text-sm text-gray-600">Profiilityypit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.yhteenveto.yhteensä_mainintoja || 
                 materiaalilista.reduce((sum, m) => sum + (m.maininnat_kuvassa || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Mainintoja yhteensä</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {materiaalilista.filter(m => m.selkeä_pituus_mm).length}
              </div>
              <div className="text-sm text-gray-600">Selkeät pituudet</div>
            </div>
          </div>
        </div>
      )}

      {/* Insinöörin tarkistettavaa */}
      {insinöörinTarkistettavaa.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h4 className="font-semibold text-yellow-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Insinöörin tarkistettavaa ({insinöörinTarkistettavaa.length} kohtaa)
          </h4>
          <ul className="space-y-2">
            {insinöörinTarkistettavaa.map((item, index) => (
              <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
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
              <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
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