import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  ArrowLeft, Download, Printer, Search, ChevronDown, Calendar,
  MoreVertical, TrendingUp, RefreshCw, Percent, Users, PieChart as PieIcon, Layers,
  DollarSign, BookOpen, SlidersHorizontal } from 'lucide-react';
import { TravelDateRange, useBusinessReport } from './businessReportData';

const trendData = [
  { month: 'Jan', sales: 120000, cost: 80000, profit: 40000 },
  { month: 'Feb', sales: 180000, cost: 120000, profit: 60000 },
  { month: 'Mar', sales: 210000, cost: 150000, profit: 60000 },
  { month: 'Apr', sales: 250000, cost: 180000, profit: 70000 },
  { month: 'May', sales: 190000, cost: 130000, profit: 60000 },
  { month: 'Jun', sales: 300000, cost: 210000, profit: 90000 },
  { month: 'Jul', sales: 280000, cost: 200000, profit: 80000 },
  { month: 'Aug', sales: 260000, cost: 180000, profit: 80000 },
  { month: 'Sep', sales: 220000, cost: 150000, profit: 70000 },
];

const servicePieData = [
  { name: 'Hotel', value: 32, profit: 104928, color: '#3B82F6' },
  { name: 'Sightseeing', value: 22, profit: 72138, color: '#22C55E' },
  { name: 'Transfer', value: 16, profit: 52464, color: '#F59E0B' },
  { name: 'Meals', value: 10, profit: 32790, color: '#EF4444' },
  { name: 'Visa', value: 8, profit: 26232, color: '#EC4899' },
  { name: 'Others', value: 12, profit: 39348, color: '#8B5CF6' },
];

const destPieData = [
  { name: 'Bangkok', value: 34, profit: 111486, color: '#3B82F6' },
  { name: 'Pattaya', value: 28, profit: 91812, color: '#22C55E' },
  { name: 'Phuket', value: 18, profit: 59022, color: '#F59E0B' },
  { name: 'Krabi', value: 10, profit: 32790, color: '#EF4444' },
  { name: 'Koh Samui', value: 6, profit: 19674, color: '#EC4899' },
  { name: 'Others', value: 4, profit: 13116, color: '#8B5CF6' },
];

const tableData = [
  { sno: 1, service: 'Hotel', bookings: 22, pax: 128, sales: 420500, cost: 292300, profit: 128200, margin: 30.5 },
  { sno: 2, service: 'Sightseeing', bookings: 18, pax: 96, sales: 250800, cost: 168600, profit: 82200, margin: 32.8 },
  { sno: 3, service: 'Transfer', bookings: 16, pax: 72, sales: 180600, cost: 128400, profit: 52200, margin: 28.9 },
  { sno: 4, service: 'Meals', bookings: 10, pax: 48, sales: 95400, cost: 62800, profit: 32600, margin: 34.2 },
  { sno: 5, service: 'Visa', bookings: 6, pax: 22, sales: 62500, cost: 38900, profit: 23600, margin: 37.8 },
  { sno: 6, service: 'Others', bookings: 8, pax: 40, sales: 78500, cost: 69400, profit: 9100, margin: 11.6 },
];

const fmtShort = (n) => {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n;
};

