import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, ChevronRight, Building2, Car, Users, Utensils, Globe,
  Settings as SettingsIcon, Hotel, MapPin, Ship, UserCheck,
  MessageSquare, Star, FileText, FileCheck, ThumbsUp, Banknote,
  Landmark, Receipt, Tag, Plane, UtensilsCrossed, Truck,
  LayoutGrid, List,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import PageLoader from '../../components/ui/PageLoader';
import { getCachedMasterSummary, loadMasterSummary } from '../../lib/masterSummary';

const masterCategories = [
  {
    category: 'SALES', 
    color: 'border-l-blue-500',
    bg: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    dot: 'bg-blue-500',
    items: [
      { label: 'Agents',       path: '/masters/agents',       icon: Users,          count: 0, desc: 'Travel agents & B2B partners' },
      { label: 'B2C',          path: '/masters/b2c',          icon: UserCheck,      count: 0, desc: 'Direct customers' },
      { label: 'Lead Source',  path: '/masters/lead-sources', icon: Tag,            count: 0, desc: 'Marketing & referral channels' },
      { label: 'Market',       path: '/masters/markets',      icon: Globe,          count: 0, desc: 'Geographic markets' },
      { label: 'Query Type',   path: '/masters/query-types',  icon: MessageSquare,  count: 0, desc: 'Types of customer queries' },
      { label: 'Markup Categories', path: '/masters/markup-categories', icon: Tag, count: 0, desc: 'Agent markup percentage rules' },
    ]
  },
  {
    category: 'HOTELS',
    color: 'border-l-purple-500',
    bg: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    dot: 'bg-purple-500',
    items: [
      { label: 'Hotels',         path: '/masters/hotels',           icon: Building2, count: 0, desc: 'Hotel database & rates' },
      { label: 'Suppliers',      path: '/masters/suppliers',        icon: Truck,     count: 0, desc: 'Hotel and service suppliers' },
      { label: 'Hotel Category', path: '/masters/hotel-categories', icon: Hotel,     count: 0, desc: '3-star, 4-star, 5-star, etc.' },
      { label: 'Room Type',      path: '/masters/room-types',       icon: Hotel,     count: 0, desc: 'Room type configurations' },
      // { label: 'Room Category',  path: '/masters/room-categories',  icon: Hotel,     count: 0, desc: 'Room classifications for hotel rates' },
      { label: 'Meal Plan',      path: '/masters/meal-plans',       icon: Utensils,  count: 0, desc: 'Breakfast, HB, FB, etc.' },
      { label: 'Amenities',      path: '/masters/amenities',        icon: Star,      count: 0, desc: 'Hotel amenities & facilities' },
    ]
  },
  {
    category: 'OPERATIONS',
    color: 'border-l-green-500',
    bg: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    dot: 'bg-green-500',
    items: [
      { label: 'Transfers',     path: '/masters/transfers',      icon: Car,       count: 0, desc: 'Transfer routes & pricing' },
      { label: 'Destination',   path: '/masters/destinations',   icon: MapPin,    count: 0, desc: 'Thai destinations' },
      { label: 'Location',      path: '/masters/locations',      icon: MapPin,    count: 0, desc: 'Specific locations & landmarks' },
      { label: 'Airports',      path: '/masters/airports',       icon: Plane,     count: 0, desc: 'Flight arrival & departure airports' },
      { label: 'Vehicles',      path: '/masters/vehicles',       icon: Car,       count: 0, desc: 'Vehicle types & capacity' },
      { label: 'Drivers',       path: '/masters/drivers',        icon: Users,     count: 0, desc: 'Driver database' },
      { label: 'Guides',        path: '/masters/guides',         icon: UserCheck, count: 0, desc: 'Tour guides' },
      { label: 'Ferry Classes', path: '/masters/ferry-classes',  icon: Ship,      count: 0, desc: 'Ferry class types' },
      { label: 'Yacht',         path: '/masters/yacht',          icon: Ship,      count: 0, desc: 'Manage yachts, boat charters, rates & availability' },
    ]
  },
  {
    category: 'ACTIVITIES',
    color: 'border-l-orange-500',
    bg: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    dot: 'bg-orange-500',
    items: [
      // Legacy sightseeing list is retained in source but intentionally hidden.
      // { label: 'Sightseeing (Legacy)', path: '/masters/sightseeing-legacy', icon: Globe, count: 0, desc: 'Legacy tours & activities' },
      { label: 'Sightseeing',      path: '/masters/sightseeing',      icon: Globe,           count: 0, desc: 'Complete sightseeing setup, pricing & voucher flow' },
      { label: 'Restaurants',      path: '/masters/restaurants',      icon: Utensils,        count: 0, desc: 'Restaurant database' },
      { label: 'Restaurant Types', path: '/masters/restaurant-types', icon: UtensilsCrossed, count: 0, desc: 'Cuisine & dining categories' },
      { label: 'Visa',             path: '/masters/visa',             icon: FileCheck,       count: 0, desc: 'Visa service providers' },
      { label: 'Travel Insurance', path: '/masters/travel-insurance', icon: FileText,        count: 0, desc: 'Travel insurance plans' },
    ]
  },
  {
    category: 'FINANCE',
    color: 'border-l-cyan-500',
    bg: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
    dot: 'bg-cyan-500',
    items: [
      { label: 'Currency',      path: '/masters/currencies',    icon: Banknote, count: 0, desc: 'THB, USD, INR, EUR...' },
      { label: 'Banks',         path: '/masters/banks',         icon: Landmark, count: 0, desc: 'Bank accounts' },
      { label: 'Expense Types', path: '/masters/expense-types', icon: Receipt,  count: 0, desc: 'Expense categories' },
    ]
  },
  {
    category: 'SYSTEM',
    color: 'border-l-slate-500',
    bg: 'bg-slate-50',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
    dot: 'bg-slate-500',
    items: [
      { label: 'Itinerary',         path: '/masters/itinerary',         icon: SettingsIcon, count: 0, desc: 'Reusable itinerary templates' },
      { label: 'Arrival/Departure', path: '/masters/arrival-departure', icon: Plane,        count: 0, desc: 'Arrival & departure templates' },
      { label: 'Documents',         path: '/masters/documents',         icon: FileText,     count: 0, desc: 'Document templates' },
      { label: 'Guest Documents',   path: '/masters/guest-documents',   icon: FileCheck,    count: 0, desc: 'Guest document types' },
      { label: 'Feedback Types',    path: '/masters/feedback-types',    icon: ThumbsUp,     count: 0, desc: 'Guest feedback categories' },
      { label: 'Terms & Conditions', path: '/masters/terms-conditions', icon: FileText, count: 0, desc: 'Reusable rich-text document terms' },
    ]
  },
];

