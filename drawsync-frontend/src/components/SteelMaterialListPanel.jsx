// src/components/SteelMaterialListPanel.jsx - KORJATTU YHTEISPITUUDEN PÄIVITYS

import { useState, useEffect } from 'react'
import { Package, Edit3, Calculator, Check, X } from 'lucide-react'

export default function SteelMaterialListPanel({ data, editedData, onFieldSave }) {
  const [editingItem, setEditingItem] = useState(null)
  const [editValues, setEditValues] = useState({})

  const materiaalilista = data?.materiaalilista || []

  // ✅ KORJAUS: Laske yhteenveto dynaamisesti aina kun materiaalilista muuttuu
  useEffect(() => {
    if (materiaalilista.length > 0) {
      updateSummary(materiaalilista)
    }
  }, [materiaalilista]) // Päivitys kun materiaalilista muuttuu

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

    // ✅ KORJAUS: Tallenna muutokset ENSIN
    onFieldSave('materiaalilista', updatedList)
    
    // ✅ KORJAUS: Laske yhteenveto heti päivitetyn listan perusteella
    updateSummary(updatedList)
    
    setEditingItem(null)
    setEditValues({})
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditValues({})
  }

  // ✅ KORJAUS: Parannettu updateSummary funktio
  const updateSummary = (list) => {
    // Laske yhteenveto vain materiaaleista joilla on yhteispituus_mm
    const validItems = list.filter(item => item.yhteispituus_mm > 0)
    
    const yhteenveto = {
      profiilityyppien_lkm: list.length,
      yhteensa_kappaleita: list.reduce((sum, item) => sum + (item.kappalemaara || 0), 0),
      yhteispituus_metria: list.reduce((sum, item) => {
        const yhteispituusMm = item.yhteispituus_mm || 0
        return sum + (yhteispituusMm / 1000)
      }, 0)
    }
    
    console.log('🔄 Päivitetään yhteenveto:', yhteenveto) // Debug log
    
    // Tallenna päivitetty yhteenveto
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

  // ✅ KORJAUS: Laske yhteenveto dynaamisesti komponentissa näytettäväksi
  const dynaamineenYhteenveto = {
    profiilityyppien_lkm: materiaalilista.length,
    yhteensa_kappaleita: materiaalilista.reduce((sum, item) => sum + (item.kappalemaara || 0), 0),
    yhteispituus_metria: materiaalilista.reduce((sum, item) => {
      const yhteispituusMm = item.yhteispituus_mm || 0
      return sum + (yhteispituusMm / 1000)
    }, 0)
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
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Ei materiaaleja löytynyt piirustuksesta</p>
          </div>
        ) : (
          <div className="space-y-4">
            {materiaalilista.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {item.profiili}
                    </h3>
                    
                    {/* Varmuustaso */}
                    {item.pituus_varmuus && (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        getConfidenceColor(item.pituus_varmuus)
                      }`}>
                        {getConfidenceText(item.pituus_varmuus)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Muokkaustila */}
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
                          {item.pituus_mm ? 
                            `${item.pituus_mm.toLocaleString()} mm` : 'Ei tietoa'}
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
            ))}
          </div>
        )}

        {/* ✅ KORJAUS: Käytä dynaamista yhteenvetoa */}
        {materiaalilista.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Yhteenveto (päivittyy reaaliajassa)
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Profiilityypit:</span>
                <div className="font-semibold text-blue-900">
                  {dynaamineenYhteenveto.profiilityyppien_lkm || 0}
                </div>
              </div>
              <div>
                <span className="text-blue-700">Yhteensä kappaleita:</span>
                <div className="font-semibold text-blue-900">
                  {dynaamineenYhteenveto.yhteensa_kappaleita || 0} kpl
                </div>
              </div>
              <div>
                <span className="text-blue-700">Yhteispituus:</span>
                <div className="font-semibold text-blue-900">
                  {dynaamineenYhteenveto.yhteispituus_metria ? 
                    `${dynaamineenYhteenveto.yhteispituus_metria.toFixed(1)} m` : 
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