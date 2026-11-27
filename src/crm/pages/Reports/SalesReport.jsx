import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ArrowLeft, BarChart2, BookOpen, Users, DollarSign, Target, 
  Printer, RefreshCw, Search, ChevronDown, Calendar,
  FileText, FileSpreadsheet, TrendingUp, Layers, Building2, MapPin, SlidersHorizontal } from 'lucide-react';
import { dateLabel, money, TravelDateRange, useBusinessReport } from './businessReportData';
import { downloadExcelTable } from '../../lib/exportTable';


const fmtShort = (n) => {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n/1000).toFixed(0)}K`;
  return n;
};

function FilterSelect({ label, options, value, onChange, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 w-full ${className}`}>
      {label && <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
      <div className="relative">
        <select className="form-select pr-5 pl-2 text-[11.5px] h-8 w-full bg-white border border-slate-200 rounded-[0.45rem] focus:border-blue-500 focus:outline-none whitespace-nowrap" value={value} onChange={event => onChange?.(event.target.value)}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name || 'Sales'}:</span>
          <span className="font-semibold text-slate-900">THB {p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700">{d.name}</p>
      <p className="text-slate-600 mt-0.5">{d.value}% {d.payload?.revenue ? `· THB ${d.payload.revenue.toLocaleString()}` : ''}</p>
    </div>
  );
};

