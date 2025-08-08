import React, { useState, useEffect } from "react"
import { CheckCircle2, X, Edit3 } from "lucide-react"

export default function EditableField({
  label,
  value,
  unit = "",
  onSave,
  editable = true
}) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleSave = () => {
    onSave(localValue)
    setEditing(false)
  }

  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button onClick={handleSave} className="text-green-600 hover:text-green-700">
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {value ?? "Ei määritelty"} {unit}
          </span>
          {editable && (
            <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-blue-600">
              <Edit3 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
)
}
