import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, MessageSquare, FileText, BookOpen,
  Settings2, Users, BarChart3, Database, FolderOpen,
  Wallet, ChevronLeft, ChevronRight, Plane, Building2,
  X, LogOut, User, Truck, Eye, Anchor, Navigation, ChevronDown, Receipt
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import phiphiImg from '../../assets/thailand_phiphi.jpg';
import phuketImg from '../../assets/thailand_phuket.jpg';
import krabiImg from '../../assets/thailand_krabi.jpg';
import bangkokImg from '../../assets/thailand_bangkok.jpg';
import chiangmaiImg from '../../assets/thailand_chiangmai.jpg';
import kohsamuiImg from '../../assets/thailand_kohsamui.jpg';

const exploreSlides = [
  { img: phiphiImg, name: 'Phi Phi Islands' },
  { img: phuketImg, name: 'Phuket' },
  { img: krabiImg, name: 'Krabi' },
  { img: bangkokImg, name: 'Bangkok' },
  { img: kohsamuiImg, name: 'Koh Samui' },
  { img: chiangmaiImg, name: 'Chiang Mai' },
];

// ─── Animated "Explore Thailand" promo card (auto-changing backgrounds) ───
function ExplorePromo({ onLearnMore }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % exploreSlides.length), 4800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="sbx-card group">
      <style>{`
        .sbx-card{position:relative;overflow:hidden;border-radius:16px;height:clamp(108px,19vh,172px);
          border:1px solid rgba(130,180,255,.28);background:#0a1a3a;
          box-shadow:0 12px 26px rgba(0,0,0,.38),inset 0 0 0 1px rgba(255,255,255,.04);isolation:isolate}
        .sbx-slide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;
          transform:scale(1.02);transition:opacity 1.4s ease}
        .sbx-slide.is-on{opacity:1;animation:sbx-zoom 7s ease-out forwards}
        @keyframes sbx-zoom{from{transform:scale(1.02) translateX(0)}to{transform:scale(1.16) translateX(-3%)}}
        .sbx-shade{position:absolute;inset:0;z-index:1;
          background:linear-gradient(90deg,rgba(8,20,48,.94) 0%,rgba(8,20,48,.72) 38%,rgba(8,20,48,.18) 75%,rgba(8,20,48,0) 100%),
                     linear-gradient(0deg,rgba(8,20,48,.55) 0%,transparent 45%)}
        .sbx-glow{position:absolute;z-index:1;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;
          background:radial-gradient(circle,rgba(80,150,255,.55),transparent 70%);animation:sbx-pulse 3.6s ease-in-out infinite}
        @keyframes sbx-pulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}
        .sbx-path{position:absolute;z-index:2;right:6px;top:6px;width:64px;height:40px;opacity:.85}
        .sbx-plane{position:absolute;z-index:3;right:12px;top:7px;color:#8cbcff;
          filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));animation:sbx-fly 4.2s ease-in-out infinite}
        @keyframes sbx-fly{0%,100%{transform:translate(0,0) rotate(-8deg)}50%{transform:translate(-9px,5px) rotate(-2deg)}}
        .sbx-body{position:absolute;z-index:4;inset:0;padding:clamp(9px,1.7vh,15px) 12px;display:flex;flex-direction:column;justify-content:center;color:#fff}
        .sbx-eyebrow{font-size:clamp(10.5px,1.6vh,13px);font-weight:600;color:rgba(255,255,255,.88);line-height:1}
        .sbx-title{font-size:clamp(18px,3.1vh,26px);font-weight:800;letter-spacing:-.01em;line-height:1.08;
          background:linear-gradient(90deg,#fff 0%,#cfe3ff 55%,#7cb8ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
          animation:sbx-rise .9s cubic-bezier(.2,.8,.2,1) both}
        @keyframes sbx-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .sbx-bar{width:30px;height:2px;border-radius:2px;margin:5px 0 4px;background:linear-gradient(90deg,#4d9bff,#2b7de9);
          transform-origin:left;animation:sbx-grow 1.1s .2s ease-out both}
        @keyframes sbx-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        .sbx-sub{font-size:clamp(8.5px,1.3vh,10.5px);line-height:1.3;color:rgba(255,255,255,.82);max-width:118px}
        .sbx-btn{position:relative;overflow:hidden;margin-top:clamp(5px,1.1vh,9px);align-self:flex-start;display:inline-flex;align-items:center;gap:5px;
          padding:clamp(4px,.8vh,6px) 11px;border-radius:999px;border:0;cursor:pointer;color:#fff;font-weight:800;font-size:clamp(9.5px,1.45vh,11.5px);
          background:linear-gradient(135deg,#4d9bff,#2b7de9);box-shadow:0 6px 14px rgba(43,125,233,.5);transition:transform .2s,box-shadow .2s}
        .sbx-btn:hover{transform:translateY(-1px);box-shadow:0 9px 18px rgba(43,125,233,.65)}
        .sbx-btn::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;
          background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:sbx-shine 3.4s ease-in-out infinite}
        @keyframes sbx-shine{0%,60%{left:-60%}100%{left:130%}}
        .sbx-loc{position:absolute;z-index:4;right:9px;bottom:8px;display:flex;align-items:center;gap:4px;
          padding:2px 8px;border-radius:999px;font-size:9.5px;font-weight:700;color:#fff;background:rgba(0,0,0,.38);backdrop-filter:blur(6px);
          border:1px solid rgba(255,255,255,.2);animation:sbx-rise .8s both}
        .sbx-dots{position:absolute;z-index:4;left:12px;bottom:6px;display:flex;gap:4px}
        .sbx-dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.4);transition:all .4s}
        .sbx-dot.is-on{width:14px;border-radius:3px;background:#4d9bff}
        @media (max-height:640px){.sbx-sub,.sbx-loc{display:none}.sbx-dots{display:none}}
        @media (prefers-reduced-motion:reduce){.sbx-slide.is-on,.sbx-plane,.sbx-glow,.sbx-btn::after{animation:none}}
      `}</style>

      {exploreSlides.map((sl, i) => (
        <img
          key={sl.name}
          src={sl.img}
          alt=""
          aria-hidden="true"
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`sbx-slide ${i === active ? 'is-on' : ''}`}
        />
      ))}
      <div className="sbx-shade" />
      <div className="sbx-glow" />

      <svg className="sbx-path" viewBox="0 0 64 40" fill="none" aria-hidden="true">
        <path d="M2 36 C 18 34, 30 24, 38 16 S 56 4, 62 4" stroke="rgba(255,196,107,.7)" strokeWidth="1.2" strokeDasharray="2.5 3.5" strokeLinecap="round" />
      </svg>
      <Plane className="sbx-plane w-[18px] h-[18px]" strokeWidth={2} />

      <div className="sbx-body">
        <span className="sbx-eyebrow">Explore</span>
        <span key={`t-${active}`} className="sbx-title">Thailand</span>
        <span className="sbx-bar" />
        <span className="sbx-sub">Trusted DMC Partner for Your Journeys</span>
        <button type="button" onClick={onLearnMore} className="sbx-btn">
          Learn More
          <ChevronRight className="w-3 h-3" strokeWidth={3} />
        </button>
      </div>

      <div className="sbx-dots" aria-hidden="true">
        {exploreSlides.map((sl, i) => (
          <span key={sl.name} className={`sbx-dot ${i === active ? 'is-on' : ''}`} />
        ))}
      </div>
      <span key={`l-${active}`} className="sbx-loc">📍 {exploreSlides[active].name}</span>
    </div>
  );
}
import LogoTransparent from '../../assets/icon-dark.png';

