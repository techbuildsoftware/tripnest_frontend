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
import { formatDate } from '../../lib/date';
import { isExpiredPrice, priceNumber } from '../../lib/pricing';

const empty = (transfer) => ({ supplier: '', fromDate: '', toDate: '', serviceType: transfer?.transferType || 'SIC', currency: 'THB', status: 'Active', adultCost: '', childCost: '', vehicleCosts: [], remarks: '' });
const dateRange = (rate) => `${formatDate(rate.fromDate)} to ${formatDate(rate.toDate)}`;
const amount = (value, currency) => `${currency || ''} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim();
const pax = (value) => `${Number(value || 0)} Pax`;

export default function TransferPrices() {
  const navigate = useNavigate();
  const { transferId } = useParams();
  const { suppliers } = useApp();
  const transfers = useOperationsMaster('transfers');
  const vehicles = useOperationsMaster('vehicles');
  const currencies = useFinanceMaster('currencies');
  const transfer = transfers.find((item) => item.id === transferId);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty(null));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [filters, setFilters] = useState({ supplier: '', serviceType: '', currency: '', status: '', expiry: '' });
  const supplierOptions = useMemo(() => supplierOptionsFor(suppliers, 'Transfer'), [suppliers]);
  const currencyOptions = useMemo(() => currencies.filter((item) => item.status === 'Active').map((item) => item.name), [currencies]);
  const vehicleOptions = useMemo(() => vehicles
    .filter((vehicle) => vehicle.status !== 'Inactive' && (vehicle.vehicleType || 'SIC') === form.serviceType)
    .sort((left, right) => Number(left.transferCapacity || 0) - Number(right.transferCapacity || 0)), [vehicles, form.serviceType]);
  const expiredRateCount = useMemo(() => rates.filter(isExpiredPrice).length, [rates]);

  const load = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ transfer: transferId, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) });
      const rows = (await apiClient.get(`/transfer-rates?${query.toString()}`)).data;
      setRates(filters.expiry === 'expired' ? rows.filter(isExpiredPrice) : rows);
    } catch (error) { toast.error(error.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [transferId, filters.supplier, filters.serviceType, filters.currency, filters.status, filters.expiry]);
  const set = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    if (key === 'fromDate' && next.toDate && value > next.toDate) next.toDate = '';
    return next;
  });
  const setServiceType = (serviceType) => setForm((current) => ({
    ...current,
    serviceType,
    vehicleCosts: [],
    adultCost: serviceType === 'SIC' ? current.adultCost : '',
    childCost: serviceType === 'SIC' ? current.childCost : '',
  }));
  const vehicleCost = (vehicle) => form.vehicleCosts?.find((row) => row.vehicleId === vehicle.id || row.vehicle === vehicle.id || row.vehicle === vehicle.name)?.cost ?? '';
  const setVehicleCost = (vehicle, cost) => setForm((current) => {
    const remaining = (current.vehicleCosts || []).filter((row) => row.vehicleId !== vehicle.id && row.vehicle !== vehicle.id && row.vehicle !== vehicle.name);
    return { ...current, vehicleCosts: [...remaining, { vehicle: vehicle.id, capacity: vehicle.transferCapacity, cost }] };
  });
  const open = (rate = null) => { setEditing(rate || {}); setFieldErrors({}); setForm(rate ? { ...empty(transfer), ...rate } : empty(transfer)); };
  const close = () => { setEditing(null); setFieldErrors({}); };
  const save = async () => {
    const isSic = form.serviceType === 'SIC';
    const missing = {
      supplier: !form.supplier,
      fromDate: !form.fromDate,
      toDate: !form.toDate,
      serviceType: !form.serviceType,
      currency: !form.currency,
      vehicleCosts: !vehicleOptions.some((vehicle) => vehicleCost(vehicle) !== ''),
    };
    if (Object.values(missing).some(Boolean)) { setFieldErrors(missing); return; }
    if (form.toDate < form.fromDate) { setFieldErrors({ fromDate: true, toDate: true }); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      const payload = {
        ...form,
        transfer: transferId,
        adultCost: isSic ? priceNumber(form.adultCost) : undefined,
        childCost: isSic ? priceNumber(form.childCost) : undefined,
        vehicleCosts: vehicleOptions.filter((vehicle) => vehicleCost(vehicle) !== '').map((vehicle) => ({ vehicle: vehicle.id, capacity: vehicle.transferCapacity, cost: priceNumber(vehicleCost(vehicle)) })),
      };
      if (editing?.id) await apiClient.put(`/transfer-rates/${encodeURIComponent(editing.id)}`, payload);
      else await apiClient.post('/transfer-rates', payload);
      toast.success(editing?.id ? 'Transfer price updated.' : 'Transfer price created.');
      close(); await load();
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const remove = async () => { try { await apiClient.delete(`/transfer-rates/${encodeURIComponent(deleting.id)}`); setRates((current) => current.filter((rate) => rate.id !== deleting.id)); setDeleting(null); toast.success('Transfer price deleted.'); } catch (error) { toast.error(error.message); } };

  return <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={() => navigate('/app/masters/transfers')} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"><ArrowLeft className="w-4 h-4" /></button><div><h1 className="text-base font-bold text-slate-900 leading-none">Transfer Prices</h1><p className="text-[10px] text-slate-500 mt-0.5 leading-none">{transfer?.name || 'Selected transfer'} · supplier costs and validity periods</p></div></div><button type="button" onClick={() => open()} className="btn-primary text-xs h-8 px-3 flex-shrink-0"><Plus className="w-3.5 h-3.5 mr-1" /> Add New Price</button></div>
    <div className="card overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-sm font-semibold text-slate-800">Transfer price contracts</h2><p className="text-xs text-slate-500 mt-0.5">{loading ? 'Loading saved prices…' : `${rates.length} ${rates.length === 1 ? 'price' : 'prices'} shown`}</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => setFilters((current) => ({ ...current, expiry: current.expiry === 'expired' ? '' : 'expired' }))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${filters.expiry === 'expired' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>{expiredRateCount} expired {expiredRateCount === 1 ? 'rate' : 'rates'}</button><button type="button" onClick={() => setFilters({ supplier: '', serviceType: '', currency: '', status: '', expiry: '' })} className="text-xs font-medium text-blue-600 hover:text-blue-700 self-start xl:self-auto">Clear filters</button></div></div><div className="p-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"><SearchableSelect value={filters.supplier} onChange={(value) => setFilters((current) => ({ ...current, supplier: value }))} options={supplierOptions} placeholder="All suppliers" /><SearchableSelect value={filters.serviceType} onChange={(value) => setFilters((current) => ({ ...current, serviceType: value }))} options={['SIC', 'PVT']} placeholder="All service types" /><SearchableSelect value={filters.currency} onChange={(value) => setFilters((current) => ({ ...current, currency: value }))} options={currencyOptions} placeholder="All currencies" /><SearchableSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={['Active', 'Inactive']} placeholder="All statuses" /></div>
      {loading ? (
        <div className="min-h-[290px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : rates.length === 0 ? (
        <div className="min-h-[290px] px-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3"><ReceiptText className="w-6 h-6" /></div>
          <h3 className="text-sm font-semibold text-slate-700">No transfer prices found</h3>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Add an SIC passenger rate or PVT vehicle pricing to start quoting this transfer.</p>
          <button type="button" onClick={() => open()} className="btn-primary mt-5"><Plus className="w-3.5 h-3.5 mr-1" /> Add first price</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-slate-900 text-white text-xs uppercase tracking-wide"><tr><th className="px-4 py-3 text-left">Supplier / validity</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Pricing</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {rates.map((rate) => <tr key={rate.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><div className="font-medium text-slate-800">{rate.supplier}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {dateRange(rate)}</div></td>
                <td className="px-4 py-3"><span className="badge badge-blue">{rate.serviceType}</span></td>
                <td className="px-4 py-3 text-slate-600">{rate.serviceType === 'SIC' ? <div className="space-y-0.5"><div>Adult: <span className="font-medium text-slate-800">{amount(rate.adultCost, rate.currency)}</span></div><div>Child: <span className="font-medium text-slate-800">{amount(rate.childCost, rate.currency)}</span></div></div> : rate.vehicleCosts?.length ? `${rate.vehicleCosts.length} vehicle ${rate.vehicleCosts.length === 1 ? 'price' : 'prices'}` : 'No vehicle prices'}</td>
                <td className="px-4 py-3"><StatusBadge status={rate.status} size="xs" /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => open(rate)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button><button type="button" onClick={() => setDeleting(rate)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
    <Modal isOpen={!!editing} onClose={close} title={editing?.id ? 'Edit Transfer Price' : 'Add Transfer Price'} size="xl" footer={<><button type="button" onClick={close} className="btn-secondary">Close</button><button type="button" onClick={save} disabled={saving} className="btn-primary text-xs h-8 px-3 flex-shrink-0">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{editing?.id ? 'Update Price' : 'Save Price'}</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label><span className="form-label">Supplier *</span><SearchableSelect value={form.supplier || ''} onChange={(value) => { set('supplier', value); setFieldErrors((current) => ({ ...current, supplier: false })); }} options={supplierOptions} placeholder="Select supplier" hasError={fieldErrors.supplier} /></label>
        <label><span className="form-label">Price valid from *</span><DateInput value={form.fromDate} max={form.toDate || undefined} onChange={(value) => { set('fromDate', value); setFieldErrors((current) => ({ ...current, fromDate: false })); }} className={`form-input ${fieldErrors.fromDate ? 'border-red-400 ring-1 ring-red-400' : ''}`} /></label>
        <label><span className="form-label">Price valid to *</span><DateInput value={form.toDate} min={form.fromDate || undefined} onChange={(value) => { set('toDate', value); setFieldErrors((current) => ({ ...current, toDate: false })); }} className={`form-input ${fieldErrors.toDate ? 'border-red-400 ring-1 ring-red-400' : ''}`} /></label>
        <label><span className="form-label">Service type *</span><SearchableSelect value={form.serviceType} onChange={(value) => { setServiceType(value); setFieldErrors((current) => ({ ...current, serviceType: false })); }} options={['SIC', 'PVT']} hasError={fieldErrors.serviceType} /></label>
        <label><span className="form-label">Currency *</span><SearchableSelect value={form.currency} onChange={(value) => { set('currency', value); setFieldErrors((current) => ({ ...current, currency: false })); }} options={currencyOptions} hasError={fieldErrors.currency} /></label>
        <label><span className="form-label">Status</span><SearchableSelect value={form.status} onChange={(value) => set('status', value)} options={['Active', 'Inactive']} /></label>
        {form.serviceType === 'SIC' && <><label><span className="form-label">Adult cost</span><input type="number" min="0" step="0.01" value={form.adultCost} onChange={(event) => set('adultCost', event.target.value)} className="form-input" placeholder="Enter adult cost" /></label><label><span className="form-label">Child cost</span><input type="number" min="0" step="0.01" value={form.childCost} onChange={(event) => set('childCost', event.target.value)} className="form-input" placeholder="Enter child cost" /></label></>}
      </div>

      <div className={`mt-5 rounded-xl border overflow-hidden ${fieldErrors.vehicleCosts ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200'}`}>
        <div className="px-4 py-3 bg-slate-900 text-white"><h3 className="text-sm font-semibold">{form.serviceType} vehicle pricing</h3><p className="text-xs text-slate-300 mt-0.5">Only vehicles marked {form.serviceType} in Vehicle Master are available.</p></div>
        {vehicleOptions.length === 0 ? <div className="p-5 text-sm text-slate-500">No active {form.serviceType} vehicles found. Add a matching vehicle in Vehicle Master first.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Transfer Capacity</th><th className="px-4 py-2 text-left">Vehicle Cost ({form.currency?.toUpperCase() || 'CURRENCY'})</th></tr></thead><tbody className="divide-y divide-slate-200">{vehicleOptions.map((vehicle) => <tr key={vehicle.id}><td className="px-4 py-2.5 font-medium text-slate-700">{vehicle.name}</td><td className="px-4 py-2.5 text-slate-600">{pax(vehicle.transferCapacity)}</td><td className="px-4 py-2.5"><input type="number" min="0" step="0.01" value={vehicleCost(vehicle)} onChange={(event) => { setVehicleCost(vehicle, event.target.value); setFieldErrors((current) => ({ ...current, vehicleCosts: false })); }} className="form-input max-w-xs" placeholder="Enter cost" /></td></tr>)}</tbody></table></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50"><div className="text-xs text-slate-400 uppercase tracking-wide">Transfer</div><div className="font-medium text-sm text-slate-700 truncate mt-1">{transfer?.name || transferId}</div></div>
        <label className="md:col-span-2"><span className="form-label">Remarks</span><textarea value={form.remarks || ''} onChange={(event) => set('remarks', event.target.value)} className="form-input min-h-24" placeholder="Add contract notes or conditions" /></label>
      </div>
    </Modal>
    <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete transfer price" message={`Delete the price contract from ${deleting?.supplier || 'this supplier'}? This cannot be undone.`} confirmLabel="Delete price" />
  </div>;
}
