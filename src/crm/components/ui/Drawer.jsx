import React from 'react';
import { X } from 'lucide-react';

export default function Drawer({ isOpen, onClose, title, children, width = 'w-96' }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay fade-in" onClick={onClose} />
      <div className={`drawer-content ${width} slide-in-right`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 pb-20">
          {children}
        </div>
      </div>
    </>
  );
}
