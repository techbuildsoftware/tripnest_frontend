import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart,
} from 'recharts';
import {
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  MessageSquare, FileText, CheckSquare, PlaneLanding, PlaneTakeoff, Wallet,
  Building2, Users, Truck, Globe, Settings, Banknote, Search,
  ChevronDown, ChevronUp, Play, Pause, RotateCcw, Sparkles, Navigation,
  Calendar as CalendarIcon, Clock, MapPin, Tag, UserCheck, ShieldCheck,
  FileCheck2, DollarSign, Compass, Eye, Star, CheckCircle, ExternalLink,
  Plus, Filter, X,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { todayIsoInTimeZone } from '../../lib/date';
import MiniBars from '../../components/ui/MiniBars';
import { getCachedMasterSummary, loadMasterSummary } from '../../lib/masterSummary';

// ── Fallback Images for Upcoming Trips ─────────────────────────────────────────
const UPCOMING_THUMBS = [
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=160&q=80', // Pattaya/Bangkok
  'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=160&q=80', // Safari World
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=160&q=80', // Luxury Hotel
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=160&q=80', // Phi Phi Speedboat
];

const EVENT_FALLBACK = {
  arrival: { emoji: '✈️', className: 'from-sky-500 to-blue-700' },
  departure: { emoji: '🛫', className: 'from-indigo-500 to-violet-700' },
  flight: { emoji: '✈️', className: 'from-sky-500 to-blue-700' },
  sightseeing: { emoji: '🏝️', className: 'from-emerald-500 to-teal-700' },
  tour: { emoji: '🛥️', className: 'from-violet-500 to-purple-700' },
  transfer: { emoji: '🚐', className: 'from-amber-500 to-orange-700' },
  hotel: { emoji: '🏨', className: 'from-rose-500 to-pink-700' },
  service: { emoji: '📍', className: 'from-slate-500 to-slate-700' },
};

function EventThumbnail({ src, type, title }) {
  const [failed, setFailed] = useState(false);
  const kind = String(type || 'service').toLowerCase();
  const fallback = EVENT_FALLBACK[kind] || EVENT_FALLBACK.service;
  if (!src || failed) return <div role="img" aria-label={title || kind} className={`w-11 h-11 rounded-lg bg-gradient-to-br ${fallback.className} grid place-items-center text-xl shadow-sm flex-shrink-0`}>{fallback.emoji}</div>;
  return <img src={src} alt={title || ''} onError={() => setFailed(true)} className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-sm" />;
}

const fmtK = (n) => {
  const num = Number(n || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return `${num}`;
};

// ── Animated Number Counter ───────────────────────────────────────────────────
const AnimatedNumber = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) { setDisplay(0); return; }
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
};

