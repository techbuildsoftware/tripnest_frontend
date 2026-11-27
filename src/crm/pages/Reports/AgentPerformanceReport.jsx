import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  ArrowLeft, Users, BookOpen, DollarSign, TrendingUp, BarChart2,
  Printer, RefreshCw, Search, ChevronDown, Calendar,
  FileText, FileSpreadsheet, Award, Target, Briefcase, Zap, ShieldCheck,
  ChevronRight, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { money, TravelDateRange, trendByDimension, useBusinessReport } from './businessReportData';
import { downloadExcelTable } from '../../lib/exportTable';

const fmtShort = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n;
};

const fmtFull = (n) => `THB ${Number(n || 0).toLocaleString()}`;

function FilterSelect({ label, options, defaultValue, value, onChange, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 w-full ${className}`}>
      {label && <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
      <div className="relative">
        <select
          className="form-select pr-5 pl-2 text-[11.5px] h-8 w-full bg-slate-50 border-slate-200 rounded-lg hover:border-slate-300 transition-colors whitespace-nowrap"
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          onChange={event => onChange?.(event.target.value)}
        >
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-3 text-xs min-w-[180px] z-[999]">
      <p className="font-bold text-slate-800 mb-1.5 pb-1 border-b border-slate-100">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-slate-600 truncate">{p.name}:</span>
          </div>
          <span className="font-medium text-slate-900 whitespace-nowrap">
            {metric === 'Bookings' ? `${p.value} bkg` : `THB ${Number(p.value).toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload, metric = 'Revenue' }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-2.5 text-xs z-[999]">
      <p className="font-bold text-slate-800">{d.name}</p>
      <p className="text-slate-600 mt-0.5">
        <span className="font-semibold text-blue-600">{d.value}%</span> of portfolio · {metric === 'Bookings' ? `${d.payload.metricValue} Bookings` : `THB ${Number(d.payload.metricValue || d.payload.revenue || 0).toLocaleString()}`}
      </p>
    </div>
  );
};

