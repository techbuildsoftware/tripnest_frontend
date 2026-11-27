import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  BarChart2, TrendingUp, Users, MapPin, Building2, BookOpen, CreditCard, Receipt, Layers, Activity,
  ArrowRight, Sparkles, DollarSign, Target, Search, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { money, TravelDateRange, useBusinessReport } from './businessReportData';
import MiniBars from '../../components/ui/MiniBars';

const fmt = (n) => `฿${(Number(n) / 1000).toFixed(0)}K`;
const fmtFull = (n) => `฿${Number(n).toLocaleString()}`;

const reportCards = [
  { title: 'Sales Report', description: 'Revenue and bookings breakdown across channels', category: 'business', icon: BarChart2, iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-500/25', iconColor: 'text-blue-600', badge: 'Revenue', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/80', glowBg: 'from-blue-500/10', hoverBorder: 'hover:border-blue-400', path: '/reports/sales' },
  { title: 'Profit & Loss Report', description: 'Margin, net profit and loss, and financial health analysis', category: 'business', icon: TrendingUp, iconBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25', iconColor: 'text-emerald-600', badge: 'Margins', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', glowBg: 'from-emerald-500/10', hoverBorder: 'hover:border-emerald-400', path: '/reports/profit' },
  { title: 'Agent Performance', description: 'Partner-wise sales volume, conversion and revenue', category: 'business', icon: Users, iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-500/25', iconColor: 'text-purple-600', badge: 'Partners', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/80', glowBg: 'from-purple-500/10', hoverBorder: 'hover:border-purple-400', path: '/reports/agent-performance' },
  { title: 'Destination Report', description: 'Regional demand, popular travel locations and yield', category: 'business', icon: MapPin, iconBg: 'bg-orange-600 text-white shadow-md shadow-orange-500/25', iconColor: 'text-orange-600', badge: 'Regional', badgeColor: 'bg-orange-50 text-orange-700 border-orange-200/80', glowBg: 'from-orange-500/10', hoverBorder: 'hover:border-orange-400', path: '/reports/destination' },
  { title: 'Guest Report', description: 'Passenger demographics, group sizes and traveler flow', category: 'business', icon: Users, iconBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25', iconColor: 'text-indigo-600', badge: 'Travellers', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', glowBg: 'from-indigo-500/10', hoverBorder: 'hover:border-indigo-400', path: '/reports/guests' },
  { title: 'Supplier Report', description: 'Supplier payables, settlement status and balances', category: 'operational', icon: Building2, iconBg: 'bg-amber-600 text-white shadow-md shadow-amber-500/25', iconColor: 'text-amber-600', badge: 'Payables', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/80', glowBg: 'from-amber-500/10', hoverBorder: 'hover:border-amber-400', path: '/reports/supplier' },
  { title: 'Booking Report', description: 'Operational booking pipeline, pax count and statuses', category: 'operational', icon: BookOpen, iconBg: 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25', iconColor: 'text-cyan-600', badge: 'Pipeline', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200/80', glowBg: 'from-cyan-500/10', hoverBorder: 'hover:border-cyan-400', path: '/reports/booking' },
  { title: 'Collection', description: 'Client invoicing, payments received and outstanding', category: 'operational', icon: CreditCard, iconBg: 'bg-teal-600 text-white shadow-md shadow-teal-500/25', iconColor: 'text-teal-600', badge: 'Receivables', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200/80', glowBg: 'from-teal-500/10', hoverBorder: 'hover:border-teal-400', path: '/reports/collection' },
  { title: 'Payment Report', description: 'Cash inflows & outflows recorded across all methods', category: 'operational', icon: CreditCard, iconBg: 'bg-rose-600 text-white shadow-md shadow-rose-500/25', iconColor: 'text-rose-600', badge: 'Cashflow', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200/80', glowBg: 'from-rose-500/10', hoverBorder: 'hover:border-rose-400', path: '/reports/payment' },
  { title: 'Expense Report', description: 'Operational supplier expenses and settled disbursements', category: 'operational', icon: Receipt, iconBg: 'bg-red-600 text-white shadow-md shadow-red-500/25', iconColor: 'text-red-600', badge: 'Expenses', badgeColor: 'bg-red-50 text-red-700 border-red-200/80', glowBg: 'from-red-500/10', hoverBorder: 'hover:border-red-400', path: '/reports/expense' },
];

const cardTints = {
  blue: 'bg-gradient-to-br from-blue-50 via-blue-50/60 to-white border-blue-200 hover:bg-blue-50',
  emerald: 'bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white border-emerald-200 hover:bg-emerald-50',
  purple: 'bg-gradient-to-br from-purple-50 via-purple-50/60 to-white border-purple-200 hover:bg-purple-50',
  orange: 'bg-gradient-to-br from-orange-50 via-orange-50/60 to-white border-orange-200 hover:bg-orange-50',
  indigo: 'bg-gradient-to-br from-indigo-50 via-indigo-50/60 to-white border-indigo-200 hover:bg-indigo-50',
  amber: 'bg-gradient-to-br from-amber-50 via-amber-50/60 to-white border-amber-200 hover:bg-amber-50',
  cyan: 'bg-gradient-to-br from-cyan-50 via-cyan-50/60 to-white border-cyan-200 hover:bg-cyan-50',
  teal: 'bg-gradient-to-br from-teal-50 via-teal-50/60 to-white border-teal-200 hover:bg-teal-50',
  rose: 'bg-gradient-to-br from-rose-50 via-rose-50/60 to-white border-rose-200 hover:bg-rose-50',
  red: 'bg-gradient-to-br from-red-50 via-red-50/60 to-white border-red-200 hover:bg-red-50',
};
const tintOf = (card) => cardTints[(card.iconColor.match(/text-(\w+)-/) || [])[1]] || 'bg-white border-slate-300';

export default function Reports() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { filters, updateFilter, generate, reset, loading, error, rows, summary } = useBusinessReport();

  const filteredCards = selectedCategory === 'all'
    ? reportCards
    : reportCards.filter(c => c.category === selectedCategory);
  const monthlyRevenue = Object.values(rows.reduce((months, row) => {
    const key = row.date ? row.date.slice(0, 7) : 'Unknown';
    months[key] ||= { key, month: row.date ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${row.date}T00:00:00`)) : 'Unknown', revenue: 0, profit: 0, bookings: 0 };
    months[key].revenue += Number(row.revenue || 0); months[key].profit += Number(row.profit || 0); months[key].bookings += 1;
    return months;
  }, {})).sort((left, right) => left.key.localeCompare(right.key));
  const agentPerformance = summary.agents;
  const destinationColors = ['#0e8a85', '#16A34A', '#7C3AED', '#F59E0B', '#64748B', '#EC4899'];
  const destData = summary.destinations.map((destination, index) => ({
    ...destination,
    value: summary.totals.revenue ? Math.round((destination.revenue / summary.totals.revenue) * 100) : 0,
    color: destinationColors[index % destinationColors.length],
  }));
  const periodLabel = filters.from || filters.to ? `${filters.from || 'Start'} – ${filters.to || 'Today'}` : 'All dates';

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex w-full sm:w-auto items-start justify-between gap-2">
          <div className="min-w-0 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><BarChart2 size={20} /></span>
            <div className="min-w-0">
              <h1 className="page-title">Reports & Analytics</h1>
              <p className="text-xs sm:text-sm text-slate-500">Business intelligence and performance insights</p>
            </div>
          </div>
          <button type="button" title="Filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className={`sm:hidden relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${filtersOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}><SlidersHorizontal size={16} />{(filters.from || filters.to) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />}</button>
        </div>
        <div className={`${filtersOpen ? 'flex' : 'hidden'} sm:flex w-full sm:w-auto items-center gap-2`}>
          <div className="min-w-0 flex-1 sm:flex-none sm:w-[245px]">
            <TravelDateRange from={filters.from} to={filters.to} onChange={updateFilter} />
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="h-8 inline-flex items-center gap-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all whitespace-nowrap disabled:opacity-60 cursor-pointer"
          >
            <Search size={13} />
            <span>{loading ? 'Loading...' : 'Generate'}</span>
          </button>
          {(filters.from || filters.to) && (
            <button
              onClick={reset}
              title="Reset date range"
              className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-2.5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          ['Total Revenue', money(summary.totals.revenue), periodLabel, DollarSign, 'from-blue-500 to-indigo-600', 'text-blue-500'],
          ['Total Profit', money(summary.totals.profit), `${summary.totals.margin}% margin`, TrendingUp, 'from-emerald-400 to-green-600', 'text-emerald-500'],
          ['Total Bookings', summary.totals.bookings, 'Matching live bookings', BookOpen, 'from-rose-400 to-pink-600', 'text-rose-500'],
          ['Avg. Booking Value', money(summary.totals.averageBooking), 'Per live booking', Target, 'from-amber-400 to-orange-500', 'text-orange-500'],
        ].map(([label, value, sub, Icon, grad, bar]) => (
          <div key={label} className="group relative flex min-w-[200px] shrink-0 snap-start items-center overflow-hidden rounded-xl border border-slate-300 bg-white p-2.5 shadow-sm transition-all hover:shadow-md sm:min-w-0 sm:p-3">
            <div className="relative z-10 flex min-w-0 items-center gap-2.5">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${grad} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}><Icon size={17} /></span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
                <div className="truncate text-[15px] font-extrabold text-slate-800 sm:text-base">{value}</div>
                <div className="truncate text-[10px] text-slate-400">{sub}</div>
              </div>
            </div>
            <MiniBars value={value} className={bar} show="hidden xl:flex" />
          </div>
        ))}
      </div>

      {/* Report Cards Section with Category Selector */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="section-title text-[15px] font-bold text-slate-800">Available Reports</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {filteredCards.length} modules
            </span>
          </div>
          
          {/* Category Tabs */}
          <div className="grid grid-cols-3 sm:flex items-stretch sm:items-center w-full sm:w-auto p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-1.5 sm:px-3 py-1.5 sm:py-1 rounded-lg font-medium text-center text-[11px] sm:text-xs leading-tight transition-all ${
                selectedCategory === 'all'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Reports ({reportCards.length})
            </button>
            <button
              onClick={() => setSelectedCategory('business')}
              className={`px-1.5 sm:px-3 py-1.5 sm:py-1 rounded-lg font-medium text-center text-[11px] sm:text-xs leading-tight transition-all ${
                selectedCategory === 'business'
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Performance ({reportCards.filter(c => c.category === 'business').length})
            </button>
            <button
              onClick={() => setSelectedCategory('operational')}
              className={`px-1.5 sm:px-3 py-1.5 sm:py-1 rounded-lg font-medium text-center text-[11px] sm:text-xs leading-tight transition-all ${
                selectedCategory === 'operational'
                  ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Operations & Finance ({reportCards.filter(c => c.category === 'operational').length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {filteredCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                onClick={() => card.path && navigate(card.path)}
                className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${tintOf(card)} ${card.hoverBorder}`}
              >
                <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${card.glowBg} to-transparent blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative z-10 flex items-start gap-2.5">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${card.iconBg} transition-transform duration-300 group-hover:scale-105`}><Icon size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="truncate text-[13px] font-extrabold leading-snug text-slate-800 transition-colors group-hover:text-blue-600">{card.title}</h3>
                    </div>
                    <span className={`mt-0.5 inline-block rounded-md border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${card.badgeColor}`}>{card.badge}</span>
                  </div>
                </div>
                <p className="relative z-10 mt-2 line-clamp-2 min-h-[30px] text-[11px] leading-snug text-slate-600">{card.description}</p>
                <div className="relative z-10 mt-2 flex items-center justify-between border-t border-black/5 pt-2">
                  <span className={`text-[11px] font-bold ${card.iconColor}`}>Generate Report</span>
                  <span className={`grid h-5 w-5 place-items-center rounded-full bg-white/80 shadow-sm transition-all duration-300 group-hover:translate-x-0.5 ${card.iconColor}`}><ArrowRight size={12} /></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Monthly Revenue & Profit</h3>
            <span className="text-[11px] font-medium text-slate-400">Financial Performance</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="revenue" fill="#0e8a85" name="Revenue" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="profit" fill="#16A34A" name="Profit" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Destination Distribution</h3>
            <span className="text-[11px] font-medium text-slate-400">Market Share</span>
          </div>
          <div className="flex items-center">
            <ResponsiveContainer width="52%" height={190}>
              <PieChart>
                <Pie data={destData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" paddingAngle={2}>
                  {destData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 pl-2">
              {destData.slice(0, 5).map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600 truncate">{d.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800 ml-2">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Sales Velocity & Service Revenue Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <h3 className="section-title">Sales & Revenue Velocity</h3>
            </div>
            <span className="text-[11px] text-slate-400">Daily Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={summary.trends}>
              <defs>
                <linearGradient id="reportsSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0e8a85" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0e8a85" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reportsProfitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="sales" stroke="#0e8a85" strokeWidth={2} fillOpacity={1} fill="url(#reportsSalesGrad)" name="Sales Revenue" />
              <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#reportsProfitGrad)" name="Net Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-purple-500" />
              <h3 className="section-title">Service Type Mix</h3>
            </div>
            <span className="text-[11px] text-slate-400">By Product Line</span>
          </div>
          <div className="flex items-center">
            <ResponsiveContainer width="52%" height={190}>
              <PieChart>
                <Pie
                  data={(summary.serviceRows || []).slice(0, 6).map((srv, idx) => ({
                    name: srv.name,
                    revenue: srv.revenue,
                    value: summary.totals.revenue ? Math.round((srv.revenue / summary.totals.revenue) * 100) : 0,
                    color: ['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'][idx % 6],
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  dataKey="revenue"
                  paddingAngle={2}
                >
                  {(summary.serviceRows || []).slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 pl-2">
              {(summary.serviceRows || []).slice(0, 5).map((srv, idx) => {
                const color = ['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'][idx % 6];
                const pct = summary.totals.revenue ? Math.round((srv.revenue / summary.totals.revenue) * 100) : 0;
                return (
                  <div key={srv.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-slate-600 truncate">{srv.name}</span>
                    </div>
                    <div className="text-right ml-2">
                      <span className="font-semibold text-slate-800">{pct}%</span>
                      <span className="text-[10px] text-slate-400 block font-normal">{fmt(srv.revenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Agent performance table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title">Agent Performance Breakdown</h3>
          <span className="text-xs text-slate-400">{agentPerformance.length} Active Partners</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
              <tr>
                {['Agent', 'Bookings', 'Revenue', 'Profit', 'Margin %'].map(h => (
                  <th 
                    key={h} 
                    className={`bg-[#F1F5F9] border-b border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider px-4 py-3 whitespace-nowrap ${
                      h === 'Bookings' ? 'text-center' : 
                      ['Revenue', 'Profit', 'Margin %'].includes(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentPerformance.map(agent => (
                <tr key={agent.name} className="table-row hover:bg-slate-50/70 transition-colors">
                  <td className="table-cell font-medium text-slate-900">{agent.name}</td>
                  <td className="table-cell text-center font-normal text-slate-600">{agent.bookings}</td>
                  <td className="table-cell font-normal text-slate-700 text-right">{fmtFull(agent.revenue)}</td>
                  <td className="table-cell text-emerald-600 font-normal text-right">{fmtFull(agent.profit)}</td>
                  <td className="table-cell text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {agent.margin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !agentPerformance.length && <div className="p-8 text-center text-sm text-slate-400">No live bookings match the selected date range.</div>}
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
