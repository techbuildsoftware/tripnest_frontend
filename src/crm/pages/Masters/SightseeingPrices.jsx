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
import { supplierOptionsFor } from '../../lib/supplierOptions';
import { isExpiredPrice, priceNumber } from '../../lib/pricing';

const activityTypes = ['SIC', 'PVT', 'Ticket Only', 'Activity Only'];
const empty = () => ({ ticketSupplier: '', vehicleSupplier: '', itemNumber: '', market: 'Thailand', fromDate: '', toDate: '', serviceType: 'SIC', currency: 'THB', status: 'Active', adultTicketCost: '', childTicketCost: '', infantTicketCost: '', vehicleAdultCost: '', vehicleChildCost: '', vehicleInfantCost: '', vehicleCosts: [], guideCost: '', remarks: '' });
const money = (value, currency) => `${currency || ''} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim();

export default function SightseeingPrices() {
  const navigate = useNavigate();
  const { sightseeingId } = useParams();
  const { suppliers } = useApp();
  const currencies = useFinanceMaster('currencies');
  const vehicles = useOperationsMaster('vehicles');
  const [sightseeing, setSightseeing] = useState(null);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [filters, setFilters] = useState({ ticketSupplier: '', vehicleSupplier: '', serviceType: '', currency: '', status: '', expiry: '' });
  const ticketSupplierOptions = useMemo(() => supplierOptionsFor(suppliers, 'Activity'), [suppliers]);
  const vehicleSupplierOptions = useMemo(() => supplierOptionsFor(suppliers, ['Vehicle', 'Transfer']), [suppliers]);
  const currencyOptions = useMemo(() => currencies.filter((currency) => currency.status === 'Active').map((currency) => currency.name), [currencies]);
  const vehicleOptions = useMemo(() => vehicles
    .filter((vehicle) => vehicle.status !== 'Inactive' && (vehicle.vehicleType || 'SIC') === form.serviceType)
    .sort((left, right) => Number(left.sightseeingCapacity || 0) - Number(right.sightseeingCapacity || 0)), [vehicles, form.serviceType]);
  const usesVehicles = form.serviceType === 'SIC' || form.serviceType === 'PVT';
  const expiredRateCount = useMemo(() => rates.filter(isExpiredPrice).length, [rates]);

  const load = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ sightseeing: sightseeingId, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) });
      const [activityResponse, ratesResponse] = await Promise.all([apiClient.get('/activity-masters/sightseeing'), apiClient.get(`/sightseeing-rates?${query.toString()}`)]);
      setSightseeing(activityResponse.data.find((activity) => activity.id === sightseeingId) || null);
      setRates(filters.expiry === 'expired' ? ratesResponse.data.filter(isExpiredPrice) : ratesResponse.data);
    } catch (error) { toast.error(error.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [sightseeingId, filters.ticketSupplier, filters.vehicleSupplier, filters.serviceType, filters.currency, filters.status, filters.expiry]);
  const set = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    if (key === 'fromDate' && next.toDate && value > next.toDate) next.toDate = '';
    return next;
  });
  const setActivityType = (serviceType) => setForm((current) => ({ ...current, serviceType, vehicleSupplier: ['SIC', 'PVT'].includes(serviceType) ? current.vehicleSupplier : '', vehicleCosts: ['SIC', 'PVT'].includes(serviceType) ? current.vehicleCosts : [] }));
  const vehicleCost = (vehicle) => form.vehicleCosts?.find((row) => row.vehicleId === vehicle.id || row.vehicle === vehicle.id || row.vehicle === vehicle.name)?.cost ?? '';
  const setVehicleCost = (vehicle, cost) => setForm((current) => {
    const remaining = (current.vehicleCosts || []).filter((row) => row.vehicleId !== vehicle.id && row.vehicle !== vehicle.id && row.vehicle !== vehicle.name);
    return { ...current, vehicleCosts: [...remaining, { vehicle: vehicle.id, capacity: vehicle.sightseeingCapacity, cost }] };
  });
  const open = (rate = null) => { setEditing(rate || {}); setForm(rate ? { ...empty(), ...rate } : { ...empty(), itemNumber: sightseeing?.items?.[0] || '' }); };
  const close = () => setEditing(null);
  const save = async () => {
    if (!form.ticketSupplier || !form.fromDate || !form.toDate || !form.currency || form.adultTicketCost === '' || (usesVehicles && !form.vehicleSupplier)) return toast.error(usesVehicles ? 'Ticket supplier, vehicle or transfer supplier, adult ticket cost, validity dates and currency are required.' : 'Ticket supplier, adult ticket cost, validity dates and currency are required.');
    if (form.toDate < form.fromDate) return toast.error('Price valid to date cannot be before the from date.');
    setSaving(true);
    try {
      const payload = { ...form, sightseeing: sightseeingId, adultTicketCost: priceNumber(form.adultTicketCost), childTicketCost: priceNumber(form.childTicketCost), infantTicketCost: priceNumber(form.infantTicketCost), vehicleAdultCost: priceNumber(form.vehicleAdultCost), vehicleChildCost: priceNumber(form.vehicleChildCost), vehicleInfantCost: priceNumber(form.vehicleInfantCost), guideCost: priceNumber(form.guideCost), vehicleCosts: usesVehicles ? vehicleOptions.map((vehicle) => ({ vehicle: vehicle.id, capacity: vehicle.sightseeingCapacity, cost: priceNumber(vehicleCost(vehicle)) })) : [] };
      if (editing?.id) await apiClient.put(`/sightseeing-rates/${encodeURIComponent(editing.id)}`, payload);
      else await apiClient.post('/sightseeing-rates', payload);
      toast.success(editing?.id ? 'Sightseeing price updated.' : 'Sightseeing price created.');
      close(); await load();
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const remove = async () => { try { await apiClient.delete(`/sightseeing-rates/${encodeURIComponent(deleting.id)}`); setRates((current) => current.filter((rate) => rate.id !== deleting.id)); setDeleting(null); toast.success('Sightseeing price deleted.'); } catch (error) { toast.error(error.message); } };

  return <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={() => navigate('/app/masters/sightseeing')} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"><ArrowLeft className="w-4 h-4" /></button><div><h1 className="text-base font-bold text-slate-900 leading-none">Sightseeing Prices</h1><p className="text-[10px] text-slate-500 mt-0.5 leading-none">{sightseeing?.name || 'Selected activity'} · ticket and vehicle supplier contracts</p></div></div><button type="button" onClick={() => open()} className="btn-primary text-xs h-8 px-3 flex-shrink-0"><Plus className="w-3.5 h-3.5 mr-1" /> Add New Price</button></div>
    <div className="card overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-sm font-semibold text-slate-800">Activity price contracts</h2><p className="text-xs text-slate-500 mt-0.5">{loading ? 'Loading saved prices…' : `${rates.length} ${rates.length === 1 ? 'price' : 'prices'} shown`}</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => setFilters((current) => ({ ...current, expiry: current.expiry === 'expired' ? '' : 'expired' }))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${filters.expiry === 'expired' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>{expiredRateCount} expired {expiredRateCount === 1 ? 'rate' : 'rates'}</button><button type="button" onClick={() => setFilters({ ticketSupplier: '', vehicleSupplier: '', serviceType: '', currency: '', status: '', expiry: '' })} className="text-xs font-medium text-blue-600 hover:text-blue-700 self-start xl:self-auto">Clear filters</button></div></div><div className="p-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"><SearchableSelect value={filters.ticketSupplier} onChange={(value) => setFilters((current) => ({ ...current, ticketSupplier: value }))} options={ticketSupplierOptions} placeholder="All activity suppliers" /><SearchableSelect value={filters.vehicleSupplier} onChange={(value) => setFilters((current) => ({ ...current, vehicleSupplier: value }))} options={vehicleSupplierOptions} placeholder="All vehicle suppliers" /><SearchableSelect value={filters.serviceType} onChange={(value) => setFilters((current) => ({ ...current, serviceType: value }))} options={activityTypes} placeholder="All activity types" /><SearchableSelect value={filters.currency} onChange={(value) => setFilters((current) => ({ ...current, currency: value }))} options={currencyOptions} placeholder="All currencies" /><SearchableSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={['Active', 'Inactive']} placeholder="All statuses" /></div>
      {loading ? <div className="min-h-[290px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div> : rates.length === 0 ? <div className="min-h-[290px] px-6 flex flex-col items-center justify-center text-center"><div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3"><ReceiptText className="w-6 h-6" /></div><h3 className="text-sm font-semibold text-slate-700">No sightseeing prices found</h3><p className="text-[10px] text-slate-500 mt-0.5 leading-none">Add ticket and vehicle supplier costs to quote this activity.</p><button type="button" onClick={() => open()} className="btn-primary mt-5"><Plus className="w-3.5 h-3.5 mr-1" /> Add first price</button></div> : <div className="overflow-x-auto"><table className="min-w-[1350px] w-full text-sm"><thead className="bg-slate-900 text-white text-xs uppercase tracking-wide"><tr><th className="px-4 py-3 text-left">Ticket supplier / item</th><th className="px-4 py-3 text-left">Vehicle Supplier</th><th className="px-4 py-3 text-left">Market / Validity</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Ticket Costs</th><th className="px-4 py-3 text-left">Vehicle Costs</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{rates.map((rate) => <tr key={rate.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="font-medium text-slate-800">{rate.ticketSupplier}</div><div className="text-xs text-slate-500 mt-1">{rate.itemNumber || 'No item number'}</div></td><td className="px-4 py-3 text-slate-700">{rate.vehicleSupplier}</td><td className="px-4 py-3"><div className="text-slate-700">{rate.market || 'Thailand'}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" />{rate.fromDate} to {rate.toDate}</div></td><td className="px-4 py-3"><span className="badge badge-blue">{rate.serviceType}</span></td><td className="px-4 py-3 text-xs text-slate-600 space-y-1"><div>Adult: <b>{money(rate.adultTicketCost, rate.currency)}</b></div><div>Child: {money(rate.childTicketCost, rate.currency)}</div><div>Infant: {money(rate.infantTicketCost, rate.currency)}</div></td><td className="px-4 py-3 text-xs text-slate-600 space-y-1"><div>Adult: <b>{money(rate.vehicleAdultCost, rate.currency)}</b></div><div>Child: {money(rate.vehicleChildCost, rate.currency)}</div><div>Infant: {money(rate.vehicleInfantCost, rate.currency)}</div></td><td className="px-4 py-3"><StatusBadge status={rate.status} size="xs" /></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => open(rate)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button><button type="button" onClick={() => setDeleting(rate)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div>}</div>
    <Modal isOpen={!!editing} onClose={close} title={editing?.id ? 'Edit Sightseeing Price' : 'Add Sightseeing Price'} size="xl" footer={<><button type="button" onClick={close} className="btn-secondary">Close</button><button type="button" onClick={save} disabled={saving} className="btn-primary text-xs h-8 px-3 flex-shrink-0">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{editing?.id ? 'Update Price' : 'Save Price'}</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label><span className="form-label">Activity type *</span><SearchableSelect value={form.serviceType} onChange={setActivityType} options={activityTypes} /></label>
        <label><span className="form-label">Price valid from *</span><DateInput value={form.fromDate} max={form.toDate || undefined} onChange={(value) => set('fromDate', value)} className="form-input" /></label>
        <label><span className="form-label">Price valid to *</span><DateInput value={form.toDate} min={form.fromDate || undefined} onChange={(value) => set('toDate', value)} className="form-input" /></label>
        <label><span className="form-label">Ticket supplier *</span><SearchableSelect value={form.ticketSupplier || ''} onChange={(value) => set('ticketSupplier', value)} options={ticketSupplierOptions} placeholder="Select activity supplier" /></label>
        {usesVehicles && <label><span className="form-label">Vehicle / Transfer supplier *</span><SearchableSelect value={form.vehicleSupplier || ''} onChange={(value) => set('vehicleSupplier', value)} options={vehicleSupplierOptions} placeholder="Select vehicle or transfer supplier" /></label>}
        <label><span className="form-label">Currency *</span><SearchableSelect value={form.currency} onChange={(value) => set('currency', value)} options={currencyOptions} /></label>
        <label><span className="form-label">Item number</span><SearchableSelect value={form.itemNumber || ''} onChange={(value) => set('itemNumber', value)} options={sightseeing?.items || []} placeholder="Select activity item" /></label>
        <label><span className="form-label">Market</span><input value={form.market || ''} onChange={(event) => set('market', event.target.value)} className="form-input" placeholder="Thailand" /></label>
        <label><span className="form-label">Status</span><SearchableSelect value={form.status} onChange={(value) => set('status', value)} options={['Active', 'Inactive']} /></label>
        <label><span className="form-label">Adult ticket cost *</span><input type="number" min="0" step="0.01" value={form.adultTicketCost} onChange={(event) => set('adultTicketCost', event.target.value)} className="form-input" /></label>
        <label><span className="form-label">Child ticket cost</span><input type="number" min="0" step="0.01" value={form.childTicketCost} onChange={(event) => set('childTicketCost', event.target.value)} className="form-input" /></label>
        <label><span className="form-label">Infant ticket cost</span><input type="number" min="0" step="0.01" value={form.infantTicketCost} onChange={(event) => set('infantTicketCost', event.target.value)} className="form-input" /></label>
      </div>
      {usesVehicles && <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden"><div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between"><div><h3 className="text-sm font-semibold">{form.serviceType} vehicle pricing</h3><p className="text-xs text-slate-300 mt-0.5">Only vehicles marked {form.serviceType} in Vehicle Master are available.</p></div></div>{vehicleOptions.length === 0 ? <div className="p-5 text-sm text-slate-500">No active {form.serviceType} vehicles found. Add vehicles with this type in Vehicle Master first.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Sightseeing Capacity</th><th className="px-4 py-2 text-left">Vehicle Cost ({form.currency?.toUpperCase() || 'CURRENCY'})</th></tr></thead><tbody className="divide-y divide-slate-200">{vehicleOptions.map((vehicle) => <tr key={vehicle.id}><td className="px-4 py-2.5 font-medium text-slate-700">{vehicle.name}</td><td className="px-4 py-2.5 text-slate-600">{vehicle.sightseeingCapacity} Pax</td><td className="px-4 py-2.5"><input type="number" min="0" step="0.01" value={vehicleCost(vehicle)} onChange={(event) => setVehicleCost(vehicle, event.target.value)} className="form-input max-w-xs" placeholder="Enter cost" /></td></tr>)}</tbody></table></div>}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"><label><span className="form-label">Guide cost</span><input type="number" min="0" step="0.01" value={form.guideCost} onChange={(event) => set('guideCost', event.target.value)} className="form-input" /></label><label className="md:col-span-2"><span className="form-label">Remarks</span><textarea value={form.remarks || ''} onChange={(event) => set('remarks', event.target.value)} className="form-input min-h-24" placeholder="Add pricing notes or conditions" /></label></div>
    </Modal>
    <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete sightseeing price" message={`Delete the price contract from ${deleting?.ticketSupplier || 'this supplier'}? This cannot be undone.`} confirmLabel="Delete price" />
  </div>;
}
