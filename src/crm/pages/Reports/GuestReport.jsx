import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Download, Printer, Search, ChevronDown, Calendar, MoreVertical, ArrowLeft, Users, RefreshCw,
  UserCheck, HeartHandshake, Compass, Globe, SlidersHorizontal } from 'lucide-react';
import { dateLabel, TravelDateRange, useBusinessReport } from './businessReportData';

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899', '#06B6D4', '#94A3B8'];
const groupedGuests = (guests, field, fallback) => Object.values(guests.reduce((groups, guest) => {
  const name = guest[field] || fallback;
  groups[name] ||= { name, guests: 0 };
  groups[name].guests += 1;
  return groups;
}, {})).sort((left, right) => right.guests - left.guests);

function FilterSelect({ label, options, value, onChange, icon: Icon, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 w-full ${className}`}>
      {label && <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</span>}
      <div className="relative">
        <select className={`w-full form-select ${Icon ? 'pl-7' : 'pl-2'} pr-5 text-[11.5px] h-8 border-slate-200 rounded-[0.45rem] appearance-none bg-white whitespace-nowrap`} value={value} onChange={(event) => onChange?.(event.target.value)}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        {Icon && <Icon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

export default function GuestReport() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Guest List');
  const [searchTerm, setSearchTerm] = useState('');
  const { filters, updateFilter, generate, reset, loading, error, rows, summary } = useBusinessReport();
  const guestCounts = rows.flatMap((row) => row.guests || []).reduce((counts, guest) => {
    const key = `${guest.passport || ''}|${guest.email || ''}|${guest.name || ''}|${guest.phone || ''}`.toLowerCase();
    if (key.replaceAll('|', '')) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const tableData = rows.flatMap((row) => (row.guests || []).map((guest) => {
    const repeatKey = `${guest.passport || ''}|${guest.email || ''}|${guest.name || ''}|${guest.phone || ''}`.toLowerCase();
    return {
      name: guest.name, nat: guest.nationality || 'Not specified', ppt: guest.passport || '—', agent: row.agent,
      dest: row.destination, date: dateLabel(row.travelDate || row.date), pax: row.pax, booking: row.booking,
      type: guest.travelType || 'Not specified', status: row.status,
      repeat: Boolean(repeatKey.replaceAll('|', '')) && guestCounts[repeatKey] > 1,
    };
  })).filter((guest) => (
    (filters.nationality === 'All' || guest.nat === filters.nationality)
    && (filters.travelType === 'All' || guest.type === filters.travelType)
    && [guest.name, guest.ppt, guest.agent, guest.dest, guest.booking].some((value) => String(value || '').toLowerCase().includes(searchTerm.trim().toLowerCase()))
  )).map((guest, index) => ({ ...guest, sno: index + 1 }));
  const totalGuests = tableData.length;
  const repeatGuests = tableData.filter((guest) => guest.repeat);
  const newGuests = tableData.filter((guest) => !guest.repeat);
  const natPieData = groupedGuests(tableData, 'nat', 'Not specified').map((item, index) => ({ ...item, value: totalGuests ? Math.round((item.guests / totalGuests) * 100) : 0, color: COLORS[index % COLORS.length] }));
  const destData = groupedGuests(tableData, 'dest', 'Unspecified').map((item) => ({ dest: item.name, guests: item.guests }));
  const typePieData = groupedGuests(tableData, 'type', 'Not specified').map((item, index) => ({ ...item, value: totalGuests ? Math.round((item.guests / totalGuests) * 100) : 0, color: COLORS[(index + 3) % COLORS.length] }));
  const topNationality = natPieData[0];
  const familyGuests = typePieData.find((item) => item.name.toLowerCase() === 'family');
  const nationalities = [...new Set(rows.flatMap((row) => (row.guests || []).map((guest) => guest.nationality).filter(Boolean)))].sort();
  const travelTypes = [...new Set(rows.flatMap((row) => (row.guests || []).map((guest) => guest.travelType).filter(Boolean)))].sort();
  const guestMonthlyTrend = (summary?.trends || []).map(t => ({
    date: t.date,
    guests: t.pax || t.bookings || 0,
    bookings: t.bookings || 0
  }));
  const topAgentsByGuests = Object.values(rows.reduce((acc, row) => {
    const a = row.agent || 'Direct';
    acc[a] = acc[a] || { name: a, guests: 0 };
    acc[a].guests += Number(row.pax || 1);
    return acc;
  }, {})).sort((a, b) => b.guests - a.guests).slice(0, 6);
  const guestStatusBreakdown = [
    { name: 'New Guests', value: totalGuests ? Math.round((newGuests.length / totalGuests) * 100) : 0, color: '#10B981' },
    { name: 'Repeat Guests', value: totalGuests ? Math.round((repeatGuests.length / totalGuests) * 100) : 0, color: '#3B82F6' }
  ];

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/reports')}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={15} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users size={16} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-slate-900">Guest Report</h1>
            <p className="text-[11px] text-slate-500 leading-tight">View guest details, travel history, booking summary and demographic report.</p>
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
              options={['Date', 'Nationality', 'Destination']}
              value={{ 'Nationality Wise': 'Nationality', 'Destination Wise': 'Destination' }[activeTab] || 'Date'}
              onChange={(value) => setActiveTab({ Date: 'Guest List', Nationality: 'Nationality Wise', Destination: 'Destination Wise' }[value])}
            />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Nationality" options={['All', ...nationalities]} value={filters.nationality} onChange={(value) => updateFilter('nationality', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[100px]">
            <FilterSelect label="Destination" options={['All', ...(rows.length ? [...new Set(rows.map((row) => row.destination).filter(Boolean))].sort() : [])]} value={filters.destination} onChange={(value) => updateFilter('destination', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Agent" options={['All', ...(rows.length ? [...new Set(rows.map((row) => row.agent).filter(Boolean))].sort() : [])]} value={filters.agent} onChange={(value) => updateFilter('agent', value)} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <FilterSelect label="Travel Type" options={['All', ...travelTypes]} value={filters.travelType} onChange={(value) => updateFilter('travelType', value)} />
          </div>
          <div className="flex items-end gap-1.5 flex-shrink-0 lg:ml-1 col-span-2 lg:col-span-1 [&>button]:flex-1 [&>button]:justify-center lg:[&>button]:flex-none">
            <button onClick={generate} disabled={loading} className="flex items-center gap-1.5 px-3.5 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11.5px] font-semibold transition-colors disabled:opacity-60 whitespace-nowrap shadow-sm">
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
        <div className="card p-2.5 sm:p-3.5 bg-white border border-blue-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Guests</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">{totalGuests}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">Matching travellers</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-emerald-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
            <UserCheck size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">New Guests</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">{newGuests.length}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">First-time visitors</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-purple-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0">
            <HeartHandshake size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Repeat Guests</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">{repeatGuests.length}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">Multiple bookings</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-amber-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
            <Globe size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Top Nationality</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">{topNationality?.name || '—'}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{topNationality ? `${topNationality.value}% of travellers` : 'No demographic'}</div>
          </div>
        </div>

        <div className="card p-2.5 sm:p-3.5 bg-white border border-rose-100/80 shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 flex-shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Family Groups</div>
            <div className="text-lg font-black text-slate-900 leading-tight truncate">{familyGuests?.guests || 0}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{familyGuests ? `${familyGuests.value}% of bookings` : 'Standard groups'}</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Donut chart 1 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-100 shadow-sm lg:col-span-4">
          <h2 className="text-[15px] font-bold text-slate-800 mb-2">Guests by Nationality</h2>
          <div className="flex flex-col items-center xl:flex-row gap-4 xl:gap-8 justify-center">
            <div className="relative flex-shrink-0" style={{ width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={natPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={1} strokeWidth={0}>
                    {natPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip cursor={false} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[18px] font-black text-slate-900 leading-tight">{totalGuests}</span>
                <span className="text-[11px] text-slate-500 font-medium">Guests</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[150px]">
              {natPieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="text-slate-900 font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-100 shadow-sm lg:col-span-4">
          <h2 className="text-[15px] font-bold text-slate-800 mb-4">Guests by Destination</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={destData} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dest" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="guests" name="Guests" radius={[2, 2, 0, 0]} barSize={24}>
                 {
                    destData.map((entry, index) => {
                        const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899', '#94A3B8'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    })
                  }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart 2 */}
        <div className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-100 shadow-sm lg:col-span-4">
          <h2 className="text-[15px] font-bold text-slate-800 mb-2">Guests by Travel Type</h2>
          <div className="flex flex-col items-center xl:flex-row gap-4 xl:gap-8 justify-center">
            <div className="relative flex-shrink-0" style={{ width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={1} strokeWidth={0}>
                    {typePieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip cursor={false} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[18px] font-black text-slate-900 leading-tight">{totalGuests}</span>
                <span className="text-[11px] text-slate-500 font-medium">Guests</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[150px]">
              {typePieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="text-slate-900 font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row (Demographic & Travel Inflow) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Guest Inflow Timeline */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Users size={15} className="text-blue-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Guest Inflow Timeline</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Arrival Volume</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={guestMonthlyTrend} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorGuests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="guests" name="Guests" stroke="#3B82F6" strokeWidth={2} fill="url(#colorGuests)" dot={{ r: 3, fill: '#3B82F6' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Agents Supplying Guests */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <UserCheck size={15} className="text-emerald-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Top Agents by Guest Volume</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Passenger Count</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topAgentsByGuests} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="guests" name="Guests" fill="#10B981" radius={[3, 3, 0, 0]} barSize={16}>
                {topAgentsByGuests.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#059669' : '#34D399'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Loyalty Breakdown */}
        <div className="card p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <HeartHandshake size={15} className="text-purple-600" />
            <h2 className="text-[13px] font-bold text-slate-800">Guest Loyalty Share</h2>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative flex-shrink-0" style={{ width: 135, height: 135 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={guestStatusBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {guestStatusBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400">TOTAL</span>
                <span className="text-[12px] font-extrabold text-slate-900 leading-tight">{totalGuests}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full mt-2">
              {guestStatusBreakdown.map(d => (
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
            {['Guest List', 'Repeat Guests', 'New Guests', 'Nationality Wise', 'Destination Wise', 'Travel History'].map(tab => (
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
                <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search guest name, passport..." className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-[12px] w-[240px] focus:outline-none focus:border-blue-500" />
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {(() => {
            if (activeTab === 'Nationality Wise') {
              return (
                <table className="w-full">
                  <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
                    <tr>
                      {['#', 'Nationality', 'Total Guests', 'Percentage'].map(h => (
                        <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700 px-4 py-3 whitespace-nowrap bg-[#F1F5F9] border-b border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {natPieData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[13px] text-slate-600">{idx + 1}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-800">{row.name}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{row.guests}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{row.value}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }

            if (activeTab === 'Destination Wise') {
              return (
                <table className="w-full">
                  <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
                    <tr>
                      {['#', 'Destination', 'Total Guests'].map(h => (
                        <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700 px-4 py-3 whitespace-nowrap bg-[#F1F5F9] border-b border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {destData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[13px] text-slate-600">{idx + 1}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-800">{row.dest}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{row.guests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }

            let displayData = tableData;
            if (activeTab === 'Repeat Guests') {
               displayData = tableData.filter((guest) => guest.repeat);
            } else if (activeTab === 'New Guests') {
               displayData = tableData.filter((guest) => !guest.repeat);
            } else if (activeTab === 'Travel History') {
               displayData = [...tableData].reverse();
            }

            return (
              <table className="w-full">
                <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
                  <tr>
                    {['#', 'Guest Name', 'Nationality', 'Passport No.', 'Agent', 'Destination', 'Travel Date', 'Pax', 'Booking No.', 'Travel Type', 'Status', 'Action'].map(h => (
                      <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700 px-4 py-3 whitespace-nowrap bg-[#F1F5F9] border-b border-slate-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((row, idx) => {
                    let statusClass = "bg-emerald-100 text-emerald-700";
                    if(row.status === 'Ongoing') statusClass = "bg-blue-100 text-blue-700";
                    if(row.status === 'Confirmed') statusClass = "bg-green-100 text-green-700";
                    if(row.status === 'Cancelled') statusClass = "bg-rose-100 text-rose-700";
                    if(row.status === 'Upcoming') statusClass = "bg-amber-100 text-amber-700";

                    let typeClass = "bg-blue-50 text-blue-600 border border-blue-200";
                    if(row.type === 'Couple') typeClass = "bg-green-50 text-green-600 border border-green-200";
                    if(row.type === 'Group') typeClass = "bg-amber-50 text-amber-600 border border-amber-200";
                    if(row.type === 'FIT') typeClass = "bg-purple-50 text-purple-600 border border-purple-200";

                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[13px] text-slate-600">{row.sno}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-800">{row.name}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{row.nat}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{row.ppt}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{row.agent}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-800 font-medium">{row.dest}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{row.date}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600 text-center">{row.pax}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-blue-600 cursor-pointer hover:underline">{row.booking}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${typeClass}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border border-transparent ${statusClass}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 hover:text-slate-600 cursor-pointer text-center">
                          <MoreVertical size={16} className="mx-auto" />
                        </td>
                      </tr>
                    );
                  })}
                  {!displayData.length && (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-[13px] text-slate-400">{loading ? 'Loading live guest data…' : 'No saved travellers match these filters.'}</td></tr>
                  )}
                </tbody>
              </table>
            );
          })()}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-500">
             <div>Showing {tableData.length ? `1 to ${tableData.length}` : '0'} of {tableData.length} live entries</div>
             <div className="flex gap-1">
                 <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">&lt;</button>
                 <button className="w-7 h-7 flex items-center justify-center rounded bg-blue-600 text-white font-medium">1</button>
                 <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">2</button>
                 <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">3</button>
                 <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">4</button>
                 <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">5</button>
                 <button className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50">&gt;</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
