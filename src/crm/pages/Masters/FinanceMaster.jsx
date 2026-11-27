import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Plus, Search, ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchableSelect from '../../components/ui/SearchableSelect';
import useLocations from '../../hooks/useLocations';
import useFinanceMaster from '../../hooks/useFinanceMaster';
import { apiClient } from '../../lib/api';
import PageLoader from '../../components/ui/PageLoader';

const cfg = {
  currencies: {
    title: 'Currency',
    cols: [['name', 'From Currency'], ['value', 'Value'], ['isBase', 'Base Currency'], ['rates', 'ROE']],
    fields: [['value', 'Value', 'number'], ['isBase', 'Base Currency', 'boolean'], ['rates', 'Rate Of Exchange', 'rates']]
  },
  banks: {
    title: 'Banks',
    cols: [['name', 'Bank Name'], ['accountDetails', 'Account Details'], ['currency', 'Currency'], ['country', 'Country'], ['state', 'State'], ['city', 'City']],
    fields: [['accountDetails', 'Account Details', 'textarea'], ['country', 'Country', 'country'], ['state', 'State', 'state'], ['city', 'City', 'city'], ['zip', 'Zip'], ['address', 'Address', 'textarea'], ['currency', 'Currency', 'currency']]
  },
  'expense-types': {
    title: 'Expense Type',
    cols: [['name', 'Name'], ['remarks', 'Remarks']],
    fields: [['remarks', 'Remarks', 'textarea']]
  }
};