function FilterSelect({ label, options, defaultValue, value, onChange, icon: Icon, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 w-full ${className}`}>
      {label && <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
      <div className="relative">
        <select className={`w-full form-select ${Icon ? 'pl-7' : 'pl-2'} pr-5 text-[11.5px] h-8 border-slate-200 rounded-[0.45rem] appearance-none bg-white whitespace-nowrap`} value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={event => onChange?.(event.target.value)}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        {Icon && <Icon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs z-50">
      <p className="font-bold text-slate-700 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-600 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-900">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function ProfitLossReport() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Service Wise');
  const { filters, updateFilter, generate, reset, loading, error, options, summary } = useBusinessReport();
  const trendData = summary.trends.map((item) => ({ ...item, month: item.date }));
  const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];
  const servicePieData = summary.serviceRows.map((item, index) => ({ ...item, value: summary.totals.profit ? Math.round((item.profit / summary.totals.profit) * 100) : 0, color: colors[index % colors.length] }));
  const destPieData = summary.destinations.map((item, index) => ({ ...item, value: summary.totals.profit ? Math.round((item.profit / summary.totals.profit) * 100) : 0, color: colors[index % colors.length] }));
  const tableData = summary.serviceRows.map((item, index) => ({ ...item, sno: index + 1, service: item.name }));
  const marginTrendData = summary.trends.map(t => ({
    date: t.date,
    margin: t.sales ? Number(((t.profit / t.sales) * 100).toFixed(1)) : 0,
    profit: t.profit,
    sales: t.sales
  }));
  const topAgentProfits = summary.agents.slice(0, 5).map(a => ({
    name: a.name,
    profit: a.profit,
    revenue: a.revenue,
    margin: a.margin
  }));
  const costProfitSplit = [
    { name: 'Direct Cost', value: summary.totals.revenue ? Math.round((summary.totals.cost / summary.totals.revenue) * 100) : 0, amount: summary.totals.cost, color: '#F59E0B' },
    { name: 'Net Profit', value: summary.totals.revenue ? Math.round((summary.totals.profit / summary.totals.revenue) * 100) : 0, amount: summary.totals.profit, color: '#10B981' }
  ];

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/reports')}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={15} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-slate-900 leading-tight">Profit & Loss Report</h1>
            <p className="text-[11px] text-slate-500 leading-tight">View revenue, cost, profit and margins for your business.</p>
          </div>
        </div>
      </div>

      <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className={`lg:hidden flex w-full items-center justify-center gap-1.5 h-9 rounded-xl border text-xs font-bold shadow-sm ${filtersOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}><SlidersHorizontal size={14} /> {filtersOpen ? 'Hide filters' : 'Filters'}</button>
      {/* Filter panel in Single Row */}
      <div className={`card p-2.5 bg-white border border-slate-200/90 shadow-sm rounded-xl overflow-hidden ${filtersOpen ? 'block' : 'hidden'} lg:block`}>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:items-end lg:overflow-x-auto lg:flex-nowrap pb-1 pt-0.5 hide-scrollbar w-full">
          <div className="flex flex-col gap-0.5 flex-[1.4] lg:min-w-[215px] col-span-2 lg:col-span-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Travel Date Range</span>
            <TravelDateRange from={filters.from} to={filters.to} onChange={updateFilter} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect
              label="Group By"
              options={['Service Type', 'Destination', 'Agent']}
              value={{ 'Service Wise': 'Service Type', 'Destination Wise': 'Destination', 'Agent Wise': 'Agent' }[activeTab] || 'Service Type'}
              onChange={(value) => setActiveTab({ 'Service Type': 'Service Wise', Destination: 'Destination Wise', Agent: 'Agent Wise' }[value])}
            />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[90px]">
            <FilterSelect label="Branch" options={['All', ...(options.branches || [])]} value={filters.branch} onChange={value => updateFilter('branch', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Agent" options={['All', ...(options.agents || [])]} value={filters.agent} onChange={value => updateFilter('agent', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[100px]">
            <FilterSelect label="Destination" options={['All', ...(options.destinations || [])]} value={filters.destination} onChange={value => updateFilter('destination', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Service Type" options={['All', ...(options.serviceTypes || [])]} value={filters.serviceType} onChange={value => updateFilter('serviceType', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[80px]">
            <FilterSelect label="Currency" options={['All', ...(options.currencies || [])]} value={filters.currency} onChange={value => updateFilter('currency', value)} />
          </div>
          <div className="flex items-end gap-1.5 flex-shrink-0 lg:ml-1 col-span-2 lg:col-span-1 [&>button]:flex-1 [&>button]:justify-center lg:[&>button]:flex-none">
            <button onClick={generate} disabled={loading} className="flex items-center gap-1.5 px-3.5 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-[11.5px] font-semibold transition-colors whitespace-nowrap shadow-sm">
              <Search size={12} /> {loading ? 'Loading...' : 'Generate Report'}
            </button>
            <button onClick={reset} className="flex items-center gap-1.5 px-3 h-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[11.5px] font-medium transition-colors whitespace-nowrap shadow-sm">
              <RefreshCw size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards - Matching Sales Report Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        <div className="card p-2.5 sm:p-3.5 bg-white border border-blue-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Sales</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">฿{summary.totals.revenue.toLocaleString()}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">Live gross sales</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-rose-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 flex-shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Cost</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">฿{summary.totals.cost.toLocaleString()}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">Direct operations cost</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-emerald-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Profit</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">฿{summary.totals.profit.toLocaleString()}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">Realized net profit</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-purple-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0">
            <Percent size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Profit Margin</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">{summary.totals.margin}%</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">Margin performance</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-amber-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
            <BookOpen size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Bookings</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">{summary.totals.bookings}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">Matching bookings</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-indigo-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Pax</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">{summary.totals.pax}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">Matching passengers</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Trend Area chart */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-300 shadow-sm lg:col-span-6 flex flex-col min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
            <h2 className="text-[15px] font-bold text-slate-800 flex-1">Monthly Profit & Loss Trend (THB)</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-[11px] text-slate-600 font-medium">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[11px] text-slate-600 font-medium">Cost</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-slate-600 font-medium">Profit</span>
              </div>
            </div>
          </div>
          <div className="min-h-[240px] flex-1 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          <div className="h-full min-h-[240px]" style={{ minWidth: Math.max(0, (trendData?.length || 0) * 36) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="sales" name="Sales" fill="#3B82F6" radius={[2, 2, 0, 0]} barSize={10} />
              <Bar dataKey="cost" name="Cost" fill="#F59E0B" radius={[2, 2, 0, 0]} barSize={10} />
              <Bar dataKey="profit" name="Profit" fill="#10B981" radius={[2, 2, 0, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
          </div>
          </div>
        </div>

        {/* Donut chart 1 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-300 shadow-sm lg:col-span-3 flex flex-col min-w-0">
          <h2 className="text-[15px] font-bold text-slate-800 mb-2">Profit by Service Type (THB)</h2>
          <div className="flex flex-col items-center">
            <div className="relative flex-shrink-0" style={{ width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={servicePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={1} strokeWidth={0}>
                    {servicePieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip cursor={false} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[16px] font-black text-slate-900 leading-tight">{summary.totals.profit.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 font-medium">Profit</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-2 max-h-[190px] overflow-y-auto pr-1 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100">
              {servicePieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600 truncate max-w-[60px]">{d.name}</span>
                  </div>
                  <span className="text-slate-900 font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Donut chart 2 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-300 shadow-sm lg:col-span-3 flex flex-col min-w-0">
          <h2 className="text-[15px] font-bold text-slate-800 mb-2">Profit by Destination (THB)</h2>
          <div className="flex flex-col items-center">
            <div className="relative flex-shrink-0" style={{ width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={destPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={1} strokeWidth={0}>
                    {destPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip cursor={false} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[16px] font-black text-slate-900 leading-tight">{summary.totals.profit.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 font-medium">Profit</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-2 max-h-[190px] overflow-y-auto pr-1 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100">
              {destPieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600 truncate max-w-[60px]">{d.name}</span>
                  </div>
                  <span className="text-slate-900 font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row (Advanced Financial Intelligence) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Margin % Trend */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-100 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <Percent size={15} className="text-emerald-600" />
              <h2 className="text-[14px] font-bold text-slate-800">Profit Margin % Trend</h2>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Avg: {summary.totals.margin}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={marginTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis unit="%" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="margin" name="Margin" stroke="#10B981" strokeWidth={2.5} fill="url(#colorMargin)" dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Profitable Agents */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-100 shadow-sm lg:col-span-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Users size={15} className="text-blue-600" />
            <h2 className="text-[14px] font-bold text-slate-800">Top Agents by Net Profit</h2>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={topAgentProfits} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }} barSize={11}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                width={130}
                tick={({ x, y, payload }) => (
                  <text x={x} y={y} dy={3.5} textAnchor="end" fill="#64748b" fontSize={10} className="select-none">
                    {payload.value}
                  </text>
                )}
              />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => `THB ${Number(val).toLocaleString()}`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="profit" name="Profit" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                {topAgentProfits.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#10B981' : '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost vs Profit Split */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-300 shadow-sm lg:col-span-3 flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <PieIcon size={15} className="text-amber-500" />
            <h2 className="text-[14px] font-bold text-slate-800">Cost vs Profit Split</h2>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costProfitSplit} cx="50%" cy="50%" innerRadius={44} outerRadius={65} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {costProfitSplit.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400">MARGIN</span>
                <span className="text-[13px] font-extrabold text-emerald-600 leading-tight">{summary.totals.margin}%</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full mt-2">
              {costProfitSplit.map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="text-slate-900 font-semibold">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 flex-wrap">
          <div className="flex gap-6 overflow-x-auto">
            {['Service Wise', 'Destination Wise', 'Agent Wise', 'Monthly Wise', 'Branch Wise'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-[13px] font-semibold whitespace-nowrap transition-colors relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>
          <div className="py-2">
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search service..." className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-[12px] w-[200px] focus:outline-none focus:border-blue-500" />
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {(() => {
            if (activeTab === 'Destination Wise') {
              return (
                <table className="w-full">
                  <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
                    <tr>
                      {['#', 'Destination', 'Profit (THB)', 'Percentage'].map(h => (
                        <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700 px-5 py-3 whitespace-nowrap bg-[#F1F5F9] border-b border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {destPieData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-[13px] text-slate-600">{idx + 1}</td>
                        <td className="px-5 py-3 text-[13px] font-medium text-slate-800">{row.name}</td>
                        <td className="px-5 py-3 text-[13px] font-bold text-emerald-600">{row.profit.toLocaleString()}</td>
                        <td className="px-5 py-3 text-[13px] text-slate-800 font-medium">{row.value}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }

            if (activeTab === 'Monthly Wise') {
              return (
                <table className="w-full">
                  <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
                    <tr>
                      {['#', 'Month', 'Sales (THB)', 'Cost (THB)', 'Profit (THB)'].map(h => (
                        <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700 px-5 py-3 whitespace-nowrap bg-[#F1F5F9] border-b border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-[13px] text-slate-600">{idx + 1}</td>
                        <td className="px-5 py-3 text-[13px] font-medium text-slate-800">{row.month}</td>
                        <td className="px-5 py-3 text-[13px] text-slate-800 font-medium">{row.sales.toLocaleString()}</td>
                        <td className="px-5 py-3 text-[13px] text-slate-800 font-medium">{row.cost.toLocaleString()}</td>
                        <td className="px-5 py-3 text-[13px] font-bold text-emerald-600">{row.profit.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }

            let displayData = tableData;
            if (activeTab === 'Agent Wise') {
               displayData = [...tableData].reverse();
            } else if (activeTab === 'Branch Wise') {
               displayData = tableData.filter((_, i) => i % 2 === 0);
            }

            return (
              <table className="w-full">
                <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
                  <tr>
                    {['#', 'Service Type', 'Bookings', 'Pax', 'Sales (THB)', 'Cost (THB)', 'Profit (THB)', 'Margin %'].map(h => (
                      <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700 px-5 py-3 whitespace-nowrap bg-[#F1F5F9] border-b border-slate-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-[13px] text-slate-600">{row.sno}</td>
                      <td className="px-5 py-3 text-[13px] font-medium text-slate-800">{row.service}</td>
                      <td className="px-5 py-3 text-[13px] text-slate-600">{row.bookings}</td>
                      <td className="px-5 py-3 text-[13px] text-slate-600">{row.pax}</td>
                      <td className="px-5 py-3 text-[13px] text-slate-800 font-medium">{row.revenue.toLocaleString()}</td>
                      <td className="px-5 py-3 text-[13px] text-slate-800 font-medium">{row.cost.toLocaleString()}</td>
                      <td className="px-5 py-3 text-[13px] font-bold text-emerald-600">{row.profit.toLocaleString()}</td>
                      <td className="px-5 py-3 text-[13px] text-slate-800 font-medium">{row.margin}%</td>
                    </tr>
                  ))}
                  {activeTab === 'Service Wise' && (
                    <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                        <td className="px-5 py-4 text-[13px] text-slate-900" colSpan={2}>Total</td>
                        <td className="px-5 py-4 text-[13px] text-slate-900">{summary.totals.bookings}</td>
                        <td className="px-5 py-4 text-[13px] text-slate-900">{summary.totals.pax}</td>
                        <td className="px-5 py-4 text-[13px] text-slate-900">{summary.totals.revenue.toLocaleString()}</td>
                        <td className="px-5 py-4 text-[13px] text-slate-900">{summary.totals.cost.toLocaleString()}</td>
                        <td className="px-5 py-4 text-[13px] text-slate-900">{summary.totals.profit.toLocaleString()}</td>
                        <td className="px-5 py-4 text-[13px] text-slate-900">{summary.totals.margin}%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
