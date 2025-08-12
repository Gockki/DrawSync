// src/components/ActionButtons.jsx
import React, { useState } from "react";
import { Save, FileDown, Eye } from "lucide-react";
import QuotePreviewModal from './QuotePreviewModal';

export default function ActionButtons({
  onSaveProject,
  onGenerateQuote,
  disabledSave,
  disabledQuote,
  saving,
  saveSuccess,
  pricing,
  analysisData,
  organization
}) {
  const [showQuotePreview, setShowQuotePreview] = useState(false);

  // Mock customer data - korvaa tämä oikeilla asiakastiedoilla
  const customerData = {
    name: analysisData?.perustiedot?.asiakasnimi || '',
    email: analysisData?.perustiedot?.asiakasemail || '',
    company: analysisData?.perustiedot?.asiakasyritys || '',
    phone: analysisData?.perustiedot?.asiakaspuhelin || ''
  };

  const handleQuotePreview = () => {
    setShowQuotePreview(true);
  };

  const handleSendQuote = async (emailSubject, emailMessage,customerData) => {
    if (!"jere@mantox.fi") {
      throw new Error('Asiakkaan sähköpostiosoite puuttuu');
    }

    try {
      // Lähetetään tarjous (käytetään olemassaolevaa logiikkaa)
      await onGenerateQuote("jere@mantox.fi", emailSubject, emailMessage);
    } catch (error) {
      throw new Error('Tarjouksen lähettäminen epäonnistui: ' + error.message);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <button
          onClick={onSaveProject}
          disabled={disabledSave}
          className={`flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg transition-all duration-200 shadow-sm ${
            saveSuccess
              ? "bg-green-100 text-green-800 border border-green-200 cursor-not-allowed"
              : disabledSave
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
          }`}
        >
          <Save className="h-4 w-4" />
          {saving
            ? "Tallennetaan..."
            : saveSuccess
            ? "✅ Tallennettu"
            : "Tallenna"}
        </button>

        <button
          onClick={handleQuotePreview}
          disabled={disabledQuote}
          className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 shadow-lg ${
            !disabledQuote
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
        >
          <Eye className="h-4 w-4" />
          📧 Esikatsele & lähetä tarjous
        </button>
      </div>

      {/* Quote Preview Modal */}
      <QuotePreviewModal
        isOpen={showQuotePreview}
        onClose={() => setShowQuotePreview(false)}
        quoteData={{
          product_name: analysisData?.perustiedot?.tuotenimi || analysisData?.perustiedot?.tuotekoodi || 'Tuote',
          product_code: analysisData?.perustiedot?.tuotekoodi || '',
          material: analysisData?.perustiedot?.materiaali || '',
          total_price: pricing?.total || 0
        }}
        customerData={customerData}
        organizationData={organization}
        onSend={handleSendQuote}
        onEdit={() => setShowQuotePreview(false)}
      />
    </>
  );
}