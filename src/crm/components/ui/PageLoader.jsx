import React from 'react';
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

/**
 * Replaces the old blank full-screen veil while a page fetches its data.
 * Appears only if loading lasts more than ~150ms (so fast loads never flash),
 * then fades in a shimmering layout placeholder instead of an empty screen.
 */
export function PageSkeleton() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  const bar = (w, h = 'h-3') => <div className={`crm-shimmer ${h} rounded-lg`} style={{ width: w }} />;
  return (
    <div className="crm-fade-in absolute inset-0 z-20 overflow-hidden bg-slate-50/90 p-5 backdrop-blur-[2px]" role="status" aria-live="polite">
      <div className="mb-5 flex items-center gap-3">
        <div className="crm-shimmer h-10 w-10 rounded-xl" />
        <div className="space-y-2">{bar(180, 'h-4')}{bar(260)}</div>
        <div className="ml-auto flex gap-2">{bar(110, 'h-9')}{bar(90, 'h-9')}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            {bar('40%')}<div className="mt-3">{bar('65%', 'h-6')}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-100 py-3.5 last:border-0">
            <div className="crm-shimmer h-8 w-8 rounded-lg" />
            {bar(`${28 - i * 2}%`)}{bar('18%')}<div className="ml-auto">{bar(70)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
