// =====================================
// File: src/components/TabNavigation.jsx
// =====================================
import React from 'react';

export default function TabNavigation({ tabs, activeTab, onChange }) {
  return (
    <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
      <nav className="flex space-x-1 p-1" role="tablist">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => tab.enabled && onChange(tab.id)}
              disabled={!tab.enabled}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab===tab.id
                  ? 'bg-white shadow-sm text-blue-700 border-b-2 border-blue-600'
                  : tab.enabled
                  ? 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}