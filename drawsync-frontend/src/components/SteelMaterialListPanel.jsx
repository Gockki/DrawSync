// src/components/SteelMaterialListPanel.jsx - PÄIVITETTY UUDELLE KONFIGURAATIOLLE

import { useState } from 'react'
import { Package, Edit3, Calculator, Check, X } from 'lucide-react'

export default function SteelMaterialListPanel({ data, editedData, onFieldSave }) {
  const [editingItem, setEditingItem] = useState(null)
  const [editValues, setEditValues] = useState({})

  const materiaalilista = data?.materiaalilista || []

  const startEdit = (index, item) => {
    setEditingItem(index)
    setEditValues({
      kappalemaara: item.kappalemaara || '',
      pituus_mm: item.pituus_mm || ''
    })
  }

  const saveEdit = (index) => {
    const updatedList = [...materiaalilista]
    const item = updatedList[index]
    
    // Päivitä arvot
    item.kappalemaara = parseInt(editValues.kappalemaara) || 0
    item.pituus_mm = parseInt(editValues.pituus_mm) || null
    
    // Laske yhteispituus
    if (item.kappalemaara && item.pituus_mm) {
      item.yhteispituus_mm = item.kappalemaara * item.pituus_mm
    } else {
      item.yhteispituus_mm = null
    }

    // Tallenna muutokset
    onFieldSave('materiaalilista', updatedList)
    
    // Laske yhteenveto uudelleen
    updateSummary(updatedList)
    
    setEditingItem(null)
    setEditValues({})
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditValues({})
  }

  const updateSummary = (list) => {
    const yhteenveto = {
      profiilityyppien_lkm: list.length,
      yhteensa_kappaleita: list.reduce((sum, item) => sum + (item.kappalemaara || 0), 0),
      yhteispituus_metria: list.reduce((sum, item) => sum + ((item.yhteispituus_mm || 0) / 1000), 0)
    }
    
    onFieldSave('yhteenveto', yhteenveto)
  }

  const getConfidenceColor = (varmuus) => {
    switch(varmuus) {
      case 'korkea': return 'text-green-600 bg-green-50'
      case 'keskitaso': return 'text-yellow-600 bg-yellow-50'
      case 'matala': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getConfidenceText = (varmuus) => {
    switch(varmuus) {
      case 'korkea': return 'Varma'
      case 'keskitaso': return 'Todennäköinen'
      case 'matala': return 'Epävarma'
      default: return 'Ei tietoa'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Materiaalilista
          <span className="text-sm font-normal text-gray-600">
            ({materiaalilista.length} materiaalia)
          </span>
        </h2>
      </div>

      <div className="p-6">
        {materiaalilista.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Ei materiaaleja tunnistettu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {materiaalilista.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Profiili */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-blue-600">
                        {item.profiili}
                      </h3>
                      
                      {/* Pituuden varmuus badge */}
                      {item.pituus_varmuus && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(item.pituus_varmuus)}`}>
                          {getConfidenceText(item.pituus_varmuus)}
                        </span>
                      )}
                    </div>

                    {/* Editointi-tila */}
                    {editingItem === index ? (
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kappalemäärä
                          </label>
                          <input
                            type="number"
                            value={editValues.kappalemaara}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              kappalemaara: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pituus (mm)
                          </label>
                          <input
                            type="number"
                            value={editValues.pituus_mm}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              pituus_mm: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Pituus mm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Kappalemäärä:</span>
                          <div className="font-semibold">
                            {item.kappalemaara ? `${item.kappalemaara} kpl` : 'Ei määritelty'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Pituus:</span>
                          <div className="font-semibold">
                            {item.pituus_mm ? `${item.pituus_mm.toLocaleString()} mm` : 'Ei tietoa'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Yhteispituus:</span>
                          <div className="font-semibold">
                            {item.yhteispituus_mm ? 
                              `${(item.yhteispituus_mm / 1000).toFixed(1)} m` : 
                              'Lasketaan kun tiedot täytetty'
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tunnistustapa */}
                    {item.tunnistustapa && (
                      <div className="text-xs text-gray-500 mb-2">
                        Tunnistettu: {item.tunnistustapa}
                      </div>
                    )}

                    {/* Puuttuvat tiedot varoitus */}
                    {(!item.kappalemaara || !item.pituus_mm) && editingItem !== index && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-800">
                        Puuttuvia tietoja - klikkaa muokkaa täydentääksesi
                      </div>
                    )}
                  </div>

                  {/* Toimintopainikkeet */}
                  <div className="flex items-center gap-2 ml-4">
                    {editingItem === index ? (
                      <>
                        <button
                          onClick={() => saveEdit(index)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="Tallenna"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                          title="Peruuta"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(index, item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Muokkaa"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Yhteenveto */}
        {data?.yhteenveto && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Yhteenveto
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Profiilityypit:</span>
                <div className="font-semibold text-blue-900">
                  {data.yhteenveto.profiilityyppien_lkm || 0}
                </div>
              </div>
              <div>
                <span className="text-blue-700">Yhteensä kappaleita:</span>
                <div className="font-semibold text-blue-900">
                  {data.yhteenveto.yhteensa_kappaleita || 0} kpl
                </div>
              </div>
              <div>
                <span className="text-blue-700">Yhteispituus:</span>
                <div className="font-semibold text-blue-900">
                  {data.yhteenveto.yhteispituus_metria ? 
                    `${data.yhteenveto.yhteispituus_metria.toFixed(1)} m` : 
                    '0 m'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}