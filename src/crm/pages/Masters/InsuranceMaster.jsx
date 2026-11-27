import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CalendarDays, CircleDollarSign, Edit, ListChecks, Plus, Search, ShieldCheck, SlidersHorizontal, ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { apiClient } from '../../lib/api';

const tabs = [
  { type: 'insurance-days', label: 'Day Management', icon: CalendarDays, add: 'Add New Day', columns: [['name', 'Name'], ['position', 'Position']], fields: [['position', 'Position', 'number']] },
  { type: 'insurance-ages', label: 'Age Management', icon: SlidersHorizontal, add: 'Add New Age', columns: [['name', 'Name'], ['position', 'Position']], fields: [['position', 'Position', 'number']] },
  { type: 'insurance-companies', label: 'Company Management', icon: Building2, add: 'Add New Company', columns: [['name', 'Name'], ['website', 'Website'], ['contactEmail', 'Email'], ['contactPhone', 'Phone']], fields: [['website', 'Website'], ['contactEmail', 'Contact Email', 'email'], ['contactPhone', 'Contact Phone']] },
  { type: 'insurance-plans', label: 'Insurance Plan', icon: ShieldCheck, add: 'Add New Plan', columns: [['name', 'Name'], ['company', 'Company'], ['description', 'Description']], fields: [['company', 'Company', 'company'], ['description', 'Description', 'textarea']] },
  { type: 'insurance-sums', label: 'Sum Insurance Management', icon: CircleDollarSign, add: 'Add New Sum Insured', columns: [['name', 'Name'], ['amount', 'Amount'], ['currency', 'Currency']], fields: [['amount', 'Amount', 'number'], ['currency', 'Currency', 'select', ['THB', 'INR', 'USD', 'AED']]] },
  { type: 'insurance-features', label: 'Feature Management', icon: ListChecks, add: 'Add New Feature', columns: [['name', 'Name'], ['description', 'Description']], fields: [['description', 'Description', 'textarea']] },
  { type: 'insurance-costs', label: 'Cost Management', icon: CircleDollarSign, add: 'Add New Cost', columns: [['name', 'Name'], ['plan', 'Plan'], ['day', 'Day'], ['age', 'Age'], ['sumInsured', 'Sum Insured'], ['cost', 'Cost'], ['currency', 'Currency']], fields: [['plan', 'Insurance Plan', 'plan'], ['day', 'Day', 'day'], ['age', 'Age', 'age'], ['sumInsured', 'Sum Insured', 'sum'], ['cost', 'Cost', 'number'], ['currency', 'Currency', 'select', ['THB', 'INR', 'USD', 'AED']]] },
];
const initialForm = (type) => ({
  name: type === 'insurance-costs' ? 'Insurance Cost' : '',
  status: 'Active',
  ...(['insurance-days', 'insurance-ages'].includes(type) ? { position: 0 } : {}),
  ...(['insurance-sums', 'insurance-costs'].includes(type) ? { currency: 'THB' } : {}),
});

