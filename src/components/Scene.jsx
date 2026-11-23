import { FaPlane } from "react-icons/fa6";

// Illustrated tropical-bay scene drawn only with the two brand colours (navy + teal) and their tints.
export default function Scene({ className = "" }) {
  return (
    <svg viewBox="0 0 600 600" className={className} role="img" aria-label="Illustration of islands, a plane and a paraglider">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e8a85" stopOpacity=".22" />
          <stop offset="1" stopColor="#0e8a85" stopOpacity=".03" />
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e8a85" stopOpacity=".85" />
          <stop offset="1" stopColor="#13234f" />
        </linearGradient>
        <clipPath id="frame"><rect width="600" height="600" rx="48" /></clipPath>
      </defs>
      <g clipPath="url(#frame)">
        <rect width="600" height="600" fill="url(#sky)" />
        <circle cx="440" cy="170" r="70" fill="#0e8a85" opacity=".35" />
        <circle cx="440" cy="170" r="46" fill="#0e8a85" opacity=".55" />

        {/* clouds */}
        <g fill="#fff" opacity=".95" className="animate-float-slow">
          <ellipse cx="120" cy="120" rx="52" ry="16" /><ellipse cx="150" cy="106" rx="34" ry="16" />
        </g>
        <g fill="#fff" opacity=".9" className="animate-float">
          <ellipse cx="330" cy="70" rx="44" ry="12" /><ellipse cx="355" cy="60" rx="26" ry="12" />
        </g>

        {/* far islands */}
        <path d="M0 360 60 300l24 20 36-62 34 52 30-26 40 76z" fill="#13234f" opacity=".25" />
        <path d="M300 372 340 290l22 16 30-70 40 80 24-20 40 76z" fill="#13234f" opacity=".3" />
        {/* near karst */}
        <path d="M120 420c4-70 18-120 34-150 12 24 26 90 30 150z" fill="#13234f" />
        <path d="M120 420c4-50 12-90 22-120 6 30 12 80 14 120z" fill="#0e8a85" opacity=".45" />
        <path d="M400 430c6-80 22-140 44-176 14 40 30 110 34 176z" fill="#13234f" />
        <path d="M400 430c6-60 16-110 32-148 8 40 16 100 18 148z" fill="#0e8a85" opacity=".45" />
        <path d="M250 430c4-40 12-70 22-90 8 20 14 50 16 90z" fill="#13234f" opacity=".85" />

        {/* sea */}
        <rect y="410" width="600" height="190" fill="url(#sea)" />
        <g className="animate-wave" style={{ width: "200%" }}>
          <path d="M0 430q25-14 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0V470H0z" fill="#fff" opacity=".12" />
        </g>
        <g className="animate-wave" style={{ animationDuration: "9s" }}>
          <path d="M0 480q25-14 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0V540H0z" fill="#fff" opacity=".1" />
        </g>

        {/* longtail boat */}
        <g className="animate-float" style={{ transformOrigin: "200px 470px" }}>
          <path d="M120 468h170l-18 22H146z" fill="#fff" />
          <path d="M120 468l-26-20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          <rect x="170" y="444" width="64" height="24" rx="6" fill="#13234f" opacity=".9" />
        </g>

        {/* jet ski + spray */}
        <g className="animate-float-slow" style={{ transformOrigin: "440px 500px" }}>
          <path d="M395 500h86l-12 20h-64z" fill="#fff" />
          <path d="M440 500l8-22h16" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="428" cy="480" r="8" fill="#13234f" />
          <path d="M385 515q-20 4-40 14M390 523q-20 10-34 24" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
        </g>
      </g>

      {/* paraglider */}
      <g className="animate-float" style={{ transformOrigin: "230px 210px" }}>
        <path d="M170 200c20-34 80-34 100 0-16-10-84-10-100 0z" fill="#13234f" />
        <path d="M170 200c14-16 36-24 50-24" stroke="#0e8a85" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M178 202l40 62M262 202l-40 62" stroke="#13234f" strokeWidth="1.5" />
        <circle cx="220" cy="270" r="7" fill="#13234f" /><path d="M220 277v22" stroke="#13234f" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function PlaneIcon({ className = "" }) {
  return <FaPlane className={className} aria-hidden />;
}
