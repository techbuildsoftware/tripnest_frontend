import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  ArrowLeft, MapPin, BookOpen, Users, DollarSign, TrendingUp, BarChart2,
  Printer, RefreshCw, Search, ChevronDown, Calendar,
  FileText, FileSpreadsheet, Percent, Compass, Globe, SlidersHorizontal } from 'lucide-react';
import { money, dateLabel, TravelDateRange, trendByDimension, useBusinessReport } from './businessReportData';
import { downloadExcelTable } from '../../lib/exportTable';

/* ─── Mock data ────────────────────────────────────────── */
const trendData = [
  { date:'01 Sep', pattaya:140000, bangkok:100000, phuket:60000, krabi:40000, kohsamui:20000, chiangmai:10000 },
  { date:'05 Sep', pattaya:250000, bangkok:180000, phuket:120000, krabi:80000, kohsamui:40000, chiangmai:20000 },
  { date:'10 Sep', pattaya:210000, bangkok:140000, phuket:100000, krabi:60000, kohsamui:30000, chiangmai:15000 },
  { date:'15 Sep', pattaya:350000, bangkok:230000, phuket:160000, krabi:90000, kohsamui:50000, chiangmai:25000 },
  { date:'20 Sep', pattaya:280000, bangkok:210000, phuket:110000, krabi:70000, kohsamui:40000, chiangmai:20000 },
  { date:'25 Sep', pattaya:450000, bangkok:290000, phuket:210000, krabi:140000, kohsamui:90000, chiangmai:50000 },
  { date:'30 Sep', pattaya:330000, bangkok:250000, phuket:180000, krabi:100000, kohsamui:60000, chiangmai:30000 },
];

const pieData = [
  { name: 'Pattaya',        value: 35, revenue: 2037000, color: '#0e8a85' },
  { name: 'Bangkok',        value: 26, revenue: 1513200, color: '#3b82f6' },
  { name: 'Phuket',         value: 18, revenue: 1047600, color: '#22C55E' },
  { name: 'Krabi',          value: 10, revenue: 582000,  color: '#A855F7' },
  { name: 'Koh Samui',      value: 7,  revenue: 406400,  color: '#EC4899' },
  { name: 'Chiang Mai/Rai', value: 4,  revenue: 232800,  color: '#EF4444' },
];

const tableData = [
  { sno:1, dest:'Pattaya',        bookings:48, pax:360, revenue:2037000, cost:1248600, profit:788400, margin:38.7, avgBooking:42438, lastBooking:'29/09/2026' },
  { sno:2, dest:'Bangkok',        bookings:36, pax:268, revenue:1513200, cost:876500,  profit:636700, margin:42.1, avgBooking:42033, lastBooking:'28/09/2026' },
  { sno:3, dest:'Phuket',         bookings:25, pax:186, revenue:1047600, cost:682900,  profit:364700, margin:34.8, avgBooking:41904, lastBooking:'27/09/2026' },
  { sno:4, dest:'Krabi',          bookings:14, pax:98,  revenue:582000,  cost:421300,  profit:160700, margin:27.6, avgBooking:41571, lastBooking:'26/09/2026' },
  { sno:5, dest:'Koh Samui',      bookings:10, pax:72,  revenue:406400,  cost:298600,  profit:107800, margin:26.5, avgBooking:40640, lastBooking:'24/09/2026' },
  { sno:6, dest:'Chiang Mai/Rai', bookings:5,  pax:44,  revenue:232800,  cost:165400,  profit:67400,  margin:29.0, avgBooking:46560, lastBooking:'22/09/2026' },
];

const fmtShort = (n) => {
  if (n >= 1000000) return `${(n/1000000).toFixed(0)}M`;
  if (n >= 1000)    return `${(n/1000).toFixed(0)}K`;
  return n;
};

