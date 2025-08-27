// src/components/QuotePreviewModal.jsx
import { useState } from 'react'
import { FileText, X, Edit3, Send, User, Mail } from 'lucide-react'

const QuotePreviewModal = ({ 
  isOpen, 
  onClose, 
  quoteData, 
  customerData: initialCustomerData, 
  organizationData,
  onSend, 
  onEdit 
}) => {
  const [emailSubject, setEmailSubject] = useState(
    `Tarjous - ${quoteData?.product_name || 'Tuote'}`
  )
  
  const [emailMessage, setEmailMessage] = useState(`Hei,

Kiitos yhteydenotostanne. Liitteenä tarjouksemme tuotteelle ${quoteData?.product_name || 'tuotteelle'}.

Tarjous sisältää:
• Materiaalikustannukset
• Pinnoituskäsittelyt  
• Työstökustannukset
• Toimitusajan arvion

Mikäli teillä on kysyttävää tarjouksesta, ottakaa rohkeasti yhteyttä.

Ystävällisin terveisin,
${organizationData?.name || 'Tiimimme'}`)

  // ✅ Local state for customer data (editable)
  const [customerData, setCustomerData] = useState(initialCustomerData || {
    name: '',
    email: 'jere@mantox.fi', // Default to allowed email
    company: '',
    phone: ''
  })

  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

const handleSend = async () => {
    // Email validation
    if (!customerData.email) {
      alert('Sähköpostiosoite on pakollinen')
      return
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerData.email)) {
      alert('Virheellinen sähköpostiosoite')
      return
    }
    
    setIsLoading(true)
    try {
      // Use customer's actual email address
      await onSend(customerData.email, emailSubject, emailMessage, customerData)
      onClose()
    } catch (error) {
      console.error('Failed to send quote:', error)
      alert('Tarjouksen lähettäminen epäonnistui: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                📧 Tarjous - Esikatselu
              </h2>
              <p className="text-gray-600">
                Tarkista tiedot ja muokkaa viestiä ennen lähettämistä
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Recipient Info - Editable */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Vastaanottajan tiedot
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asiakkaan nimi:
                </label>
                <input
                  type="text"
                  value={customerData?.name || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Asiakkaan nimi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sähköposti: *
                </label>
                <input
                  type="email"
                  value={customerData?.email || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="jere@mantox.fi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yritys:
                </label>
                <input
                  type="text"
                  value={customerData?.company || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Yrityksen nimi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puhelin:
                </label>
                <input
                  type="tel"
                  value={customerData?.phone || ''}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+358 40 123 4567"
                />
              </div>
            </div>
            
            {/* Email restriction notice */}
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Huomio:</strong> Ilman custom domain:ia viestit voidaan lähettää vain osoitteeseen <code>jere@mantox.fi</code>
              </p>
            </div>
          </div>

          {/* Email Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📧 Sähköpostin aihe:
            </label>
            <input 
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tarjouksen aihe..."
            />
          </div>

          {/* Email Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ✍️ Saateviesti:
            </label>
            <textarea 
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Kirjoita saateviesti..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Voit muokata viestiä tarpeidesi mukaan
            </p>
          </div>

          {/* Quote Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tarjouksen yhteenveto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Tuote:</span>
                <p className="font-medium">{quoteData?.product_name || 'Ei määritelty'}</p>
              </div>
              <div>
                <span className="text-gray-600">Tuotekoodi:</span>
                <p className="font-medium">{quoteData?.product_code || 'Ei määritelty'}</p>
              </div>
              <div>
                <span className="text-gray-600">Materiaali:</span>
                <p className="font-medium">{quoteData?.material || 'Ei määritelty'}</p>
              </div>
              <div>
                <span className="text-gray-600">Kokonaishinta:</span>
                <p className="font-bold text-lg text-blue-600">
                  {quoteData?.total_price ? `${quoteData.total_price.toFixed(2)} €` : 'Ei määritelty'}
                </p>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              📎 Liitteet
            </h3>
            <div className="flex items-center gap-3 p-3 bg-white rounded border border-green-200">
              <FileText className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium">Tarjous_{quoteData?.product_code || 'tuote'}.pdf</p>
                <p className="text-sm text-gray-600">PDF-tarjous automaattisesti generoitu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button 
              onClick={onEdit}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 justify-center"
            >
              <Edit3 className="h-4 w-4" />
              Muokkaa tarjousta
            </button>
            
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Peruuta
            </button>
            
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 justify-center font-medium"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Lähetetään...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Lähetä tarjous (→ jere@mantox.fi)
                </>
              )}
            </button>
          </div>
          
          <p className="text-yellow-600 text-sm mt-2 text-center">
            💡 Demo-tilassa kaikki tarjoukset lähetetään osoitteeseen jere@mantox.fi
          </p>
        </div>
      </div>
    </div>
  )
}

export default QuotePreviewModal