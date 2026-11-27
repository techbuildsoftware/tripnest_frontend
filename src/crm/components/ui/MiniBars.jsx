import React from 'react';

// Small decorative "activity" bars shown at the end of stat cards on big
// screens: three faded dots followed by three bars in the card colour.
// Bar heights are derived from the card value so each card looks different.
export default function MiniBars({ value = 0, className = 'text-blue-500', show = 'hidden xl:flex', color }) {
  const seed = Math.abs(Number(String(value).replace(/[^0-9.]/g, '')) || 0);
  const heights = [38 + ((seed * 7) % 22), 66 + ((seed * 3) % 30), 48 + ((seed * 5) % 36)];
  return (
    <div className={`${show} ${className} relative z-10 ml-auto h-8 shrink-0 items-end gap-[3px] pl-2`} style={color ? { color } : undefined} aria-hidden="true">
      {[0, 1, 2].map((i) => <span key={`d${i}`} className="h-[3px] w-[3px] rounded-full bg-current opacity-30" />)}
      {heights.map((h, i) => <span key={`b${i}`} className="w-[3px] rounded-full bg-current" style={{ height: `${h}%`, opacity: 0.55 + i * 0.2 }} />)}
    </div>
  );
}
