// src/components/SteelSummaryPanel.jsx - PÄIVITETTY OSTOLISTA

import { Calculator, ShoppingCart, AlertTriangle, Download } from 'lucide-react'

export default function SteelSummaryPanel({ data }) {
  const materiaalilista = data?.materiaalilista || []
  const yhteenveto = data?.yhteenveto || {}
  
  // Laske ostolista 5% hukalla
  const hukkaProsentti = 5
  const ostolista = materiaalilista.map(item => {
    if (!item.yhteispituus_mm) return null
    
    const yhteispituusMetria = item.yhteispituus_mm / 1000
    const hukkaKerroin = 1 + (hukkaProsentti / 100)
    const ostettavaMetria = yhteispituusMetria * hukkaKerroin
    
    return {
      ...item,
      yhteispituus_metria: yhteispituusMetria,
      ostettava_metria: ostettavaMetria,
      hukka_metria: ostettavaMetria - yhteispituusMetria
    }
  }).filter(Boolean)

  const kokonaisOstettava = ostolista.reduce((sum, item) => sum + item.ostettava_metria, 0)
  const kokonaisHukka = ostolista.reduce((sum, item) => sum + item.hukka_metria, 0)

  const exportData = () => {
    const csvData = [
      ['Profiili', 'Kappalemäärä', 'Pituus (mm)', 'Yhteispituus (m)', 'Ostettava (m)', 'Hukka (m)'],
      ...ostolista.map(item => [
        item.profiili,
        item.kappalemaara,
        item.pituus_mm,
        item.yhteispituus_metria.toFixed(2),
        item.ostettava_metria.toFixed(2),
        item.hukka_metria.toFixed(2)
      ])
    ]
    
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `ostolista_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 p-6 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            Ostolista
            <span className="text-sm font-normal text-gray-600">
              (+{hukkaProsentti}% hukka)
            </span>
          </h2>
          
          {ostolista.length > 0 && (
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              Lataa CSV
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {ostolista.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-yellow-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ei voida laskea ostolistaa
            </h3>
            <p className="text-gray-600">
              Täydennä materiaalilistan pituustiedot laskeaksesi ostotarpeet
            </p>
          </div>
        ) : (
          <>
            {/* Materiaalit */}
            <div className="space-y-3 mb-6">
              {ostolista.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{item.profiili}</h3>
                    <div className="text-sm text-gray-600">
                      {item.kappalemaara} kpl × {(item.pituus_mm / 1000).toFixed(1)}m
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Yhteispituus:</span>
                      <div className="font-medium text-blue-600">
                        {item.yhteispituus_metria.toFixed(1)} m
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Ostettava:</span>
                      <div className="font-medium text-green-600">
                        {item.ostettava_metria.toFixed(1)} m
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Hukka:</span>
                      <div className="font-medium text-orange-600">
                        {item.hukka_metria.toFixed(1)} m
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Yhteenveto */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Ostolistan yhteenveto
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Materiaalit:</span>
                  <div className="font-semibold text-gray-900">
                    {yhteenveto.profiilityyppien_lkm || 0} tyyppiä
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Kappaleet:</span>
                  <div className="font-semibold text-gray-900">
                    {yhteenveto.yhteensa_kappaleita || 0} kpl
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Tarvitaan:</span>
                  <div className="font-semibold text-blue-600">
                    {(yhteenveto.yhteispituus_metria || 0).toFixed(1)} m
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Ostettava:</span>
                  <div className="font-semibold text-green-600">
                    {kokonaisOstettava.toFixed(1)} m
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Hukka yhteensä ({hukkaProsentti}%):
                  </span>
                  <span className="font-semibold text-orange-600">
                    {kokonaisHukka.toFixed(1)} m
                  </span>
                </div>
              </div>
            </div>

            {/* Huomiot */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
              <div className="font-medium mb-1">Huomioitavaa:</div>
              <ul className="space-y-1 text-xs">
                <li>• Hukkaprosentti ({hukkaProsentti}%) on arvio normaalista leikkuu- ja valmistushukasta</li>
                <li>• Tarkista saatavat standardipituudet toimittajalta</li>
                <li>• Varmista toleranssit ja materiaalimerkinnät</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}