import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Edit, Loader2, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../lib/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchableSelect from '../../components/ui/SearchableSelect';
import StatusBadge from '../../components/ui/StatusBadge';
import DateInput from '../../components/ui/DateInput';
import useFinanceMaster from '../../hooks/useFinanceMaster';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import useSalesMaster from '../../hooks/useSalesMaster';
import { supplierOptionsFor } from '../../lib/supplierOptions';
import { formatDate } from '../../lib/date';
import { isExpiredPrice, priceNumber } from '../../lib/pricing';

const tripTypes = ['Without Transfer', 'Round Trip Transfer', 'One Way Transfer'];
const empty = () => ({ supplier: '', fromDate: '', toDate: '', mealType: '', tripType: 'Without Transfer', currency: 'THB', status: 'Active', adultCost: '', childCost: '', infantCost: '', vehicleCosts: [], remarks: '' });
const money = (value, currency) => `${currency || ''} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim();

export default function RestaurantPrices() {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const { suppliers } = useApp();
  const mealPlans = useSalesMaster('meal-plans');
  const currencies = useFinanceMaster('currencies');
  const vehicles = useOperationsMaster('vehicles');
  const [restaurant, setRestaurant] = useState(null);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [filters, setFilters] = useState({ supplier: '', mealType: '', tripType: '', currency: '', status: '', expiry: '' });
  const supplierOptions = useMemo(() => supplierOptionsFor(suppliers, 'Restaurant'), [suppliers]);
  const currencyOptions = useMemo(() => currencies.filter((item) => item.status === 'Active').map((item) => item.name), [currencies]);
  const vehicleOptions = useMemo(() => vehicles
    .filter((item) => item.status !== 'Inactive')
    .sort((left, right) => Number(left.transferCapacity || 0) - Number(right.transferCapacity || 0)), [vehicles]);
  const usesVehicles = form.tripType !== 'Without Transfer';
  const expiredRateCount = useMemo(() => rates.filter(isExpiredPrice).length, [rates]);

  const load = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ restaurant: restaurantId, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) });
      const [restaurants, priceResponse] = await Promise.all([apiClient.get('/activity-masters/restaurants'), apiClient.get(`/restaurant-rates?${query.toString()}`)]);
      setRestaurant(restaurants.data.find((item) => item.id === restaurantId) || null);
      setRates(filters.expiry === 'expired' ? priceResponse.data.filter(isExpiredPrice) : priceResponse.data);
    } catch (error) { toast.error(error.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [restaurantId, filters.supplier, filters.mealType, filters.tripType, filters.currency, filters.status, filters.expiry]);
  const set = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    if (key === 'fromDate' && next.toDate && value > next.toDate) next.toDate = '';
    return next;
  });
  const setTripType = (tripType) => setForm((current) => ({ ...current, tripType, vehicleCosts: tripType === 'Without Transfer' ? [] : current.vehicleCosts }));
  const vehicleCost = (vehicle) => form.vehicleCosts?.find((row) => row.vehicleId === vehicle.id || row.vehicle === vehicle.id || row.vehicle === vehicle.name)?.cost ?? '';
  const setVehicleCost = (vehicle, cost) => setForm((current) => {
    const remaining = (current.vehicleCosts || []).filter((row) => row.vehicleId !== vehicle.id && row.vehicle !== vehicle.id && row.vehicle !== vehicle.name);
    return { ...current, vehicleCosts: [...remaining, { vehicle: vehicle.id, capacity: vehicle.transferCapacity, cost }] };
  });
  const open = (rate = null) => { setEditing(rate || {}); setForm(rate ? { ...empty(), ...rate } : empty()); };
  const close = () => setEditing(null);
  const save = async () => {
    if (!form.supplier || !form.fromDate || !form.toDate || !form.mealType || !form.currency || form.adultCost === '') return toast.error('Supplier, meal type, adult cost, validity dates and currency are required.');
    if (form.toDate < form.fromDate) return toast.error('Price valid to date cannot be before the from date.');
    setSaving(true);
    try {
      const payload = { ...form, restaurant: restaurantId, adultCost: priceNumber(form.adultCost), childCost: priceNumber(form.childCost), infantCost: priceNumber(form.infantCost), vehicleCosts: usesVehicles ? vehicleOptions.map((vehicle) => ({ vehicle: vehicle.id, capacity: vehicle.transferCapacity, cost: priceNumber(vehicleCost(vehicle)) })) : [] };
      if (editing?.id) await apiClient.put(`/restaurant-rates/${encodeURIComponent(editing.id)}`, payload);
      else await apiClient.post('/restaurant-rates', payload);
      toast.success(editing?.id ? 'Restaurant price updated.' : 'Restaurant price created.');
      close(); await load();
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const remove = async () => { try { await apiClient.delete(`/restaurant-rates/${encodeURIComponent(deleting.id)}`); setRates((current) => current.filter((rate) => rate.id !== deleting.id)); setDeleting(null); toast.success('Restaurant price deleted.'); } catch (error) { toast.error(error.message); } };

  return <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={() => navigate('/app/masters/restaurants')} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"><ArrowLeft className="w-4 h-4" /></button><div><h1 className="text-base font-bold text-slate-900 leading-none">Restaurant Prices</h1><p className="text-[10px] text-slate-500 mt-0.5 leading-none">{restaurant?.name || 'Selected restaurant'} · meal and transfer pricing contracts</p></div></div><button type="button" onClick={() => open()} className="btn-primary text-xs h-8 px-3 flex-shrink-0"><Plus className="w-3.5 h-3.5 mr-1" /> Add New Price</button></div>
    <div className="card overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-sm font-semibold text-slate-800">Restaurant price contracts</h2><p className="text-xs text-slate-500 mt-0.5">{loading ? 'Loading saved prices…' : `${rates.length} ${rates.length === 1 ? 'price' : 'prices'} shown`}</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => setFilters((current) => ({ ...current, expiry: current.expiry === 'expired' ? '' : 'expired' }))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${filters.expiry === 'expired' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>{expiredRateCount} expired {expiredRateCount === 1 ? 'rate' : 'rates'}</button><button type="button" onClick={() => setFilters({ supplier: '', mealType: '', tripType: '', currency: '', status: '', expiry: '' })} className="text-xs font-medium text-blue-600 hover:text-blue-700 self-start xl:self-auto">Clear filters</button></div></div><div className="p-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"><SearchableSelect value={filters.supplier} onChange={(value) => setFilters((current) => ({ ...current, supplier: value }))} options={supplierOptions} placeholder="All restaurant suppliers" /><SearchableSelect value={filters.mealType} onChange={(value) => setFilters((current) => ({ ...current, mealType: value }))} options={mealPlans} placeholder="All meal types" /><SearchableSelect value={filters.tripType} onChange={(value) => setFilters((current) => ({ ...current, tripType: value }))} options={tripTypes} placeholder="All trip types" /><SearchableSelect value={filters.currency} onChange={(value) => setFilters((current) => ({ ...current, currency: value }))} options={currencyOptions} placeholder="All currencies" /><SearchableSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={['Active', 'Inactive']} placeholder="All statuses" /></div>
      {loading ? <div className="min-h-[290px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div> : rates.length === 0 ? <div className="min-h-[290px] px-6 flex flex-col items-center justify-center text-center"><div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3"><ReceiptText className="w-6 h-6" /></div><h3 className="text-sm font-semibold text-slate-700">No restaurant prices found</h3><p className="text-[10px] text-slate-500 mt-0.5 leading-none">Add a restaurant supplier contract to start quoting meals.</p><button type="button" onClick={() => open()} className="btn-primary mt-5"><Plus className="w-3.5 h-3.5 mr-1" /> Add first price</button></div> : <div className="overflow-x-auto"><table className="min-w-[1150px] w-full text-sm"><thead className="bg-slate-900 text-white text-xs uppercase tracking-wide"><tr><th className="px-4 py-3 text-left">Supplier / validity</th><th className="px-4 py-3 text-left">Meal Type</th><th className="px-4 py-3 text-left">Trip Type</th><th className="px-4 py-3 text-left">Adult</th><th className="px-4 py-3 text-left">Child</th><th className="px-4 py-3 text-left">Infant</th><th className="px-4 py-3 text-left">Vehicle Pricing</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{rates.map((rate) => <tr key={rate.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="font-medium text-slate-800">{rate.supplier}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(rate.fromDate)} to {formatDate(rate.toDate)}</div></td><td className="px-4 py-3 text-slate-700">{rate.mealType}</td><td className="px-4 py-3"><span className="badge badge-blue">{rate.tripType}</span></td><td className="px-4 py-3 text-slate-700 font-medium">{money(rate.adultCost, rate.currency)}</td><td className="px-4 py-3 text-slate-600">{money(rate.childCost, rate.currency)}</td><td className="px-4 py-3 text-slate-600">{money(rate.infantCost, rate.currency)}</td><td className="px-4 py-3 text-xs text-slate-600">{rate.vehicleCosts?.length ? `${rate.vehicleCosts.length} vehicle ${rate.vehicleCosts.length === 1 ? 'rate' : 'rates'}` : 'No transfer'}</td><td className="px-4 py-3"><StatusBadge status={rate.status} size="xs" /></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => open(rate)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button><button type="button" onClick={() => setDeleting(rate)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div>}</div>
    <Modal isOpen={!!editing} onClose={close} title={editing?.id ? 'Edit Restaurant Price' : 'Add Restaurant Price'} size="xl" footer={<><button type="button" onClick={close} className="btn-secondary">Close</button><button type="button" onClick={save} disabled={saving} className="btn-primary text-xs h-8 px-3 flex-shrink-0">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{editing?.id ? 'Update Price' : 'Save Price'}</button></>}><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><label><span className="form-label">Supplier *</span><SearchableSelect value={form.supplier || ''} onChange={(value) => set('supplier', value)} options={supplierOptions} placeholder="Select restaurant supplier" /></label><label><span className="form-label">Price valid from *</span><DateInput value={form.fromDate} max={form.toDate || undefined} onChange={(value) => set('fromDate', value)} className="form-input" /></label><label><span className="form-label">Price valid to *</span><DateInput value={form.toDate} min={form.fromDate || undefined} onChange={(value) => set('toDate', value)} className="form-input" /></label><label><span className="form-label">Meal type *</span><SearchableSelect value={form.mealType} onChange={(value) => set('mealType', value)} options={mealPlans} placeholder="Select Meal Plan Master" /></label><label><span className="form-label">Trip type *</span><SearchableSelect value={form.tripType} onChange={setTripType} options={tripTypes} /></label><label><span className="form-label">Currency *</span><SearchableSelect value={form.currency} onChange={(value) => set('currency', value)} options={currencyOptions} /></label><label><span className="form-label">Adult cost *</span><input type="number" min="0" step="0.01" value={form.adultCost} onChange={(event) => set('adultCost', event.target.value)} className="form-input" /></label><label><span className="form-label">Child cost</span><input type="number" min="0" step="0.01" value={form.childCost} onChange={(event) => set('childCost', event.target.value)} className="form-input" /></label><label><span className="form-label">Infant cost</span><input type="number" min="0" step="0.01" value={form.infantCost} onChange={(event) => set('infantCost', event.target.value)} className="form-input" /></label></div>{usesVehicles && <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden"><div className="px-4 py-3 bg-slate-900 text-white"><h3 className="text-sm font-semibold">Transfer vehicle pricing</h3><p className="text-xs text-slate-300 mt-0.5">Active vehicles from Vehicle Master. Set a cost for each vehicle used with this meal.</p></div>{vehicleOptions.length === 0 ? <div className="p-5 text-sm text-slate-500">No active vehicles found in Vehicle Master.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Transfer Capacity</th><th className="px-4 py-2 text-left">Vehicle Cost ({form.currency?.toUpperCase() || 'CURRENCY'})</th></tr></thead><tbody className="divide-y divide-slate-200">{vehicleOptions.map((vehicle) => <tr key={vehicle.id}><td className="px-4 py-2.5 font-medium text-slate-700">{vehicle.name}</td><td className="px-4 py-2.5 text-slate-600">{vehicle.transferCapacity} Pax</td><td className="px-4 py-2.5"><input type="number" min="0" step="0.01" value={vehicleCost(vehicle)} onChange={(event) => setVehicleCost(vehicle, event.target.value)} className="form-input max-w-xs" placeholder="Enter cost" /></td></tr>)}</tbody></table></div>}</div>}<label className="block mt-4"><span className="form-label">Remarks</span><textarea value={form.remarks || ''} onChange={(event) => set('remarks', event.target.value)} className="form-input min-h-24" placeholder="Add pricing notes or conditions" /></label></Modal>
    <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete restaurant price" message={`Delete the price contract from ${deleting?.supplier || 'this supplier'}? This cannot be undone.`} confirmLabel="Delete price" />
  </div>;
}
