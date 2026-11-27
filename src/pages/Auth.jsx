import { useState } from "react";
import { LuMail, LuLock, LuUser, LuEye, LuEyeOff, LuBuilding2, LuArrowRight, LuCheck, LuPhone, LuUsers, LuBriefcase, LuStar, LuShieldCheck, LuBadgePercent, LuLayers, LuCode, LuTicket, LuHeadset } from "react-icons/lu";
import { FaGoogle, FaFacebookF } from "react-icons/fa6";
import { Link, navigate } from "../router.jsx";
import { useAuth } from "../auth.jsx";
import Logo from "../components/Logo.jsx";
import Photo from "../components/Photo.jsx";
import { IMG } from "../images.js";

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/* ───────── small building blocks ───────── */
function Field({ icon: Icon, error, right, className = "", ...p }) {
  return (
    <div className={className}>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40" size={17} />
        <input {...p} aria-invalid={!!error} className={`input !py-2.5 !pl-10 ${right ? "!pr-11" : ""} ${error ? "!border-navy !ring-4 !ring-navy/10" : ""}`} />
        {right}
      </div>
      {error && <p className="mt-1 pl-1 text-xs font-semibold text-teal" role="alert">{error}</p>}
    </div>
  );
}

const PwToggle = ({ show, set }) => (
  <button type="button" onClick={() => set(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-navy/50 transition hover:bg-navy/5 hover:text-teal">{show ? <LuEyeOff size={17} /> : <LuEye size={17} />}</button>
);

const Spinner = () => <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />;

function TypeSwitch({ value, onChange }) {
  const opts = [["traveller", "Traveller", LuUsers], ["business", "Business", LuBriefcase]];
  return (
    <div className="relative grid grid-cols-2 rounded-2xl bg-navy/[.06] p-1" role="tablist" aria-label="Account type">
      <span aria-hidden className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-md shadow-navy/10 transition-transform duration-300 ${value === "business" ? "translate-x-full" : ""}`} />
      {opts.map(([k, l, I]) => (
        <button type="button" key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold transition-colors ${value === k ? "text-navy" : "text-navy/50 hover:text-navy"}`}>
          <I size={16} className={value === k ? "text-teal" : ""} />{l}<span className="text-[9px] font-bold uppercase tracking-widest text-navy/35">{k === "traveller" ? "B2C" : "B2B"}</span>
        </button>
      ))}
    </div>
  );
}

function Social() {
  return (
    <>
      <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-navy/40"><span className="h-px flex-1 bg-navy/10" />or continue with<span className="h-px flex-1 bg-navy/10" /></div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled title="Coming soon" className="btn btn-ghost !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"><FaGoogle className="text-[#ea4335]" /> Google</button>
        <button type="button" disabled title="Coming soon" className="btn btn-ghost !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"><FaFacebookF className="text-[#1877f2]" /> Facebook</button>
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold text-navy/40">Social sign-in coming soon</p>
    </>
  );
}

/* ───────── page frame: animated backdrop + one split card ───────── */
function Frame({ type, title, sub, children, footer }) {
  const biz = type === "business";
  const points = biz
    ? [[LuBadgePercent, "Net wholesale rates & commissions"], [LuLayers, "Bulk bookings & invoicing"], [LuCode, "White-label pages & API access"]]
    : [[LuTicket, "Instant e-vouchers & confirmations"], [LuBadgePercent, "Best-price promise on every trip"], [LuHeadset, "24/7 human support in your language"]];
  return (
    <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 pb-12 pt-24 sm:px-6">
      <style>{`.auth-form input:-webkit-autofill{-webkit-box-shadow:0 0 0 40px #fff inset!important;-webkit-text-fill-color:#13234f!important}`}</style>
      <Photo src={IMG.hero} alt="" priority sizes="100vw" className="absolute inset-0 -z-20" imgClassName="scale-110 blur-[3px]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy/95 via-navy/80 to-teal/65" />
      <span aria-hidden className="absolute -left-24 top-10 -z-10 h-80 w-80 rounded-full bg-teal/30 blur-3xl" />
      <span aria-hidden className="absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-sun/20 blur-3xl" />

      <div className="grid w-full max-w-5xl animate-[pop_.5s_cubic-bezier(.2,.8,.2,1)] overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/40 ring-1 ring-white/20 md:grid-cols-[.9fr_1.1fr]">
        {/* left: visual */}
        <aside className="relative hidden min-h-[560px] text-white md:block">
          <Photo src={IMG.north} alt="Royal pagodas at Doi Inthanon, Chiang Mai" className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/20" />
          <div className="relative flex h-full flex-col justify-between p-7">
            <div className="flex items-start justify-between gap-3">
              <Logo plate className="h-11" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur"><LuStar size={12} className="text-sun" fill="currentColor" /> 4.9 rated</span>
            </div>
            <div>
              <h2 className="text-[26px] font-extrabold leading-tight">{biz ? <>Grow your travel business with <span className="text-sun">TripNest</span>.</> : <>Your next adventure is <span className="text-sun">one click</span> away.</>}</h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold">
                {points.map(([I, t]) => <li key={t} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 backdrop-blur"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal"><I size={14} /></span>{t}</li>)}
              </ul>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-center">
                {[["25k+", "Travellers"], ["9", "Destinations"], ["24/7", "Support"]].map(([n, l]) => <div key={l}><p className="text-lg font-extrabold text-sun">{n}</p><p className="text-[10px] font-bold uppercase tracking-widest text-white/65">{l}</p></div>)}
              </div>
            </div>
          </div>
        </aside>

        {/* right: form */}
        <div className="auth-form flex flex-col justify-center p-6 sm:p-9">
          <Link to="/" aria-label="TripNest home" className="mb-4 block md:hidden"><Logo className="h-10" /></Link>
          <h1 className="text-2xl font-extrabold sm:text-[28px]">{title}</h1>
          <p className="mt-1 text-sm text-navy/60">{sub}</p>
          <div className="mt-5">{children}</div>
          <p className="mt-5 text-center text-sm text-navy/70">{footer}</p>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-navy/40"><LuShieldCheck size={13} className="text-teal" /> Your details are encrypted & never shared</p>
        </div>
      </div>
    </section>
  );
}

/* ───────── Login ───────── */
export function Login() {
  const { login } = useAuth();
  const [type, setType] = useState("traveller");
  const [f, setF] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!emailOk(f.email)) er.email = "Enter a valid email address";
    if (f.password.length < 6) er.password = "Password must be at least 6 characters";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    await login({ ...f, type });
    navigate(type === "business" ? "/business" : "/services");
  };
  return (
    <Frame type={type} title="Welcome back" sub="Log in to manage your bookings, quotes and trips."
      footer={<>New to TripNest? <Link to="/signup" className="font-bold text-teal hover:underline">Create an account</Link></>}>
      <TypeSwitch value={type} onChange={setType} />
      <form onSubmit={submit} noValidate className="mt-3 space-y-3">
        <Field icon={LuMail} type="email" placeholder="Email address" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err.email} />
        <Field icon={LuLock} type={show ? "text" : "password"} placeholder="Password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={err.password} right={<PwToggle show={show} set={setShow} />} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-semibold"><input type="checkbox" className="h-4 w-4 accent-teal" /> Remember me</label>
          <Link to="/contact" className="font-bold text-teal hover:underline">Forgot password?</Link>
        </div>
        <button disabled={busy} className="btn btn-primary w-full !py-3 shadow-lg shadow-teal/30 disabled:opacity-70">{busy ? <Spinner /> : <>Log in <LuArrowRight /></>}</button>
      </form>
      <Social />
    </Frame>
  );
}

