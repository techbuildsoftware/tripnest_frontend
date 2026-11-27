import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Plus, Search, Trash2, ArrowLeft, ReceiptText, LayoutGrid, List, Eye, Hash, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { apiClient } from '../../lib/api';
import useLocations from '../../hooks/useLocations';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import { formatDate, todayIsoInTimeZone } from '../../lib/date';
import PageLoader from '../../components/ui/PageLoader';
import RichTextEditor from '../../components/ui/RichTextEditor';

// ─── Per-type configuration ──────────────────────────────────────────────────
const config = {
  destinations: {
    title: 'Destination', plural: 'Destinations',
    hint: 'Destinations used by hotels, transfers, guides and operations',
    columns: [['name', 'Destination Name'], ['company', 'Company'], ['country', 'Country']],
    fields: [
      ['country', 'Country', 'country'],
      ['company', 'Assigned Company'],
      ['destinationImage', 'Destination Image', 'file'],
    ],
    defaults: { company: 'TripNest Pvt Ltd', country: 'Thailand' },
  },
  locations: {
    title: 'Location', plural: 'Locations',
    hint: 'Places, landmarks and pickup points linked to a destination',
    columns: [['name', 'Name'], ['destination', 'Destination']],
    fields: [['destination', 'Destination', 'destination']],
  },
  transfers: {
    title: 'Transfer', plural: 'Transfers',
    hint: 'Transfer routes, timings and operational details',
    columns: [['name', 'Transfer Name'], ['destination', 'Destination'], ['timing', 'Operating Time']],
    fields: [
      ['destination', 'Destination', 'destination'],
      ['duration', 'Tour Duration'],
      ['timing', 'Timing'],
      ['operatingDays', 'Operating Days', 'multi', ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']],
      ['description', 'Description (PDF-ready rich text)', 'richtext'],
      ['termsHtml', 'Terms & Conditions (Voucher)', 'richtext'],
      ['usefulInformation', 'Useful Information', 'textarea'],
      ['transferImage', 'Transfer Image', 'file'],
    ],
  },
  vehicles: {
    title: 'Vehicle', plural: 'Vehicles',
    hint: 'Vehicle images, capacity and availability',
    defaults: { vehicleType: 'SIC' },
    columns: [['name', 'Name'], ['brand', 'Brand'], ['vehicleType', 'Type'], ['transferCapacity', 'Transfer Cap.'], ['sightseeingCapacity', 'Sightseeing Cap.']],
    fields: [
      ['brand', 'Brand'],
      ['vehicleType', 'Vehicle Type', 'select', ['SIC', 'PVT']],
      ['transferCapacity', 'Transfer Capacity', 'number'],
      ['sightseeingCapacity', 'Sightseeing Capacity', 'number'],
      ['vehicleImage', 'Vehicle Image', 'file'],
    ],
  },
  drivers: {
    title: 'Driver', plural: 'Drivers',
    hint: 'Driver contacts, licence documents and assigned vehicle',
    columns: [['name', 'Name'], ['mobile', 'Mobile'], ['alternateNo', 'Alternate No.'], ['vehicle', 'Vehicle'], ['license', 'License']],
    fields: [
      ['code', 'Code'],
      ['mobile', 'Mobile'],
      ['alternateNo', 'Alternate No.'],
      ['idPassportNo', 'ID / Passport No.'],
      ['vehicle', 'Vehicle', 'vehicle'],
      ['vehicleCapacity', 'Vehicle Capacity', 'number'],
      ['address', 'Address', 'textarea'],
      ['driverImage', 'Driver Photo', 'file'],
      ['licenseUpload', 'License Upload', 'file'],
    ],
  },
  guides: {
    title: 'Guide', plural: 'Guides',
    hint: 'Guide contacts, languages and destinations covered',
    defaults: { timingRates: [] },
    columns: [['name', 'Name'], ['mobile', 'Contact'], ['vehicle', 'Vehicle'], ['language', 'Language']],
    fields: [
      ['code', 'Code'],
      ['mobile', 'Mobile'],
      ['alternateNo', 'Alternate No.'],
      ['idPassportNo', 'ID / Passport No.'],
      ['vehicle', 'Vehicle', 'vehicle'],
      ['vehicleCapacity', 'Vehicle Capacity', 'number'],
      ['destinations', 'Destinations Covered', 'multi-destination'],
      ['language', 'Language Known'],
      ['address', 'Address', 'textarea'],
      ['guideImage', 'Guide Photo', 'file'],
      ['licenseUpload', 'License Upload', 'file'],
    ],
  },
  'ferry-classes': {
    title: 'Ferry Class', plural: 'Ferry Classes',
    hint: 'Ferry and boat service class configuration',
    columns: [['name', 'Name']],
    fields: [['description', 'Description (PDF-ready rich text)', 'richtext'], ['termsHtml', 'Terms & Conditions (Voucher)', 'richtext']],
  },
  airports: {
    title: 'Airport', plural: 'Airports',
    hint: 'List of airports for flight arrivals and departures',
    columns: [['name', 'Airport Name'], ['iataCode', 'IATA'], ['city', 'City'], ['country', 'Country']],
    fields: [
      ['country', 'Country', 'country'],
      ['city', 'City'],
      ['iataCode', 'IATA Code'],
      ['icaoCode', 'ICAO Code'],
      ['airportType', 'Airport Type', 'select', ['International', 'Domestic', 'Regional', 'Private']],
      ['timezone', 'Timezone'],
    ],
    defaults: { country: 'Thailand', airportType: 'International', timezone: 'Asia/Bangkok' },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const initial = (type) => ({ name: '', status: 'Active', ...(config[type]?.defaults || {}) });
const fmtDate = (val) => formatDate(val);

// Icon for each type
function TypeIcon({ type }) {
  const map = {
    destinations: '📍', locations: '🗺️', transfers: '🚌',
    vehicles: '🚗', drivers: '🧑‍✈️', guides: '🧭', 'ferry-classes': '⛴️', airports: '✈️',
  };
  return <span className="text-base">{map[type] || '📋'}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OperationsMaster({ type }) {
  const navigate = useNavigate();
  const meta = config[type] || { title: type, plural: type, hint: '', columns: [['name', 'Name']], fields: [] };

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [isOpen, setIsOpen]   = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm]       = useState(initial(type));
  const [files, setFiles]     = useState({});
  const [expiredIds, setExpiredIds] = useState(new Set());
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(`operations-master-view-${type}`) || 'cards');

  useEffect(() => {
    localStorage.setItem(`operations-master-view-${type}`, viewMode);
  }, [viewMode, type]);

  const destinations = useOperationsMaster('destinations');
  const vehicles     = useOperationsMaster('vehicles');
  const { countries } = useLocations('', '');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/operations-masters/${type}`);
      setItems(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setItems([]); setSearch(''); setIsOpen(false);
    load();
  }, [type]);

  useEffect(() => {
    if (type !== 'transfers') { setExpiredIds(new Set()); setExpiredOnly(false); return undefined; }
    let active = true;
    apiClient.get('/transfer-rates').then((response) => {
      if (!active) return;
      const today = todayIsoInTimeZone();
      setExpiredIds(new Set((response.data || []).filter((rate) => rate.toDate && rate.toDate < today).map((rate) => rate.transferId)));
    }).catch(() => active && setExpiredIds(new Set()));
    return () => { active = false; };
  }, [type]);

  const set = (key, value) => setForm(cur => ({ ...cur, [key]: value }));

  const open = (item = null) => {
    setEditing(item);
    setForm(item ? { ...initial(type), ...item } : initial(type));
    setFiles({});
    setIsOpen(true);
  };

  const close = () => { setEditing(null); setIsOpen(false); };

  const save = async () => {
    if (!form.name?.trim()) return toast.error(`${meta.title} name is required.`);
    if (type === 'guides' && (form.timingRates || []).some((rate) => {
      const hasPrice = ['englishCost', 'asianCost', 'otherCost'].some((field) => rate[field] !== '' && rate[field] !== undefined && rate[field] !== null);
      return !String(rate.duration || '').trim() || !hasPrice;
    })) return toast.error('Every guide timing rate needs a duration and at least one language cost.');
    try {
      let uploaded = {};
      if (Object.keys(files).length) {
        const payload = new FormData();
        Object.entries(files).forEach(([field, file]) => payload.append(field, file));
        uploaded = Object.fromEntries(
          (await apiClient.upload('/uploads?folder=operations', payload)).data.map(f => [f.field, f])
        );
      }
      const payload = { ...form, ...uploaded };
      const res = editing
        ? await apiClient.put(`/operations-masters/${type}/${editing.id}`, payload)
        : await apiClient.post(`/operations-masters/${type}`, payload);
      setItems(cur =>
        editing ? cur.map(x => (x.id === editing.id ? res.data : x)) : [res.data, ...cur]
      );
      close();
      toast.success(`${meta.title} saved.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/operations-masters/${type}/${deleteId}`);
      setItems(cur => cur.filter(x => x.id !== deleteId));
      toast.success(`${meta.title} deleted.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const visible = useMemo(
    () => items.filter(x => JSON.stringify(x).toLowerCase().includes(search.toLowerCase()) && (!expiredOnly || expiredIds.has(x.id))),
    [items, search, expiredOnly, expiredIds]
  );

  const optionFor = (kind) =>
    kind === 'country' ? countries.map(x => x.name)
      : kind === 'destination' || kind === 'multi-destination' ? destinations
        : vehicles;

  const renderField = ([key, label, kind = 'text', options]) => {
    const isFullWidth = kind === 'textarea' || kind === 'richtext';
    const isDoubleWidth = key === 'operatingDays';
    const wrapperClass = isFullWidth 
      ? 'col-span-1 md:col-span-2 lg:col-span-3' 
      : isDoubleWidth 
        ? 'col-span-1 md:col-span-2 lg:col-span-2' 
        : 'col-span-1';

    if (kind === 'file') {
      const fileValue = form[key] || (key.toLowerCase().includes('image') ? form.image : undefined);
      const hasFile = !!files[key] || !!fileValue;
      const existingUrl = typeof fileValue === 'string' ? fileValue : fileValue?.url;
      return (
        <div key={key} className={`${wrapperClass} flex flex-col gap-1`}>
          <span className="form-label mb-0">{label}</span>
          {existingUrl && !files[key] && (
            <div className="flex items-center gap-2 mb-0.5">
               {existingUrl.match(/\.pdf(\?.*)?$/i) ? null : (
                  <img src={existingUrl} alt="Current" className="w-6 h-6 object-cover rounded border border-slate-200" />
               )}
               <a href={existingUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate">View current</a>
            </div>
          )}
          <input type="file" accept={key === 'destinationImage' ? 'image/*' : 'image/*,application/pdf'} className={`form-input h-7 px-1.5 py-0.5 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold cursor-pointer transition-colors ${hasFile ? 'file:bg-green-100 file:text-green-700 hover:file:bg-green-200 bg-green-50/50 border-green-200' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`}
            onChange={e => e.target.files?.[0] && setFiles(cur => ({ ...cur, [key]: e.target.files[0] }))} />
        </div>
      );
    }
    if (kind === 'textarea') return (
      <label key={key} className={wrapperClass}>
        <span className="form-label mb-0">{label}</span>
        <textarea rows="2" className="form-input text-xs py-1 min-h-[44px]" value={form[key] || ''} onChange={e => set(key, e.target.value)} />
      </label>
    );
    if (kind === 'richtext') return (
      <label key={key} className={wrapperClass}>
        <span className="form-label mb-0">{label}</span>
        <RichTextEditor value={form[key] || ''} onChange={(value) => set(key, value)} />
      </label>
    );
    if (['select', 'country', 'destination', 'vehicle'].includes(kind)) return (
      <label key={key} className={wrapperClass}>
        <span className="form-label mb-0">{label}</span>
        <SearchableSelect compact value={form[key] || ''} onChange={v => set(key, v)} options={options || optionFor(kind)} placeholder={`Select ${label}`} />
      </label>
    );
    if (['multi', 'multi-destination'].includes(kind)) return (
      <label key={key} className={wrapperClass}>
        <span className="form-label mb-0">{label}</span>
        <SearchableSelect compact isMulti value={form[key] || []} onChange={v => set(key, key === 'operatingDays' && v.includes('All') ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] : v)} options={options || optionFor(kind)} placeholder={`Select ${label}`} />
      </label>
    );
    return (
      <label key={key} className={wrapperClass}>
        <span className="form-label mb-0">{label}</span>
        <input type={kind} className="form-input text-xs h-7 py-1 px-2.5" value={form[key] || ''}
          onChange={e => set(key, kind === 'number' ? Number(e.target.value) : e.target.value)} />
      </label>
    );
  };

  return (
    <div className="p-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => navigate("/masters")} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0 mt-0.5" title="Go Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">{meta.plural}</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">{loading ? 'Loading records…' : `${items.length} ${items.length === 1 ? meta.title.toLowerCase() : meta.plural.toLowerCase()}`} · {meta.hint}</p>
          </div>
        </div>
        <div className="flex-1 max-w-xl mx-0 md:mx-8">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all" placeholder={`Search ${meta.plural.toLowerCase()}...`} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          {type === 'transfers' && <button type="button" onClick={() => setExpiredOnly((value) => !value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${expiredOnly ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>{expiredIds.size} expired {expiredIds.size === 1 ? 'rate' : 'rates'}</button>}
          <button onClick={() => open()} className="btn-primary text-xs h-8 px-3"><Plus className="w-3.5 h-3.5 mr-1" /> Add {meta.title}</button>
        </div>
      </div>

      {/* Table / Grid */}
      <div className={`${viewMode === 'table' ? 'card overflow-hidden' : ''}`}>
        {loading ? <PageLoader label={`Loading ${meta.plural.toLowerCase()}…`} /> : <>
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {meta.columns.map(([, label]) => (
                  <th key={label} className="table-header">{label}</th>
                ))}
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((item, i) => (
                <tr key={item.id} className={`table-row hover:bg-primary-50/30 ${i % 2 === 1 ? 'bg-slate-50/40' : ''} cursor-pointer`} onClick={() => setViewing(item)}>
                  {meta.columns.map(([key], idx) => (
                    <td key={key} className="table-cell">
                      {idx === 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                            <TypeIcon type={type} />
                          </div>
                          <span className="font-medium text-slate-900">{item[key] || '—'}{type === 'transfers' && expiredIds.has(item.id) && <span className="ml-2 badge badge-red">Expired rate</span>}</span>
                        </div>
                      ) : Array.isArray(item[key]) ? (
                        <span className="text-slate-500">{item[key].join(', ') || '—'}</span>
                      ) : (
                        <span className="text-slate-500">{item[key] || '—'}</span>
                      )}
                    </td>
                  ))}
                  <td className="table-cell">
                    <span className={item.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>
                      {item.status}
                    </span>
                  </td>
                  <td className="table-cell text-slate-400">{fmtDate(item.createdAt)}</td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-1">
                      {type === 'transfers' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/masters/transfers/${encodeURIComponent(item.id)}/prices`); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Manage prices"
                        >
                          <ReceiptText className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewing(item); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); open(item); }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {visible.map((item) => {
              const imageObj = item.transferImage || item.vehicleImage || item.driverImage || item.guideImage || item.image || (item.images && item.images[0]);
              const imageUrl = imageObj?.url;
              return (
                <div key={item.id} onClick={() => setViewing(item)} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col">
                  <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name || meta.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="text-4xl opacity-40 group-hover:scale-110 transition-transform duration-500"><TypeIcon type={type} /></div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md shadow-sm ${item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.status}</span>
                    </div>
                    {type === 'transfers' && expiredIds.has(item.id) && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-500 text-white px-2 py-0.5 text-[10px] font-bold rounded-md shadow-sm">Expired rate</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center flex-shrink-0 text-xs">
                        <TypeIcon type={type} />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm truncate" title={item.name || item[meta.columns[0][0]]}>{item.name || item[meta.columns[0][0]] || '—'}</h3>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1.5 mb-3 flex-1">
                      {meta.columns.slice(1).slice(0, 3).map(([key, label]) => {
                        const val = Array.isArray(item[key]) ? item[key].join(', ') : item[key];
                        if (!val) return null;
                        return (
                          <div key={key} className="flex justify-between items-center gap-2">
                            <span className="text-slate-400 whitespace-nowrap">{label}:</span>
                            <span className="font-medium text-slate-700 truncate">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                      <span className="text-[10px] text-slate-400 font-medium">{fmtDate(item.createdAt)}</span>
                      <div className="flex items-center justify-end gap-1">
                        {type === 'transfers' && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/masters/transfers/${encodeURIComponent(item.id)}/prices`); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Manage prices">
                            <ReceiptText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setViewing(item); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); open(item); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {visible.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl">
              <TypeIcon type={type} />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search
                ? `No ${meta.plural.toLowerCase()} match "${search}"`
                : `No ${meta.plural.toLowerCase()} added yet`}
            </p>
            {!search && (
              <button onClick={() => open()} className="btn-primary mt-4 mx-auto">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add first {meta.title}
              </button>
            )}
          </div>
        )}</>}
      </div>

      {/* ── View Modal ── */}
      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name || `${meta.title} Details`}
        size={meta.fields.length >= 4 ? 'lg' : 'md'}
        footer={
          <>
            <button onClick={() => setViewing(null)} className="btn-secondary">Close</button>
            <button onClick={() => { const v = viewing; setViewing(null); open(v); }} className="btn-primary text-xs h-8 px-3 flex-shrink-0">
              <Edit className="w-4 h-4" /> Edit {meta.title}
            </button>
          </>
        }
      >
        {viewing && (() => {
          const imageObj = viewing.transferImage || viewing.vehicleImage || viewing.driverImage || viewing.guideImage || viewing.image;
          const imageUrl = imageObj?.url;
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-200 p-3 shadow-sm">
                {imageUrl ? (
                  <img src={imageUrl} alt={viewing.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 text-2xl">
                    <TypeIcon type={type} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <div className="text-base font-bold text-slate-900 leading-tight break-words">{viewing.name}</div>
                    <span className={viewing.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>{viewing.status || 'Active'}</span>
                    {type === 'transfers' && expiredIds.has(viewing.id) && <span className="badge badge-red">Expired Rate</span>}
                  </div>
                  <div className="text-xs text-slate-500">{meta.title} · {meta.hint}</div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Hash className="w-3.5 h-3.5 text-blue-400" /> Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {meta.columns.map(([key, label]) => (
                    <div key={key}>
                      <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</div>
                      <div className="text-xs font-medium text-slate-800">{Array.isArray(viewing[key]) ? viewing[key].join(', ') : viewing[key] || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Record Info
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Created</div><div className="text-xs font-medium text-slate-800">{fmtDate(viewing.createdAt)}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Last Updated</div><div className="text-xs font-medium text-slate-800">{fmtDate(viewing.updatedAt)}</div></div>
                  <div className="col-span-2"><div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">ID</div><div className="text-xs font-medium text-slate-800">{viewing.id}</div></div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={close}
        title={`${editing ? 'Edit' : 'Add'} ${meta.title}`}
        size={meta.fields.length > 6 ? 'xl' : meta.fields.length >= 4 ? 'lg' : 'md'}
        footer={
          <>
            <button className="btn-secondary py-1 text-sm" onClick={close}>Cancel</button>
            <button className="btn-primary py-1 text-sm flex-shrink-0" onClick={save}>Save {meta.title}</button>
          </>
        }
      >
        <div className="bg-white -mx-6 -my-4 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
            <label className="col-span-1">
              <span className="form-label mb-0">Name *</span>
              <input className="form-input text-xs h-7 py-1 px-2.5" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder={`Enter ${meta.title.toLowerCase()} name`} />
            </label>
            {meta.fields.map(renderField)}
            <label className="col-span-1">
              <span className="form-label mb-0">Status</span>
              <SearchableSelect compact value={form.status} onChange={v => set('status', v)} options={['Active', 'Inactive']} />
            </label>
          </div>
          {type === 'guides' && <GuideTimingRates rates={form.timingRates || []} onChange={(timingRates) => set('timingRates', timingRates)} />}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={`Delete ${meta.title}`}
        message={`Are you sure you want to delete this ${meta.title.toLowerCase()}? This action cannot be undone.`}
      />
    </div>
  );
}

function GuideTimingRates({ rates, onChange }) {
  const update = (index, field, value) => onChange(rates.map((rate, rateIndex) => rateIndex === index ? { ...rate, [field]: value } : rate));
  const add = () => onChange([...rates, { duration: '', currency: 'THB', englishCost: '', asianCost: '', otherCost: '', status: 'Active' }]);
  const remove = (index) => onChange(rates.filter((_, rateIndex) => rateIndex !== index));

  return (
    <section className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Timing-wise guide costs</h3>
          <p className="text-xs text-slate-500 mt-0.5">Set the supplier cost for each guide duration and language category. Zero is a valid rate.</p>
        </div>
        <button type="button" onClick={add} className="btn-secondary text-xs py-1.5 px-2.5"><Plus className="w-3.5 h-3.5 mr-1" /> Add time band</button>
      </div>
      {rates.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left px-3 py-2 font-bold">Hours / timing</th>
                <th className="text-left px-3 py-2 font-bold">Currency</th>
                <th className="text-left px-3 py-2 font-bold">English language</th>
                <th className="text-left px-3 py-2 font-bold">Asian language</th>
                <th className="text-left px-3 py-2 font-bold">Other language</th>
                <th className="text-left px-3 py-2 font-bold">Status</th>
                <th className="px-3 py-2" aria-label="Remove" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map((rate, index) => (
                <tr key={`${rate.duration || 'new'}-${index}`}>
                  <td className="p-2"><input value={rate.duration || ''} onChange={(event) => update(index, 'duration', event.target.value)} className="form-input h-8 text-xs" placeholder="e.g. 2-4 Hours" /></td>
                  <td className="p-2"><select value={rate.currency || 'THB'} onChange={(event) => update(index, 'currency', event.target.value)} className="form-select h-8 text-xs">{['THB', 'USD', 'EUR', 'INR'].map((currency) => <option key={currency}>{currency}</option>)}</select></td>
                  {['englishCost', 'asianCost', 'otherCost'].map((field) => <td className="p-2" key={field}><input type="number" min="0" step="0.01" value={rate[field] ?? ''} onChange={(event) => update(index, field, event.target.value === '' ? '' : Number(event.target.value))} className="form-input h-8 text-xs" placeholder="0" /></td>)}
                  <td className="p-2"><select value={rate.status || 'Active'} onChange={(event) => update(index, 'status', event.target.value)} className="form-select h-8 text-xs"><option>Active</option><option>Inactive</option></select></td>
                  <td className="p-2 text-right"><button type="button" onClick={() => remove(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Remove time band"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="px-4 py-5 text-center text-xs text-slate-500">No timing costs yet. Add a time band to make this guide available for quotation pricing.</div>}
    </section>
  );
}
