import { useState } from "react";
import { LuImage } from "react-icons/lu";

// Wikimedia Commons only serves fixed thumbnail widths – keep to these steps.
const sized = (src, w) => src.replace(/width=\d+/, `width=${w}`);

/**
 * <img> with lazy loading, responsive srcset for Commons photos, and a brand-coloured fallback if a remote photo can't load.
 * `priority` = above-the-fold image (eager + high fetch priority).  `sizes` = how wide it renders (helps the browser pick a small file).
 */
export default function Photo({ src, alt = "", className = "", imgClassName = "", priority = false, sizes = "(min-width: 1024px) 34vw, 100vw", ...rest }) {
  const [bad, setBad] = useState(false);
  const commons = typeof src === "string" && src.includes("Special:FilePath") && /width=\d+/.test(src);
  return (
    <div className={`${/\babsolute\b/.test(className) ? "" : "relative"} overflow-hidden bg-navy ${className}`} {...rest}>
      {!bad ? (
        <img
          src={commons ? sized(src, 960) : src}
          srcSet={commons ? `${sized(src, 500)} 500w, ${sized(src, 960)} 960w, ${sized(src, 1280)} 1280w` : undefined}
          sizes={commons ? sizes : undefined}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBad(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy via-navy to-teal text-white/40">{!/\babsolute\b/.test(className) && <LuImage size={42} />}</div>
      )}
    </div>
  );
}
