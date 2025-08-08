import React from 'react';

export default function StatusBadge({ type, text, className = '' }) {
  const colors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error:   'bg-red-100 text-red-800 border-red-200',
    info:    'bg-blue-100 text-blue-800 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[type] || colors.info} ${className}`}>
      {text}
    </span>
  );
}