function FilterSelect({ label, options, defaultValue, value, onChange, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 w-full ${className}`}>
      {label && <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
      <div className="relative">
        <select className="w-full form-select pl-2 pr-5 text-[11.5px] h-8 border-slate-200 rounded-[0.45rem] appearance-none bg-white whitespace-nowrap" value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={event => onChange?.(event.target.value)}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg = 'bg-blue-50 text-blue-600 border border-blue-100', cardBorder = 'border-blue-100/80', label, value, subText }) {
  return (
    <div className={`card p-2.5 sm:p-3.5 bg-white border ${cardBorder} shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md`}>
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${iconBg} flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</div>
        <div className="text-lg font-black text-slate-900 leading-tight truncate">{value}</div>
        <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{subText}</div>
      </div>
    </div>
  );
}

const LineTooltip = ({ active, payload, label, metric = 'Revenue' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs z-50 min-w-[150px]">
      <p className="font-bold text-slate-800 mb-1.5 border-b border-slate-100 pb-1">{label}</p>
      {payload.map(p => {
        const val = Number(p.value || 0);
        const formatted = metric === 'Bookings' ? `${val} bookings` : `THB ${val.toLocaleString()}`;
        return (
          <div key={p.name} className="flex items-center justify-between gap-3 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color || '#0e8a85' }} />
              <span className="text-slate-600 truncate">{p.name}:</span>
            </div>
            <span className="font-bold text-slate-900 flex-shrink-0">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
};

const PieTooltip = ({ active, payload, metric = 'Revenue' }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const val = Number(d.payload?.metricVal || d.payload?.revenue || 0);
  const formatted = metric === 'Bookings' ? `${val} bookings` : `THB ${val.toLocaleString()}`;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs z-50">
      <p className="font-bold text-slate-800 mb-1">{d.name}</p>
      <p className="text-slate-600 font-medium">{d.value}% · {formatted}</p>
    </div>
  );
};

export default function DestinationReport() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const [trendMetric, setTrendMetric] = useState('Revenue');
  const [pieMetric, setPieMetric]     = useState('Revenue');
  const [selectedDest, setSelectedDest] = useState('All');
  const { filters, updateFilter, generate, reset, loading, error, rows, options, summary } = useBusinessReport();
  const chartDestinations = summary.destinations.slice(0, 6);
  const colors = ['#0e8a85', '#3b82f6', '#22C55E', '#A855F7', '#EC4899', '#EF4444'];

  // Continuous, unbroken trend data across all recorded dates
  const trendData = useMemo(() => {
    const byDate = new Map();
    rows.forEach((row) => {
      const dateKey = row.date || 'Unknown';
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, {
          date: dateLabel(row.date || row.travelDate),
          key: dateKey,
          revenue: 0,
          bookings: 0,
          profit: 0,
        });
      }
      const item = byDate.get(dateKey);
      const rev = Number(row.revenue || row.totalSales || row.sales || 0);
      const cost = Number(row.cost || 0);
      const profit = rev - cost;

      item.revenue += rev;
      item.bookings += 1;
      item.profit += profit;

      const dName = row.destination || 'Other';
      if (!item[dName]) item[dName] = { revenue: 0, bookings: 0, profit: 0 };
      item[dName].revenue += rev;
      item[dName].bookings += 1;
      item[dName].profit += profit;
    });

    const sorted = [...byDate.values()].sort((a, b) => a.key.localeCompare(b.key));
    const metricKey = trendMetric.toLowerCase(); // 'revenue', 'bookings', 'profit'

    return sorted.map((item) => {
      const total = item[metricKey] || 0;
      const point = {
        date: item.date,
        key: item.key,
        total,
        selectedVal: selectedDest === 'All' ? total : (item[selectedDest]?.[metricKey] || 0),
      };

      chartDestinations.forEach((d) => {
        point[d.name] = item[d.name]?.[metricKey] ?? null;
      });

      return point;
    });
  }, [rows, trendMetric, selectedDest, chartDestinations]);

  // Reactive Pie / Donut data based on pieMetric
  const pieMetricTotals = useMemo(() => {
    if (pieMetric === 'Bookings') return summary.totals.bookings || 1;
    if (pieMetric === 'Profit') return summary.totals.profit || 1;
    return summary.totals.revenue || 1;
  }, [pieMetric, summary.totals]);

  const pieData = useMemo(() => {
    return summary.destinations.map((item, index) => {
      const rawVal = pieMetric === 'Bookings' ? item.bookings : pieMetric === 'Profit' ? item.profit : item.revenue;
      const pct = pieMetricTotals ? Math.round((rawVal / pieMetricTotals) * 100) : 0;
      return {
        ...item,
        value: pct,
        metricVal: rawVal,
        color: colors[index % colors.length]
      };
    });
  }, [summary.destinations, pieMetric, pieMetricTotals, colors]);

  const tableData = summary.destinations.map((item, index) => ({ ...item, sno: index + 1, dest: item.name }));
  const exportExcel = () => {
    if (!tableData.length) return;
    downloadExcelTable({
      filename: `destination-report-${new Date().toISOString().slice(0, 10)}`,
      head: ['S.No.', 'Destination', 'Total Bookings', 'Total Pax', 'Revenue (THB)', 'Cost (THB)', 'Profit (THB)', 'Margin %', 'Avg Booking Value', 'Latest Travel Date'],
      rows: tableData.map((row) => [row.sno, row.dest, Number(row.bookings || 0), Number(row.pax || 0), Number(row.revenue || 0), Number(row.cost || 0), Number(row.profit || 0), Number(row.margin || 0), Number(row.avgBooking || 0), row.lastBooking || '']),
    });
  };
  const destBookings = summary.destinations.slice(0, 6).map(d => ({
    name: d.name,
    bookings: d.bookings,
    pax: d.pax
  }));
  const destMargins = summary.destinations.slice(0, 6).map(d => ({
    name: d.name,
    margin: d.margin,
    profit: d.profit
  }));
  const destAvgBooking = summary.destinations.slice(0, 6).map(d => ({
    name: d.name,
    avgBooking: d.avgBooking || (d.bookings ? Math.round(d.revenue / d.bookings) : 0),
    revenue: d.revenue
  }));

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
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
            <MapPin size={16} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-slate-900 leading-tight">Destination Report</h1>
            <p className="text-[11px] text-slate-500 leading-tight">Destination wise revenue, bookings and profitability analysis</p>
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
          <div className="flex-1 min-w-0 lg:min-w-[90px]">
            <FilterSelect label="Group By" options={['Destination']} value="Destination" />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Service Type" options={['All', ...(options.serviceTypes || [])]} value={filters.serviceType} onChange={value => updateFilter('serviceType', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Agent" options={['All', ...(options.agents || [])]} value={filters.agent} onChange={value => updateFilter('agent', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[90px]">
            <FilterSelect label="Branch" options={['All', ...(options.branches || [])]} value={filters.branch} onChange={value => updateFilter('branch', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[105px]">
            <FilterSelect label="Booking Status" options={['All', ...(options.statuses || [])]} value={filters.status} onChange={value => updateFilter('status', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Sales Person" options={['All', ...(options.salesPeople || [])]} value={filters.salesPerson} onChange={value => updateFilter('salesPerson', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[90px]">
            <FilterSelect label="Supplier" options={['All', ...(options.suppliers || [])]} value={filters.supplier} onChange={value => updateFilter('supplier', value)} />
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3.5 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        <StatCard 
          icon={<MapPin size={20} />}  
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"  
          cardBorder="border-emerald-100/80"
          label="Total Destinations"    
          value={summary.destinations.length}                 
          subText="Active locations" 
        />
        <StatCard 
          icon={<BookOpen size={20} />} 
          iconBg="bg-rose-50 text-rose-500 border border-rose-100"   
          cardBorder="border-rose-100/80"
          label="Total Bookings"        
          value={summary.totals.bookings}               
          subText="Confirmed trips" 
        />
        <StatCard 
          icon={<Users size={20} />}    
          iconBg="bg-amber-50 text-amber-600 border border-amber-100"  
          cardBorder="border-amber-100/80"
          label="Total Pax"             
          value={summary.totals.pax}             
          subText="Passengers travelling" 
        />
        <StatCard 
          icon={<DollarSign size={20} />}
          iconBg="bg-blue-50 text-blue-600 border border-blue-100" 
          cardBorder="border-blue-100/80"
          label="Total Revenue"      
          value={money(summary.totals.revenue)}     
          subText="Gross bookings" 
        />
        <StatCard 
          icon={<TrendingUp size={20} />} 
          iconBg="bg-purple-50 text-purple-600 border border-purple-100"    
          cardBorder="border-purple-100/80"
          label="Total Profit"          
          value={money(summary.totals.profit)}     
          subText={`${summary.totals.margin}% margin`} 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Continuous Solid Line / Area chart */}
        <div className="card p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-600" />
              <h2 className="text-[13px] font-bold text-slate-800">
                {trendMetric} by Destination Trend
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Destination Filter */}
              <div className="relative">
                <select 
                  value={selectedDest} 
                  onChange={e => setSelectedDest(e.target.value)}
                  className="text-[11px] font-medium border border-slate-200 rounded-lg pl-2.5 pr-6 py-1 bg-white text-slate-700 appearance-none focus:outline-none hover:border-slate-300 transition-colors"
                >
                  <option value="All">All Destinations (Total)</option>
                  {chartDestinations.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Metric Filter */}
              <div className="relative">
                <select 
                  value={trendMetric} 
                  onChange={e => setTrendMetric(e.target.value)}
                  className="text-[11px] font-medium border border-slate-200 rounded-lg pl-2.5 pr-6 py-1 bg-white text-slate-700 appearance-none focus:outline-none hover:border-slate-300 transition-colors"
                >
                  <option>Revenue</option>
                  <option>Bookings</option>
                  <option>Profit</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Destination Pill Filters */}
          <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1 hide-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedDest('All')}
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-medium transition-all ${
                selectedDest === 'All'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Destinations
            </button>
            {chartDestinations.map((d, index) => {
              const isSelected = selectedDest === d.name;
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => setSelectedDest(isSelected ? 'All' : d.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: colors[index] }} />
                  <span className="whitespace-nowrap">{d.name}</span>
                </button>
              );
            })}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorTrendTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0e8a85" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0e8a85" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTrendDest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={38} />
              <Tooltip content={<LineTooltip metric={trendMetric} />} />

              {/* Main Solid Continuous Area Line */}
              {selectedDest === 'All' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="total"
                    name={`Total ${trendMetric}`}
                    stroke="#0e8a85"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTrendTotal)"
                    connectNulls={true}
                    dot={{ r: 3, fill: '#ffffff', stroke: '#0e8a85', strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  {chartDestinations.map((d, index) => (
                    <Line
                      key={d.name}
                      type="monotone"
                      dataKey={d.name}
                      name={d.name}
                      stroke={colors[index]}
                      strokeWidth={1.5}
                      connectNulls={true}
                      dot={{ r: 2.5, fill: colors[index], strokeWidth: 0 }}
                      strokeDasharray="4 2"
                    />
                  ))}
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="selectedVal"
                  name={selectedDest}
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTrendDest)"
                  connectNulls={true}
                  dot={{ r: 3.5, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-slate-800">{pieMetric} by Destination</h2>
            <div className="relative">
              <select value={pieMetric} onChange={e => setPieMetric(e.target.value)}
                className="text-[11px] font-medium border border-slate-200 rounded-lg px-2.5 py-1 pr-6 bg-white text-slate-700 appearance-none focus:outline-none hover:border-slate-300 transition-colors">
                <option>Revenue</option><option>Bookings</option><option>Profit</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0" style={{ width:140, height:140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={65} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {pieData.map((d,i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip metric={pieMetric} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{pieMetric === 'Bookings' ? 'BOOKINGS' : 'THB'}</span>
                <span className="text-[11px] font-extrabold text-slate-900 leading-tight">
                  {pieMetric === 'Bookings' ? pieMetricTotals : fmtShort(pieMetricTotals)}
                </span>
                <span className="text-[8px] text-slate-400">{pieMetric}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[10px] text-slate-600 truncate">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-700">{d.value}%</span>
                    <span className="text-[9px] text-slate-400 w-14 text-right">
                      {pieMetric === 'Bookings' ? d.metricVal : fmtShort(d.metricVal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row (Regional Deep Dive) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Destination Bookings Production */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BookOpen size={15} className="text-orange-500" />
              <h2 className="text-[13px] font-bold text-slate-800">Bookings by Destination</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Volume</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={destBookings} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="bookings" name="Bookings" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="pax" name="Pax" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Margin % */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Percent size={15} className="text-emerald-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Margin % by Destination</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Profitability</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={destMargins} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis unit="%" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="margin" name="Margin %" fill="#10B981" radius={[3, 3, 0, 0]} barSize={16}>
                {destMargins.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#059669' : '#34D399'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average Booking Spend */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <DollarSign size={15} className="text-blue-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Avg. Revenue per Booking</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Ticket Size</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={destAvgBooking} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `THB ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="avgBooking" name="Avg Booking" fill="#0e8a85" radius={[3, 3, 0, 0]} barSize={16}>
                {destAvgBooking.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#1D4ED8' : '#60A5FA'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-[13px] font-bold text-slate-800">
            Destination Report Details
            <span className="ml-1.5 text-[11px] font-normal text-slate-500">({tableData.length} Records)</span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-medium">
              <BarChart2 size={11} /> Columns
            </button>
            <button type="button" onClick={exportExcel} disabled={!tableData.length} className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[11px] font-medium disabled:opacity-50">
              <FileSpreadsheet size={11} /> Export Excel
            </button>
            <button type="button" onClick={() => window.print()} title="Opens the print dialog — choose Save as PDF" className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-medium">
              <FileText size={11} /> Export PDF
            </button>
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-medium">
              <Printer size={11} /> Print
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-20 bg-[#F1F5F9] shadow-sm">
              <tr>
                {['S.No.','Destination','Total Bookings','Total Pax','Revenue (THB)','Cost (THB)','Profit (THB)','Margin %','Avg Booking Value','Latest Travel Date'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-700 px-3 py-2.5 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={row.sno} className={`border-b border-slate-100 hover:bg-blue-50/60 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                  <td className="px-3 py-2 text-[11.5px] text-slate-400">{row.sno}</td>
                  <td className="px-3 py-2 text-[12px] font-semibold text-blue-600 cursor-pointer hover:underline whitespace-nowrap">{row.dest}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-700 text-center">{row.bookings}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-700 text-center">{row.pax}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-800 font-medium">{row.revenue.toLocaleString()}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-700">{row.cost.toLocaleString()}</td>
                  <td className="px-3 py-2 text-[12px] text-emerald-600 font-semibold">{row.profit.toLocaleString()}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-700 font-medium">{row.margin}%</td>
                  <td className="px-3 py-2 text-[12px] text-slate-700">{row.avgBooking.toLocaleString()}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-500">{row.lastBooking || '—'}</td>
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
