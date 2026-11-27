import { Loader2 } from 'lucide-react';

/**
 * Prevents an empty-state/count flash while a page is still fetching its first
 * response. Keep the loader inside the content area so navigation remains
 * responsive and the page layout does not jump.
 */
export default function PageLoader({ label = 'Loading records…', minHeight = 'min-h-[260px]' }) {
  return (
    <div className={`${minHeight} flex flex-col items-center justify-center gap-3 text-slate-500`} role="status" aria-live="polite">
      <span className="w-10 h-10 rounded-xl border border-blue-100 bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      </span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
