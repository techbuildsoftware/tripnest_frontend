import logo from "../Assets/Logo/logo.png";

// Logo is pre-cropped (no empty margins). `plate` puts it on a white pill – used on dark backgrounds (footer).
export default function Logo({ plate = false, className = "h-11" }) {
  const img = <img src={logo} alt="TripNest – Travel Tech Company Limited" className={`w-auto ${className}`} draggable="false" />;
  return plate ? <span className="inline-block rounded-xl bg-white px-3 py-1.5 shadow-lg shadow-black/20">{img}</span> : img;
}