export default function AgentPerformanceReport() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [trendMetric, setTrendMetric] = useState('Revenue');
  const [trendMode, setTrendMode] = useState('Monthly'); // 'Monthly' | 'Daily'
  const [pieMetric, setPieMetric] = useState('Revenue');
  const [pieView, setPieView] = useState('top6'); // 'top6' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('revenue');
  const [sortOrder, setSortOrder] = useState('desc');

  const selectedAgent = searchParams.get('agent') || 'All';
  const clientType = searchParams.get('clientType') === 'B2C' ? 'B2C' : 'Agent';
  const reportInitialFilters = useMemo(() => ({ agent: selectedAgent, clientType }), [selectedAgent, clientType]);
  const { filters, updateFilter, generate, reset, loading, error, rows, options, summary } = useBusinessReport(reportInitialFilters);
  const audienceLabel = clientType === 'B2C' ? 'B2C Customer' : 'Agent';

  const palette = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];
  const topAgents = useMemo(() => summary.agents.slice(0, 5), [summary.agents]);

  // Dense monthly trend calculation to eliminate empty horizontal gaps
  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map();
    rows.forEach(row => {
      if (!row.date) return;
      const monthKey = row.date.slice(0, 7);
      if (!monthMap.has(monthKey)) {
        const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(`${monthKey}-01T00:00:00`));
        monthMap.set(monthKey, { monthKey, date: monthLabel, totalRevenue: 0, totalBookings: 0, totalProfit: 0 });
        topAgents.forEach((_, idx) => {
          monthMap.get(monthKey)[`series${idx}`] = 0;
        });
      }
      const entry = monthMap.get(monthKey);
      const rev = Number(row.revenue || 0);
      const prf = Number(row.profit || 0);
      entry.totalRevenue += rev;
      entry.totalBookings += 1;
      entry.totalProfit += prf;

      topAgents.forEach((ag, idx) => {
        if (row.agent === ag.name) {
          const val = trendMetric === 'Bookings' ? 1 : trendMetric === 'Profit' ? prf : rev;
          entry[`series${idx}`] = (entry[`series${idx}`] || 0) + val;
        }
      });
    });
    return [...monthMap.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [rows, topAgents, trendMetric]);

  // Daily trend fallback for fine-grained view
  const dailyTrendData = useMemo(() => {
    return trendByDimension(rows, 'agent', topAgents.map(a => a.name));
  }, [rows, topAgents]);

  const activeTrendData = trendMode === 'Monthly' ? monthlyTrendData : dailyTrendData;

  // Peak month discovery
  const peakMonth = useMemo(() => {
    if (!monthlyTrendData.length) return { month: 'N/A', val: 0 };
    return monthlyTrendData.reduce((max, cur) => cur.totalRevenue > max.val ? { month: cur.date, val: cur.totalRevenue } : max, { month: 'N/A', val: 0 });
  }, [monthlyTrendData]);

  // Donut data with top 5 + "Others" aggregation
  const { pieData, top3Concentration, totalMetricAmount } = useMemo(() => {
    const totalVal = pieMetric === 'Bookings'
      ? summary.totals.bookings
      : pieMetric === 'Profit'
        ? summary.totals.profit
        : summary.totals.revenue;

    const list = summary.agents.map((ag, idx) => {
      const metricVal = pieMetric === 'Bookings' ? ag.bookings : pieMetric === 'Profit' ? ag.profit : ag.revenue;
      const pct = totalVal ? Math.round((metricVal / totalVal) * 100) : 0;
      return {
        ...ag,
        metricValue: metricVal,
        value: pct,
        color: palette[idx % palette.length]
      };
    });

    // Top 3 concentration
    const top3Share = list.slice(0, 3).reduce((sum, item) => sum + item.value, 0);

    // If more than 5 agents, group the rest as Others for clean donut presentation
    let chartSlices = list;
    if (list.length > 5) {
      const top5 = list.slice(0, 5);
      const others = list.slice(5);
      const othersMetricVal = others.reduce((sum, item) => sum + item.metricValue, 0);
      const othersPct = totalVal ? Math.max(0, 100 - top5.reduce((sum, item) => sum + item.value, 0)) : 0;
      chartSlices = [
        ...top5,
        {
          name: `Other Agents (${others.length})`,
          metricValue: othersMetricVal,
          value: othersPct,
          color: '#94A3B8'
        }
      ];
    }

    return {
      pieData: chartSlices,
      top3Concentration: Math.min(100, top3Share),
      totalMetricAmount: totalVal
    };
  }, [summary.agents, summary.totals, pieMetric]);

  // Top Agent Bookings Bar Chart
  const topAgentBookings = useMemo(() => {
    return summary.agents.slice(0, 6).map(a => ({
      name: a.name.split(' ')[0] + (a.name.split(' ')[1] ? ' ' + a.name.split(' ')[1][0] + '.' : ''),
      fullName: a.name,
      bookings: a.bookings,
      pax: a.pax
    }));
  }, [summary.agents]);

  // Average Booking Value Bar Chart
  const topAgentABV = useMemo(() => {
    return summary.agents.slice(0, 6).map(a => ({
      name: a.name.split(' ')[0] + (a.name.split(' ')[1] ? ' ' + a.name.split(' ')[1][0] + '.' : ''),
      fullName: a.name,
      avgBooking: a.avgBooking || (a.bookings ? Math.round(a.revenue / a.bookings) : 0),
      margin: a.margin
    }));
  }, [summary.agents]);

  // Profit Matrix Bar Chart
  const agentProfitMatrix = useMemo(() => {
    return summary.agents.slice(0, 6).map(a => ({
      name: a.name.split(' ')[0] + (a.name.split(' ')[1] ? ' ' + a.name.split(' ')[1][0] + '.' : ''),
      fullName: a.name,
      profit: a.profit,
      margin: a.margin
    }));
  }, [summary.agents]);

  // Filtered & Sorted Table Data
  const sortedTableData = useMemo(() => {
    let data = summary.agents.map((item, index) => ({
      ...item,
      sno: index + 1,
      avgBooking: item.avgBooking || (item.bookings ? Math.round(item.revenue / item.bookings) : 0)
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d => d.name.toLowerCase().includes(q));
    }

    data.sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];
      if (typeof vA === 'string') {
        return sortOrder === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortOrder === 'asc' ? (vA - vB) : (vB - vA);
    });

    return data;
  }, [summary.agents, searchQuery, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const exportCsv = () => {
    downloadExcelTable({
      filename: `agent-performance-report-${new Date().toISOString().slice(0, 10)}`,
      head: ['Rank', 'Agent', 'Bookings', 'Pax', 'Revenue (THB)', 'Cost (THB)', 'Profit (THB)', 'Margin %', 'Avg Booking (THB)', 'Last Travel Date'],
      rows: sortedTableData.map(r => [r.sno, r.name, Number(r.bookings || 0), Number(r.pax || 0), Number(r.revenue || 0), Number(r.cost || 0), Number(r.profit || 0), Number(r.margin || 0), Number(r.avgBooking || 0), r.lastBooking || '']),
    });
  };

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 min-h-screen bg-[#F8FAFC]">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/reports')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
            title="Back to Reports"
          >
            <ArrowLeft size={15} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Users size={17} />
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-slate-900 leading-tight">{audienceLabel} Performance Report</h1>
              <p className="text-[11px] text-slate-500 leading-tight">Agent-wise revenue, conversion volume and profitability performance</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {summary.agents.length} Active {clientType === 'B2C' ? 'Customers' : 'Partners'}
          </span>
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
          <div className="flex-1 min-w-0 lg:min-w-[85px]">
            <FilterSelect label="Group By" options={['Agent']} value="Agent" />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Destination" options={['All', ...(options.destinations || [])]} value={filters.destination} onChange={value => updateFilter('destination', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Service Type" options={['All', ...(options.serviceTypes || [])]} value={filters.serviceType} onChange={value => updateFilter('serviceType', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
              <FilterSelect label={audienceLabel} options={['All', ...(options.agents || [])]} value={filters.agent} onChange={value => updateFilter('agent', value)} />
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
          <div className="flex-1 min-w-0 lg:min-w-[80px]">
            <FilterSelect label="Currency" options={['All', ...(options.currencies || [])]} value={filters.currency} onChange={value => updateFilter('currency', value)} />
          </div>
          
          {/* Action buttons cleanly positioned without overlapping */}
          <div className="flex items-end gap-1.5 flex-shrink-0 lg:ml-1 col-span-2 lg:col-span-1 [&>button]:flex-1 [&>button]:justify-center lg:[&>button]:flex-none">
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-[11.5px] font-semibold transition-colors whitespace-nowrap shadow-sm"
            >
              <Search size={12} /> {loading ? 'Loading...' : 'Generate Report'}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 h-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[11.5px] font-medium transition-colors whitespace-nowrap shadow-sm"
              title="Reset Filters"
            >
              <RefreshCw size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards - Matching Sales Report Style */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3.5 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        <StatCard
          icon={<Users size={20} />}
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
          cardBorder="border-emerald-100/80"
          label="Total Agents"
          value={summary.agents.length}
          subText="Active partners"
        />
        <StatCard
          icon={<BookOpen size={20} />}
          iconBg="bg-rose-50 text-rose-500 border border-rose-100"
          cardBorder="border-rose-100/80"
          label="Total Bookings"
          value={summary.totals.bookings}
          subText={`${summary.totals.pax || 0} passengers`}
        />
        <StatCard
          icon={<DollarSign size={20} />}
          iconBg="bg-blue-50 text-blue-600 border border-blue-100"
          cardBorder="border-blue-100/80"
          label="Total Revenue"
          value={money(summary.totals.revenue)}
          subText="Agent booking revenue"
        />
        <StatCard
          icon={<Target size={20} />}
          iconBg="bg-purple-50 text-purple-600 border border-purple-100"
          cardBorder="border-purple-100/80"
          label="Avg Booking Value"
          value={money(summary.totals.averageBooking)}
          subText="Per live booking"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          iconBg="bg-amber-50 text-amber-600 border border-amber-100"
          cardBorder="border-amber-100/80"
          label="Total Profit"
          value={money(summary.totals.profit)}
          subText={`${summary.totals.margin}% margin rate`}
        />
      </div>

      {/* Primary Charts Deck: Balanced, Dense, No Empty Void */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        
        {/* Left: Trend Chart (Dense Monthly / Timeline Curve + Executive Intelligence Strip) */}
        <div className="card p-4 lg:col-span-3 bg-white border border-slate-200/90 shadow-sm rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-blue-600" />
                  Agent Performance Trend
                </h2>
                <p className="text-[10.5px] text-slate-400">Continuous trajectory across active agents</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Interval Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10.5px]">
                  <button
                    onClick={() => setTrendMode('Monthly')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${trendMode === 'Monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setTrendMode('Daily')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${trendMode === 'Daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Daily
                  </button>
                </div>
                {/* Metric Selector */}
                <div className="relative">
                  <select
                    value={trendMetric}
                    onChange={e => setTrendMetric(e.target.value)}
                    className="text-[11px] border border-slate-200 rounded-lg px-2.5 py-1 pr-6 bg-slate-50 text-slate-700 appearance-none focus:outline-none"
                  >
                    <option>Revenue</option>
                    <option>Bookings</option>
                    <option>Profit</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Agent Legend Pills */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {topAgents.map((agent, index) => (
                <div key={agent.name} className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[index] }} />
                  <span className="text-[11px] font-medium text-slate-700">{agent.name}</span>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeTrendData} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
                  <defs>
                    {topAgents.map((_, index) => (
                      <linearGradient key={index} id={`agentGrad${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={palette[index]} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={palette[index]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<LineTooltip metric={trendMetric} />} />
                  {topAgents.map((agent, index) => (
                    <Area
                      key={agent.name}
                      type="monotone"
                      dataKey={`series${index}`}
                      stroke={palette[index]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#agentGrad${index})`}
                      dot={{ r: 3, fill: palette[index], strokeWidth: 0 }}
                      name={agent.name}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Insights Strip to Fill Space Perfectly */}
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
            <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
              <div className="text-[9.5px] uppercase font-bold text-slate-400">Peak Month</div>
              <div className="text-[12px] font-bold text-slate-800 mt-0.5">{peakMonth.month}</div>
              <div className="text-[10px] text-slate-500">{fmtShort(peakMonth.val)} volume</div>
            </div>
            <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
              <div className="text-[9.5px] uppercase font-bold text-slate-400">Market Leader</div>
              <div className="text-[12px] font-bold text-blue-700 truncate mt-0.5">{topAgents[0]?.name || 'N/A'}</div>
              <div className="text-[10px] text-slate-500">{fmtShort(topAgents[0]?.revenue || 0)} THB</div>
            </div>
            <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
              <div className="text-[9.5px] uppercase font-bold text-slate-400">Top 3 Concentration</div>
              <div className="text-[12px] font-bold text-emerald-700 mt-0.5">{top3Concentration}%</div>
              <div className="text-[10px] text-slate-500">of total volume</div>
            </div>
          </div>
        </div>

        {/* Right: Revenue Distribution Donut & Smart Legend */}
        <div className="card p-4 lg:col-span-2 bg-white border border-slate-200/90 shadow-sm rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                  <BarChart2 size={15} className="text-purple-600" />
                  Portfolio Share by Agent
                </h2>
                <p className="text-[10.5px] text-slate-400">Concentration analysis</p>
              </div>
              <div className="relative">
                <select
                  value={pieMetric}
                  onChange={e => setPieMetric(e.target.value)}
                  className="text-[11px] border border-slate-200 rounded-lg px-2.5 py-1 pr-6 bg-slate-50 text-slate-700 appearance-none focus:outline-none"
                >
                  <option>Revenue</option>
                  <option>Bookings</option>
                  <option>Profit</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Donut Chart & Compact Legend */}
            <div className="flex items-center gap-3 my-2">
              <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      dataKey="value"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip metric={pieMetric} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{pieMetric}</span>
                  <span className="text-[12px] font-black text-slate-800 leading-tight">
                    {pieMetric === 'Bookings' ? totalMetricAmount : fmtShort(totalMetricAmount)}
                  </span>
                  <span className="text-[8px] text-slate-400">Total</span>
                </div>
              </div>

              {/* Top Contributors List */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {pieData.slice(0, 5).map(d => (
                  <div key={d.name} className="flex items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-[11px] text-slate-700 truncate font-medium">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] font-bold text-slate-800">{d.value}%</span>
                      <span className="text-[9.5px] text-slate-400">
                        {pieMetric === 'Bookings' ? `${d.metricValue}b` : fmtShort(d.metricValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Portfolio Health Metric */}
          <div className="mt-3 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-blue-900 font-medium">
              <Zap size={13} className="text-blue-600" />
              <span>Top 3 drive <strong>{top3Concentration}%</strong> of total volume</span>
            </div>
            <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Health: Stable</span>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row (Productivity & Profit Intelligence) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Agent Bookings Production */}
        <div className="card p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BookOpen size={15} className="text-emerald-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Bookings by Agent</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Top 6 Production</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topAgentBookings} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="bookings" name="Bookings" fill="#10B981" radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="pax" name="Pax" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average Booking Value (ABV) */}
        <div className="card p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Target size={15} className="text-purple-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Avg. Ticket Size (ABV)</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Per Booking</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topAgentABV} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `THB ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="avgBooking" name="Avg Booking" fill="#8B5CF6" radius={[3, 3, 0, 0]} barSize={16}>
                {topAgentABV.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#7C3AED' : '#A78BFA'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Contribution */}
        <div className="card p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={15} className="text-blue-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Net Profit by Agent</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Contribution</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={agentProfitMatrix} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `THB ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="profit" name="Net Profit" fill="#2563EB" radius={[3, 3, 0, 0]} barSize={16}>
                {agentProfitMatrix.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#1D4ED8' : '#60A5FA'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail table with Search, Sticky Header, and Export actions */}
      <div className="card overflow-hidden bg-white border border-slate-200/90 shadow-sm rounded-xl">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-3">
            <h2 className="text-[13px] font-bold text-slate-800">
              Agent Performance Breakdown
              <span className="ml-1.5 text-[11px] font-normal text-slate-500">({sortedTableData.length} Records)</span>
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search agent..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-44 pl-7 pr-2.5 py-1 text-[11.5px] border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-400"
              />
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-medium transition-colors"
            >
              <FileSpreadsheet size={12} /> Export Excel
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-medium transition-colors"
            >
              <Printer size={12} /> Print
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full">
            <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
              <tr>
                {[
                  { key: 'sno', label: 'Rank', align: 'text-center' },
                  { key: 'name', label: 'Agent', align: 'text-left' },
                  { key: 'bookings', label: 'Bookings', align: 'text-center' },
                  { key: 'pax', label: 'Pax', align: 'text-center' },
                  { key: 'revenue', label: 'Revenue (THB)', align: 'text-right' },
                  { key: 'cost', label: 'Cost (THB)', align: 'text-right' },
                  { key: 'profit', label: 'Profit (THB)', align: 'text-right' },
                  { key: 'margin', label: 'Margin %', align: 'text-right' },
                  { key: 'avgBooking', label: 'Avg Booking', align: 'text-right' },
                  { key: 'lastBooking', label: 'Latest Date', align: 'text-left' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`${col.align} text-[10px] font-bold uppercase tracking-wider text-slate-700 px-3 py-2.5 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors select-none`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : 'justify-start'}`}>
                      <span>{col.label}</span>
                      <ArrowUpDown size={10} className="text-slate-400" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTableData.map((row, idx) => (
                <tr key={row.name} className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-3 py-2 text-center">
                    {row.sno === 1 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">#1</span>
                    ) : row.sno === 2 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-300">#2</span>
                    ) : row.sno === 3 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200">#3</span>
                    ) : (
                      <span className="text-[11px] text-slate-400">#{row.sno}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {row.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-medium text-slate-800">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-slate-600 text-center font-normal">{row.bookings}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-600 text-center font-normal">{row.pax}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-700 font-normal text-right">{row.revenue.toLocaleString()}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-600 font-normal text-right">{row.cost.toLocaleString()}</td>
                  <td className="px-3 py-2 text-[12px] text-emerald-600 font-normal text-right">{row.profit.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-medium border ${row.margin >= 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : row.margin >= 10 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {row.margin}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-slate-700 font-normal text-right">{row.avgBooking.toLocaleString()}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-500 font-normal">{row.lastBooking || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !sortedTableData.length && (
            <div className="p-8 text-center text-sm text-slate-400">No agents match the selected search or date range.</div>
          )}
        </div>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