const navItems = [
  { path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', iconBg: '#3b82f6', iconColor: '#93c5fd' },
  { path: '/app/queries', icon: MessageSquare, label: 'Queries', iconBg: '#10b981', iconColor: '#6ee7b7' },
  { path: '/app/quotations', icon: FileText, label: 'Quotations', iconBg: '#8b5cf6', iconColor: '#d8b4fe' },
  { path: '/app/bookings', icon: BookOpen, label: 'Bookings', iconBg: '#f43f5e', iconColor: '#fca5a5' },
  // Operations is handled as a dropdown group separately
  { path: '/app/accounts', icon: Wallet, label: 'Accounts', iconBg: '#14b8a6', iconColor: '#2dd4bf' },
  { path: '/app/reports', icon: BarChart3, label: 'Reports', iconBg: '#d946ef', iconColor: '#f0abfc' },
  { path: '/app/documents', icon: FolderOpen, label: 'Documents', iconBg: '#0891b2', iconColor: '#67e8f9' },
  { path: '/app/masters', icon: Database, label: 'Masters', iconBg: '#64748b', iconColor: '#a8a29e' },
  { path: '/app/settings', icon: Settings2, label: 'Settings', iconBg: '#64748b', iconColor: '#94a3b8' },
];

const operationsSubItems = [
  { path: '/app/operations/tour-master-sheet', label: 'Tour Master Sheet' },
  { path: '/app/operations/hotel-reservation', label: 'Hotel Reservation' },
];

const accountsSubItems = [
  { path: '/app/accounts', label: 'Accounts' },
  { path: '/app/accounts/invoices-payments', label: 'Invoices & Payments' },
  // { path: '/app/accounts/payment-planner', label: 'Payment Planner' },
];

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [opsOpen, setOpsOpen] = useState(() => location.pathname.startsWith('/app/operations'));
  const [accountsOpen, setAccountsOpen] = useState(() => location.pathname.startsWith('/app/accounts'));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const collapsed = sidebarCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col bg-[#0b1f45]
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-14' : 'w-52'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo area */}
        <div
          className={`flex items-center h-16 px-4 flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-between'}`}
          style={{ borderBottom: '1px solid rgba(255,214,170,0.12)' }}
        >
          {!collapsed && (
            <div
              role="link"
              tabIndex={0}
              title="Go to website"
              onClick={() => navigate('/')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/')}
              className="flex items-center gap-3 cursor-pointer select-none hover:opacity-90 transition-opacity"
            >
              <img src={LogoTransparent} alt="Logo" className="h-10 w-10 object-contain rounded-lg bg-white p-0.5 shadow-md" />
              <div className="flex flex-col justify-center mt-0.5">
                <div className="text-white font-extrabold text-[15px] leading-none tracking-tight">BuildSoftware</div>
                <div className="text-sky-200/80 text-[11px] font-semibold mt-1 tracking-[0.15em]">THAILAND</div>
              </div>
            </div>
          )}
          {collapsed && (
            <img
              src={LogoTransparent}
              alt="Logo"
              title="Go to website"
              onClick={() => navigate('/')}
              className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 shadow-md cursor-pointer"
            />
          )}
          {mobileOpen && (
            <button onClick={onMobileClose} className="lg:hidden text-sky-200/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 py-1.5 flex flex-col overflow-visible hide-scrollbar relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Before Accounts – render Operations dropdown */}
          {navItems.map(({ path, icon: Icon, label, iconBg, iconColor }) => {
            // Insert Operations dropdown before Accounts
            const isOpsSlot = path === '/app/accounts';
            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
            const opsActive = location.pathname.startsWith('/app/operations');
            const accountsActive = location.pathname.startsWith('/app/accounts');
            return (
              <React.Fragment key={path}>
                {isOpsSlot && (
                  <div className="mx-1.5 my-0.5">
                    {/* Operations Parent */}
                    <button
                      onClick={() => { if (collapsed) navigate('/app/operations/tour-master-sheet'); else setOpsOpen(o => !o); }}
                      className={`
                        relative group flex items-center gap-2.5 w-full rounded-lg cursor-pointer transition-all duration-200
                        ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[5px]'}
                        ${opsActive ? 'bg-white text-black font-semibold shadow-sm' : 'text-white hover:bg-white/10'}
                      `}
                    >
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%), #2b7de9`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.6)',
                          border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                        <Plane className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                      </div>
                      {!collapsed && (
                        <>
                          <span className="text-[12.5px] truncate tracking-wide leading-none flex-1 text-left">Operations</span>
                          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${opsOpen ? 'rotate-180' : ''}`} />
                        </>
                      )}
                      {collapsed && (
                        <div className="absolute left-[calc(100%+8px)] hidden group-hover:flex items-center z-[100] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-2.5 h-2.5 bg-[#2b7de9] rounded-[1.5px] rotate-45 -mr-1.5 relative z-10 shadow-sm"></div>
                          <div className="bg-[#111827] text-white pl-3 pr-2.5 py-1 rounded-md shadow-xl border border-white/5 relative z-0">
                            <span className="text-[11.5px] font-semibold tracking-wide">Operations</span>
                          </div>
                        </div>
                      )}
                    </button>
                    {/* Sub-items */}
                    {!collapsed && opsOpen && (
                      <div className="mt-1 mb-1 ml-4 relative">
                        {/* Vertical tree line */}
                        <div className="absolute left-[13px] top-0 bottom-3 w-px bg-white/10" />
                        
                        <div className="space-y-0.5">
                          {operationsSubItems.map(sub => {
                            const subActive = location.pathname === sub.path;
                            return (
                              <NavLink key={sub.path} to={sub.path} onClick={onMobileClose}
                                className={`group flex items-center relative pl-8 pr-3 py-[7px] rounded-lg text-[11.5px] transition-all cursor-pointer
                                  ${subActive ? 'text-white font-semibold bg-white/10 shadow-sm' : 'text-sky-100/70 hover:text-white hover:bg-white/5'}`}>
                                
                                {/* Horizontal branch line */}
                                <div className={`absolute left-[13px] top-1/2 -translate-y-1/2 w-3 border-t ${subActive ? 'border-white/60' : 'border-white/20 group-hover:border-white/40'} transition-colors`} />
                                
                                {/* Circle node */}
                                <div className={`absolute left-[24px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full ${subActive ? 'bg-[#4d9bff] shadow-[0_0_8px_rgba(43,125,233,0.8)]' : 'bg-transparent border border-white/30 group-hover:border-white/60'} z-10 transition-all`} />
                                
                                {sub.label}
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Accounts as dropdown (replaces plain nav link) */}
                {path === '/app/accounts' ? (
                  <div className="mx-1.5 my-0.5">
                    <button
                      onClick={() => { if (collapsed) navigate('/app/accounts/invoices-payments'); else setAccountsOpen(o => !o); }}
                      className={`
                        relative group flex items-center gap-2.5 w-full rounded-lg cursor-pointer transition-all duration-200
                        ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[5px]'}
                        ${accountsActive ? 'bg-white text-black font-semibold shadow-sm' : 'text-white hover:bg-white/10'}
                      `}
                    >
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%), #2b7de9`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.6)',
                          border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                        <Wallet className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                      </div>
                      {!collapsed && (
                        <>
                          <span className="text-[12.5px] truncate tracking-wide leading-none flex-1 text-left">Accounts</span>
                          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${accountsOpen ? 'rotate-180' : ''}`} />
                        </>
                      )}
                      {collapsed && (
                        <div className="absolute left-[calc(100%+8px)] hidden group-hover:flex items-center z-[100] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-2.5 h-2.5 bg-[#2b7de9] rounded-[1.5px] rotate-45 -mr-1.5 relative z-10 shadow-sm"></div>
                          <div className="bg-[#111827] text-white pl-3 pr-2.5 py-1 rounded-md shadow-xl border border-white/5 relative z-0">
                            <span className="text-[11.5px] font-semibold tracking-wide">Accounts</span>
                          </div>
                        </div>
                      )}
                    </button>
                    {!collapsed && accountsOpen && (
                      <div className="mt-1 mb-1 ml-4 relative">
                        <div className="absolute left-[13px] top-0 bottom-3 w-px bg-white/10" />
                        <div className="space-y-0.5">
                          {accountsSubItems.map(sub => {
                            const subActive = location.pathname === sub.path;
                            return (
                              <NavLink key={sub.path} to={sub.path} onClick={onMobileClose}
                                className={`group flex items-center relative pl-8 pr-3 py-[7px] rounded-lg text-[11.5px] transition-all cursor-pointer
                                  ${subActive ? 'text-white font-semibold bg-white/10 shadow-sm' : 'text-sky-100/70 hover:text-white hover:bg-white/5'}`}>
                                <div className={`absolute left-[13px] top-1/2 -translate-y-1/2 w-3 border-t ${subActive ? 'border-white/60' : 'border-white/20 group-hover:border-white/40'} transition-colors`} />
                                <div className={`absolute left-[24px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full ${subActive ? 'bg-[#4d9bff] shadow-[0_0_8px_rgba(43,125,233,0.8)]' : 'bg-transparent border border-white/30 group-hover:border-white/60'} z-10 transition-all`} />
                                {sub.label}
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onMobileClose}
                  className={`
                    relative group flex items-center gap-2.5 mx-1.5 my-0.5 rounded-lg cursor-pointer transition-all duration-200
                    ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[5px]'}
                    ${isActive
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-white hover:bg-white/10'
                    }
                  `}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%), #2b7de9`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.6)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                  {!collapsed && (
                    <span className="text-[12.5px] truncate tracking-wide leading-none">{label}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-[calc(100%+8px)] hidden group-hover:flex items-center z-[100] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-2.5 h-2.5 bg-[#2b7de9] rounded-[1.5px] rotate-45 -mr-1.5 relative z-10 shadow-sm"></div>
                      <div className="bg-[#111827] text-white pl-3 pr-2.5 py-1 rounded-md shadow-xl border border-white/5 relative z-0">
                        <span className="text-[11.5px] font-semibold tracking-wide">{label}</span>
                      </div>
                    </div>
                  )}
                </NavLink>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Explore Thailand promo + profile */}
        {!collapsed ? (
          <div className="flex-shrink-0 relative">
            <div className="px-2.5 pt-2 pb-2.5">
              <ExplorePromo onLearnMore={() => { navigate('/'); onMobileClose?.(); }} />
            </div>

            {/* Profile row on warm wave background */}
            <div
              className="relative overflow-hidden px-3 py-3 flex items-center justify-between gap-2"
              style={{
                background: 'linear-gradient(135deg, #0a1c40 0%, #12306b 55%, #1c4a9a 100%)',
                borderTop: '1px solid rgba(255,190,100,0.25)',
              }}
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 260 70" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 48 C 50 28, 90 66, 140 46 S 220 24, 260 40 L260 70 L0 70 Z" fill="rgba(80,150,255,0.14)" />
                <path d="M0 58 C 60 40, 100 70, 150 56 S 225 40, 260 54 L260 70 L0 70 Z" fill="rgba(80,150,255,0.12)" />
                <path d="M0 50 C 50 30, 90 68, 140 48 S 220 26, 260 42" fill="none" stroke="rgba(255,200,110,0.45)" strokeWidth="1" />
              </svg>

              <div className="relative flex items-center gap-2.5 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4d9bff] to-[#2b7de9] flex items-center justify-center text-white text-[17px] font-extrabold flex-shrink-0 shadow-[0_4px_12px_rgba(43,125,233,0.5)] ring-2 ring-white/20">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="flex flex-col overflow-hidden leading-tight">
                  <span className="text-[13px] font-bold text-white truncate">{user?.name || 'Admin'}</span>
                  <span className="text-[11px] font-medium text-sky-100/70 truncate capitalize">{user?.role || 'Administrator'}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-sky-100/80 border border-white/15 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 flex justify-center flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sky-100/70 hover:text-rose-300 hover:bg-white/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