export default function InsuranceMaster() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState(tabs[0].type);
  const [items, setItems] = useState([]); const [search, setSearch] = useState(''); const [isOpen, setIsOpen] = useState(false); const [editing, setEditing] = useState(null); const [deleteId, setDeleteId] = useState(null); const [form, setForm] = useState(initialForm(tabs[0].type));
  const [lookups, setLookups] = useState({ companies: [], plans: [], days: [], ages: [], sums: [] });
  const tab = tabs.find((item) => item.type === activeType);
  const loadLookups = async () => { try { const [companies, plans, days, ages, sums] = await Promise.all(['insurance-companies', 'insurance-plans', 'insurance-days', 'insurance-ages', 'insurance-sums'].map((type) => apiClient.get(`/activity-masters/${type}`))); setLookups({ companies: companies.data, plans: plans.data, days: days.data, ages: ages.data, sums: sums.data }); } catch { /* Lists simply stay empty until their masters are created. */ } };
  const load = async () => { try { setItems((await apiClient.get(`/activity-masters/${activeType}`)).data); } catch (error) { toast.error(error.message); } };
  useEffect(() => { setSearch(''); load(); loadLookups(); }, [activeType]);
  const open = (item = null) => { setEditing(item); setForm(item ? { ...initialForm(activeType), ...item } : initialForm(activeType)); setIsOpen(true); };
  const close = () => { setIsOpen(false); setEditing(null); };
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const options = (kind) => ({ company: lookups.companies, plan: lookups.plans, day: lookups.days, age: lookups.ages, sum: lookups.sums.map((item) => ({ ...item, label: `${item.name} (${item.amount} ${item.currency})` })) }[kind] || []);
  const save = async () => { if (!form.name.trim()) return toast.error('Name is required.'); try { const response = editing?.id ? await apiClient.put(`/activity-masters/${activeType}/${editing.id}`, form) : await apiClient.post(`/activity-masters/${activeType}`, form); setItems((current) => editing?.id ? current.map((item) => item.id === editing.id ? response.data : item) : [response.data, ...current]); close(); loadLookups(); toast.success(`${tab.label} saved.`); } catch (error) { toast.error(error.message); } };
  const remove = async () => { try { await apiClient.delete(`/activity-masters/${activeType}/${deleteId}`); setItems((current) => current.filter((item) => item.id !== deleteId)); setDeleteId(null); loadLookups(); toast.success(`${tab.label} deleted.`); } catch (error) { toast.error(error.message); } };
  const visible = useMemo(() => items.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase())), [items, search]);
  const renderField = ([key, label, kind = 'text', values]) => {
    const isFullWidth = kind === 'textarea';
    const wrapperClass = isFullWidth ? 'w-full' : 'flex-1 min-w-[140px]';
    if (kind === 'textarea') return <label key={key} className={wrapperClass}><span className="form-label mb-0">{label}</span><textarea rows="2" className="form-input text-xs py-1 min-h-[44px]" value={form[key] || ''} onChange={(event) => set(key, event.target.value)} /></label>;
    if (kind === 'select' || ['company', 'plan', 'day', 'age', 'sum'].includes(kind)) return <label key={key} className={wrapperClass}><span className="form-label mb-0">{label}</span><SearchableSelect compact value={form[key] || ''} onChange={(value) => set(key, value)} options={values || options(kind)} placeholder={`Select ${label}`} /></label>;
    return <label key={key} className={wrapperClass}><span className="form-label mb-0">{label}</span><input type={kind} className="form-input text-xs h-7 py-1 px-2.5" value={form[key] || ''} onChange={(event) => set(key, kind === 'number' ? Number(event.target.value) : event.target.value)} /></label>;
  };

  return (
    <div className="p-4 space-y-4 max-w-full overflow-x-hidden min-w-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/masters")}
            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Travel Insurance</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 line-clamp-1">Insurance rules, plans, coverage, features and pricing</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 md:justify-end min-w-0">
          <div className="relative flex-1 max-w-none md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 h-8 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${tab.label}...`}
            />
          </div>
          <button
            className="btn-primary text-xs sm:text-sm flex-shrink-0 justify-center whitespace-nowrap shadow-sm"
            onClick={() => open()}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>{tab.add}</span>
          </button>
        </div>
      </div>

      {/* Sidebar + Table */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] min-w-0 w-full">
        {/* Tab Sidebar - horizontal scroll on mobile with custom scrollbar */}
        <aside className="card p-1.5 sm:p-2 h-fit min-w-0 max-w-full overflow-hidden">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 custom-scrollbar">
            {tabs.map((item) => (
              <button
                key={item.type}
                onClick={() => setActiveType(item.type)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium whitespace-nowrap lg:whitespace-normal lg:w-full flex-shrink-0 transition-colors ${
                  activeType === item.type
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Data Table with dedicated horizontal scrollbar */}
        <section className="card overflow-hidden min-w-0 max-w-full flex flex-col">
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  {tab.columns.map(([, label]) => (
                    <th key={label} className="table-header py-2 px-3">
                      {label}
                    </th>
                  ))}
                  <th className="table-header py-2 px-3">Status</th>
                  <th className="table-header py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((item) => (
                  <tr key={item.id} className="table-row cursor-pointer hover:bg-slate-50" onClick={() => open(item)}>
                    {tab.columns.map(([key]) => (
                      <td key={key} className="table-cell px-3 py-2">
                        {item[key] || '—'}
                      </td>
                    ))}
                    <td className="table-cell px-3 py-2">
                      <span className={item.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>
                        {item.status}
                      </span>
                    </td>
                    <td className="table-cell px-3 py-2 text-right">
                      <button
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        onClick={(e) => { e.stopPropagation(); open(item); }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      <button
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <div className="p-12 text-center text-slate-400 text-sm">
                No records yet. Add your first {tab.label.toLowerCase()} record.
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={`${editing?.id ? 'Edit' : 'Add'} ${tab.label}`}
        size={tab.fields.length >= 5 ? 'lg' : 'md'}
        footer={
          <>
            <button className="btn-secondary py-1 text-sm" onClick={close}>Cancel</button>
            <button className="btn-primary py-1 text-sm flex-shrink-0" onClick={save}>
              {activeType === 'insurance-companies'
                ? (editing?.id ? 'Update Company' : 'Save Company')
                : (editing?.id ? `Update ${tab.label.replace(' Management', '')}` : `Save ${tab.label.replace(' Management', '')}`)}
            </button>
          </>
        }
      >
        <div className="bg-white -mx-6 -my-4 p-4">
          <div className="flex flex-wrap gap-x-2 gap-y-2">
            <label className="flex-1 min-w-[140px]"><span className="form-label mb-0">Name *</span><input className="form-input text-xs h-7 py-1 px-2.5" value={form.name || ''} onChange={(event) => set('name', event.target.value)} /></label>
            {tab.fields.map(renderField)}
            <label className="flex-1 min-w-[140px]"><span className="form-label mb-0">Status</span><SearchableSelect compact value={form.status} onChange={(value) => set('status', value)} options={['Active', 'Inactive']} /></label>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title={`Delete ${tab.label}`} message={`Are you sure you want to delete this ${tab.label.toLowerCase()} record? This cannot be undone.`} />
    </div>
  );
}
