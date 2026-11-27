import { CURRENCIES, setCurrency, useCurrency } from "../currency.js";

export default function CurrencySelect({ className = "" }) {
  const cur = useCurrency();
  return (
    <select aria-label="Currency" value={cur} onChange={(e) => setCurrency(e.target.value)} className={`cursor-pointer rounded font-semibold outline-none [&>option]:text-navy ${className}`}>
      {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}
