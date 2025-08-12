import React from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen } from "lucide-react";

export default function ProjectShortcut() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-6 pt-6">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => navigate("/projektit")}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FolderOpen className="h-4 w-4 text-gray-600" />
          <span className="text-gray-700">Näytä kaikki analyysit</span>
        </button>
      </div>
    </div>
  );
}