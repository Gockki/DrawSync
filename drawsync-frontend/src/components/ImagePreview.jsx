import React from "react";

export default function ImagePreview({ url }) {
  if (!url) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Esikatselu</h3>
      </div>
      <div className="p-6">
        <img
          src={url}
          alt="Preview"
          className="w-full h-auto rounded-lg shadow-sm"
        />
      </div>
    </div>
  );
}
