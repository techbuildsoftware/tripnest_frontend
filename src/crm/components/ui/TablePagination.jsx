import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TablePagination({ pagination, loading, onPageChange, label }) {
  const { page = 1, limit = 25, total = 0, totalPages = 1 } = pagination || {};
  const first = total ? (page - 1) * limit + 1 : 0;
  const last = Math.min(page * limit, total);
  return (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
      <span>{total ? `Showing ${first}-${last} of ${total} ${label}` : `No ${label} found`}</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)} className="btn-secondary h-7 px-2 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="w-3.5 h-3.5" /></button>
        <span className="min-w-20 text-center">Page {page} of {totalPages}</span>
        <button type="button" disabled={loading || page >= totalPages} onClick={() => onPageChange(page + 1)} className="btn-secondary h-7 px-2 disabled:opacity-40" aria-label="Next page"><ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
