import React from "react";
import { AlertTriangle } from "lucide-react";

export default function NotesPanel({ notes }) {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-300 rounded-xl p-6 mt-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
        <div>
          <h4 className="font-semibold text-yellow-800 mb-3">⚠️ Huomiot</h4>
          <ul className="space-y-2">
            {notes.map((note, idx) => (
              <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}