export default function FinanceMaster({ type }) {
  const navigate = useNavigate();
  const m = cfg[type];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', status: 'Active', value: 1, rates: [] });
  const currencies = useFinanceMaster('currencies');
  const { countries, states, cities } = useLocations(form.country, form.state);

  const load = async () => {
    setLoading(true);
    try { setItems((await apiClient.get(`/finance-masters/${type}`)).data); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); setForm({ name: '', status: 'Active', value: 1, rates: [] }); }, [type]);

  const set = (k, v) => setForm(x => ({ ...x, [k]: v }));
  const show = (x = null) => {
    setEdit(x);
    setForm(x ? { ...x, rates: x.rates || [] } : { name: '', status: 'Active', value: 1, rates: [] });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required.');
    try {
      const r = edit?.id
        ? await apiClient.put(`/finance-masters/${type}/${edit.id}`, form)
        : await apiClient.post(`/finance-masters/${type}`, form);
      setItems(x => edit?.id ? x.map(y => y.id === edit.id ? r.data : y) : [r.data, ...x]);
      setOpen(false);
      toast.success(`${m.title} saved.`);
    } catch (e) { toast.error(e.message); }
  };

  const remove = async () => {
    try {
      await apiClient.delete(`/finance-masters/${type}/${deleteId}`);
      setItems((current) => current.filter((item) => item.id !== deleteId));
      setDeleteId(null);
      toast.success(`${m.title} deleted.`);
    } catch (error) { toast.error(error.message); }
  };

  const f = ([k, l, kind = 'text']) => {
    if (kind === 'textarea') return <label key={k} className="w-full"><span className="form-label mb-0">{l}</span><textarea className="form-input text-xs py-1 min-h-[44px]" rows="2" value={form[k] || ''} onChange={e => set(k, e.target.value)} /></label>;
    if (kind === 'boolean') return (
      <label key={k} className="flex-1 min-w-[140px] flex items-center gap-2 mt-[0.85rem] h-7 px-2.5 bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
        <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" checked={!!form[k]} onChange={e => set(k, e.target.checked)} />
        <span className="text-[11px] font-semibold text-slate-700">{l}</span>
      </label>
    );
    if (['currency', 'country', 'state', 'city'].includes(kind)) {
      // Currency records also have a numeric exchange-rate `value`. Passing
      // those raw records to SearchableSelect made it save (for example) `1`
      // for THB rather than the actual Currency Master id. Banks must retain
      // the currency reference, not its rate.
      const options = kind === 'currency'
        ? currencies.map((currency) => ({ value: currency.id || currency._id || currency.name, label: currency.name }))
        : kind === 'country' ? countries.map(x => x.name) : kind === 'state' ? states : cities;
      return <label key={k} className="flex-1 min-w-[140px]"><span className="form-label mb-0">{l}</span><SearchableSelect compact options={options} value={form[k] || ''} isDisabled={(kind === 'state' && !form.country) || (kind === 'city' && !form.state)} onChange={v => { set(k, v); if (k === 'country') { set('state', ''); set('city', ''); } if (k === 'state') set('city', ''); }} /></label>;
    }
    if (kind === 'rates') return (
      <div key={k} className="w-full mt-1">
        <span className="form-label mb-1 flex justify-between items-center">
          {l}
          <button className="text-[10px] font-medium flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 hover:border-blue-300 px-2 py-0.5 rounded transition-colors" onClick={() => set('rates', [...form.rates, { currency: '', value: 0 }])}>
            <Plus className="w-3 h-3" /> Add ROE
          </button>
        </span>
        <div className="space-y-1.5">
          {form.rates.map((r, i) => (
            <div key={i} className="flex gap-2 items-center bg-white p-0.5 rounded border border-slate-200">
              <input className="form-input !border-none !shadow-none bg-transparent text-xs h-6 py-0 px-2 flex-1" placeholder="Currency" value={r.currency} onChange={e => set('rates', form.rates.map((x, n) => n === i ? { ...x, currency: e.target.value.toUpperCase() } : x))} />
              <div className="w-px h-4 bg-slate-200"></div>
              <input className="form-input !border-none !shadow-none bg-transparent text-xs h-6 py-0 px-2 flex-1" type="number" placeholder="Rate" value={r.value} onChange={e => set('rates', form.rates.map((x, n) => n === i ? { ...x, value: Number(e.target.value) } : x))} />
              <button className="p-1 mr-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove" onClick={() => set('rates', form.rates.filter((_, n) => n !== i))}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {form.rates.length === 0 && <div className="text-[10px] text-slate-400 py-2 text-center border border-dashed border-slate-200 rounded bg-white/50">No exchange rates added yet.</div>}
        </div>
      </div>
    );
    return <label key={k} className="flex-1 min-w-[140px]"><span className="form-label mb-0">{l}</span><input className="form-input text-xs h-7 py-1 px-2.5" type={kind} value={form[k] || ''} onChange={e => set(k, kind === 'number' ? Number(e.target.value) : e.target.value)} /></label>;
  };

  const visible = items.filter(x => JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => navigate("/masters")} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0 mt-0.5" title="Go Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">{m.title}</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Finance master configuration used across the CRM</p>
          </div>
        </div>
        <div className="flex-1 max-w-xl mx-0 md:mx-8">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all" placeholder={`Search ${m.title}...`} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary text-xs h-8 px-3 flex-shrink-0" onClick={() => show()}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add {m.title}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <PageLoader label={`Loading ${m.title.toLowerCase()} records…`} /> : <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {m.cols.map(([, l]) => <th key={l} className="table-header py-2 px-3">{l}</th>)}
                  <th className="table-header py-2 px-3">Status</th>
                  <th className="table-header py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(x => (
                  <tr key={x.id} className="table-row hover:bg-primary-50/30 cursor-pointer" onClick={() => show(x)}>
                    {m.cols.map(([k]) => (
                      <td key={k} className="table-cell">
                        {k === 'rates' ? x.rates?.map(r => `${r.currency} ${r.value}`).join(' · ') || '—'
                          : k === 'isBase' ? (x[k] ? 'Yes' : 'No')
                            : x[k] || '—'}
                      </td>
                    ))}
                    <td className="table-cell px-3 py-2"><span className={x.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>{x.status}</span></td>
                    <td className="table-cell px-3 py-2 text-right"><div className="flex items-center justify-end gap-1"><button className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded" onClick={(e) => { e.stopPropagation(); show(x); }} title="Edit"><Edit className="w-3.5 h-3.5" /></button><button className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded" onClick={(e) => { e.stopPropagation(); setDeleteId(x.id); }} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && <div className="py-12 text-center text-slate-400 text-sm">No {m.title.toLowerCase()} records yet.</div>}
        </>}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={`${edit?.id ? 'Edit' : 'Add'} ${m.title}`} size={m.fields.length >= 6 ? 'lg' : 'md'} footer={<><button className="btn-secondary py-1 text-sm" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary py-1 text-sm flex-shrink-0" onClick={save}>Save {m.title}</button></>}>
        <div className="bg-white -mx-6 -my-4 p-4">
          <div className="flex flex-wrap gap-x-2 gap-y-2">
            <label className="flex-1 min-w-[140px]"><span className="form-label mb-0">Name *</span><input className="form-input text-xs h-7 py-1 px-2.5" value={form.name || ''} onChange={e => set('name', e.target.value)} /></label>
            <label className="flex-1 min-w-[140px]"><span className="form-label mb-0">Status</span><SearchableSelect compact options={['Active', 'Inactive']} value={form.status} onChange={v => set('status', v)} /></label>
            {m.fields.map(f)}
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title={`Delete ${m.title}`} message={`Are you sure you want to delete this ${m.title.toLowerCase()} record? This cannot be undone.`} />
    </div>
  );
}
