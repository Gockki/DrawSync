import React from "react";
import { ExternalLink, FileText, Image as ImageIcon } from "lucide-react";

export default function ImagePreview({ url, filename, fileType }) {
  if (!url) return null;

  const isPDF = fileType === 'pdf' || filename?.toLowerCase().endsWith('.pdf');
  const isImage = !isPDF && (fileType === 'image' || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename || ''));

  // Avaa uudessa ikkunassa
  const openInNewWindow = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-6 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {isPDF ? <FileText className="h-5 w-5 text-red-600" /> : <ImageIcon className="h-5 w-5 text-blue-600" />}
            Esikatselu {isPDF && '(PDF)'}
          </h3>
          
          {/* Avaa uudessa ikkunassa -nappi */}
          <button
            onClick={openInNewWindow}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            title="Avaa koko näkymässä uudessa ikkunassa"
          >
            <ExternalLink className="h-4 w-4" />
            Avaa uudessa ikkunassa
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {isPDF ? (
          // PDF: Näytä klikkattava alue ja thumbnail jos saatavilla
          <div 
            onClick={openInNewWindow}
            className="cursor-pointer group border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg p-8 text-center transition-all"
          >
            <FileText className="h-16 w-16 mx-auto mb-4 text-red-600 group-hover:text-red-700" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">PDF-piirustus</h4>
            <p className="text-gray-600 mb-4">
              {filename || 'Piirustustiedosto'}
            </p>
            <p className="text-blue-600 font-medium flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Klikkaa avataksesi PDF uudessa ikkunassa
            </p>
          </div>
        ) : (
          // Kuva: Näytä esikatselu + klikkattava
          <div className="space-y-4">
            <img
              src={url}
              alt="Preview"
              className="w-full h-auto rounded-lg shadow-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={openInNewWindow}
              title="Klikkaa avataksesi koko koossa"
            />
            <div className="text-center">
              <button
                onClick={openInNewWindow}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Avaa koko koossa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}