import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function StatusOverview({ success, filename, hasMeasurement, pricing }) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="text-xs uppercase text-gray-500 mb-2 block">Tila</label>
          <StatusBadge type={success ? 'success' : 'error'} text={success ? 'Onnistui' : 'Virhe'} />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500 mb-2 block">Tiedosto</label>
          <p className="font-semibold text-gray-900 truncate">{filename}</p>
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500 mb-2 block">Prosessi vaiheet</label>
          <div className="flex gap-2 flex-wrap">
            <StatusBadge type="success" text="OCR" />
            <StatusBadge type="success" text="Vision" />
            {hasMeasurement && <StatusBadge type="success" text="Mittaus" />}
            {pricing && <StatusBadge type="success" text="Hinnoittelu" />}
          </div>
        </div>
      </div>
    </div>
  );
}