export default function SalesReport() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const [trendView, setTrendView] = useState('Daily');
  const { filters, updateFilter, generate, reset, loading, error, rows, options, summary } = useBusinessReport();
  const trendData = summary.trends;
  const colours = ['#3B82F6', '#3b82f6', '#22C55E', '#A855F7', '#EC4899', '#EAB308', '#06B6D4'];
  const pieData = summary.destinations.map((item, index) => ({ ...item, value: summary.totals.revenue ? Math.round((item.revenue / summary.totals.revenue) * 100) : 0, color: colours[index % colours.length] }));
  const agentData = summary.agents.slice(0, 5).map((item) => ({ ...item, sales: item.revenue }));
  const servicePieData = summary.serviceRows.map((item, index) => ({
    ...item,
    value: summary.totals.revenue ? Math.round((item.revenue / summary.totals.revenue) * 100) : 0,
    color: colours[index % colours.length]
  }));
  const branchData = Object.values(rows.reduce((acc, row) => {
    const b = row.branch || 'Main Branch';
    acc[b] = acc[b] || { name: b, revenue: 0, bookings: 0 };
    acc[b].revenue += Number(row.revenue || 0);
    acc[b].bookings += 1;
    return acc;
  }, {})).sort((a, b) => b.revenue - a.revenue);
  const tableData = rows.map((row) => ({ ...row, dest: row.destination, service: row.services }));
  const exportExcel = () => {
    if (!tableData.length) return;
    downloadExcelTable({
      filename: `sales-report-${new Date().toISOString().slice(0, 10)}`,
      head: ['Travel Date', 'Booking No.', 'Agent', 'Client Name', 'Destination', 'Service Type', 'Pax', 'Revenue (THB)', 'Cost (THB)', 'Profit (THB)', 'Margin %'],
      rows: tableData.map((row) => [dateLabel(row.date), row.booking, row.agent, row.client, row.dest, row.service, Number(row.pax || 0), Number(row.revenue || 0), Number(row.cost || 0), Number(row.profit || 0), Number(row.margin || 0)]),
    });
  };

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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
            <BarChart2 size={16} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-slate-900 leading-tight">Sales Report</h1>
            <p className="text-[11px] text-slate-500 leading-tight">Revenue, bookings & sales trends by date, agent, destination and branch</p>
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
            <FilterSelect label="Group By" options={['Travel Date']} value="Travel Date" />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[100px]">
            <FilterSelect label="Destination" options={['All', ...(options.destinations || [])]} value={filters.destination} onChange={value => updateFilter('destination', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[90px]">
            <FilterSelect label="Branch" options={['All', ...(options.branches || [])]} value={filters.branch} onChange={value => updateFilter('branch', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Agent" options={['All', ...(options.agents || [])]} value={filters.agent} onChange={value => updateFilter('agent', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Client Type" options={['All', ...(options.clientTypes || [])]} value={filters.clientType} onChange={value => updateFilter('clientType', value)} />
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        <div className="card p-2.5 sm:p-3.5 bg-white border border-blue-100/80 shadow-sm rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</div>
            <div className="text-lg font-black text-slate-900 leading-tight">{money(summary.totals.revenue)}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Live booking revenue</div>
          </div>
        </div>
        <div className="card p-2.5 sm:p-3.5 bg-white border border-rose-100/80 shadow-sm rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 flex-shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</div>
            <div className="text-lg font-black text-slate-900 leading-tight">{summary.totals.bookings}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Matching bookings</div>
          </div>
        </div>
        <div className="card p-2.5 sm:p-3.5 bg-white border border-emerald-100/80 shadow-sm rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pax</div>
            <div className="text-lg font-black text-slate-900 leading-tight">{summary.totals.pax}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Matching passengers</div>
          </div>
        </div>
        <div className="card p-2.5 sm:p-3.5 bg-white border border-amber-100/80 shadow-sm rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
            <Target size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Booking Value</div>
            <div className="text-lg font-black text-slate-900 leading-tight">{money(summary.totals.averageBooking)}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5">Per live booking</div>
          </div>
        </div>
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={15} className="text-blue-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Sales Trend</h2>
            </div>
            <div className="relative">
              <select value={trendView} onChange={e => setTrendView(e.target.value)} className="text-[11px] border border-slate-200 rounded-lg px-2.5 py-0.5 pr-6 bg-white text-slate-700 appearance-none focus:outline-none">
                <option>Daily</option><option>Weekly</option><option>Monthly</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trendData} margin={{ top:10, right:10, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize:9, fill:'#94a3b8' }} axisLine={false} tickLine={false} width={32} />
              <RechartsTooltip content={<TrendTooltip />} />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" dot={{ r:3, fill:'#fff', stroke:'#3B82F6', strokeWidth:2 }} activeDot={{ r:5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart - Destinations */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin size={15} className="text-orange-500" />
            <h2 className="text-[13px] font-bold text-slate-800">Sales by Destination</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0" style={{ width:135, height:135 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {pieData.map((d,i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400">TOTAL</span>
                <span className="text-[11px] font-extrabold text-slate-900 leading-tight">{fmtShort(summary.totals.revenue)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full overflow-hidden">
              {pieData.slice(0, 5).map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600 truncate">{d.name}</span>
                  </div>
                  <span className="text-slate-700 font-semibold text-right">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart - Agents */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl relative">
          <div className="flex items-center gap-1.5 mb-3">
            <Users size={15} className="text-blue-600" />
            <h2 className="text-[13px] font-bold text-slate-800">Top Agents by Revenue</h2>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={agentData} layout="vertical" margin={{ top:0, right:25, left:10, bottom:0 }} barSize={11}>
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
              <RechartsTooltip cursor={{fill: '#f8fafc'}} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 text-xs">
                    <p className="font-bold text-slate-700 mb-0.5">{payload[0].payload.name}</p>
                    <p className="text-slate-600">THB {payload[0].value.toLocaleString()}</p>
                  </div>
                );
              }} />
              <Bar dataKey="sales" fill="#3B82F6" radius={[0,4,4,0]}>
                {agentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#0e8a85' : '#93C5FD'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts Row (Enhanced Visuals) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Service Type Breakdown */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center gap-1.5 mb-3">
            <Layers size={15} className="text-purple-600" />
            <h2 className="text-[13px] font-bold text-slate-800">Service Type Revenue Mix</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0" style={{ width:135, height:135 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={servicePieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {servicePieData.map((d,i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400">SERVICES</span>
                <span className="text-[11px] font-extrabold text-slate-900 leading-tight">{servicePieData.length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full overflow-hidden">
              {servicePieData.slice(0, 5).map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600 truncate">{d.name}</span>
                  </div>
                  <span className="text-slate-700 font-semibold text-right">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings & Passenger Volume Velocity */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BookOpen size={15} className="text-emerald-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Bookings & Pax Velocity</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Bookings</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500 inline-block" /> Pax</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData} margin={{ top:10, right:5, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="bookings" name="Bookings" fill="#10B981" radius={[3, 3, 0, 0]} barSize={9} />
              <Bar dataKey="pax" name="Pax" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={9} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Branch Performance Comparison */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 size={15} className="text-indigo-600" />
            <h2 className="text-[13px] font-bold text-slate-800">Branch Revenue Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={branchData} margin={{ top:10, right:10, bottom:0, left:-15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize:9, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <RechartsTooltip formatter={(val) => `THB ${Number(val).toLocaleString()}`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={18}>
                {branchData.map((_, idx) => (
                  <Cell key={idx} fill={idx === 0 ? '#4F46E5' : '#818CF8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail table */}
      <div className="card overflow-hidden bg-white border border-slate-200/80 shadow-sm rounded-xl">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-[14px] font-bold text-slate-800">
            Sales Report Details
            <span className="ml-1.5 text-[12px] font-normal text-slate-500">({tableData.length} Records)</span>
          </h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportExcel} disabled={!tableData.length} className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50">
              <FileSpreadsheet size={12} /> Export Excel
            </button>
            <button type="button" onClick={() => window.print()} title="Opens the print dialog — choose Save as PDF" className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-medium transition-colors">
              <FileText size={12} /> Export PDF
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-medium transition-colors">
              <Printer size={12} /> Print
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-20 bg-[#F1F5F9] shadow-sm">
              <tr>
                {['Travel Date','Booking No.','Agent','Client Name','Destination','Service Type','Pax','Revenue (THB)','Cost (THB)','Profit (THB)','Margin %'].map(h => (
                  <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700 px-4 py-3 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-[12px] text-slate-600 whitespace-nowrap">{dateLabel(row.date)}</td>
                  <td className="px-4 py-2.5 text-[12px] font-medium text-blue-600 cursor-pointer hover:underline">{row.booking}</td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-700">{row.agent}</td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-700">{row.client}</td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-700">{row.dest}</td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-600">{row.service}</td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-700 text-center">{row.pax}</td>
                  <td className="px-4 py-2.5 text-[12px] font-normal text-slate-800">{row.revenue.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[12px] font-normal text-slate-700">{row.cost.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[12px] font-normal text-emerald-600">{row.profit.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[12px] font-normal text-slate-700">{row.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !tableData.length && <div className="p-8 text-center text-sm text-slate-400">No live bookings match these filters.</div>}
        </div>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