/* ───────── Signup ───────── */
function strength(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export function Signup() {
  const { signup } = useAuth();
  const [type, setType] = useState("traveller");
  const [f, setF] = useState({ name: "", company: "", email: "", phone: "", password: "", agree: false });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const s = strength(f.password);
  const biz = type === "business";

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = "Enter your full name";
    if (biz && f.company.trim().length < 2) er.company = "Enter your company name";
    if (!emailOk(f.email)) er.email = "Enter a valid email";
    if (f.password.length < 8) er.password = "Use at least 8 characters";
    if (!f.agree) er.agree = "Please accept the terms to continue";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    await signup({ ...f, type });
    navigate(biz ? "/business" : "/services");
  };

  return (
    <Frame type={type} title="Create your account" sub="Free to join. Takes less than a minute."
      footer={<>Already have an account? <Link to="/login" className="font-bold text-teal hover:underline">Log in</Link></>}>
      <TypeSwitch value={type} onChange={setType} />
      <form onSubmit={submit} noValidate className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field icon={LuUser} placeholder="Full name" autoComplete="name" value={f.name} onChange={set("name")} error={err.name} />
        {biz
          ? <Field icon={LuBuilding2} placeholder="Company name" autoComplete="organization" value={f.company} onChange={set("company")} error={err.company} />
          : <Field icon={LuPhone} type="tel" placeholder="Phone (optional)" autoComplete="tel" value={f.phone} onChange={set("phone")} />}
        <Field icon={LuMail} type="email" placeholder={biz ? "Work email" : "Email address"} autoComplete="email" value={f.email} onChange={set("email")} error={err.email} className={biz ? "" : "sm:col-span-2"} />
        {biz && <Field icon={LuPhone} type="tel" placeholder="Phone / WhatsApp" autoComplete="tel" value={f.phone} onChange={set("phone")} />}
        <div className="sm:col-span-2">
          <Field icon={LuLock} type={show ? "text" : "password"} placeholder="Create password" autoComplete="new-password" value={f.password} onChange={set("password")} error={err.password} right={<PwToggle show={show} set={setShow} />} />
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex flex-1 gap-1.5" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < s ? "bg-teal" : "bg-navy/10"}`} />)}</div>
            <span className="w-20 text-right text-[11px] font-semibold text-navy/55">{f.password ? ["Too weak", "Weak", "Good", "Strong", "Excellent"][s] : "8+ characters"}</span>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={f.agree} onChange={set("agree")} className="mt-0.5 h-4 w-4 accent-teal" /><span>I agree to the <Link to="/terms" className="font-bold text-teal hover:underline">Terms</Link> and <Link to="/privacy" className="font-bold text-teal hover:underline">Privacy Policy</Link></span></label>
          {err.agree && <p className="mt-1 pl-7 text-xs font-semibold text-teal" role="alert">{err.agree}</p>}
        </div>
        <button disabled={busy} className="btn btn-primary w-full !py-2.5 disabled:opacity-70 sm:col-span-2">{busy ? <Spinner /> : <>{biz ? "Create partner account" : "Create account"} <LuArrowRight /></>}</button>
      </form>
      <Social />
    </Frame>
  );
}
