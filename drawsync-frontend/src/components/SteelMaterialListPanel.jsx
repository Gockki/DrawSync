// src/components/SteelMaterialListPanel.jsx - KORJATTU VERSIO

import { useState, useEffect } from 'react'
import { Package, Edit3, Calculator, Check, X, Plus, Trash2 } from 'lucide-react'

export default function SteelMaterialListPanel({ data, editedData, onFieldSave }) {
  const [editingItem, setEditingItem] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMaterial, setNewMaterial] = useState({
    profiili: '',
    kappalemaara: '',
    pituus_mm: ''
  })

  // ✅ KORJAUS 1: Käytä editedData jos saatavilla, muuten data
  const materiaalilista = (editedData?.materiaalilista || data?.materiaalilista || [])

  // ✅ KORJAUS 2: Kuuntele sekä data että editedData muutoksia
  useEffect(() => {
    if (materiaalilista.length > 0) {
      updateSummary(materiaalilista)
    }
  }, [materiaalilista, data, editedData]) // Lisätty data ja editedData

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

    // ✅ KORJAUS 3: Tallenna materiaalilista ENSIN, sitten yhteenveto
    onFieldSave('materiaalilista', updatedList)
    
    // ✅ KORJAUS 4: Käytä setTimeout:ia varmistaaksesi että state on päivittynyt
    setTimeout(() => {
      updateSummary(updatedList)
    }, 10)
    
    setEditingItem(null)
    setEditValues({})
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditValues({})
  }

  // ✅ KORJAUS 5: Parannettu addNewMaterial-funktio
  const addNewMaterial = () => {
    if (!newMaterial.profiili.trim()) {
      alert('Anna materiaalin nimi (esim. IPE200)')
      return
    }

    const kappalemaara = parseInt(newMaterial.kappalemaara) || 0
    const pituus_mm = parseInt(newMaterial.pituus_mm) || null

    const newItem = {
      profiili: newMaterial.profiili.trim().toUpperCase(),
      kappalemaara,
      pituus_mm,
      yhteispituus_mm: kappalemaara && pituus_mm ? kappalemaara * pituus_mm : null,
      pituus_varmuus: 'manuaalinen',
      tunnistustapa: 'Manuaalisesti lisätty'
    }

    const updatedList = [...materiaalilista, newItem]
    
    console.log('📦 Lisätään uusi materiaali:', newItem)
    console.log('📋 Päivitetty lista:', updatedList)
    
    // ✅ KORJAUS 6: Tallenna materiaalilista ja pakota komponentin uudelleenrenderöinti
    onFieldSave('materiaalilista', updatedList)
    
    // Päivitä yhteenveto hieman myöhemmin
    setTimeout(() => {
      updateSummary(updatedList)
    }, 10)

    // Tyhjennä lomake
    setNewMaterial({ profiili: '', kappalemaara: '', pituus_mm: '' })
    setShowAddForm(false)
  }

  const cancelAddMaterial = () => {
    setNewMaterial({ profiili: '', kappalemaara: '', pituus_mm: '' })
    setShowAddForm(false)
  }

  // ✅ KORJAUS 7: Parannettu removeMaterial-funktio
  const removeMaterial = (index) => {
    if (confirm('Haluatko varmasti poistaa tämän materiaalin?')) {
      const updatedList = materiaalilista.filter((_, i) => i !== index)
      
      console.log('🗑️ Poistetaan materiaali indeksistä:', index)
      console.log('📋 Päivitetty lista poiston jälkeen:', updatedList)
      
      onFieldSave('materiaalilista', updatedList)
      
      // Päivitä yhteenveto
      setTimeout(() => {
        updateSummary(updatedList)
      }, 10)
    }
  }

  const updateSummary = (list) => {
    const yhteenveto = {
      profiilityyppien_lkm: list.length,
      yhteensa_kappaleita: list.reduce((sum, item) => sum + (item.kappalemaara || 0), 0),
      yhteispituus_metria: list.reduce((sum, item) => {
        const yhteispituusMm = item.yhteispituus_mm || 0
        return sum + (yhteispituusMm / 1000)
      }, 0)
    }
    
    console.log('🔄 Päivitetään yhteenveto:', yhteenveto)
    onFieldSave('yhteenveto', yhteenveto)
  }

  const getConfidenceColor = (varmuus) => {
    if (varmuus === 'manuaalinen') return 'text-blue-600 bg-blue-50'
    switch(varmuus) {
      case 'korkea': return 'text-green-600 bg-green-50'
      case 'keskitaso': return 'text-yellow-600 bg-yellow-50'
      case 'matala': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getConfidenceText = (varmuus) => {
    if (varmuus === 'manuaalinen') return 'Manuaalinen'
    switch(varmuus) {
      case 'korkea': return 'Varma'
      case 'keskitaso': return 'Todennäköinen'
      case 'matala': return 'Epävarma'
      default: return 'Ei tietoa'
    }
  }

  // ✅ KORJAUS 8: Dynaaminen yhteenveto joka laskee reaaliajassa
  const dynaamineenYhteenveto = {
    profiilityyppien_lkm: materiaalilista.length,
    yhteensa_kappaleita: materiaalilista.reduce((sum, item) => sum + (item.kappalemaara || 0), 0),
    yhteispituus_metria: materiaalilista.reduce((sum, item) => {
      const yhteispituusMm = item.yhteispituus_mm || 0
      return sum + (yhteispituusMm / 1000)
    }, 0)
  }

  // ✅ DEBUG: Logita tilan muutokset
  useEffect(() => {
    console.log('📊 Materiaalilistan tila:', {
      data_materiaalilista: data?.materiaalilista?.length || 0,
      editedData_materiaalilista: editedData?.materiaalilista?.length || 0,
      active_materiaalilista: materiaalilista.length,
      showAddForm,
      yhteenveto: dynaamineenYhteenveto
    })
  }, [materiaalilista, data, editedData, showAddForm])

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Materiaalilista
            <span className="text-sm font-normal text-gray-600">
              ({materiaalilista.length} materiaalia)
            </span>
          </h2>
          
          {/* Lisää materiaali nappi */}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Lisää materiaali
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Lisää materiaali lomake */}
        {showAddForm && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-md font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Lisää uusi materiaali
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profiili *
                </label>
                <input
                  type="text"
                  value={newMaterial.profiili}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, profiili: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="esim. IPE300, HEA200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kappalemäärä
                </label>
                <input
                  type="number"
                  value={newMaterial.kappalemaara}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, kappalemaara: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="kpl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pituus (mm)
                </label>
                <input
                  type="number"
                  value={newMaterial.pituus_mm}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, pituus_mm: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="mm"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={addNewMaterial}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Check className="h-4 w-4" />
                Lisää listaan
              </button>
              <button
                onClick={cancelAddMaterial}
                className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                <X className="h-4 w-4" />
                Peruuta
              </button>
            </div>
          </div>
        )}

        {materiaalilista.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Ei materiaaleja löytynyt piirustuksesta</p>
            <p className="text-sm mt-1">Klikkaa "Lisää materiaali" lisätäksesi manuaalisesti</p>
          </div>
        ) : (
          <div className="space-y-4">
            {materiaalilista.map((item, index) => (
              <div key={`material-${index}-${item.profiili}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow relative">
                
                {/* Poista materiaali nappi (vain manuaalisesti lisätyille) */}
                {item.tunnistustapa === 'Manuaalisesti lisätty' && (
                  <button
                    onClick={() => removeMaterial(index)}
                    className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Poista materiaali"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

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
                <div className="flex items-center gap-2 mt-3">
                  {editingItem === index ? (
                    <>
                      <button
                        onClick={() => saveEdit(index)}
                        className="flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded-md transition-colors text-sm"
                      >
                        <Check className="h-4 w-4" />
                        Tallenna
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:bg-gray-50 rounded-md transition-colors text-sm"
                      >
                        <X className="h-4 w-4" />
                        Peruuta
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(index, item)}
                      className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm"
                    >
                      <Edit3 className="h-4 w-4" />
                      Muokkaa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Yhteenveto */}
        {materiaalilista.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Yhteenveto 
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