export default function Masters() {
  const navigate  = useNavigate();
  const [search,  setSearch]  = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('masters-view') || 'cards');
  const [counts, setCounts] = useState(() => getCachedMasterSummary() || {});
  const [countsLoading, setCountsLoading] = useState(() => !getCachedMasterSummary());

  useEffect(() => {
    let active = true;
    if (!getCachedMasterSummary()) setCountsLoading(true);
    loadMasterSummary()
      .then((nextCounts) => { if (active) setCounts(nextCounts); })
      .catch(() => { if (active) setCounts({}); })
      .finally(() => { if (active) setCountsLoading(false); });
    return () => { active = false; };
  }, []);

  const scrollContainer = () => document.getElementById('main-scroll');

  useEffect(() => {
    const saved = sessionStorage.getItem('masters-scroll');
    if (saved) {
      const el = scrollContainer();
      if (el) el.scrollTop = parseInt(saved, 10);
    }
  }, []);

  const handleNavigate = (path) => {
    const el = scrollContainer();
    if (el) sessionStorage.setItem('masters-scroll', el.scrollTop);
    navigate(path);
  };

  const switchView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('masters-view', mode);
  };

  const categoriesWithCounts = masterCategories.map(cat => ({ ...cat, items: cat.items.map(item => ({ ...item, count: counts[item.path] ?? 0 })) }));
  const filtered = search
    ? categoriesWithCounts.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
      })).filter(cat => cat.items.length > 0)
    : categoriesWithCounts;

  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-[calc(100vh-48px)]">

      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Back + Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            title="Go Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Masters</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Manage all reference data and configuration</p>
          </div>
        </div>

        {/* Search – centred, grows */}
        <div className="flex-1 min-w-[200px] flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search masters... (e.g. "hotel", "agent")'
              className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0 rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden flex-shrink-0">
          <button
            onClick={() => switchView('cards')}
            title="Card view"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 rounded-l-[5px]
              ${viewMode === 'cards'
                ? 'bg-[#DFF2FE] text-[#0069a8] ring-1 ring-inset ring-blue-300'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Cards</span>
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <button
            onClick={() => switchView('rows')}
            title="Row view"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 rounded-r-[5px]
              ${viewMode === 'rows'
                ? 'bg-[#DFF2FE] text-[#0069a8] ring-1 ring-inset ring-blue-300'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <List className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Rows</span>
          </button>
        </div>
      </div>

      {/* ── Category sections ── */}
      {countsLoading ? <div className="card"><PageLoader label="Loading master data…" minHeight="min-h-[420px]" /></div> : <div className="space-y-5">
        {filtered.map(cat => (
          <div key={cat.category}>
            {/* Section heading */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className={`h-4 w-1 rounded-full ${cat.dot}`} />
              <h2 className={`text-[11px] font-bold tracking-widest uppercase ${cat.textColor}`}>
                {cat.category}
              </h2>
              <span className={`ml-1 rounded-full px-2 py-px text-[10px] font-semibold ${cat.bg} ${cat.textColor}`}>
                {cat.items.length}
              </span>
            </div>

            {/* ── CARDS view ── */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {cat.items.map(item => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.path)}
                    className="card p-4 text-left card-hover group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg ${cat.bg} border ${cat.borderColor} flex items-center justify-center`}>
                        <item.icon className={`w-4 h-4 ${cat.textColor}`} />
                      </div>
                      <div className={`min-w-[24px] h-6 flex items-center justify-center text-[11px] font-bold ${cat.textColor} ${cat.bg} border ${cat.borderColor} px-1.5 rounded-full`}>
                        {item.count}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">{item.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{item.desc}</div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 group-hover:text-blue-600 transition-colors">
                      <span>Manage</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── ROWS view ── */}
            {viewMode === 'rows' && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                {cat.items.map((item, idx) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 group transition-colors"
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${cat.bg} border ${cat.borderColor} flex items-center justify-center`}>
                      <item.icon className={`w-3.5 h-3.5 ${cat.textColor}`} />
                    </div>

                    {/* Index */}
                    <span className="flex-shrink-0 w-5 text-[10px] font-bold text-slate-300 text-center">{idx + 1}</span>

                    {/* Label */}
                    <span className="flex-1 font-semibold text-slate-800 text-[13px] truncate">{item.label}</span>

                    {/* Description */}
                    <span className="hidden md:block flex-1 text-xs text-slate-400 truncate">{item.desc}</span>

                    {/* Count badge */}
                    <div className={`flex-shrink-0 min-w-[24px] h-6 flex items-center justify-center text-[10px] font-bold ${cat.textColor} ${cat.bg} border ${cat.borderColor} px-1.5 rounded-full`}>
                      {item.count}
                    </div>

                    {/* Manage arrow */}
                    <span className="flex-shrink-0 flex items-center gap-0.5 text-[11px] text-slate-400 group-hover:text-blue-600 transition-colors font-medium">
                      Manage <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>}

      {filtered.length === 0 && (
        <div className="py-12 text-center text-slate-400 text-sm">
          No masters found for &quot;{search}&quot;
        </div>
      )}
    </div>
  );
}
