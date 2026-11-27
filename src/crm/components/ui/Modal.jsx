import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer, icon }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-full mx-4',
  };
  const Icon = icon?.icon;

  return (
    <div
      className="modal-overlay"
    >
      <div className={`modal-content ${sizeClasses[size]} w-[calc(100vw-1rem)] sm:w-full fade-in flex flex-col max-h-[calc(100dvh-1rem)] !p-0 overflow-hidden border border-slate-300`}>
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 px-4 py-2.5 border-b border-slate-300 bg-slate-100 z-10">
          {Icon && (
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/60 shadow-sm ${icon.iconBg || 'bg-blue-100'}`}>
              <Icon className={`h-[18px] w-[18px] ${icon.iconColor || 'text-blue-600'}`} />
            </div>
          )}
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-4 py-2.5 border-t border-slate-300 flex items-center justify-end gap-3 bg-slate-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
