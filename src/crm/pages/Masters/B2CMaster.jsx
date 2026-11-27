import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Mail, Phone, Plus, Search, Trash2, Users, ArrowLeft, LayoutGrid, List, User, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { apiClient } from '../../lib/api';
import useLocations from '../../hooks/useLocations';
import SearchableSelect from '../../components/ui/SearchableSelect';
import DateInput from '../../components/ui/DateInput';
import { formatDate } from '../../lib/date';
import PageLoader from '../../components/ui/PageLoader';

const blank = {
  name: '', email: '', phone: '', salesPerson: 'TripNest',
  status: 'Active', gstVatNumber: '', dateOfBirth: '', anniversaryDate: '',
  country: '', state: '', city: '', zip: '', address: '', companyLogo: null, familyMembers: [],
};

const emptyMember = {
  salutation: 'Mr.', firstName: '', lastName: '', email: '', code: '+91',
  phone: '', gender: 'Male', relation: '', nationality: 'Indian', passportNo: '',
};

export default function B2CMaster() {
  const navigate = useNavigate();
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState(() => localStorage.getItem('b2c-view') || 'cards');
  const [form, setForm]           = useState(blank);
  const [editing, setEditing]     = useState(null);
  const [viewing, setViewing]     = useState(null);
  const [show, setShow]           = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [member, setMember]       = useState(emptyMember);
  const [deleteId, setDeleteId]   = useState(null);
  const [logoFile, setLogoFile]   = useState(null);

  const { countries, states, cities } = useLocations(form.country, form.state);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/b2c');
      setItems(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const switchView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('b2c-view', mode);
  };

  const set = (key, value) => setForm(v => ({ ...v, [key]: value }));

  const open = (record = null) => {
    setEditing(record);
    setForm(record ? { ...blank, ...record, familyMembers: record.familyMembers || [] } : blank);
    setLogoFile(null); setShow(true);
  };

  const close = () => { setEditing(null); setLogoFile(null); setShow(false); };

  const save = async () => {
    if (!form.name || !form.email) return toast.error('Client name and email are required.');
    try {
      let uploads = {};
      if (logoFile) {
        const files = new FormData();
        files.append('companyLogo', logoFile);
        uploads = Object.fromEntries((await apiClient.upload('/uploads?folder=b2c', files)).data.map((file) => [file.field, file]));
      }
      const payload = { ...form, ...uploads };
      const res = editing
        ? await apiClient.put(`/b2c/${editing.id}`, payload)
        : await apiClient.post('/b2c', payload);
      setItems(all =>
        editing ? all.map(x => (x.id === editing.id ? res.data : x)) : [res.data, ...all]
      );
      close();
      toast.success('B2C client saved.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/b2c/${deleteId}`);
      setItems(all => all.filter(x => x.id !== deleteId));
      toast.success('Client deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addFamily = () => {
    if (!member.firstName || !member.relation)
      return toast.error('Family member first name and relation are required.');
    set('familyMembers', [...form.familyMembers, { ...member, id: crypto.randomUUID() }]);
    setMember(emptyMember);
    setShowFamily(false);
  };

  const renderField = (label, field, type = 'text') => (
    <label key={field}>
      <span className="form-label text-[10px] mb-0.5">{label}</span>
      <input type={type} className="form-input text-xs py-1 h-7 px-2" value={form[field] || ''} onChange={e => set(field, e.target.value)} />
    </label>
  );
  // Keep master dates in ISO form while displaying the same DD-MM-YYYY format
  // used everywhere else in the CRM. Native date inputs ignore a display
  // format request and vary by browser/Windows locale.
  const renderDateField = (label, field) => (
    <label key={field}>
      <span className="form-label text-[10px] mb-0.5">{label}</span>
      <DateInput value={form[field] || ''} onChange={value => set(field, value)} className="form-input text-xs py-1 h-7 px-2" compact ariaLabel={`${label} in DD-MM-YYYY format`} />
    </label>
  );

  const filtered = items.filter(x =>
    `${x.name} ${x.email} ${x.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={() => navigate("/masters")} 
            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0 mt-0.5"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">B2C Customers</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
              {loading ? 'Loading clients…' : `${items.length} ${items.length === 1 ? 'client' : 'clients'}`} · Direct customers and their travel profiles
            </p>
          </div>
        </div>

        {/* Middle Search Bar */}
        <div className="flex-1 max-w-xl mx-0 md:mx-8">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="hidden sm:flex items-center gap-0 rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden flex-shrink-0">
            <button
              onClick={() => switchView('cards')}
              title="Card view"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 rounded-l-[5px]
                ${viewMode === 'cards'
                  ? 'bg-[#DFF2FE] text-[#0069a8] ring-1 ring-inset ring-blue-300'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Cards</span>
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={() => switchView('rows')}
              title="Row view"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 rounded-r-[5px]
                ${viewMode === 'rows'
                  ? 'bg-[#DFF2FE] text-[#0069a8] ring-1 ring-inset ring-blue-300'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <List className="w-3 h-3" />
              <span>Rows</span>
            </button>
          </div>
          <button onClick={() => open()} className="btn-primary text-xs h-8 px-3 flex-shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add B2C Client
          </button>
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="card"><PageLoader label="Loading B2C clients…" /></div>
      ) : filtered.length > 0 ? (
        <>
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(x => (
                <div key={x.id} onClick={() => setViewing(x)} className={`bg-white border border-slate-300 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group flex flex-col cursor-pointer hover:-translate-y-1 overflow-hidden`}>
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 bg-primary-100 border border-slate-300 shadow-sm rounded-xl flex items-center justify-center overflow-hidden text-primary-700 font-bold text-xs flex-shrink-0">
                          {x.name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-sm truncate">{x.name}</div>
                          {x.familyMembers?.length > 0 && <div className="text-[11px] text-slate-500 truncate">{x.familyMembers.length} family member{x.familyMembers.length > 1 ? 's' : ''}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={x.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>{x.status}</span>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(x.id); }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-y-1.5 text-[11px] mb-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <span className="truncate">{x.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <span className="truncate">{x.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="text-slate-400 flex-shrink-0">Loc:</span> <span className="truncate">{[x.city, x.state, x.country].filter(Boolean).join(', ') || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50/80 group-hover:bg-slate-100/50 transition-colors rounded-b-2xl mt-auto border-t border-slate-100 text-[10px]">
                    <div className="text-slate-500 truncate mr-2"><span className="font-medium">Sales:</span> {x.salesPerson || '—'}</div>
                    <div className="text-slate-400 flex-shrink-0">{formatDate(x.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'rows' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="table-header">Client Name</th>
                      <th className="table-header">Contact Info</th>
                      <th className="table-header">Location</th>
                      <th className="table-header">Sales Person</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Created</th>
                      <th className="table-header text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(x => (
                      <tr key={x.id} className="table-row hover:bg-primary-50/30 cursor-pointer" onClick={() => setViewing(x)}>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {x.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{x.name}</div>
                              {x.familyMembers?.length > 0 && (
                                <div className="text-xs text-slate-400">{x.familyMembers.length} family member{x.familyMembers.length > 1 ? 's' : ''}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Mail className="w-3 h-3 text-slate-400" />{x.email || '—'}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Phone className="w-3 h-3 text-slate-400" />{x.phone || '—'}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell text-slate-500">
                          {[x.city, x.state, x.country].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="table-cell text-slate-600">{x.salesPerson || '—'}</td>
                        <td className="table-cell">
                          <span className={x.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>
                            {x.status}
                          </span>
                        </td>
                        <td className="table-cell text-slate-400">
                          {formatDate(x.createdAt)}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-1">
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
            </div>
          )}
        </>
      ) : (
        <div className="card py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {search ? `No clients match "${search}"` : 'No B2C clients yet'}
          </p>
          {!search && (
            <button onClick={() => open()} className="btn-primary mt-4 mx-auto">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add first client
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={show}
        onClose={close}
        title={editing ? 'Edit B2C Customer' : 'Add B2C Customer'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary py-1 text-sm" onClick={close}>Cancel</button>
            <button className="btn-primary py-1 text-sm flex-shrink-0" onClick={save}>Save Client</button>
          </>
        }
      >
        <div className="bg-slate-50 -mx-6 -my-4 p-3.5 space-y-2.5">
          {/* Client Info */}
          <div className="bg-white rounded-xl border border-slate-300 px-3.5 py-3 shadow-sm relative overflow-hidden">
            <h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5 border-b border-slate-100 pb-2">
              <User className="w-3.5 h-3.5 text-blue-500" /> Client Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
              {renderField('Name *', 'name')}
              {renderField('Email *', 'email', 'email')}
              {renderField('Mobile Number', 'phone')}
              {renderField('Sales Person', 'salesPerson')}
              {renderField('GST / VAT Number', 'gstVatNumber')}
              <label>
                <span className="form-label text-[10px] mb-0.5">Quotation Logo</span>
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="form-input text-xs py-0.5 h-7 file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-0.5 file:text-[9px] file:font-semibold file:text-blue-700" />
                {form.companyLogo?.url && !logoFile && <a href={form.companyLogo.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[9px] text-blue-600 hover:underline">Current logo</a>}
              </label>
              <label>
                <span className="form-label text-[10px] mb-0.5">Status</span>
                <SearchableSelect compact value={form.status} onChange={value => set('status', value)} options={['Active', 'Inactive']} />
              </label>
              {renderDateField('Date of Birth', 'dateOfBirth')}
              {renderDateField('Anniversary Date', 'anniversaryDate')}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-slate-300 px-3.5 py-3 shadow-sm relative overflow-hidden">
            <h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5 border-b border-slate-100 pb-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
              <label>
                <span className="form-label text-[10px] mb-0.5">Country</span>
                <SearchableSelect compact value={form.country} onChange={value => { set('country', value); set('state', ''); set('city', ''); }} options={countries.map(c => c.name)} placeholder="Select country" />
              </label>
              <label>
                <span className="form-label text-[10px] mb-0.5">State</span>
                <SearchableSelect compact value={form.state} onChange={value => { set('state', value); set('city', ''); }} options={states} placeholder="Select state" isDisabled={!form.country} />
              </label>
              <label>
                <span className="form-label text-[10px] mb-0.5">City</span>
                <SearchableSelect compact value={form.city} onChange={value => set('city', value)} options={cities} placeholder="Select city" isDisabled={!form.state} />
              </label>
              {renderField('Zip / Postal Code', 'zip')}
              <label className="col-span-1 sm:col-span-2 md:col-span-4">
                <span className="form-label text-[10px] mb-0.5">Address</span>
                <textarea className="form-input min-h-[30px] text-xs py-1" rows="1" value={form.address} onChange={e => set('address', e.target.value)} />
              </label>
            </div>
          </div>

          {/* Family Members */}
          <div className="bg-white rounded-xl border border-slate-300 px-3.5 py-3 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2.5 border-b border-slate-100 pb-2">
              <h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-orange-500" /> Family Members
                {form.familyMembers.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[9px] font-bold leading-none">{form.familyMembers.length}</span>
                )}
              </h3>
              <button onClick={() => setShowFamily(true)} className="btn-secondary text-[10px] py-0.5 px-2 font-medium h-5">
                <Plus className="w-2.5 h-2.5 mr-1" /> Add Member
              </button>
            </div>
            {form.familyMembers.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y divide-slate-100">
                {form.familyMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 text-[11px] hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-medium text-slate-800">{m.salutation} {m.firstName} {m.lastName}</span>
                      <span className="text-slate-400 ml-1">· {m.relation}</span>
                      {m.nationality && <span className="text-slate-400 ml-1">· {m.nationality}</span>}
                    </div>
                    <button onClick={() => set('familyMembers', form.familyMembers.filter(x => x.id !== m.id))} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-2 py-3 text-[11px] text-slate-400 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                No family members added yet. Click "Add Member" to include family.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name || 'Client Details'}
        size="lg"
        footer={
          <>
            <button onClick={() => setViewing(null)} className="btn-secondary py-1 text-sm">Close</button>
            <button onClick={() => { const x = viewing; setViewing(null); open(x); }} className="btn-primary py-1 text-sm">
              <Edit className="w-4 h-4 mr-1" /> Edit Client
            </button>
          </>
        }
      >
        {viewing && (
          <div className="text-[11px] bg-white divide-y divide-slate-100 -mx-6 -my-4">
            {/* Header Block */}
            <div className="flex items-center gap-3 bg-slate-50/80 px-4 py-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary-100 flex items-center justify-center text-primary-700 text-lg font-bold flex-shrink-0 shadow-sm border border-primary-200">
                {viewing.name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 leading-tight break-words">{viewing.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{[viewing.city, viewing.state, viewing.country].filter(Boolean).join(', ') || 'No location set'}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={viewing.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>{viewing.status}</span>
                  {viewing.salesPerson && <span className="badge badge-purple py-0 px-1.5 text-[9px]">Sales: {viewing.salesPerson}</span>}
                </div>
              </div>
            </div>

            {/* Core Details */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Email</div><div className="font-medium text-slate-800 break-words">{viewing.email || '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Mobile</div><div className="font-medium text-slate-800">{viewing.phone || '—'}</div></div>
                <div className="md:col-span-2"><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Address</div><div className="font-medium text-slate-800 break-words">{viewing.address || '—'} {viewing.zip ? `- ${viewing.zip}` : ''}</div></div>
                
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Date of Birth</div><div className="font-medium text-slate-800">{viewing.dateOfBirth ? formatDate(viewing.dateOfBirth) : '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Anniversary</div><div className="font-medium text-slate-800">{viewing.anniversaryDate ? formatDate(viewing.anniversaryDate) : '—'}</div></div>
                <div><div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">GST / VAT No.</div><div className="font-medium text-slate-800">{viewing.gstVatNumber || '—'}</div></div>
              </div>
            </div>

            {/* Family Members */}
            {viewing.familyMembers && viewing.familyMembers.length > 0 && (
              <div className="px-4 py-3 bg-slate-50/50">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-orange-500" /> Family Members ({viewing.familyMembers.length})
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y divide-slate-100">
                  {viewing.familyMembers.map(m => (
                    <div key={m.id} className="px-3 py-1.5 text-[11px] grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="font-medium text-slate-800 break-words">{m.salutation} {m.firstName} {m.lastName}</div>
                      <div className="text-slate-600">{m.relation}</div>
                      <div className="text-slate-600 break-words">{m.email || m.phone || '—'}</div>
                      <div className="text-slate-600">{m.nationality || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Record Created</div>
                  <div className="text-xs font-medium text-slate-700">{formatDate(viewing.createdAt)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Record ID</div>
                  <div className="text-xs font-mono text-slate-500">{viewing.id}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Family Member Modal */}
      <Modal
        isOpen={showFamily}
        onClose={() => setShowFamily(false)}
        title="Add Family Member"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowFamily(false)}>Cancel</button>
            <button className="btn-primary text-xs h-8 px-3 flex-shrink-0" onClick={addFamily}>Add Member</button>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
          {[
            ['Salutation', 'salutation'], ['First Name', 'firstName'], ['Last Name', 'lastName'],
            ['Email', 'email'], ['Phone', 'phone'], ['Relation', 'relation'],
            ['Nationality', 'nationality'], ['Passport No.', 'passportNo'],
          ].map(([label, key]) => (
            <label key={key}>
              <span className="form-label text-[10px] mb-0.5">{label}</span>
              <input className="form-input text-xs py-1 h-7 px-2" value={member[key]} onChange={e => setMember(v => ({ ...v, [key]: e.target.value }))} />
            </label>
          ))}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete B2C Client"
        message="Are you sure you want to delete this client? This action cannot be undone."
      />
    </div>
  );
}
