import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck,
  MessageSquare,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  BarChart4,
  FileText,
  Award,
  Headphones,
  ArrowLeft,
  Users,
  UserCog
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import loginImage from '../../assets/thailand_phiphi.jpg';
import logoTransparent from '../../assets/logo-color.png';

export default function Login() {
  const { login, user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate(); 
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState('staff');
  // Demo build: credentials are fixed and cannot be edited.
  const DEMO_CREDENTIALS = {
    staff: { identifier: 'admin@buildsoftware.in', password: 'Admin@123' },
    agent: { identifier: 'AGENT-AGT-2026-001', password: 'Agent@123' },
  };
  const { identifier, password } = DEMO_CREDENTIALS[role];

  if (!loading && isAuthenticated) return <Navigate to={user?.role === 'Agent' ? '/app/queries' : '/app/dashboard'} replace />;

  const submit = async (event) => {
    event.preventDefault(); 
    setSubmitting(true);
    try { 
      const loggedInUser = await login(identifier, password);
      toast.success('Welcome back!'); 
      const savedPath = sessionStorage.getItem('buildsoftware_post_login_path');
      sessionStorage.removeItem('buildsoftware_post_login_path');
      navigate(
        savedPath && savedPath.startsWith('/')
          ? savedPath
          : (location.state?.from?.pathname || (loggedInUser?.role === 'Agent' ? '/app/queries' : '/app/dashboard')),
        { replace: true },
      );
    } catch (error) { 
      toast.error(error.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const modules = [
    { icon: MessageSquare, label: 'Queries' },
    { icon: ClipboardList, label: 'Quotations' },
    { icon: CalendarDays, label: 'Bookings' },
    { icon: TrendingUp, label: 'Operations' },
    { icon: BarChart4, label: 'Accounts' },
    { icon: FileText, label: 'Reports' },
  ];

  const inputCls =
    'w-full pl-14 pr-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#2b7de9]/15 focus:border-[#2b7de9] transition-all font-medium hover:border-slate-300';

  return (
    <main className="min-h-[100dvh] w-full relative overflow-x-hidden bg-[#13616b]">
      {/* Background photo with dark brand overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginImage})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-r from-[#0b1220]/80 via-[#0b1220]/35 to-transparent" />
      <div className="fixed inset-0 bg-gradient-to-t from-[#0b1220]/35 via-transparent to-transparent" />
      <div className="fixed -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#2b7de9]/25 blur-[110px]" />
      <div className="fixed -bottom-40 right-1/4 w-[460px] h-[460px] rounded-full bg-[#7cb8ff]/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-[1500px] mx-auto min-h-[100dvh] flex flex-col lg:flex-row items-stretch">
        {/* Left: brand + message */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-12 xl:px-20 py-8 text-white">
          <div className="flex items-center gap-5">
            <div className="rounded-2xl bg-white p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.35)]">
              <img src={logoTransparent} alt="BuildSoftware" className="h-[60px] xl:h-[72px] w-auto object-contain" />
            </div>
            <div className="h-14 w-px bg-white/30" />
            <div>
              <div className="text-[34px] xl:text-[40px] font-extrabold leading-none tracking-tight text-[#7cb8ff]">CRM</div>
              <div className="mt-1.5 text-[14px] xl:text-[15px] font-semibold text-white/80">Hotel &amp; Travel Management</div>
            </div>
          </div>

          <h1 className="mt-[clamp(20px,4vh,48px)] text-[40px] xl:text-[clamp(44px,6.4vh,58px)] font-extrabold leading-[1.06] tracking-tight">
            One CRM.<br />
            <span className="bg-gradient-to-r from-[#7cb8ff] to-[#ff8a1f] bg-clip-text text-transparent">Complete Thailand</span><br />
            Operations.
          </h1>
          <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-white/75 font-medium">
            Manage queries, quotations, bookings and accounts for every Thailand itinerary, from one place, at your service 24 hours.
          </p>

          <div className="mt-[clamp(18px,3.5vh,36px)] grid grid-cols-3 gap-2.5 max-w-[540px]">
            {modules.map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md px-3 py-2.5 hover:bg-white/20 hover:-translate-y-0.5 transition-all"
              >
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4d9bff] to-[#2b7de9] flex items-center justify-center shadow-md">
                  <m.icon className="w-[18px] h-[18px] text-white stroke-[2.2]" />
                </span>
                <span className="text-[14px] font-bold tracking-tight">{m.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-[clamp(18px,3.5vh,36px)] flex items-center gap-8 text-white/90">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-[#7cb8ff]" />
              <div className="leading-tight"><div className="text-[20px] font-extrabold">15+</div><div className="text-[12px] text-white/60 font-semibold">Years Experience</div></div>
            </div>
            <div className="w-px h-9 bg-white/20" />
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#7cb8ff]" />
              <div className="leading-tight"><div className="text-[20px] font-extrabold">98%</div><div className="text-[12px] text-white/60 font-semibold">Satisfaction</div></div>
            </div>
            <div className="w-px h-9 bg-white/20" />
            <div className="flex items-center gap-3">
              <Headphones className="w-6 h-6 text-[#7cb8ff]" />
              <div className="leading-tight"><div className="text-[20px] font-extrabold">24/7</div><div className="text-[12px] text-white/60 font-semibold">Local Support</div></div>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="w-full lg:w-[500px] xl:w-[540px] min-h-[100dvh] flex items-center justify-center p-5 pt-20 sm:p-10 sm:pt-24 lg:pr-14 relative">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute top-5 right-5 sm:top-7 sm:right-8 lg:right-14 z-30 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-[13px] font-bold text-white shadow-sm hover:bg-white hover:text-[#1f6fe0] transition-all"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            Back to Website
          </button>

          {/* Mobile brand */}
          <div className="lg:hidden absolute top-5 left-5 sm:left-8 rounded-xl bg-white p-1.5 shadow-lg">
            <img src={logoTransparent} alt="BuildSoftware" className="h-11 w-auto object-contain" />
          </div>

          <div className="w-full relative z-20 bg-white/95 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-[0_40px_90px_rgba(0,0,0,0.45)] border border-white/60">
            <div className="h-1.5 bg-gradient-to-r from-[#7cb8ff] via-[#ff8a1f] to-[#2b7de9]" />
            <div className="py-9 px-7 sm:px-10">
              <div className="mb-6">
                <h2 className="text-[30px] font-extrabold text-[#0f172a] tracking-tight mb-1.5">Welcome Back</h2>
                <p className="text-[14.5px] text-slate-500 font-medium">Sign in to your BuildSoftware CRM</p>
              </div>

              <div role="tablist" aria-label="Login type" className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-2xl bg-slate-100 border border-slate-200">
                {[
                  { key: 'agent', label: 'Agent Login', icon: Users },
                  { key: 'staff', label: 'Admin Login', icon: UserCog },
                ].map((t) => {
                  const active = role === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setRole(t.key)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                        active
                          ? 'bg-gradient-to-br from-[#4d9bff] to-[#2b7de9] text-white shadow-[0_6px_16px_rgba(43,125,233,0.35)]'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <t.icon className="w-4 h-4 stroke-[2.2]" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="identifier" className="block mb-1.5 text-[12.5px] font-bold text-slate-600">{role === 'agent' ? 'Login Code or Email' : 'Email Address'}</label>
                    <div className="relative group">
                      <Mail className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2b7de9] transition-colors z-10 stroke-[1.6]" />
                      <input
                        id="identifier"
                        name="identifier"
                        className={`${inputCls} bg-slate-50 cursor-not-allowed select-none`}
                        type="text"
                        value={identifier}
                        placeholder={role === 'agent' ? 'e.g. AGENT-AGT-2026-001 or email' : 'admin@buildsoftware.in'}
                        readOnly
                        aria-readonly="true"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block mb-1.5 text-[12.5px] font-bold text-slate-600">Password</label>
                    <div className="relative group">
                      <Lock className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2b7de9] transition-colors z-10 stroke-[1.6]" />
                      <input
                        id="password"
                        name="password"
                        className={`${inputCls} !pr-12 bg-slate-50 cursor-not-allowed select-none`}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        placeholder="Enter password"
                        readOnly
                        aria-readonly="true"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5 stroke-[1.6]" /> : <Eye className="w-5 h-5 stroke-[1.6]" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[12.5px] font-semibold text-blue-800">
                  Demo mode &mdash; sign in with the pre-filled {role === 'agent' ? 'agent' : 'admin'} account. All data is sample data stored in your browser.
                </div>

                <button
                  className="w-full relative py-3.5 bg-gradient-to-r from-[#4d9bff] to-[#2b7de9] hover:shadow-[0_14px_30px_rgba(43,125,233,0.45)] hover:-translate-y-0.5 text-white rounded-2xl font-bold text-[16px] flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_10px_24px_rgba(43,125,233,0.32)]"
                  disabled={submitting}
                >
                  <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                  {!submitting && <ArrowRight className="w-5 h-5 absolute right-5 stroke-[2.5]" />}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2 text-[12px] font-semibold text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Demo workspace &middot; no server, no real data
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
