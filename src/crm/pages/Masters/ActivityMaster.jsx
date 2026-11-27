import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Plus, Search, Trash2, ArrowLeft, ImagePlus, ReceiptText, X, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { apiClient } from '../../lib/api';
import useSalesMaster from '../../hooks/useSalesMaster';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import { useApp } from '../../context/AppContext';
import PageLoader from '../../components/ui/PageLoader';
import { todayIsoInTimeZone } from '../../lib/date';

// ─── Per-type configuration ───────────────────────────────────────────────────
const cfg = {
  sightseeing: {
    title: 'Sightseeing',
    hint: 'Tours, attractions and activity listings',
    cols: [['name', 'Activity Name'], ['operatingDays', 'Operating Days'], ['destination', 'Destination'], ['timing', 'Timings']],
    fields: [
      ['destination', 'Destination', 'destination'],
      ['activityType', 'Activity Type', 'select', ['Standard Activity', 'Private Activity', 'Ticket Only']],
      ['duration', 'Tour Duration'],
      ['timing', 'Timings'],
      ['operatingDays', 'Operating Days', 'multi', ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']],
      ['items', 'Add More Items', 'tag-input'],
      ['activityImages', 'Activity Images', 'image-files'],
      ['childAgeSlabs', 'Child Age Slabs', 'age-slabs'],
      ['details', 'Details', 'textarea'],
      ['usefulInformation', 'Useful Information', 'textarea'],
    ],
  },
  restaurants: {
    title: 'Restaurant',
    hint: 'Restaurant database with contact and dining details',
    cols: [['name', 'Name'], ['mealPreference', 'Meal Preference'], ['destination', 'Destination'], ['location', 'Location']],
    fields: [
      ['destination', 'Destination', 'destination'],
      ['location', 'Location', 'location'],
      ['restaurantType', 'Restaurant Type', 'restaurant-type'],
      ['mealPreference', 'Meal Preference', 'meal-preference'],
      ['timing', 'Timing'],
      ['landmark', 'Landmark'],
      ['image', 'Restaurant Image', 'restaurant-image'],
      ['nearHotels', 'Near By Hotels', 'hotels'],
      ['category', 'Restaurant Category', 'select', ['Standard', 'Deluxe', 'Luxury']],
      ['supplier', 'Restaurant Supplier', 'restaurant-supplier'],
      ['address', 'Address', 'textarea'],
      ['contactPerson', 'Contact Person'],
      ['contactPhone', 'Contact Person Phone'],
      ['contactEmail', 'Contact Person Email'],
      ['landline', 'Landline No.'],
      ['details', 'Restaurant Details', 'textarea'],
    ],
  },
  'restaurant-types': {
    title: 'Restaurant Type',
    hint: 'Cuisine and dining category classifications',
    cols: [['name', 'Name']],
    fields: [],
  },
  visa: {
    title: 'Visa',
    hint: 'Visa types and their cost configuration',
    cols: [['name', 'Name'], ['currency', 'Currency'], ['adultCost', 'Adult Cost'], ['childCost', 'Child Cost'], ['infantCost', 'Infant Cost']],
    fields: [
      ['currency', 'Currency', 'select', ['THB', 'INR', 'USD', 'AED']],
      ['adultCost', 'Adult Cost', 'number'],
      ['childCost', 'Child Cost', 'number'],
      ['infantCost', 'Infant Cost', 'number'],
    ],
  },
  'travel-insurance': {
    title: 'Travel Insurance',
    hint: 'Travel insurance plans and coverage details',
    cols: [['name', 'Name'], ['currency', 'Currency'], ['adultCost', 'Adult Cost'], ['childCost', 'Child Cost']],
    fields: [
      ['currency', 'Currency', 'select', ['THB', 'INR', 'USD', 'AED']],
      ['adultCost', 'Adult Cost', 'number'],
      ['childCost', 'Child Cost', 'number'],
      ['infantCost', 'Infant Cost', 'number'],
      ['details', 'Coverage Details', 'textarea'],
    ],
  },
};

// Type icon map
const TYPE_ICONS = {
  sightseeing: '🏛️', restaurants: '🍽️', 'restaurant-types': '🍜',
  visa: '🛂', 'travel-insurance': '🛡️',
};

const SUPPLIER_BANK_FIELDS = [
  ['accountName', 'Account Name'],
  ['accountNumber', 'Account Number'],
  ['bankName', 'Bank Name'],
  ['branch', 'Branch'],
  ['ifscCode', 'IFSC Code'],
  ['swiftCode', 'Swift Code'],
];

const emptySupplierBankDetails = () => Object.fromEntries(SUPPLIER_BANK_FIELDS.map(([key]) => [key, '']));

function TypeIcon({ type }) {
  return <span className="text-base">{TYPE_ICONS[type] || '📋'}</span>;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ActivityMaster({ type }) {
  const navigate = useNavigate();
  const meta = cfg[type] || { title: type, hint: '', cols: [['name', 'Name']], fields: [] };

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [edit, setEdit]         = useState(null);
  const [isOpen, setIsOpen]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm]         = useState({ name: '', status: 'Active' });
  const [drafts, setDrafts]     = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [restaurantImageFile, setRestaurantImageFile] = useState(null);
  const [expiredIds, setExpiredIds] = useState(new Set());
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [restaurantTypes, setRestaurantTypes] = useState([]);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(`activity-master-view-${type}`) || 'cards');

  useEffect(() => {
    localStorage.setItem(`activity-master-view-${type}`, viewMode);
  }, [viewMode, type]);

  const destinations = useOperationsMaster('destinations');
  const locations    = useOperationsMaster('locations');
  const mealPlans    = useSalesMaster('meal-plans');
  const { hotels, suppliers, addSupplier } = useApp();

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/activity-masters/${type}`);
      setItems(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setItems([]); setSearch('');
    load();
  }, [type]);

  useEffect(() => {
    if (type !== 'restaurants') { setExpiredIds(new Set()); setExpiredOnly(false); return undefined; }
    let active = true;
    apiClient.get('/restaurant-rates').then((response) => {
      if (!active) return;
      const today = todayIsoInTimeZone();
      setExpiredIds(new Set((response.data || []).filter((rate) => rate.toDate && rate.toDate < today).map((rate) => rate.restaurantId)));
    }).catch(() => active && setExpiredIds(new Set()));
    return () => { active = false; };
  }, [type]);

  useEffect(() => {
    if (type !== 'restaurants') { setRestaurantTypes([]); return undefined; }
    let active = true;
    apiClient.get('/activity-masters/restaurant-types')
      .then((response) => {
        if (active) setRestaurantTypes(response.data || []);
      })
      .catch(() => active && setRestaurantTypes([]));
    return () => { active = false; };
  }, [type]);

  const set = (k, v) => setForm(x => ({ ...x, [k]: v }));
  const setSupplierBankDetail = (key, value) => setForm((current) => ({
    ...current,
    supplierBankDetails: { ...emptySupplierBankDetails(), ...(current.supplierBankDetails || {}), [key]: value },
  }));

  const open = (x = null) => {
    if (type === 'sightseeing') {
      navigate(`/masters/sightseeing/${x?.id || 'new'}`);
      return;
    }
    setEdit(x);
    setForm(x
      ? { ...x, childAgeSlabs: x.childAgeSlabs || [], items: x.items || [], supplierOwn: Boolean(x.supplierOwn), supplierBankDetails: { ...emptySupplierBankDetails(), ...(x.supplierBankDetails || {}) } }
      : { name: '', status: 'Active', items: [], childAgeSlabs: [], supplier: '', supplierOwn: false, supplierBankDetails: emptySupplierBankDetails() });
    setDrafts({}); setImageFiles([]); setRestaurantImageFile(null);
    setIsOpen(true);
  };

  const close = () => { setEdit(null); setIsOpen(false); setImageFiles([]); setRestaurantImageFile(null); setDrafts({}); };

  const save = async () => {
    if (!form.name?.trim()) return toast.error('Name is required.');
    try {
      let payload = { ...form };
      if (type === 'restaurants' && payload.supplierOwn) {
        // The API creates or updates the Restaurant-owned supplier using the
        // restaurant name and the bank details below.
        payload.supplier = '';
      } else if (type === 'restaurants' && payload.supplier) {
        const matchingSupplier = suppliers.find((supplier) => String(supplier.id) === String(payload.supplier) || String(supplier.name).toLowerCase() === String(payload.supplier).toLowerCase());
        if (!matchingSupplier) {
          const createdSupplier = await addSupplier({
            name: String(payload.supplier).trim(), type: ['Restaurant'], status: 'Active', supplierOwn: true,
            contactPerson: payload.contactPerson || '', phone: payload.contactPhone || '', email: payload.contactEmail || '',
            country: 'Thailand', currency: 'THB', destination: payload.destination || '', bankDetails: payload.supplierBankDetails || {},
          });
          payload.supplier = createdSupplier.id;
        }
      }
      if (type === 'sightseeing' && imageFiles.length) {
        const data = new FormData();
        imageFiles.forEach((file) => data.append('activityImages', file));
        const uploaded = await apiClient.upload('/uploads?folder=sightseeing', data);
        payload = { ...payload, activityImages: uploaded.data.filter((file) => file.field === 'activityImages') };
      }
      if (type === 'restaurants' && restaurantImageFile) {
        const data = new FormData();
        data.append('restaurantImage', restaurantImageFile);
        const uploaded = await apiClient.upload('/uploads?folder=restaurants', data);
        const image = (uploaded.data || []).find((file) => file.field === 'restaurantImage');
        if (!image?.url) throw new Error('The restaurant image upload did not return a file.');
        payload = { ...payload, image };
      }
      const r = edit?.id
        ? await apiClient.put(`/activity-masters/${type}/${edit.id}`, payload)
        : await apiClient.post(`/activity-masters/${type}`, payload);
      setItems(x => edit?.id ? x.map(y => (y.id === edit.id ? r.data : y)) : [r.data, ...x]);
      close();
      toast.success(`${meta.title} saved.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/activity-masters/${type}/${deleteId}`);
      setItems(x => x.filter(y => y.id !== deleteId));
      toast.success(`${meta.title} deleted.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const renderField = ([k, l, kind = 'text', opts]) => {
    if (kind === 'textarea') return (
      <label key={k}>
        <span className="form-label">{l}</span>
        <textarea className="form-input h-10" rows="2" value={form[k] || ''} onChange={e => set(k, e.target.value)} />
      </label>
    );
    if (kind === 'multi' || kind === 'multi-text') return (
      <label key={k} className={kind === 'multi-text' ? "md:col-span-2" : ""}>
        <span className="form-label">{l}</span>
        {kind === 'multi' ? (
          <SearchableSelect isMulti options={opts} value={form[k] || []} onChange={v => set(k, v.includes('All') ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] : v)} />
        ) : (
          <input className="form-input"
            value={(form[k] || []).join(', ')}
            onChange={e => set(k, e.target.value.split(',').map(x => x.trim()).filter(Boolean))}
            placeholder="Comma separated values"
          />
        )}
      </label>
    );
    if (kind === 'tag-input') return (
      <div key={k} className="md:col-span-2 lg:col-span-2">
        <span className="form-label">{l}</span>
        <div className="flex gap-2">
          <input className="form-input" value={drafts[k] || ''} placeholder="Enter item name" onChange={(event) => setDrafts((current) => ({ ...current, [k]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const value = (drafts[k] || '').trim(); if (value && !(form[k] || []).includes(value)) { set(k, [...(form[k] || []), value]); setDrafts((current) => ({ ...current, [k]: '' })); } } }} />
          <button type="button" className="btn-secondary px-3" onClick={() => { const value = (drafts[k] || '').trim(); if (value && !(form[k] || []).includes(value)) { set(k, [...(form[k] || []), value]); setDrafts((current) => ({ ...current, [k]: '' })); } }} title="Add item"><Plus className="w-3.5 h-3.5 mr-1" /></button>
        </div>
        {(form[k] || []).length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{form[k].map((value) => <span key={value} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-xs">{value}<button type="button" onClick={() => set(k, form[k].filter((item) => item !== value))}><X className="w-3 h-3" /></button></span>)}</div>}
      </div>
    );
    if (kind === 'image-files') return (
      <div key={k} className="md:col-span-2 lg:col-span-2">
        <span className="form-label">{l}</span>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
          {form.images?.length > 0 && imageFiles.length === 0 && (
             <div className="flex flex-wrap gap-2 mb-3">
               {form.images.map(image => (
                 <a key={image.key || image.url} href={image.url} target="_blank" rel="noreferrer" className="relative block h-12 w-12 rounded border border-slate-200 overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all">
                   <img src={image.url} alt="Gallery" className="w-full h-full object-cover" />
                 </a>
               ))}
             </div>
          )}
          <input type="file" accept="image/*" multiple onChange={(event) => setImageFiles(Array.from(event.target.files || []))} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100" />
          <p className="text-xs text-slate-500 mt-2">{imageFiles.length ? `${imageFiles.length} new image${imageFiles.length > 1 ? 's' : ''} will be added to the gallery.` : `${form.images?.length || 0} saved image${(form.images?.length || 0) === 1 ? '' : 's'} in the gallery.`}</p>
        </div>
      </div>
    );
    if (kind === 'restaurant-image') return (
      <label key={k} className="md:col-span-2">
        <span className="form-label">{l}</span>
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-2.5">
          {form.image?.url && !restaurantImageFile && <img src={form.image.url} alt="Restaurant" className="h-14 w-20 rounded-lg border border-slate-200 object-cover" />}
          {restaurantImageFile && <img src={URL.createObjectURL(restaurantImageFile)} alt="Restaurant upload preview" className="h-14 w-20 rounded-lg border border-slate-200 object-cover" />}
          <div className="min-w-0 flex-1">
            <input type="file" accept="image/*" onChange={(event) => setRestaurantImageFile(event.target.files?.[0] || null)} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100" />
            <p className="mt-1 text-xs text-slate-500">{restaurantImageFile ? 'New image will replace the current restaurant card image.' : form.image?.url ? 'Current restaurant image. Choose a file to replace it.' : 'Upload the image to show on the restaurant card.'}</p>
          </div>
        </div>
      </label>
    );
    if (kind === 'age-slabs') return (
      <div key={k} className="md:col-span-2 lg:col-span-2">
        <span className="form-label">{l}</span>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input type="number" min="0" className="form-input" placeholder="Min age" value={drafts.minAge || ''} onChange={(event) => setDrafts((current) => ({ ...current, minAge: event.target.value }))} />
          <input type="number" min="0" className="form-input" placeholder="Max age" value={drafts.maxAge || ''} onChange={(event) => setDrafts((current) => ({ ...current, maxAge: event.target.value }))} />
          <button type="button" className="btn-secondary px-3" onClick={() => { const minAge = Number(drafts.minAge); const maxAge = Number(drafts.maxAge); if (drafts.minAge === '' || drafts.maxAge === '' || minAge > maxAge) return toast.error('Enter a valid minimum and maximum age.'); set(k, [...(form[k] || []), { minAge, maxAge }]); setDrafts((current) => ({ ...current, minAge: '', maxAge: '' })); }}><Plus className="w-3.5 h-3.5 mr-1" /></button>
        </div>
        {(form[k] || []).length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{form[k].map((slab, index) => <span key={`${slab.minAge}-${slab.maxAge}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 px-2 py-1 text-xs">{slab.minAge}–{slab.maxAge} years<button type="button" onClick={() => set(k, form[k].filter((_, itemIndex) => itemIndex !== index))}><X className="w-3 h-3" /></button></span>)}</div>}
      </div>
    );
    if (kind === 'hotels') return (
      <label key={k} className="md:col-span-2">
        <span className="form-label">{l}</span>
        <SearchableSelect
          isMulti
          options={hotels.filter((hotel) => hotel.status !== 'Inactive').map((hotel) => ({ value: hotel.name, label: `${hotel.name}${hotel.destination ? ` · ${hotel.destination}` : ''}` }))}
          value={form[k] || []}
          onChange={(value) => set(k, value)}
          placeholder="Search Hotel Master and select nearby hotels"
        />
        <span className="mt-1 block text-xs text-slate-400">Only active hotels from Hotel Master are suggested.</span>
      </label>
    );
    if (kind === 'restaurant-supplier' && form.supplierOwn) return null;
    if (kind === 'meal-preference') return (
      <label key={k}>
        <span className="form-label">{l}</span>
        <SearchableSelect
          options={mealPlans}
          value={form[k] || ''}
          onChange={(value) => set(k, value)}
          placeholder="Select Meal Preference"
        />
        <span className="mt-1 block text-xs text-slate-400">Options are loaded from Meal Plan Master.</span>
      </label>
    );
    if (kind === 'restaurant-type') return (
      <label key={k}>
        <span className="form-label">{l}</span>
        <SearchableSelect
          options={restaurantTypes.filter((restaurantType) => restaurantType.status === 'Active').map((restaurantType) => restaurantType.name)}
          value={form[k] || ''}
          onChange={(value) => set(k, value)}
          placeholder="Select Restaurant Type"
        />
        <span className="mt-1 block text-xs text-slate-400">Options are loaded from Restaurant Type Master.</span>
      </label>
    );
    if (kind === 'restaurant-supplier') return (
      <label key={k} className="md:col-span-2">
        <span className="form-label">{l}</span>
        <SearchableSelect
          isCreatable
          options={suppliers.filter((supplier) => supplier.status !== 'Inactive' && (Array.isArray(supplier.type) ? supplier.type : [supplier.type]).some((supplierType) => /restaurant/i.test(String(supplierType || ''))))}
          value={form[k] || ''}
          onChange={(value) => set(k, value)}
          placeholder="Select Restaurant supplier or create a new one"
        />
        <span className="mt-1 block text-xs text-slate-400">A new supplier is saved in Supplier Master with Thailand and THB as defaults.</span>
      </label>
    );
    if (kind === 'destination') return (
      <label key={k}>
        <span className="form-label">{l}</span>
        <SearchableSelect
          options={opts || destinations}
          value={form[k] || ''}
          onChange={(value) => setForm((current) => {
            const currentLocation = locations.find((location) => String(location.name || location.id) === String(current.location));
            const locationDestination = typeof currentLocation?.destination === 'object' ? currentLocation.destination?.name || currentLocation.destination?.id : currentLocation?.destination;
            return { ...current, destination: value, location: locationDestination && String(locationDestination).toLowerCase() !== String(value).toLowerCase() ? '' : current.location };
          })}
        />
      </label>
    );
    if (kind === 'location') {
      const availableLocations = locations.filter((location) => {
        const locationDestination = typeof location.destination === 'object' ? location.destination?.name || location.destination?.id : location.destination;
        return location.status !== 'Inactive' && String(locationDestination || '').toLowerCase() === String(form.destination || '').toLowerCase();
      });
      return (
        <label key={k}>
          <span className="form-label">{l}</span>
          <SearchableSelect options={availableLocations} value={form[k] || ''} onChange={v => set(k, v)} isDisabled={!form.destination} placeholder={form.destination ? 'Select location for destination' : 'Select destination first'} />
        </label>
      );
    }
    if (kind === 'select') return (
      <label key={k}>
        <span className="form-label">{l}</span>
        <SearchableSelect options={opts || []} value={form[k] || ''} onChange={v => set(k, v)} />
      </label>
    );
    return (
      <label key={k}>
        <span className="form-label">{l}</span>
        <input type={kind} className="form-input" value={form[k] || ''}
          onChange={e => set(k, kind === 'number' ? Number(e.target.value) : e.target.value)} />
      </label>
    );
  };

  const filtered = items.filter(x =>
    JSON.stringify(x).toLowerCase().includes(search.toLowerCase()) && (!expiredOnly || expiredIds.has(x.id))
  );

  return (
    <div className="p-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => navigate("/masters")} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0 mt-0.5" title="Go Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">{meta.title}</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">{loading ? 'Loading records…' : `${items.length} ${items.length === 1 ? meta.title.toLowerCase() : `${meta.title.toLowerCase()}s`}`} · {meta.hint}</p>
          </div>
        </div>
        <div className="flex-1 max-w-xl mx-0 md:mx-8">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all" placeholder={`Search ${meta.title.toLowerCase()}s...`} />
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
          {type === 'restaurants' && <button type="button" onClick={() => setExpiredOnly((value) => !value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${expiredOnly ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>{expiredIds.size} expired {expiredIds.size === 1 ? 'rate' : 'rates'}</button>}
          <button onClick={() => open()} className="btn-primary text-xs h-8 px-3"><Plus className="w-3.5 h-3.5 mr-1" /> Add {meta.title}</button>
        </div>
      </div>

      {/* Table / Grid */}
      <div className={`${viewMode === 'table' ? 'card overflow-hidden' : ''}`}>
        {loading ? <PageLoader label={`Loading ${meta.title.toLowerCase()} records…`} /> : <>
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {meta.cols.map(([, l]) => (
                  <th key={l} className="table-header">{l}</th>
                ))}
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((x, i) => (
                <tr key={x.id} className={`table-row hover:bg-primary-50/30 ${i % 2 === 1 ? 'bg-slate-50/40' : ''} cursor-pointer`} onClick={() => open(x)}>
                  {meta.cols.map(([k], idx) => (
                    <td key={k} className="table-cell">
                      {idx === 0 ? (
                        <div className="flex items-center gap-2">
                          {(type === 'sightseeing' || type === 'restaurants') && (x.image?.url || x.images?.[0]?.url) ? <img src={x.image?.url || x.images[0].url} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200" /> : <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0"><TypeIcon type={type} /></div>}
                          <span className="font-medium text-slate-900">{x[k] || '—'}{type === 'restaurants' && expiredIds.has(x.id) && <span className="ml-2 badge badge-red">Expired rate</span>}</span>
                        </div>
                      ) : Array.isArray(x[k]) ? (
                        <span className="text-slate-500">{x[k].join(', ') || '—'}</span>
                      ) : (
                        <span className="text-slate-500">{x[k] || '—'}</span>
                      )}
                    </td>
                  ))}
                  <td className="table-cell">
                    <span className={x.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>
                      {x.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-1">
                      {(type === 'sightseeing' || type === 'restaurants') && <button onClick={(e) => { e.stopPropagation(); navigate(type === 'sightseeing' ? `/masters/sightseeing/${x.id}/prices` : `/masters/restaurants/${x.id}/prices`); }} className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" title="Manage prices"><ReceiptText className="w-3.5 h-3.5" /></button>}
                      <button
                        onClick={(e) => { e.stopPropagation(); open(x); }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(x.id); }}
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
            {filtered.map((item, i) => {
              const imageObj = item.image || item.images?.[0] || item.activityImages?.[0];
              const imageUrl = imageObj?.url;
              return (
                <div key={item.id} onClick={() => open(item)} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col">
                  <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name || meta.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="text-4xl opacity-40 group-hover:scale-110 transition-transform duration-500"><TypeIcon type={type} /></div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md shadow-sm ${item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.status}</span>
                    </div>
                    {type === 'restaurants' && expiredIds.has(item.id) && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-500 text-white px-2 py-0.5 text-[10px] font-bold rounded-md shadow-sm">Expired rate</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0 text-xs">
                        <TypeIcon type={type} />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm truncate" title={item.name || item[meta.cols[0][0]]}>{item.name || item[meta.cols[0][0]] || '—'}</h3>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1.5 mb-3 flex-1">
                      {meta.cols.slice(1).slice(0, 3).map(([key, label]) => {
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
                      <div className="flex items-center justify-end gap-1 ml-auto">
                        {(type === 'sightseeing' || type === 'restaurants') && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(type === 'sightseeing' ? `/masters/sightseeing/${item.id}/prices` : `/masters/restaurants/${item.id}/prices`); }} className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" title="Manage prices">
                            <ReceiptText className="w-3.5 h-3.5" />
                          </button>
                        )}
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
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl">
              <TypeIcon type={type} />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search
                ? `No ${meta.title.toLowerCase()}s match "${search}"`
                : `No ${meta.title.toLowerCase()}s added yet`}
            </p>
            {!search && (
              <button onClick={() => open()} className="btn-primary mt-4 mx-auto">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add first {meta.title}
              </button>
            )}
          </div>
        )}</>}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={close}
        title={`${edit?.id ? 'Edit' : 'Add'} ${meta.title}`}
        size={meta.fields.length >= 4 ? 'lg' : 'md'}
        footer={
          <>
            <button className="btn-secondary py-1 text-sm" onClick={close}>Cancel</button>
            <button className="btn-primary py-1 text-sm flex-shrink-0" onClick={save}>Save {meta.title}</button>
          </>
        }
      >
        <div className="bg-white -mx-6 -my-4 p-4">
          <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1 h-3 rounded-full bg-blue-500"></span>
            {meta.title} Details
          </h3>
          <div className={`grid gap-3 grid-cols-1 md:grid-cols-2 ${meta.fields.length >= 6 ? 'lg:grid-cols-4' : meta.fields.length >= 4 ? 'lg:grid-cols-3' : meta.fields.length === 1 ? 'lg:grid-cols-3' : ''}`}>
            <div className="col-span-full md:col-span-1">
              <label>
                <span className="form-label text-[10px]">Name *</span>
                <input className="form-input text-xs py-1.5" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder={`Enter ${meta.title.toLowerCase()} name`} />
              </label>
            </div>
            {meta.fields.map(renderField)}
            {type === 'restaurants' && <>
              <div className="col-span-full lg:col-span-1 flex items-end">
                <label className="flex w-full h-8 items-center justify-center gap-2 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={Boolean(form.supplierOwn)}
                    onChange={(event) => setForm((current) => ({ ...current, supplierOwn: event.target.checked, supplier: event.target.checked ? '' : current.supplier }))}
                    className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] font-medium text-slate-700">Supplier Own</span>
                </label>
              </div>
              {form.supplierOwn && <div className="col-span-full rounded-xl border border-slate-200 bg-slate-100 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Supplier bank details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SUPPLIER_BANK_FIELDS.map(([key, label]) => <label key={key}>
                    <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">{label}</span>
                    <input value={form.supplierBankDetails?.[key] || ''} onChange={(event) => setSupplierBankDetail(key, event.target.value)} className="form-input py-1.5 text-xs" />
                  </label>)}
                </div>
              </div>}
            </>}
            <div className="col-span-full md:col-span-1">
              <label>
                <span className="form-label text-[10px]">Status</span>
                <SearchableSelect options={['Active', 'Inactive']} value={form.status} onChange={v => set('status', v)} />
              </label>
            </div>
          </div>
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
