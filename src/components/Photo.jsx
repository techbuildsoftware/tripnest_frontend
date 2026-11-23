import { useState } from "react";
import { LuImage } from "react-icons/lu";

/** <img> with lazy loading and a brand-coloured fallback if a remote photo can't load. */
export default function Photo({ src, alt = "", className = "", imgClassName = "", ...rest }) {
  const [bad, setBad] = useState(false);
  return (
    <div className={`${/\babsolute\b/.test(className) ? "" : "relative"} overflow-hidden bg-navy ${className}`} {...rest}>
      {!bad ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBad(true)} className={`h-full w-full object-cover ${imgClassName}`} />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy via-navy to-teal text-white/40">{!/\babsolute\b/.test(className) && <LuImage size={42} />}</div>
      )}
    </div>
  );
}