// ── Curved Sparkline Mini SVG Chart ───────────────────────────────────────────
const Sparkline = ({ data, color, height = 28 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 68;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={height} className="flex-shrink-0 overflow-visible">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ── Top KPI Stat Card ─────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, pct, pctPositive, iconGradient, sparkData, sparkColor, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="kpi-card group cursor-pointer"
  >
    <div className="flex items-center gap-2.5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-105"
        style={{ background: iconGradient, boxShadow: `0 4px 12px ${sparkColor}35` }}
      >
        <Icon className="w-5 h-5" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-black text-slate-900 leading-none tracking-tight">
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">{label}</div>
      </div>
      <MiniBars value={typeof value === 'number' ? value : String(value)} color={sparkColor} show="hidden 2xl:flex" />
    </div>
    {(pct !== undefined || (sparkData && sparkData.length > 0)) && <div className="flex items-center justify-between mt-2.5 pt-1">
      {pct !== undefined && (
        <div className={`flex items-center gap-0.5 text-[11px] font-bold ${pctPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
          {pctPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{pct}%</span>
        </div>
      )}
      <Sparkline data={sparkData} color={sparkColor || '#94a3b8'} />
    </div>}
  </button>
);

// ── Custom Tooltip for Charts ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-xl text-xs z-50">
        <p className="font-bold text-slate-800 mb-1.5">{label}</p>
        {payload.filter((p) => p.name !== 'Revenue area').map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-[11px] py-0.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: String(p.color || '').startsWith('url') ? (p.dataKey === 'revenue' ? '#8b5cf6' : p.dataKey === 'queries' ? '#2b7de9' : '#10b981') : p.color }} />
              {p.name}
            </span>
            <span className="font-bold text-slate-900">
              {p.dataKey === 'revenue' ? `฿${fmtK(p.value)}` : p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Common Dashboard Card Container ───────────────────────────────────────────
const SectionCard = ({ title, onViewAll, extra, children, className }) => (
  <div className={`dash-card flex flex-col ${className || ''}`}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100/90 flex-shrink-0">
      <span className="text-[13px] font-bold text-slate-800 tracking-tight">{title}</span>
      <div className="flex items-center gap-2">
        {extra}
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            View All
          </button>
        )}
      </div>
    </div>
    <div className="flex-1 flex flex-col min-h-0">
      {children}
    </div>
  </div>
);

const RankingCard = ({ title, items, onViewAll, onSelect, emptyLabel = 'No booking data yet' }) => (
  <SectionCard title={title} onViewAll={onViewAll}>
    <div className="p-2">
      {items.length ? <div className="space-y-1">
        {items.map((item, index) => (
          <button
            key={`${item.name}-${index}`}
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
          >
            <span className="w-4 text-[10px] font-bold text-slate-400">{index + 1}</span>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: item.color || ['#1d62c9', '#7c3aed', '#16a34a', '#f59e0b', '#ef4444'][index % 5] }}>{item.initials || String(item.name || '—').slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">{item.name}</span>
            <span className="shrink-0 text-right text-[10px] font-bold text-slate-800"><span className="block">{item.activityLabel || `${item.bookings || 0} booking${item.bookings === 1 ? '' : 's'}`}</span><span className="block text-[9px] font-semibold text-slate-400">฿{fmtK(item.revenue || 0)}</span></span>
          </button>
        ))}
      </div> : <div className="py-8 text-center text-xs font-medium text-slate-400">{emptyLabel}</div>}
    </div>
  </SectionCard>
);

// ── Interactive Animated Live Sales Pipeline ──────────────────────────────────
const SalesPipeline = ({ stages, onClick }) => {
  const [activeStage, setActiveStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-advance traveling runner through pipeline stages
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % stages.length);
    }, 2600);
    return () => clearInterval(interval);
  }, [isPlaying, stages.length]);

  return (
    <div className="p-4 flex flex-col justify-between h-full bg-gradient-to-b from-white to-slate-50/40">
      {/* Active Traveling Deal Badge */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: stages[activeStage]?.color || '#2b7de9' }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ background: stages[activeStage]?.color || '#2b7de9' }}
            />
          </span>
          <span className="text-[11px] font-extrabold tracking-tight text-slate-700">
            Live Deal Flow:
          </span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse"
            style={{
              background: stages[activeStage]?.pillBg,
              color: stages[activeStage]?.pillColor,
            }}
          >
            {stages[activeStage]?.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveStage((prev) => (prev - 1 + stages.length) % stages.length)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-[10px]"
            title="Previous Stage"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 px-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors cursor-pointer text-[10px] flex items-center gap-1"
            title={isPlaying ? 'Pause Auto-Play' : 'Play Live Flow'}
          >
            {isPlaying ? <Pause className="w-3 h-3 text-slate-600" /> : <Play className="w-3 h-3 text-slate-600" />}
            <span>{isPlaying ? 'Live' : 'Paused'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStage((prev) => (prev + 1) % stages.length)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-[10px]"
            title="Next Stage"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Main Chevron Pipeline Grid */}
      <div className="grid grid-cols-4 gap-2 relative">
        {stages.map((stage, idx) => {
          const isActive = activeStage === idx;
          const Icon = stage.icon || MessageSquare;

          return (
            <div
              key={stage.label}
              className="relative flex flex-col items-center group cursor-pointer"
              onClick={() => {
                setActiveStage(idx);
                onClick && onClick(stage);
              }}
            >
              {/* Card Container */}
              <div
                className={`w-full py-3.5 px-2.5 rounded-xl text-center transition-all duration-300 relative border flex flex-col items-center justify-between min-h-[94px] ${
                  isActive
                    ? 'shadow-lg scale-[1.04] ring-2 ring-offset-2'
                    : 'hover:shadow-md hover:scale-[1.01] opacity-90 hover:opacity-100'
                }`}
                style={{
                  background: stage.bgColor,
                  borderColor: isActive ? stage.color : stage.borderColor,
                  boxShadow: isActive ? `0 8px 24px -4px ${stage.color}35` : undefined,
                  ...(isActive ? { ringColor: stage.color } : {}),
                }}
              >
                {/* Animated Step Icon */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 text-white shadow-sm transition-transform duration-300 ${
                    isActive ? 'scale-110 rotate-3' : 'group-hover:scale-105'
                  }`}
                  style={{ background: stage.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Counter value */}
                <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none tracking-tight">
                  <AnimatedNumber value={stage.value} />
                </div>

                {/* Label */}
                <div className="text-[10px] font-bold text-slate-600 mt-1 truncate max-w-full">
                  {stage.label}
                </div>
              </div>

              {/* Conversion Percentage Pill */}
              <div
                className={`mt-2.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-tight transition-all duration-300 shadow-sm border ${
                  isActive ? 'scale-105 font-black ring-1' : ''
                }`}
                style={{
                  background: stage.pillBg,
                  color: stage.pillColor,
                  borderColor: `${stage.color}30`,
                }}
              >
                {stage.conversionPct}%
              </div>

              {/* Connecting Chevron Arrow */}
              {idx < stages.length - 1 && (
                <div className="absolute right-[-10px] top-[32px] z-10 hidden sm:flex items-center text-slate-400">
                  <span className="text-sm font-black transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Animated Stepper Progress Bar & Stage Indicator */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: stages[activeStage]?.color || '#2b7de9' }}
            />
            <span>Stage {activeStage + 1} of 4:</span>
            <span className="text-slate-900 font-extrabold">{stages[activeStage]?.label}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            Conversion: {stages[activeStage]?.conversionPct}%
          </span>
        </div>

        {/* Dynamic Track with Moving Gradient */}
        <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${((activeStage + 1) / stages.length) * 100}%`,
              background: `linear-gradient(90deg, #2b7de9 0%, #a855f7 35%, #10b981 70%, #3b82f6 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Booking Status Donut Chart ────────────────────────────────────────────────
const BookingStatusDonut = ({ data, totalBookings }) => {
  const total = Number(totalBookings ?? 0);
  const statusData = [
    { name: 'Confirmed', value: Number(data?.Confirmed ?? 0), from: '#34d399', to: '#059669' },
    { name: 'Upcoming', value: Number(data?.Upcoming ?? 0), from: '#60a5fa', to: '#1d62c9' },
    { name: 'Traveling', value: Number(data?.Traveling ?? 0), from: '#a78bfa', to: '#7c3aed' },
    { name: 'Completed', value: Number(data?.Completed ?? 0), from: '#fbbf24', to: '#d97706' },
    { name: 'Cancelled', value: Number(data?.Cancelled ?? data?.Canceled ?? 0), from: '#fb7185', to: '#e11d48' },
  ].map((status) => ({ ...status, pct: total ? Math.round((status.value / total) * 100) : 0 }));
  const hasData = statusData.some((status) => status.value > 0);
  const chartData = hasData ? statusData.filter((status) => status.value > 0) : [{ name: 'None', value: 1, from: '#e2e8f0', to: '#cbd5e1' }];

  return (
    <div className="p-3 flex flex-col min-[420px]:flex-row items-center gap-3 h-full" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 60%)' }}>
      <div className="flex-shrink-0 w-[128px] h-[128px] relative">
                <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {chartData.map((entry) => (
                <linearGradient key={entry.name} id={`bs-${entry.name}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.from} />
                  <stop offset="100%" stopColor={entry.to} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={chartData}
              innerRadius={46}
              outerRadius={61}
              paddingAngle={chartData.length > 1 ? 2 : 0}
              minAngle={chartData.length > 1 ? 4 : 0}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={`url(#bs-${entry.name})`} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[24px] font-black text-slate-900 leading-none">
            <AnimatedNumber value={total} />
          </div>
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            Bookings
          </div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-1">
        {statusData.map((s) => (
          <div key={s.name} className="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }} />
                <span className="text-[11.5px] font-semibold text-slate-700">{s.name}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-slate-800">{s.value}</span>
                <span className="text-[10px] text-slate-400 font-semibold">({s.pct}%)</span>
              </div>
            </div>
            <div className="mt-0.5 h-[3px] rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${s.from}, ${s.to})` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Master Modules Collapsible Section ────────────────────────────────────────
const MASTER_CATEGORIES = [
  {
    name: 'Sales',
    itemsCount: 6,
    icon: Users,
    color: '#1d62c9',
    bgColor: '#eff6ff',
    badgeColor: '#154aa0',
    items: [
      { name: 'Agents', count: 18, path: '/masters/agents' },
      { name: 'B2C', count: 20, path: '/masters/b2c' },
      { name: 'Lead Source', count: 4, path: '/masters/lead-source' },
      { name: 'Market', count: 1, path: '/masters/market' },
      { name: 'Query Type', count: 8, path: '/masters/query-type' },
      { name: 'Markup Categories', count: 3, path: '/masters/markup-categories' },
    ],
  },
  {
    name: 'Hotels',
    itemsCount: 6,
    icon: Building2,
    color: '#9333ea',
    bgColor: '#faf5ff',
    badgeColor: '#7e22ce',
    items: [
      { name: 'Hotels', count: 64, path: '/masters/hotels' },
      { name: 'Suppliers', count: 99, path: '/masters/suppliers' },
      { name: 'Hotel Category', count: 11, path: '/masters/hotel-category' },
      { name: 'Room Type', count: 94, path: '/masters/room-type' },
      { name: 'Meal Plan', count: 6, path: '/masters/meal-plan' },
      { name: 'Amenities', count: 12, path: '/masters/amenities' },
    ],
  },
  {
    name: 'Operations',
    itemsCount: 9,
    icon: Truck,
    color: '#059669',
    bgColor: '#ecfdf5',
    badgeColor: '#047857',
    items: [
      { name: 'Transfers', count: 40, path: '/masters/transfers' },
      { name: 'Destination', count: 6, path: '/masters/destination' },
      { name: 'Location', count: 16, path: '/masters/location' },
      { name: 'Airports', count: 8, path: '/masters/airports' },
      { name: 'Vehicles', count: 14, path: '/masters/vehicles' },
      { name: 'Drivers', count: 2, path: '/masters/drivers' },
      { name: 'Guides', count: 2, path: '/masters/guides' },
      { name: 'Ferry Classes', count: 0, path: '/masters/ferry-classes' },
      { name: 'Yacht', count: 4, path: '/masters/yacht' },
    ],
  },
  {
    name: 'Activities',
    itemsCount: 5,
    icon: Globe,
    color: '#d97706',
    bgColor: '#fffbeb',
    badgeColor: '#b45309',
    items: [
      { name: 'Sightseeing', count: 37, path: '/masters/sightseeing' },
      { name: 'Restaurants', count: 2, path: '/masters/restaurants' },
      { name: 'Restaurant Types', count: 2, path: '/masters/restaurant-types' },
      { name: 'Visa', count: 1, path: '/masters/visa' },
      { name: 'Travel Insurance', count: 0, path: '/masters/travel-insurance' },
    ],
  },
  {
    name: 'Finance',
    itemsCount: 3,
    icon: Banknote,
    color: '#e11d48',
    bgColor: '#fff1f2',
    badgeColor: '#be123c',
    items: [
      { name: 'Currency', count: 3, path: '/masters/currency' },
      { name: 'Banks', count: 4, path: '/masters/banks' },
      { name: 'Expense Types', count: 1, path: '/masters/expense-types' },
    ],
  },
  {
    name: 'System',
    itemsCount: 6,
    icon: Settings,
    color: '#4f46e5',
    bgColor: '#eef2ff',
    badgeColor: '#4338ca',
    items: [
      { name: 'Itinerary', count: 2, path: '/masters/itinerary' },
      { name: 'Arrival/Departure', count: 2, path: '/masters/arrival-departure' },
      { name: 'Documents', count: 1, path: '/masters/documents' },
      { name: 'Guest Documents', count: 2, path: '/masters/guest-documents' },
      { name: 'Feedback Types', count: 2, path: '/masters/feedback-types' },
      { name: 'Terms & Conditions', count: 1, path: '/masters/terms-conditions' },
    ],
  },
];

const MasterModulesSection = ({ counts, navigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return MASTER_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return MASTER_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((it) => it.name.toLowerCase().includes(q)),
    })).filter((cat) => cat.items.length > 0 || cat.name.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="dash-card">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-transform"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div>
            <div className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
              Master Modules
            </div>
            <p className="text-[10px] text-slate-400">Manage all your business data from one place</p>
          </div>
        </div>

        {/* Search master data */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search master data..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Module Grid */}
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.name}
                className="rounded-xl p-3 border transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                style={{
                  background: cat.bgColor,
                  borderColor: `${cat.color}25`,
                }}
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                      style={{ background: cat.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: cat.badgeColor }}>
                        {cat.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-semibold">
                        {cat.itemsCount} Items
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    {cat.items.map((it) => {
                      // Lookup live count if available in masterCounts or fallback
                      const liveCount = counts?.[it.path] ?? it.count;
                      return (
                        <button
                          key={it.name}
                          type="button"
                          onClick={() => navigate(it.path)}
                          className="flex items-center justify-between w-full text-left py-0.5 px-1 rounded hover:bg-white/60 transition-colors cursor-pointer group"
                        >
                          <span className="text-[11px] font-medium text-slate-700 truncate group-hover:text-slate-900">
                            {it.name}
                          </span>
                          <span
                            className="text-[10px] font-bold flex items-center gap-0.5 flex-shrink-0"
                            style={{ color: cat.color }}
                          >
                            <span>{liveCount}</span>
                            <span className="text-[10px] opacity-70">›</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manage Link */}
                <div className="mt-4 pt-2 border-t border-black/5 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/app/masters')}
                    className="text-[11px] font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                    style={{ color: cat.color }}
                  >
                    Manage →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Interactive Travel Booking Calendar ───────────────────────────────────────
const CALENDAR_EVENTS = [
  { id: 'ev-4', day: 4, label: 'Pattaya Arrival', time: '10:30 AM', category: 'arrival', type: 'Flight Arrival', client: 'Mr Gautam Patel', pax: '4 Pax', bookingId: 'BK-2026-123', arrival: 'Oct 04, 2026', departure: 'Oct 09, 2026', checkIn: 'Oct 04, 2026', checkOut: 'Oct 09, 2026', bg: '#eff6ff', border: '#2b7de9', color: '#154aa0', icon: '✈️' },
  { id: 'ev-5', day: 5, label: 'Bangkok City Tour', time: '09:00 AM', category: 'tour', type: 'City Tour', client: 'Desi Firangi', pax: '6 Pax', bookingId: 'BK-2026-124', arrival: 'Oct 04, 2026', departure: 'Oct 10, 2026', checkIn: 'Oct 04, 2026', checkOut: 'Oct 10, 2026', bg: '#faf5ff', border: '#a855f7', color: '#7e22ce', icon: '🏛️' },
  { id: 'ev-6', day: 6, label: 'Safari World', time: '12:30 PM', category: 'sightseeing', type: 'Wildlife Park', client: 'Satnam Singh', pax: '5 Pax', bookingId: 'TK-332', arrival: 'Oct 05, 2026', departure: 'Oct 11, 2026', checkIn: 'Oct 05, 2026', checkOut: 'Oct 11, 2026', bg: '#ecfdf5', border: '#10b981', color: '#047857', icon: '🦁' },
  { id: 'ev-7', day: 7, label: '+3 more', time: 'Multiple', category: 'all', type: 'Multi Bookings', client: 'Various Clients', pax: '12 Pax', bookingId: 'BK-MULTI', arrival: 'Oct 06, 2026', departure: 'Oct 12, 2026', checkIn: 'Oct 06, 2026', checkOut: 'Oct 12, 2026', bg: '#f0f9ff', border: '#0284c7', color: '#0369a1', icon: '📋' },
  { id: 'ev-8', day: 8, label: 'Krabi Tour', time: '08:30 AM', category: 'tour', type: 'Island Tour', client: 'Mr Arvind Sutariya', pax: '12 Pax', bookingId: 'BK-2026-127', arrival: 'Oct 07, 2026', departure: 'Oct 13, 2026', checkIn: 'Oct 07, 2026', checkOut: 'Oct 13, 2026', bg: '#eff6ff', border: '#3b82f6', color: '#154aa0', icon: '🏝️' },
  { id: 'ev-9', day: 9, label: 'Phuket Transfer', time: '02:00 PM', category: 'transfer', type: 'Van Transfer', client: 'Mr Kaushalkumar', pax: '16 Pax', bookingId: 'BK-2026-128', arrival: 'Oct 07, 2026', departure: 'Oct 14, 2026', checkIn: 'Oct 08, 2026', checkOut: 'Oct 14, 2026', bg: '#eff6ff', border: '#2b7de9', color: '#154aa0', icon: '🚐' },
  { id: 'ev-10', day: 10, label: 'Bangkok Departure', time: '06:00 PM', category: 'arrival', type: 'Flight Departure', client: 'Mr Manoj Shah', pax: '4 Pax', bookingId: 'BK-2026-129', arrival: 'Oct 05, 2026', departure: 'Oct 10, 2026', checkIn: 'Oct 05, 2026', checkOut: 'Oct 10, 2026', bg: '#eff6ff', border: '#2b7de9', color: '#154aa0', icon: '🛫' },
  { id: 'ev-11', day: 11, label: 'Kanchanaburi Tour', time: '07:30 AM', category: 'sightseeing', type: 'Historical Excursion', client: 'Jiya Tours', pax: '8 Pax', bookingId: 'BK-2026-130', arrival: 'Oct 09, 2026', departure: 'Oct 15, 2026', checkIn: 'Oct 09, 2026', checkOut: 'Oct 15, 2026', bg: '#ecfdf5', border: '#10b981', color: '#047857', icon: '🌿' },
  { id: 'ev-12', day: 12, label: 'James Bond Island', time: '09:00 AM', category: 'sightseeing', type: 'Boat & Canoeing', client: 'Travelling The World', pax: '6 Pax', bookingId: 'BK-2026-131', arrival: 'Oct 10, 2026', departure: 'Oct 16, 2026', checkIn: 'Oct 10, 2026', checkOut: 'Oct 16, 2026', bg: '#ecfdf5', border: '#10b981', color: '#047857', icon: '⛵' },
  { id: 'ev-13', day: 13, label: 'Krabi Tour', time: '11:00 AM', category: 'tour', type: '4 Islands Sunset', client: 'Surya Kiran DMC', pax: '10 Pax', bookingId: 'BK-2026-132', arrival: 'Oct 11, 2026', departure: 'Oct 17, 2026', checkIn: 'Oct 11, 2026', checkOut: 'Oct 17, 2026', bg: '#faf5ff', border: '#a855f7', color: '#7e22ce', icon: '🏖️' },
  { id: 'ev-14', day: 14, label: 'Phi Phi Island', time: '08:00 AM', category: 'tour', type: 'Speedboat & Maya Bay', client: 'Mr Gautam Patel', pax: '4 Pax', bookingId: 'BK-2026-119', arrival: 'Oct 12, 2026', departure: 'Oct 18, 2026', checkIn: 'Oct 12, 2026', checkOut: 'Oct 18, 2026', bg: '#eff6ff', border: '#2b7de9', color: '#154aa0', icon: '🚤' },
  { id: 'ev-16', day: 16, label: 'Phuket Transfer', time: '01:30 PM', category: 'transfer', type: 'Intercity Transfer', client: 'Desi Firangi', pax: '6 Pax', bookingId: 'BK-2026-135', arrival: 'Oct 14, 2026', departure: 'Oct 20, 2026', checkIn: 'Oct 14, 2026', checkOut: 'Oct 20, 2026', bg: '#eff6ff', border: '#2b7de9', color: '#154aa0', icon: '🚐' },
  { id: 'ev-17', day: 17, label: 'Check Out', time: '12:00 PM', category: 'hotel', type: 'Hotel Check-out', client: 'Satnam Singh', pax: '4 Pax', bookingId: 'PG-251', arrival: 'Oct 12, 2026', departure: 'Oct 17, 2026', checkIn: 'Oct 12, 2026', checkOut: 'Oct 17, 2026', bg: '#eff6ff', border: '#3b82f6', color: '#154aa0', icon: '🏨' },
  { id: 'ev-18', day: 18, label: 'Phuket Transfer', time: '03:00 PM', category: 'transfer', type: 'Airport Drop', client: 'Mr Arvind Sutariya', pax: '12 Pax', bookingId: 'BK-2026-138', arrival: 'Oct 13, 2026', departure: 'Oct 18, 2026', checkIn: 'Oct 13, 2026', checkOut: 'Oct 18, 2026', bg: '#eff6ff', border: '#2b7de9', color: '#154aa0', icon: '🚐' },
];

const calendarCategory = (type = '') => {
  const value = String(type).toLowerCase();
  if (value.includes('arrival') || value.includes('departure') || value.includes('flight')) return 'arrival';
  if (value.includes('sightseeing') || value.includes('activity')) return 'sightseeing';
  if (value.includes('tour') || value.includes('yacht') || value.includes('ferry')) return 'tour';
  if (value.includes('transfer') || value.includes('hotel')) return 'transfer';
  return 'all';
};

const calendarAppearance = (event = {}) => {
  const category = calendarCategory(event.type);
  const styles = {
    arrival: { bg: '#eff6ff', border: '#2b7de9', color: '#154aa0', icon: String(event.type).toLowerCase().includes('departure') ? '🛫' : '✈️' },
    sightseeing: { bg: '#ecfdf5', border: '#10b981', color: '#047857', icon: '🏝️' },
    tour: { bg: '#faf5ff', border: '#a855f7', color: '#7e22ce', icon: '🛥️' },
    transfer: { bg: '#eff6ff', border: '#3b82f6', color: '#154aa0', icon: String(event.type).toLowerCase().includes('hotel') ? '🏨' : '🚐' },
    all: { bg: '#f8fafc', border: '#64748b', color: '#334155', icon: '📍' },
  };
  return { ...styles[category], category };
};

const formatCalendarDay = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
  : '';

const TravelCalendar = ({ selectedMonth, setSelectedMonth, changeMonth, today, navigate, events = [] }) => {
  const [viewMode, setViewMode] = useState('Month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activePreview, setActivePreview] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today);

  // Calendar Weeks
  const calendarWeeks = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const start = new Date(year, month - 1, 1 - first.getDay());
    const daysInMonth = new Date(year, month, 0).getDate();
    const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7);
    return Array.from({ length: weekCount }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => {
        const date = new Date(start);
        date.setDate(start.getDate() + week * 7 + day);
        return {
          date,
          dayNum: date.getDate(),
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
          inMonth: date.getMonth() === month - 1,
        };
      })
    );
  }, [selectedMonth]);

  useEffect(() => {
    if (selectedDate.slice(0, 7) !== selectedMonth) setSelectedDate(`${selectedMonth}-01`);
  }, [selectedMonth, selectedDate]);

  // Filtered events are keyed by their full ISO date, so a trip on the 16th
  // can never overwrite a similarly numbered day in another month.
  const filteredEventsMap = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const appearance = calendarAppearance(event);
      if (categoryFilter !== 'all' && appearance.category !== categoryFilter) return;
      const dayEvents = map.get(event.date) || [];
      dayEvents.push({ ...event, ...appearance });
      map.set(event.date, dayEvents);
    });
    return map;
  }, [categoryFilter, events]);

  const filteredEvents = useMemo(() => [...filteredEventsMap.values()].flat(), [filteredEventsMap]);
  const categoryCounts = useMemo(() => {
    const counts = { all: events.length, arrival: 0, tour: 0, sightseeing: 0, transfer: 0 };
    events.forEach((event) => { const category = calendarCategory(event.type); if (category !== 'all') counts[category] += 1; });
    return counts;
  }, [events]);

  // Week view is anchored to the selected date (today by default).
  const weekEvents = useMemo(() => {
    const anchor = new Date(`${selectedDate}T00:00:00Z`);
    const sunday = new Date(anchor);
    sunday.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sunday);
      date.setUTCDate(sunday.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        dayName: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date),
        date: date.getUTCDate(),
        isToday: key === today,
        events: filteredEventsMap.get(key) || [],
      };
    });
  }, [filteredEventsMap, selectedDate, today]);

  // The day timeline always represents the selected calendar date.
  const daySchedule = useMemo(() => {
    return (filteredEventsMap.get(selectedDate) || []).sort((left, right) => String(left.time || '').localeCompare(String(right.time || '')));
  }, [filteredEventsMap, selectedDate]);

  return (
    <div className="dash-card flex flex-col w-full relative">
      {/* ── Calendar Toolbar Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 border-b border-slate-100">
        {/* Left: Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-extrabold text-slate-800 tracking-tight">
              {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${selectedMonth}-01T00:00:00Z`))}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {events.length} Trip{events.length === 1 ? '' : 's'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setSelectedMonth(today.slice(0, 7)); setSelectedDate(today); setViewMode('Day'); }}
            className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Right: View Segmented Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
          {['Month', 'Week', 'Day'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setViewMode(tab)}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                viewMode === tab
                  ? 'bg-blue-600 text-white shadow-sm scale-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category Filter Pills ─────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-[11px]">
        {[
          { id: 'all', label: 'All Trips', icon: '●', count: categoryCounts.all },
          { id: 'arrival', label: 'Arrivals & Flights', icon: '✈️', count: categoryCounts.arrival },
          { id: 'tour', label: 'Tours & Islands', icon: '🏝️', count: categoryCounts.tour },
          { id: 'sightseeing', label: 'Sightseeing', icon: '🦁', count: categoryCounts.sightseeing },
          { id: 'transfer', label: 'Transfers & Hotels', icon: '🚐', count: categoryCounts.transfer },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCategoryFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
              categoryFilter === f.id
                ? 'bg-white text-blue-700 border-blue-300 shadow-2xs font-bold'
                : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-800'
            }`}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
            <span className="text-[9px] opacity-75 font-mono">({f.count})</span>
          </button>
        ))}
      </div>

      {/* ── View 1: Month Grid View ───────────────────────────────────────── */}
      {viewMode === 'Month' && (
        <div className="p-3 flex-1 overflow-x-auto flex flex-col">
          <div className="min-w-[540px] flex-1 flex flex-col">
            {/* Weekday Row */}
            <div className="grid grid-cols-7 mb-1 bg-slate-100/70 rounded-lg p-0.5 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-[11px] font-bold text-slate-500 py-1.5 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* 5-Week Grid */}
            {calendarWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-t border-slate-100 flex-1">
                {week.map((cell) => {
                  const dayEvents = filteredEventsMap.get(cell.key) || [];
                  const ev = dayEvents[0];
                  const isToday = cell.key === today;

                  return (
                    <div
                      key={cell.key}
                      onClick={() => {
                        setSelectedDate(cell.key);
                        if (ev) setActivePreview(ev);
                        else setViewMode('Day');
                      }}
                      className={`min-h-[58px] sm:min-h-[64px] p-1 border-l border-slate-100 first:border-l-0 transition-all cursor-pointer relative group ${
                        cell.inMonth
                          ? 'hover:bg-blue-50/25 bg-white'
                          : 'bg-slate-50/40 opacity-55'
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between mb-1">
                        <div
                          className={`text-[11px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 font-black'
                              : cell.inMonth
                              ? 'text-slate-800'
                              : 'text-slate-300'
                          }`}
                        >
                          {cell.dayNum}
                        </div>

                        {/* Subtle event indicator dot if present */}
                        {ev && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: ev.border }}
                          />
                        )}
                      </div>

                      {/* Event Chip */}
                      {ev && (
                        <div
                          title={`${ev.time || 'All day'} - ${ev.title} (${ev.detail})`}
                          className="w-full text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate leading-tight shadow-2xs border transition-all duration-150 group-hover:scale-[1.02] group-hover:shadow-xs flex items-center gap-1"
                          style={{
                            background: ev.bg,
                            color: ev.color,
                            borderColor: `${ev.border}40`,
                            borderLeftWidth: '2.5px',
                            borderLeftColor: ev.border,
                          }}
                        >
                          <span className="text-[10px] flex-shrink-0">{ev.icon}</span>
                          <span className="truncate">{ev.title}</span>
                        </div>
                      )}
                      {dayEvents.length > 1 && <div className="mt-0.5 text-[8px] font-bold text-blue-600">+{dayEvents.length - 1} more</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── View 2: Week Columns View ─────────────────────────────────────── */}
      {viewMode === 'Week' && (
        <div className="p-3 flex-1 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[580px]">
            {weekEvents.map((w) => (
              <div
                key={w.key}
                className={`rounded-xl p-2.5 border transition-all flex flex-col justify-between min-h-[220px] ${
                  w.isToday
                    ? 'bg-blue-50/40 border-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-center pb-2 border-b border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {w.dayName}
                    </div>
                    <div
                      className={`text-sm font-black mx-auto mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                        w.isToday ? 'bg-blue-600 text-white' : 'text-slate-800'
                      }`}
                    >
                      {w.date}
                    </div>
                  </div>

                  {/* Day Events */}
                  <div className="mt-2 space-y-2">
                    {w.events.map((ev, i) =>
                      ev ? (
                        <div
                          key={i}
                          onClick={() => setActivePreview(ev)}
                          className="p-2 rounded-lg border text-left cursor-pointer transition-transform hover:scale-[1.02] shadow-2xs"
                          style={{
                            background: ev.bg,
                            borderColor: `${ev.border}40`,
                            borderLeftWidth: '3px',
                            borderLeftColor: ev.border,
                          }}
                        >
                          <div className="text-[10px] font-bold" style={{ color: ev.color }}>
                            {ev.icon} {ev.time}
                          </div>
                          <div className="text-[11px] font-extrabold text-slate-800 truncate mt-0.5">
                            {ev.title}
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
                            {ev.detail}
                          </div>
                        </div>
                      ) : null
                    )}
                    {w.events.length === 0 && (
                      <div className="text-center text-[10px] text-slate-300 py-8">
                        No events
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setSelectedDate(w.key); setViewMode('Day'); }}
                  className="mt-2 w-full text-center text-[9px] font-bold text-blue-600 hover:underline pt-1 border-t border-slate-100"
                >
                  View day
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── View 3: Day Timeline View ─────────────────────────────────────── */}
      {viewMode === 'Day' && (
        <div className="p-3 flex-1 overflow-y-auto max-h-[290px] space-y-2">
          <div className="flex items-center justify-between px-2 py-1 bg-blue-50/60 rounded-lg text-xs font-bold text-blue-800">
            <span>Schedule for {formatCalendarDay(selectedDate)}</span>
            <span className="text-[10px] text-blue-600 font-normal">{daySchedule.length} itinerary item{daySchedule.length === 1 ? '' : 's'}</span>
          </div>
          {daySchedule.map((item, idx) => (
            <div
              key={idx}
              onClick={() => navigate(`/app/bookings/${item.bookingId}`)}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200/70 bg-white hover:bg-slate-50 transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="w-18 flex-shrink-0 text-[11px] font-black text-slate-600">
                {item.time || 'All day'}
              </div>
              <div className="w-1.5 h-8 rounded-full" style={{ background: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">{item.detail}</div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                style={{ background: item.bg, color: item.color }}
              >
                {item.status || 'Confirmed'}
              </span>
            </div>
          ))}
          {!daySchedule.length && <div className="py-10 text-center text-xs font-medium text-slate-400">No booking activity is scheduled for this day.</div>}
        </div>
      )}

      {/* ── Interactive Quick Event Preview Modal / Flyout ────────────────── */}
      {activePreview && (
        <div className="absolute inset-0 z-30 bg-slate-900/20 backdrop-blur-[2px] rounded-2xl flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">{activePreview.icon}</span>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{activePreview.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{activePreview.type}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Time & Date:</span>
                <span className="font-bold text-slate-800">
                  {activePreview.time || 'All day'} · {formatCalendarDay(activePreview.date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Booking ID:</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {activePreview.bookingId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Client / Guest:</span>
                <span className="font-bold text-slate-800">{activePreview.client}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Party Size:</span>
                <span className="font-bold text-slate-800">{activePreview.detail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Status:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {activePreview.status || 'Confirmed'}
                </span>
              </div>

            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActivePreview(null);
                  navigate(`/app/bookings/${activePreview.bookingId}`);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Full Booking</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Complete Redesigned Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const today = todayIsoInTimeZone();
  const [selectedMonth, setSelectedMonth] = useState(() => todayIsoInTimeZone().slice(0, 7));
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [masterCounts, setMasterCounts] = useState(() => getCachedMasterSummary() || {});

  // Fetch overview from API
  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError('');
    apiClient.get(`/dashboard?month=${encodeURIComponent(selectedMonth)}`)
      .then((response) => {
        if (current) setOverview(response.data);
      })
      .catch((error) => {
        if (current) setLoadError(error.message || 'Unable to load live dashboard data.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, [selectedMonth]);

  useEffect(() => {
    loadMasterSummary().then(setMasterCounts).catch(() => {});
  }, []);

  const data = overview || {};
  const summary = data.summary || {};
  const selectedYear = selectedMonth.slice(0, 4);
  const dashboardYears = useMemo(() => [...new Set([
    ...(Array.isArray(data.availableYears) ? data.availableYears.map(String) : []),
    selectedYear,
    today.slice(0, 4),
  ].filter((year) => /^\d{4}$/.test(year)))].sort((left, right) => Number(right) - Number(left)), [data.availableYears, selectedYear, today]);

  const changeDashboardYear = (event) => {
    const year = String(event.target.value || '');
    if (!/^\d{4}$/.test(year)) return;
    // Retain the viewed month (for example October) while loading that month
    // and the chart totals for the newly selected reporting year.
    setSelectedMonth(`${year}-${selectedMonth.slice(5, 7)}`);
  };

  const totalEnquiries = Number(summary.totalQueries ?? 0);
  const quotationCount = Number(summary.quotations ?? 0);
  const confirmedBookingCount = Number(summary.confirmedBookings ?? 0);
  const lostQueryCount = Number(summary.lostQueries ?? 0);
  const pctOfEnquiries = (value) => totalEnquiries > 0 ? Math.round((Number(value || 0) / totalEnquiries) * 100) : 0;

  // All dashboard figures are live values returned by the API. Do not show
  // demo numbers when a category has no records.
  const kpiStats = [
    {
      icon: Users,
      label: 'Total Enquiries',
      value: totalEnquiries,
      pctPositive: true,
      iconGradient: 'linear-gradient(135deg, #1d62c9, #154aa0)',
      sparkColor: '#2b7de9',
      sparkData: [],
      onClick: () => navigate('/app/queries'),
    },
    {
      icon: FileText,
      label: 'Quotations Sent',
      value: quotationCount,
      pctPositive: true,
      iconGradient: 'linear-gradient(135deg, #9333ea, #7e22ce)',
      sparkColor: '#a855f7',
      sparkData: [],
      onClick: () => navigate('/app/quotations'),
    },
    {
      icon: CalendarIcon,
      label: 'Confirmed',
      value: confirmedBookingCount,
      pctPositive: true,
      iconGradient: 'linear-gradient(135deg, #10b981, #059669)',
      sparkColor: '#10b981',
      sparkData: [],
      onClick: () => navigate('/app/bookings?status=Confirmed'),
    },
    {
      icon: Clock,
      label: 'Lost',
      value: lostQueryCount,
      pctPositive: false,
      iconGradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
      sparkColor: '#f43f5e',
      sparkData: [],
      onClick: () => navigate('/app/queries?status=Lost'),
    },
    {
      icon: FileCheck2,
      label: 'Total Bookings',
      value: Number(summary.totalBookings ?? 0),
      pctPositive: true,
      iconGradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
      sparkColor: '#0284c7',
      sparkData: [],
      onClick: () => navigate('/app/bookings'),
    },
    {
      icon: Users,
      label: 'Total Pax',
      value: Number(summary.totalPax ?? 0),
      pctPositive: true,
      iconGradient: 'linear-gradient(135deg, #3b82f6, #1d62c9)',
      sparkColor: '#3b82f6',
      sparkData: [],
      onClick: () => navigate('/app/bookings'),
    },
    {
      icon: Wallet,
      label: 'Revenue (THB)',
      value: fmtK(summary.revenue ?? 0),
      pctPositive: true,
      iconGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      sparkColor: '#f59e0b',
      sparkData: [],
      onClick: () => navigate('/app/accounts/invoices-payments'),
    },
  ];

  const monthlyData = useMemo(() => {
    // Never blend live data with placeholder months. A zero is a real zero,
    // so the selected year can be trusted for reporting.
    return (data.monthly || []).map((month) => ({
      month: month.month,
      queries: Number(month.queries || 0),
      bookings: Number(month.bookings || 0),
      revenue: Number(month.revenue || 0),
    }));
  }, [data.monthly]);

  // Upcoming Today items
  const upcomingToday = useMemo(() => {
    // Cross-check with the calendar feed: only items dated today are shown,
    // duplicates are removed, and calendar events for today fill any gaps.
    const calendarToday = (data.calendar?.events || []).filter((event) => event.date === today);
    const merged = [];
    const seen = new Set();
    [...(data.upcomingToday || []).filter((item) => !item.date || item.date === today), ...calendarToday].forEach((item) => {
      const key = `${item.bookingId || ''}|${String(item.type || '').toLowerCase()}|${item.title || ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
    if (merged.length > 0) {
      return merged.map((item, idx) => {
        const appearance = calendarAppearance(item);
        const eventType = String(item.type || 'service').toLowerCase();
        return {
          ...item,
          time: item.time || 'All day',
          badge: eventType.includes('departure') ? 'Departure' : eventType.includes('arrival') ? 'Arrival' : String(item.type || 'Service'),
          badgeBg: appearance.bg,
          badgeColor: appearance.color,
          img: item.image || item.img || '',
        };
      });
    }
    return [];
  }, [data.upcomingToday, data.calendar, today]);

  // Recent Enquiries
  const recentEnquiries = useMemo(() => {
    const styles = {
      New: { bg: '#dcfce7', color: '#15803d' }, Working: { bg: '#e0f2fe', color: '#0369a1' },
      Quoted: { bg: '#f3e8ff', color: '#7e22ce' }, Confirmed: { bg: '#dcfce7', color: '#15803d' },
      Lost: { bg: '#fee2e2', color: '#dc2626' },
    };
    const avatars = ['#2b7de9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    return (data.recentEnquiries || []).map((item, idx) => {
      const status = item.status || 'New';
      const style = styles[status] || { bg: '#f1f5f9', color: '#475569' };
      return {
        id: item.id || idx,
        initials: item.initials || 'EN',
        name: item.name || 'Enquiry Client',
        detail: item.detail || '—',
        status,
        statusBg: style.bg,
        statusColor: style.color,
        date: item.date || '',
        avatarBg: item.color || avatars[idx % avatars.length],
      };
    });
  }, [data.recentEnquiries]);

  // Top Agents
  const topAgents = useMemo(() => {
    if (data.topAgents && data.topAgents.length > 0) return data.topAgents;
    return [];
  }, [data.topAgents]);

  const topHotels = useMemo(() => data.topHotels || [], [data.topHotels]);
  const topSuppliers = useMemo(() => data.topSuppliers || [], [data.topSuppliers]);
  const topSightseeing = useMemo(() => data.topSightseeing || [], [data.topSightseeing]);
  const topB2C = useMemo(() => data.topB2C || [], [data.topB2C]);

  const topDestinations = useMemo(() => data.topDestinations || [], [data.topDestinations]);
  const revenueBreakdown = useMemo(() => (data.revenueBreakdown || []).map((item) => ({
    ...item,
    display: fmtK(item.value),
  })), [data.revenueBreakdown]);
  const leadSources = useMemo(() => {
    const sources = data.leadSources || [];
    const total = sources.reduce((sum, source) => sum + Number(source.value || 0), 0);
    return sources.map((source) => ({ ...source, pct: total ? Math.round((Number(source.value || 0) / total) * 100) : 0 }));
  }, [data.leadSources]);

  const changeMonth = (offset) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    setSelectedMonth(new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7));
  };

  const todayDate = new Date();
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(todayDate);
  const fullDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(todayDate);

  return (
    <div className="flex flex-col min-h-full pb-8 bg-slate-50/60 font-sans">
      {/* ── Load error banner if any ────────────────────────────────────────── */}
      {loadError && (
        <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex items-center justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => setLoadError('')} className="font-bold">✕</button>
        </div>
      )}

      {/* ── Welcome Greeting & Date Bar ─────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            Welcome back, {String(authUser?.name || 'there').split(' ')[0]} <span className="inline-block animate-wave text-2xl">👋</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Here's an overview of your travel business today.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-slate-700 tracking-tight">
            {dayName}, {fullDate}
          </div>
        </div>
      </div>

      {/* ── Top 7 KPI Stat Cards ────────────────────────────────────────────── */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2.5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-3 md:[&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1">
          {kpiStats.map((stat, i) => (
            <KPICard key={i} {...stat} />
          ))}
        </div>
      </div>

      {/* ── Row 2: Monthly Enquiries & Bookings + Booking Status ── */}
      <div className="px-4 py-2 grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Monthly Enquiries & Bookings */}
        <div className="xl:col-span-8 flex">
          <SectionCard
            title="Monthly Enquiries & Bookings"
            extra={
              <label className="relative text-[10px] font-semibold bg-slate-50 text-slate-600 rounded-md border border-slate-200 flex items-center">
                <span className="sr-only">Dashboard reporting year</span>
                <select
                  aria-label="Dashboard reporting year"
                  value={selectedYear}
                  onChange={changeDashboardYear}
                  className="appearance-none bg-transparent pl-2 pr-5 py-0.5 cursor-pointer outline-none"
                >
                  {dashboardYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1 w-3 h-3 text-slate-400" />
              </label>
            }
            onViewAll={() => navigate('/app/reports/booking')}
            className="w-full"
          >
            <div className="p-3 pt-2 flex-1 flex flex-col justify-between">
              {/* Legend */}
              <div className="flex items-center gap-4 mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg,#60a5fa,#1d62c9)' }} />
                  <span className="text-[11px] text-slate-600 font-medium">Enquiries</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }} />
                  <span className="text-[11px] text-slate-600 font-medium">Confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg,#6366f1,#d946ef)' }} />
                  <span className="text-[11px] text-slate-600 font-medium">Revenue (THB)</span>
                </div>
              </div>

              {/* Chart */}
              <div className="relative flex-1 min-h-[190px] w-full">
                <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gEnq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#1d62c9" /></linearGradient>
                      <linearGradient id="gBook" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient>
                      <linearGradient id="gRevArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient>
                      <linearGradient id="gRevLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#d946ef" /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 'auto']}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v / 1000}K`)}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      yAxisId="left"
                      dataKey="queries"
                      name="Enquiries"
                      fill="url(#gEnq)"
                      radius={[5, 5, 0, 0]}
                      barSize={14}
                      cursor="pointer"
                      onClick={() => navigate('/app/queries')}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="bookings"
                      name="Confirmed"
                      fill="url(#gBook)"
                      radius={[5, 5, 0, 0]}
                      barSize={14}
                      cursor="pointer"
                      onClick={() => navigate('/app/bookings?status=Confirmed')}
                    />
                    <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue area" fill="url(#gRevArea)" stroke="none" tooltipType="none" legendType="none" activeDot={false} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="url(#gRevLine)"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1.5, r: 3.5 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Booking Status */}
        <div className="xl:col-span-4 flex">
          <SectionCard
            title="Booking Status"
            extra={
              <span className="text-[10px] font-semibold bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                This Month <ChevronDown className="w-3 h-3 text-slate-400" />
              </span>
            }
            onViewAll={() => navigate('/app/bookings')}
            className="w-full"
          >
            <BookingStatusDonut
              data={summary.bookingStatusCounts || summary.statusCounts}
              totalBookings={summary.totalBookings ?? 0}
            />
          </SectionCard>
        </div>
      </div>

      {/* ── Row 3: Upcoming Today + Mini Calendar + Recent Enquiries ────────── */}
      <div className="px-4 py-2 grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Upcoming Today */}
        <div className="xl:col-span-3 flex">
          <SectionCard
            title={`Upcoming Today${upcomingToday.length ? ` (${upcomingToday.length})` : ''}`}
            onViewAll={() => navigate('/app/bookings?status=Today')}
            className="w-full"
          >
            <div className="relative flex-1 min-h-[320px]">
            <div className="p-2 space-y-1.5 overflow-y-auto h-full xl:absolute xl:inset-0">
              {upcomingToday.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => navigate(`/app/bookings/${item.bookingId}`)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <EventThumbnail src={item.img} type={item.type} title={item.title} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-500 mb-0.5">{item.time}</div>
                    <div className="text-xs font-bold text-slate-800 truncate">{item.title}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{item.detail}</div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
                    style={{
                      background: item.badgeBg || '#dbeafe',
                      color: item.badgeColor || '#1d62c9',
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
              ))}
              {!upcomingToday.length && !loading && <div className="px-3 py-12 text-center text-xs font-medium text-slate-400">No booking activity is scheduled for today.</div>}
            </div>
            </div>
          </SectionCard>
        </div>

        {/* Travel Calendar */}
        <div className="xl:col-span-6 flex">
          <TravelCalendar
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            changeMonth={changeMonth}
            today={today}
            navigate={navigate}
            events={data.calendar?.events || []}
          />
        </div>

        {/* Recent Enquiries */}
        <div className="xl:col-span-3 flex">
          <SectionCard
            title="Recent Enquiries"
            onViewAll={() => navigate('/app/queries')}
            className="w-full"
          >
            <div className="p-2 flex-1 flex flex-col gap-1.5 min-h-[320px]">
              {recentEnquiries.map((enq) => (
                <div
                  key={enq.id}
                  onClick={() => navigate('/app/queries')}
                  className="flex-1 max-h-[84px] flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100/70 hover:border-slate-200"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0 shadow-sm"
                    style={{ background: enq.avatarBg }}
                  >
                    {enq.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{enq.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{enq.detail}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full inline-block"
                      style={{ background: enq.statusBg, color: enq.statusColor }}
                    >
                      {enq.status}
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-medium">{enq.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Row 4: Top Agents + Top Destinations + Revenue Breakdown + Lead Sources ── */}
      <div className="px-4 py-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Top Agents */}
        <SectionCard
          title="Top Agents"
          onViewAll={() => navigate('/app/reports/agent-performance')}
        >
          <div className="p-1.5 sm:p-2 overflow-x-auto">
            <table className="w-full table-fixed min-w-[240px]">
              <colgroup>
                <col className="w-7" />
                <col />
                <col className="w-[18%]" />
                <col className="w-[30%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="text-left pb-2 pl-1.5 sm:pl-2">#</th>
                  <th className="text-left pb-2 pr-1">Agent<span className="hidden min-[400px]:inline"> Name</span></th>
                  <th className="text-center pb-2"><span className="min-[400px]:hidden">Bkgs</span><span className="hidden min-[400px]:inline">Bookings</span></th>
                  <th className="text-right pb-2 pr-1.5 sm:pr-2">Revenue<span className="hidden min-[400px]:inline"> (THB)</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topAgents.map((agent, i) => (
                  <tr
                    key={agent.name}
                    onClick={() => navigate(`/app/reports/agent-performance?agent=${encodeURIComponent(agent.name)}&clientType=Agent`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                  >
                    <td className="py-2 pl-1.5 sm:pl-2 font-bold text-slate-400 text-[11px]">{i + 1}</td>
                    <td className="py-2 pr-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                          style={{ background: agent.color }}
                        >
                          {agent.initials}
                        </div>
                        <span className="font-semibold text-slate-700 truncate min-w-0 text-[11px]" title={agent.name}>
                          {agent.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-center font-bold text-slate-800 text-[11px]">{agent.bookings}</td>
                    <td className="py-2 pr-1.5 sm:pr-2 text-right font-bold text-slate-800 text-[11px] whitespace-nowrap">฿{Number(agent.revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {!topAgents.length && <tr><td colSpan="4" className="py-8 text-center text-xs font-medium text-slate-400">No agent bookings yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Top Destinations */}
        <SectionCard
          title="Top Destinations (Bookings)"
          onViewAll={() => navigate('/app/reports/destination')}
        >
          <div className="p-3 space-y-3">
            {topDestinations.map((dest, i) => (
              <div
                key={dest.name}
                onClick={() => navigate('/app/reports/destination')}
                className="cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{i + 1}</span>
                    <span className="font-semibold text-slate-700 text-[11px] group-hover:text-blue-600 transition-colors">
                      {dest.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-[11px]">
                    <span className="text-slate-800">{dest.bookings}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{dest.pct}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${dest.pct}%`, background: dest.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Revenue Breakdown */}
        <SectionCard
          title="Revenue Breakdown (THB)"
          extra={
            <span className="text-[10px] font-semibold bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
              This Month <ChevronDown className="w-3 h-3 text-slate-400" />
            </span>
          }
          onViewAll={() => navigate('/app/reports/sales')}
        >
          <div className="p-3 flex-1 flex flex-col min-[420px]:flex-row xl:flex-col 2xl:flex-row items-center justify-center gap-4">
            <div className="w-[130px] h-[130px] relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {revenueBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-base font-black text-slate-900 leading-none">{fmtK(summary.revenue ?? 0)}</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Revenue</div>
              </div>
            </div>

            <div className="flex-1 w-full min-w-0 space-y-2">
              {revenueBreakdown.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-[11px] font-medium text-slate-600">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      <span className="text-slate-800">{item.display}</span>
                      <span className="text-[9px] text-slate-400 font-normal">({item.pct}%)</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Lead Sources */}
        <SectionCard
          title="Lead Sources"
          onViewAll={() => navigate('/app/queries')}
        >
          <div className="p-3 flex-1 flex flex-col justify-center gap-4">
            {leadSources.map((source) => (
              <div key={source.name} className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: source.color }} />
                    <span className="text-[11px] font-medium text-slate-700">{source.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">{source.pct}%</span>
                </div>
                <div className="w-full bg-white border border-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${source.pct}%`, background: source.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Row 5: Top operational partners and products ─────────────────── */}
      <div className="px-4 py-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <RankingCard
          title="Top Hotels"
          items={topHotels}
          onViewAll={() => navigate('/app/reports/booking?serviceType=Hotel')}
          onSelect={(hotel) => navigate(`/app/reports/booking?serviceType=Hotel&serviceName=${encodeURIComponent(hotel.name)}`)}
          emptyLabel="No hotel stays in bookings yet."
        />
        <RankingCard
          title="Top Suppliers"
          items={topSuppliers}
          onViewAll={() => navigate('/app/reports/supplier')}
          onSelect={(supplier) => navigate(`/app/reports/supplier?supplier=${encodeURIComponent(supplier.name)}`)}
          emptyLabel="No assigned suppliers in bookings yet."
        />
        <RankingCard
          title="Top Sightseeing"
          items={topSightseeing}
          onViewAll={() => navigate('/app/reports/booking?serviceType=Sightseeing')}
          onSelect={(sightseeing) => navigate(`/app/reports/booking?serviceType=Sightseeing&serviceName=${encodeURIComponent(sightseeing.name)}`)}
          emptyLabel="No sightseeing services in bookings yet."
        />
        <RankingCard
          title="Top B2C Customers"
          items={topB2C}
          onViewAll={() => navigate('/app/reports/agent-performance?clientType=B2C')}
          onSelect={(customer) => navigate(`/app/reports/agent-performance?clientType=B2C&agent=${encodeURIComponent(customer.name)}`)}
          emptyLabel="No B2C bookings yet."
        />
      </div>

      {/* ── Row 6: Master Modules ───────────────────────────────────────────── */}
      <div className="px-4 py-2">
        <MasterModulesSection counts={masterCounts} navigate={navigate} />
      </div>
    </div>
  );
}
