import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Eye, Hotel, Mail, MoreVertical, Phone, Plus, ReceiptText, Search, Trash2, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../../context/AppContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchableSelect from '../../components/ui/SearchableSelect';
import RichTextEditor from '../../components/ui/RichTextEditor';
import useLocations from '../../hooks/useLocations';
import useSalesMaster from '../../hooks/useSalesMaster';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import { apiClient } from '../../lib/api';
import { todayIsoInTimeZone } from '../../lib/date';

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const blank = {
  name: '', country: 'Thailand', state: '', city: '', destination: '', location: '',
  contactPerson: '', phone: '', mobile: '', email: '', status: 'Active',
  childAgeAbove: 1, infantAgeBelow: 1, groupRoomLimit: '', totalRooms: 0, category: '',
  roomTypes: [], mealPlans: [], weekends: [], amenities: [],
  address: '', importantNotes: '', details: '', supplierOwn: false, supplierBankDetails: { accountName: '', accountNumber: '', bankName: '', branch: '', ifscCode: '', swiftCode: '' }, contacts: [],
};

// ─── Hotel Card ────────────────────────────────────────────────────────────────
function HotelCard({ hotel, expiredRate, openMenuId, setOpenMenuId, onView, onEdit, onDelete, onRates }) {
  const topAmenities = Array.isArray(hotel.amenities) ? hotel.amenities.slice(0, 3) : [];
  const extraAmenities = (hotel.amenities?.length || 0) - topAmenities.length;

  return (
    <div onClick={() => onView(hotel)} className={`bg-white border border-slate-300 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group flex flex-col cursor-pointer ${openMenuId === hotel.id ? 'relative z-50' : 'hover:-translate-y-1 overflow-visible'}`}>
      <div className="p-5">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
              {hotel.hotelImage?.url
                ? <img src={hotel.hotelImage.url} alt={hotel.name} className="h-full w-full object-cover" />
                : (hotel.name?.charAt(0).toUpperCase() || 'H')}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{hotel.name}{expiredRate && <span className="ml-2 badge badge-red">Expired rate</span>}</div>
              <div className="text-xs text-slate-500 truncate">
                {[hotel.location, hotel.destination, hotel.country].filter(Boolean).join(', ') || 'Location not set'}
              </div>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <StatusBadge status={hotel.status} size="xs" />
            <div className={`relative ${openMenuId === hotel.id ? 'z-50' : ''}`}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === hotel.id ? null : hotel.id); }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {openMenuId === hotel.id && (
                <div onMouseDown={(event) => event.stopPropagation()} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1 z-50 fade-in">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onView(hotel); setOpenMenuId(null); }} className="menu-action">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(hotel); setOpenMenuId(null); }} className="menu-action">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onRates(hotel); setOpenMenuId(null); }} className="menu-action">
                    <ReceiptText className="w-3.5 h-3.5" /> Manage rates
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(hotel.id); setOpenMenuId(null); }} className="menu-action text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Meta */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3">
          <div className="flex gap-1">
            <span className="text-slate-400">Category:</span>
            <span className="font-medium text-slate-700">{hotel.category || '—'}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-slate-400">Room types:</span>
            <span className="font-medium text-slate-700">{hotel.roomTypes?.length || 0}</span>
          </div>
          <div className="flex items-center gap-1 truncate">
            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="font-medium text-slate-600 truncate">{hotel.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-1 truncate">
            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="font-medium text-slate-600 truncate">{hotel.phone || hotel.mobile || 'No phone'}</span>
          </div>
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1 min-h-6 border-t border-slate-100 pt-3">
          {topAmenities.length > 0
            ? topAmenities.map(a => <span key={a} className="badge badge-gray">{a}</span>)
            : <span className="text-xs text-slate-400">No amenities selected</span>}
          {extraAmenities > 0 && <span className="badge badge-gray">+{extraAmenities}</span>}
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRates(hotel); }} className="mt-3 w-full flex items-center justify-center gap-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg px-3 py-2 text-xs font-medium transition-colors">
          <ReceiptText className="w-3.5 h-3.5" /> Manage Hotel Rates
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HotelMaster() {
  const navigate = useNavigate();
  const { hotels, addHotel, updateHotel, deleteHotel } = useApp();

  const [search, setSearch] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('hotel-view') || 'cards');

  React.useEffect(() => { localStorage.setItem('hotel-view', viewMode); }, [viewMode]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [form, setForm] = useState(blank);
  const [attachments, setAttachments] = useState({ hotelImage: null, hotelContract: null });
  const [contact, setContact] = useState({ name: '', designation: '', email: '', phone: '' });
  const [expiredHotelIds, setExpiredHotelIds] = useState(new Set());
  const [expiredOnly, setExpiredOnly] = useState(false);

  const categories = useSalesMaster('hotel-categories');
  const roomTypes = useSalesMaster('room-types');
  const mealPlans = useSalesMaster('meal-plans');
  const amenities = useSalesMaster('amenities');
  const destinations = useOperationsMaster('destinations');
  const locations = useOperationsMaster('locations');
  const { countries, states, cities } = useLocations(form.country, form.state);
  const locationOptions = React.useMemo(
    () => locations.filter((location) => location.destination === form.destination),
    [locations, form.destination],
  );

  React.useEffect(() => {
    let active = true;
    apiClient.get('/hotel-rates').then((response) => {
      if (!active) return;
      const today = todayIsoInTimeZone();
      setExpiredHotelIds(new Set((response.data || []).filter((rate) => {
        const periods = rate.validityPeriods || [];
        return periods.length > 0 && periods.every((period) => period.toDate && period.toDate < today);
      }).map((rate) => rate.hotelId)));
    }).catch(() => active && setExpiredHotelIds(new Set()));
    return () => { active = false; };
  }, []);

  const set = (key, value) => setForm(cur => ({ ...cur, [key]: value }));
  const setSupplierBankDetail = (key, value) => setForm((current) => ({ ...current, supplierBankDetails: { ...blank.supplierBankDetails, ...(current.supplierBankDetails || {}), [key]: value } }));

  const open = (hotel = null) => {
    setEditing(hotel || {});
    setForm(hotel
      ? { ...blank, ...hotel, supplierBankDetails: { ...blank.supplierBankDetails, ...(hotel.supplierBankDetails || {}) }, roomTypes: hotel.roomTypes || [], mealPlans: hotel.mealPlans || [], weekends: hotel.weekends || [], amenities: hotel.amenities || [], contacts: hotel.contacts || [] }
      : blank
    );
    setAttachments({ hotelImage: null, hotelContract: null });
    setContact({ name: '', designation: '', email: '', phone: '' });
  };

  const close = () => setEditing(null);

  const save = async () => {
    if (!form.name.trim() || !form.destination) return toast.error('Hotel name and destination are required.');
    try {
      const files = new FormData();
      if (attachments.hotelImage) files.append('hotelImage', attachments.hotelImage);
      if (attachments.hotelContract) files.append('hotelContract', attachments.hotelContract);
      const uploaded = (attachments.hotelImage || attachments.hotelContract)
        ? Object.fromEntries((await apiClient.upload('/uploads?folder=hotels', files)).data.map(f => [f.field, f]))
        : {};
      const payload = { ...form, ...uploaded, stars: parseInt(form.category, 10) || 0 };
      if (editing?.id) await updateHotel(editing.id, payload);
      else await addHotel(payload);
      close();
      toast.success('Hotel saved.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addContact = () => {
    if (!contact.name || !contact.email) return toast.error('Contact name and email are required.');
    set('contacts', [...form.contacts, { ...contact, id: crypto.randomUUID() }]);
    setContact({ name: '', designation: '', email: '', phone: '' });
  };

  const filtered = hotels.filter(h =>
    `${h.name} ${h.destination} ${h.country} ${h.email}`.toLowerCase().includes(search.toLowerCase()) &&
    (!destinationFilter || h.destination === destinationFilter) &&
    (!expiredOnly || expiredHotelIds.has(h.id))
  );

  const renderField = (label, field, type = 'text') => (
    <label>
      <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">{label}</span>
      <input type={type} value={form[field] || ''} onChange={e => set(field, type === 'number' ? Number(e.target.value) : e.target.value)} className="form-input-compact" />
    </label>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate("/masters")}
            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0 mt-0.5"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Hotel Master</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
              {hotels.length} {hotels.length === 1 ? 'hotel' : 'hotels'} · Hotel database, rates and configurations
            </p>
          </div>
        </div>

        {/* Middle Search & Filters */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 xl:mx-8">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-sm transition-all h-8 transition-all"
              placeholder="Search hotels by name, destination, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-48">
            <SearchableSelect value={destinationFilter} onChange={setDestinationFilter} options={destinations} placeholder="All destinations" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md flex items-center justify-center transition-all ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('rows')}
              className={`p-1.5 rounded-md flex items-center justify-center transition-all ${viewMode === 'rows' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button type="button" onClick={() => setExpiredOnly((value) => !value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${expiredOnly ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>{expiredHotelIds.size} expired {expiredHotelIds.size === 1 ? 'rate' : 'rates'}</button>
          <button type="button" onClick={() => open()} className="btn-primary text-xs h-8 px-3">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Hotel
          </button>
        </div>
      </div>

      {/* Hotel Content */}
      {filtered.length > 0 ? (
        <>
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(hotel => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  expiredRate={expiredHotelIds.has(hotel.id)}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onView={setViewing}
                  onEdit={open}
                  onDelete={setDeleting}
                  onRates={(hotel) => navigate(`/masters/hotels/${encodeURIComponent(hotel.id)}/rates`)}
                />
              ))}
            </div>
          )}

          {viewMode === 'rows' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-4 py-3">Hotel</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Rooms / Amenities</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 text-right">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((hotel) => {
                    const topAmenities = Array.isArray(hotel.amenities) ? hotel.amenities.slice(0, 2) : [];
                    const extraAmenities = (hotel.amenities?.length || 0) - topAmenities.length;

                    return (
                      <tr key={hotel.id} onClick={() => setViewing(hotel)} className="hover:bg-slate-50 group transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 flex-shrink-0 overflow-hidden rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                              {hotel.hotelImage?.url
                                ? <img src={hotel.hotelImage.url} alt={hotel.name} className="h-full w-full object-cover" />
                                : (hotel.name?.charAt(0).toUpperCase() || 'H')}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 text-xs truncate">{hotel.name}{expiredHotelIds.has(hotel.id) && <span className="ml-2 badge badge-red">Expired rate</span>}</div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {[hotel.location, hotel.destination, hotel.country].filter(Boolean).join(', ') || 'Location not set'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                          {hotel.category || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-600 mb-1">{hotel.roomTypes?.length || 0} Room Types</div>
                          <div className="flex flex-wrap gap-1">
                            {topAmenities.map(a => <span key={a} className="badge badge-gray text-[9px] py-px px-1.5">{a}</span>)}
                            {extraAmenities > 0 && <span className="badge badge-gray text-[9px] py-px px-1.5">+{extraAmenities}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-0.5 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{hotel.email || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate max-w-[180px]">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{hotel.phone || hotel.mobile || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <StatusBadge status={hotel.status} size="xs" />
                            <div className={`relative ${openMenuId === hotel.id ? 'z-50' : ''}`}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === hotel.id ? null : hotel.id); }}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              {openMenuId === hotel.id && (
                                <div onMouseDown={(event) => event.stopPropagation()} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1 z-50 fade-in text-left">
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setViewing(hotel); setOpenMenuId(null); }} className="menu-action w-full">
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); open(hotel); setOpenMenuId(null); }} className="menu-action w-full">
                                    <Edit className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/masters/hotels/${encodeURIComponent(hotel.id)}/rates`); setOpenMenuId(null); }} className="menu-action w-full">
                                    <ReceiptText className="w-3.5 h-3.5" /> Manage rates
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setDeleting(hotel.id); setOpenMenuId(null); }} className="menu-action text-red-600 hover:bg-red-50 w-full">
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="card p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Hotel className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {search || destinationFilter ? 'No hotels match the selected filters.' : 'No hotels registered yet.'}
          </p>
          {!search && !destinationFilter && (
            <button type="button" onClick={() => open()} className="btn-primary mt-4 mx-auto">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add first hotel
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={!!editing}
        onClose={close}
        title={editing?.id ? 'Edit Hotel' : 'Add Hotel'}
        size="2xl"
        footer={
          <>
            <button onClick={close} className="btn-secondary py-1 text-sm">Cancel</button>
            <button onClick={save} className="btn-primary py-1 text-sm">Save Hotel</button>
          </>
        }
      >
        <div className="bg-white divide-y divide-slate-100 -mx-6 -my-4">

          {/* Hotel Details - Combined Basic & Location & Contact */}
          <div className="bg-slate-50/50 px-4 py-3">
            <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-3">Hotel Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                {renderField('Hotel Name *', 'name')}
              </div>
              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Category</span>
                <SearchableSelect compact value={form.category} onChange={v => set('category', v)} options={categories} />
              </label>
              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Status</span>
                <SearchableSelect compact value={form.status} onChange={v => set('status', v)} options={['Active', 'Inactive']} />
              </label>
              
              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Country</span>
                <SearchableSelect compact value={form.country} onChange={v => { set('country', v); set('state', ''); set('city', ''); }} options={countries.map(x => x.name)} placeholder="Country" />
              </label>
              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">State</span>
                <SearchableSelect compact value={form.state} onChange={v => { set('state', v); set('city', ''); }} options={states} isDisabled={!form.country} placeholder="State" />
              </label>
              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">City</span>
                <SearchableSelect compact value={form.city} onChange={v => set('city', v)} options={cities} isDisabled={!form.state} placeholder="City" />
              </label>
              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Destination *</span>
                <SearchableSelect compact value={form.destination} onChange={v => setForm(current => ({ ...current, destination: v, location: '' }))} options={destinations} placeholder="Destination" />
              </label>

              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Location</span>
                <SearchableSelect compact value={form.location} onChange={v => set('location', v)} options={locationOptions} isDisabled={!form.destination} placeholder={form.destination ? `Select ${form.destination} location` : 'Select destination first'} />
              </label>
              <label className="md:col-span-3">
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Address</span>
                <input className="form-input-compact" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full street address..." />
              </label>

              {renderField('Contact Person', 'contactPerson')}
              {renderField('Reservation Email', 'email', 'email')}
              {renderField('TEL No.', 'phone')}
              {renderField('Mobile No.', 'mobile')}
            </div>
          </div>

          {/* Features & Policies */}
          <div className="px-4 py-3">
            <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-3">Features & Policies</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="md:col-span-2">
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Room Types</span>
                <SearchableSelect compact isMulti value={form.roomTypes} onChange={v => set('roomTypes', v)} options={roomTypes} placeholder="Rooms" />
              </label>
              <label className="md:col-span-2">
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Amenities</span>
                <SearchableSelect compact isMulti value={form.amenities} onChange={v => set('amenities', v)} options={amenities} placeholder="Amenities" />
              </label>
              
              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Meal Plans</span>
                <SearchableSelect compact isMulti value={form.mealPlans} onChange={v => set('mealPlans', v)} options={mealPlans} placeholder="Meals" />
              </label>
              <label>
                <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Weekends</span>
                <SearchableSelect compact isMulti value={form.weekends} onChange={(values) => set('weekends', values.includes('All') ? weekDays : values)} options={['All', ...weekDays]} placeholder="Select weekends or All" />
              </label>
              {renderField('Total Rooms', 'totalRooms', 'number')}
              <label>
                <span className="form-label text-[10px] capitalize tracking-wider text-slate-500 mb-0.5 block">Group Limit</span>
                <SearchableSelect compact isCreatable value={form.groupRoomLimit} onChange={v => set('groupRoomLimit', v)} options={['0', ...Array.from({ length: 20 }, (_, index) => String(index + 1))]} placeholder="Select or type group limit" />
              </label>

              {renderField('Child Age Above', 'childAgeAbove', 'number')}
              {renderField('Infant Age Below', 'infantAgeBelow', 'number')}
              <div className="flex items-end pb-0.5 md:col-span-2">
                <label className="flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 px-3 h-8 rounded-xl transition-colors w-full border border-slate-200 bg-white">
                  <input type="checkbox" checked={form.supplierOwn} onChange={e => set('supplierOwn', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" />
                  <span className="text-slate-700 font-medium text-[11px]">Supplier Own</span>
                </label>
              </div>
            </div>
            {form.supplierOwn && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-100 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Supplier bank details</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    ['accountName', 'Account Name'], ['accountNumber', 'Account Number'], ['bankName', 'Bank Name'], ['branch', 'Branch'],
                    ['ifscCode', 'IFSC Code'], ['swiftCode', 'Swift Code'],
                  ].map(([key, label]) => <label key={key}><span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">{label}</span><input value={form.supplierBankDetails?.[key] || ''} onChange={(event) => setSupplierBankDetail(key, event.target.value)} className="form-input-compact" /></label>)}
                </div>
              </div>
            )}
          </div>

          {/* Side by side: Notes & Attachments + Contacts */}
          <div className="bg-slate-50/50 px-4 py-3">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Left: Notes & Attachments */}
               <div>
                 <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-3">Notes & Attachments</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 block">Hotel Image</span>
                      {(() => {
                        const existingUrl = typeof form.hotelImage === 'string' ? form.hotelImage : form.hotelImage?.url;
                        return existingUrl && !attachments.hotelImage && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <img src={existingUrl} alt="Current" className="w-6 h-6 object-cover rounded border border-slate-200" />
                            <a href={existingUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate">View current image</a>
                          </div>
                        )
                      })()}
                      <input className={`form-input p-0.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold cursor-pointer transition-colors ${attachments.hotelImage || form.hotelImage ? 'file:bg-green-100 file:text-green-700 hover:file:bg-green-200 bg-green-50/50 border-green-200' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`} type="file" accept="image/*" onChange={e => setAttachments(v => ({ ...v, hotelImage: e.target.files?.[0] || null }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 block">Hotel Contract</span>
                      {form.hotelContract?.url && !attachments.hotelContract && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <a href={form.hotelContract.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate">View current contract</a>
                        </div>
                      )}
                      <input className={`form-input p-0.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold cursor-pointer transition-colors ${attachments.hotelContract || form.hotelContract ? 'file:bg-green-100 file:text-green-700 hover:file:bg-green-200 bg-green-50/50 border-green-200' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`} type="file" accept="image/*,application/pdf" onChange={e => setAttachments(v => ({ ...v, hotelContract: e.target.files?.[0] || null }))} />
                    </div>
                    <label className="col-span-2">
                      <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Important Notes</span>
                      <input className="form-input-compact" value={form.importantNotes} onChange={e => set('importantNotes', e.target.value)} />
                    </label>
                    <label className="col-span-2">
                      <span className="form-label text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 block">Details <small className="normal-case font-normal">(PDF-ready rich text)</small></span>
                      <RichTextEditor value={form.details || ''} onChange={(value) => set('details', value)} />
                    </label>
                 </div>
               </div>

               {/* Right: Additional Contacts */}
               <div>
                  <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-3">
                    Additional Contacts
                    {form.contacts.length > 0 && <span className="ml-2 badge badge-blue text-[10px] py-0">{form.contacts.length}</span>}
                  </h3>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-1.5 mb-1.5">
                      <input className="form-input-compact text-[11px] bg-white" placeholder="Name" value={contact.name} onChange={e => setContact(v => ({ ...v, name: e.target.value }))} />
                      <input className="form-input-compact text-[11px] bg-white" placeholder="Designation" value={contact.designation} onChange={e => setContact(v => ({ ...v, designation: e.target.value }))} />
                      <input className="form-input-compact text-[11px] bg-white" placeholder="Email" value={contact.email} onChange={e => setContact(v => ({ ...v, email: e.target.value }))} />
                      <input className="form-input-compact text-[11px] bg-white" placeholder="Phone" value={contact.phone} onChange={e => setContact(v => ({ ...v, phone: e.target.value }))} />
                      <button type="button" onClick={addContact} className="btn-primary justify-center text-[11px] py-1 h-7 col-span-2">Add Contact</button>
                    </div>
                    {form.contacts.length > 0 && (
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden mt-2 max-h-[120px] overflow-y-auto">
                        {form.contacts.map(c => (
                          <div key={c.id} className="flex items-center justify-between px-3 py-2 text-[11px] bg-white">
                            <span className="text-slate-700">{c.name} <span className="text-slate-400 mx-1">·</span> <span className="text-slate-500">{c.designation}</span> <span className="text-slate-400 mx-1">·</span> {c.email} <span className="text-slate-400 mx-1">·</span> {c.phone}</span>
                            <button type="button" onClick={() => set('contacts', form.contacts.filter(x => x.id !== c.id))} className="text-red-500 hover:text-red-700 font-medium ml-3 text-[10px]">Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
             </div>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      {/* View Modal */}
      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name || 'Hotel Details'}
        size="2xl"
        footer={
          <>
            <button onClick={() => setViewing(null)} className="btn-secondary py-1 text-sm">Close</button>
            <button onClick={() => { const h = viewing; setViewing(null); open(h); }} className="btn-primary py-1 text-sm">
              <Edit className="w-4 h-4" /> Edit Hotel
            </button>
          </>
        }
      >
        {viewing && (
          <div className="text-[11px] bg-white divide-y divide-slate-100 -mx-6 -my-4">
            {/* Header Block */}
            <div className="flex items-center gap-3 bg-slate-50/80 px-4 py-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-purple-100 flex items-center justify-center text-purple-700 text-lg font-bold flex-shrink-0 shadow-sm border border-purple-200">
                {viewing.hotelImage?.url
                  ? <img src={viewing.hotelImage.url} alt={viewing.name} className="w-full h-full object-cover" />
                  : viewing.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 leading-tight">{viewing.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{[viewing.location, viewing.city, viewing.country].filter(Boolean).join(', ')}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={viewing.status} size="xs" />
                  {viewing.category && <span className="badge badge-yellow py-0 px-1.5 text-[9px]">{viewing.category}</span>}
                  {viewing.supplierOwn && <span className="badge badge-purple py-0 px-1.5 text-[9px]">Supplier Own</span>}
                </div>
              </div>
            </div>

            {/* Core Details */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Destination</div><div className="font-medium text-slate-800">{viewing.destination || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Country / State / City</div><div className="font-medium text-slate-800">{[viewing.country, viewing.state, viewing.city].filter(Boolean).join(', ') || '—'}</div></div>
                <div className="md:col-span-2"><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Address</div><div className="font-medium text-slate-800" title={viewing.address}>{viewing.address || '—'}</div></div>

                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Contact Person</div><div className="font-medium text-slate-800">{viewing.contactPerson || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Email</div><div className="font-medium text-slate-800">{viewing.email || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Mobile</div><div className="font-medium text-slate-800">{viewing.mobile || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Phone</div><div className="font-medium text-slate-800">{viewing.phone || '—'}</div></div>
              </div>
            </div>

            {/* Features */}
            <div className="px-4 py-3 bg-slate-50/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Room Types</div><div className="font-medium text-slate-800">{viewing.roomTypes?.join(', ') || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Meal Plans</div><div className="font-medium text-slate-800">{viewing.mealPlans?.join(', ') || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Amenities</div><div className="font-medium text-slate-800" title={viewing.amenities?.join(', ')}>{viewing.amenities?.join(', ') || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Weekends</div><div className="font-medium text-slate-800">{viewing.weekends?.join(', ') || '—'}</div></div>

                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Child Age</div><div className="font-medium text-slate-800">&gt; {viewing.childAgeAbove || 0}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Infant Age</div><div className="font-medium text-slate-800">&lt; {viewing.infantAgeBelow || 0}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Group Limit</div><div className="font-medium text-slate-800">{viewing.groupRoomLimit || 'None'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Total Rooms</div><div className="font-medium text-slate-800">{viewing.totalRooms ?? 0}</div></div>
              </div>
            </div>

            {/* Notes */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Important Notes</div><div className="font-medium text-slate-800">{viewing.importantNotes || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Details</div>{viewing.details ? <div className="font-medium text-slate-800 rich-text-content" dangerouslySetInnerHTML={{ __html: viewing.details }} /> : <div className="font-medium text-slate-800">—</div>}</div>
              </div>
            </div>

            {(viewing.hotelImage?.url || viewing.hotelContract?.url) && (
              <div className="px-4 py-3 bg-slate-50/50">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-2">Attachments</div>
                <div className="flex flex-wrap gap-2">
                  {viewing.hotelImage?.url && (
                    <a href={viewing.hotelImage.url} target="_blank" rel="noreferrer" className="block relative group rounded-lg overflow-hidden border border-slate-200 w-24 h-16 bg-slate-100 flex-shrink-0 shadow-sm">
                      <img src={viewing.hotelImage.url} alt="Hotel" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 backdrop-blur-[1px]">
                        <span className="text-white text-[9px] font-semibold tracking-wider uppercase">View</span>
                      </div>
                    </a>
                  )}
                  {viewing.hotelContract?.url && (
                    <a href={viewing.hotelContract.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors h-16 w-24 flex-col text-center group shadow-sm flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <span className="text-[9px] font-medium text-slate-700 leading-tight">Contract</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Extra Contacts */}
            {viewing.contacts && viewing.contacts.length > 0 && (
              <div className="px-4 py-3 bg-slate-50/50">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-2">Additional Contacts</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y divide-slate-100">
                  {viewing.contacts.map(c => (
                    <div key={c.id} className="px-3 py-1.5 text-[11px] grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="font-medium text-slate-800">{c.name}</div>
                      <div className="text-slate-600">{c.designation}</div>
                      <div className="text-slate-600 break-words">{c.email}</div>
                      <div className="text-slate-600">{c.phone}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try { await deleteHotel(deleting); toast.success('Hotel deleted.'); }
          catch (err) { toast.error(err.message); }
        }}
        title="Delete Hotel"
        message="This hotel will be permanently removed from master data. This action cannot be undone."
      />

      {/* Close menu backdrop */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
}
