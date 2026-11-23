import logo from "../Assets/Logo/logo.png";

// `plate` puts the logo on a white pill – used on dark backgrounds (footer) where the navy wordmark would vanish.
export default function Logo({ plate = false, className = "h-11" }) {
  const img = <img src={logo} alt="TripNest – Travel Tech Company" className={`w-auto ${className}`} draggable="false" />;
  return plate ? <span className="inline-block rounded-2xl bg-white px-4 py-2.5 shadow-lg shadow-black/20">{img}</span> : img;
}
