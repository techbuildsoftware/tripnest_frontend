import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, Users, TrendingUp, DollarSign, Image, FileText, ArrowLeft, Star, LayoutGrid, List, Building2, MapPin, CreditCard, Paperclip } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';
import useLocations from '../../hooks/useLocations';
import useSalesMaster from '../../hooks/useSalesMaster';
import useFinanceMaster from '../../hooks/useFinanceMaster';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) => `฿${Number(n || 0).toLocaleString()}`;
const paymentTermsOptions = [
  '100% Advance',
  '30% Advance, Balance 7 Days',
  '50% Advance, Balance 3 Days',
  '30% Advance, Balance 5 Days',
  '20% Advance, Balance 10 Days',
];

const emptyForm = {
  name: '', contactPerson: '', email: '', phone: '', market: '', currency: 'INR',
  country: '', state: '', city: '', creditLimit: 100000, paymentTerms: '30% Advance, Balance 7 Days',
  markup: 0, markupCategory: '', status: 'Active', notes: '', contacts: [],
  portalEnabled: true, loginCode: '', portalPassword: '',
};

const emptyContact = { name: '', designation: '', email: '', phone: '', primary: false };
const contactsFor = (agent = {}) => agent.contacts?.length ? agent.contacts : agent.contactPerson ? [{ name: agent.contactPerson, email: agent.email || '', phone: agent.phone || '', designation: '', primary: true }] : [];
const normaliseAgent = (agent) => ({ ...emptyForm, ...agent, contacts: contactsFor(agent) });

export default function AgentMaster() {
  const navigate = useNavigate();
  const { agents, addAgent, updateAgent, deleteAgent } = useApp();
  const { user } = useAuth();
  const canManageCredentials = user?.role === 'Administrator';

  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [viewMode, setViewMode]   = useState(() => localStorage.getItem('agent-view') || 'cards');
  const [editAgent, setEditAgent] = useState(null);

  const switchView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('agent-view', mode);
  };
  const [deleteId, setDeleteId]   = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewAgent, setViewAgent] = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [contactDraft, setContactDraft] = useState(emptyContact);
  const [attachments, setAttachments] = useState({ companyLogo: null, declaration: null });
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [revealedCredentials, setRevealedCredentials] = useState(null);

  const { countries, states, cities } = useLocations(form.country, form.state);
  const markets = useSalesMaster('markets');
  const markupCategories = useSalesMaster('markup-categories');
  const currencies = useFinanceMaster('currencies');
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const setContact = (key, value) => setContactDraft((current) => ({ ...current, [key]: value }));

  const agentRecords = Array.isArray(agents) ? agents.filter(Boolean) : [];
  const filtered = agentRecords.filter(a => {
    const s = search.toLowerCase();
    return !s || a.name.toLowerCase().includes(s) || a.contactPerson?.toLowerCase().includes(s) || a.market?.toLowerCase().includes(s);
  });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Agent name required'); return; }
    if (!form.markupCategory) { toast.error('Select a markup category.'); return; }
    if (!form.contacts?.length) { toast.error('Add at least one contact person.'); return; }
    try {
      let uploads = {};
      if (attachments.companyLogo || attachments.declaration) {
        const files = new FormData();
        if (attachments.companyLogo) files.append('companyLogo', attachments.companyLogo);
        if (attachments.declaration) files.append('declaration', attachments.declaration);
        uploads = Object.fromEntries(
          (await apiClient.upload('/uploads', files)).data.map(f => [f.field, f])
        );
      }
      const contacts = form.contacts.map((contact, index) => ({ ...contact, primary: contact.primary || (!form.contacts.some((item) => item.primary) && index === 0) }));
      const primaryContact = contacts.find((contact) => contact.primary) || contacts[0];
      const payload = { ...form, contacts, contactPerson: primaryContact.name, email: primaryContact.email, phone: primaryContact.phone, ...uploads };
      if (!payload.portalPassword) delete payload.portalPassword;
      if (editAgent) { await updateAgent(editAgent.id, payload); toast.success('Agent updated!'); }
      else { await addAgent(payload); toast.success('Agent added!'); }
      setShowForm(false); setEditAgent(null); setForm(emptyForm); setContactDraft(emptyContact); setShowPortalPassword(false);
      setAttachments({ companyLogo: null, declaration: null });
    } catch (err) { toast.error(err.message); }
  };

  const openEdit = (agent) => { setForm(normaliseAgent(agent)); setContactDraft(emptyContact); setEditAgent(agent); setShowPortalPassword(false); setShowForm(true); };
  const openCreate = () => { setEditAgent(null); setForm(emptyForm); setContactDraft(emptyContact); setAttachments({ companyLogo: null, declaration: null }); setShowPortalPassword(false); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditAgent(null); setContactDraft(emptyContact); setAttachments({ companyLogo: null, declaration: null }); setShowPortalPassword(false); };
  const revealCredentials = async (agent) => {
    try {
      const credentials = (await apiClient.get(`/agents/${encodeURIComponent(agent.id)}/credentials`)).data;
      setRevealedCredentials({ agent, ...credentials });
    } catch (error) { toast.error(error.message); }
  };
  const addContact = () => {
    if (!contactDraft.name.trim()) return toast.error('Contact person name is required.');
    if (contactDraft.email && form.contacts.some((contact) => contact.email?.toLowerCase() === contactDraft.email.trim().toLowerCase())) return toast.error('A contact with this email already exists.');
    set('contacts', [...form.contacts, { ...contactDraft, name: contactDraft.name.trim(), email: contactDraft.email.trim(), primary: contactDraft.primary || form.contacts.length === 0 }]);
    setContactDraft(emptyContact);
  };
  const setPrimaryContact = (index) => set('contacts', form.contacts.map((contact, contactIndex) => ({ ...contact, primary: contactIndex === index })));
  const removeContact = (index) => set('contacts', form.contacts.filter((_, contactIndex) => contactIndex !== index));

  return (
    <div className="p-6 space-y-5">
      {/* Page Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={() => navigate("/masters")} 
            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-none">Agent Management</h1>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{agentRecords.length} agents</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
              Travel agents & B2B partners
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-sm w-full mx-0 sm:mx-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-sm transition-all h-8"
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
          
          <button onClick={openCreate} className="btn-primary text-[11px] h-7 px-2.5 flex-shrink-0">
            <Plus className="w-3.5 h-3.5 mr-0.5" /> Add Agent
          </button>
        </div>
      </div>

      {/* Agent List */}
      {filtered.length > 0 ? (
        <>
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(agent => (
            <div key={agent.id} onClick={() => setViewAgent(agent)} className={`bg-white border border-slate-300 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group flex flex-col cursor-pointer ${openMenuId === agent.id ? 'relative z-20' : 'hover:-translate-y-1 overflow-hidden'}`}>
              <div className="p-4 pb-3">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 bg-blue-100 border border-slate-300 shadow-sm rounded-xl flex items-center justify-center overflow-hidden text-blue-700 font-bold text-xs flex-shrink-0">
                      {agent.companyLogo?.url
                        ? <img src={agent.companyLogo.url} alt={agent.name} className="h-full w-full object-cover" />
                        : agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-sm break-words leading-tight">{agent.name}</div>
                      <div className="text-[11px] text-slate-500 break-words mt-0.5">{agent.contactPerson || 'No contact'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <StatusBadge status={agent.status} size="xs" />
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === agent.id ? null : agent.id); }}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      {openMenuId === agent.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1 z-20 fade-in">
                          <button onClick={(e) => { e.stopPropagation(); setViewAgent(agent); setOpenMenuId(null); }} className="menu-action">
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(agent); setOpenMenuId(null); }} className="menu-action">
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteId(agent.id); setOpenMenuId(null); }} className="menu-action text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Meta */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-3">
                  <div className="flex gap-1">
                    <span className="text-slate-400">Market:</span>
                    <span className="font-medium text-slate-700 break-words">{agent.market || '—'}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-slate-400">Currency:</span>
                    <span className="font-medium text-slate-700">{agent.currency || '—'}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-slate-400">Markup:</span>
                    <span className="font-medium text-slate-700">{agent.markup ?? '—'}%</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-slate-400">Terms:</span>
                    <span className="font-medium text-slate-700 break-words line-clamp-2" title={agent.paymentTerms}>{agent.paymentTerms || '—'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Contact</div>
                  {contactsFor(agent).slice(0, 1).map((contact, index) => <div key={`${contact.email || contact.name}-${index}`} className="flex items-center justify-between gap-2 text-[11px]"><div className="min-w-0"><span className="font-medium text-slate-700">{contact.name}</span>{contact.designation && <span className="text-slate-400"> · {contact.designation}</span>}<div className="break-all text-slate-500 mt-0.5 leading-tight">{contact.email || contact.phone || 'No email or phone'}</div></div></div>)}
                  {contactsFor(agent).length > 1 && <div className="text-[10px] text-blue-600">+{contactsFor(agent).length - 1} more contacts</div>}
                </div>
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-3 gap-1 px-2 py-2 bg-slate-50/80 group-hover:bg-slate-100/50 transition-colors rounded-b-2xl mt-auto border-t border-slate-100">
                <div className="text-center overflow-hidden">
                  <div className="text-[11px] font-extrabold text-blue-600 truncate">{fmt(agent.totalSales)}</div>
                  <div className="text-[8px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide truncate">Total Sales</div>
                </div>
                <div className="text-center border-l border-slate-200/60 overflow-hidden">
                  <div className="text-[11px] font-extrabold text-orange-500 truncate">{fmt(agent.outstanding)}</div>
                  <div className="text-[8px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide truncate">Outstanding</div>
                </div>
                <div className="text-center border-l border-slate-200/60 overflow-hidden">
                  <div className="text-[11px] font-extrabold text-emerald-500 truncate">{agent.totalBookings ?? 0}</div>
                  <div className="text-[8px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide truncate">Bookings</div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
          {viewMode === 'rows' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-4 py-3">Agent Name</th>
                    <th className="px-4 py-3">Market</th>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3">Terms</th>
                    <th className="px-4 py-3">Markup</th>
                    <th className="px-4 py-3 text-right">Performance</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((agent) => (
                    <tr key={agent.id} onClick={() => setViewAgent(agent)} className="hover:bg-slate-50 group transition-colors cursor-pointer relative z-10">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden text-blue-700 font-bold text-xs">
                            {agent.companyLogo?.url ? <img src={agent.companyLogo.url} alt={agent.name} className="h-full w-full object-cover" /> : agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="font-semibold text-slate-800 text-[13px] break-words leading-tight">{agent.name}</div>
                            <div className="text-[11px] text-slate-500 break-words mt-0.5">{agent.contactPerson || 'No contact'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">
                        {agent.market || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {agent.currency || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 truncate max-w-[120px]" title={agent.paymentTerms}>
                        {agent.paymentTerms?.split(',')[0] || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {agent.markup ?? '—'}%
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
                          <div className="text-right">
                            <div className="font-bold text-blue-600">{fmt(agent.totalSales)}</div>
                            <div className="text-[9px] uppercase tracking-wide">Sales</div>
                          </div>
                          <div className="w-px h-6 bg-slate-200"></div>
                          <div className="text-right">
                            <div className="font-bold text-orange-500">{fmt(agent.outstanding)}</div>
                            <div className="text-[9px] uppercase tracking-wide">Due</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          <StatusBadge status={agent.status} size="xs" />
                          <div className="w-px h-4 bg-slate-200 ml-1 mr-1"></div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewAgent(agent); }}
                            className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(agent); }}
                            className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(agent.id); }}
                            className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          )}
        </>
      ) : (
        /* Empty State */
        <div className="card p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {search ? `No agents match "${search}"` : 'No agents registered yet'}
          </p>
          {!search && (
            <button onClick={openCreate} className="btn-primary mt-4 mx-auto">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add first agent
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editAgent ? 'Edit Agent' : 'Add Agent'}
        size="lg"
        footer={
          <>
            <button onClick={closeForm} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary text-xs h-8 px-3 flex-shrink-0">Save Agent</button>
          </>
        }
      >
        <div className="bg-slate-50 -mx-6 -my-4 p-3.5 space-y-3">
          {/* Company Info */}
          <div className="bg-white rounded-xl border border-slate-300 p-3.5 shadow-sm relative overflow-hidden">
            <h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2">
              <Building2 className="w-3.5 h-3.5 text-blue-500" /> Company Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="col-span-full sm:col-span-3 lg:col-span-2">
                <label className="form-label text-[10px]">Company Name *</label>
                <input type="text" value={form.name || ''} onChange={e => set('name', e.target.value)} className="form-input text-xs py-1.5" placeholder="Enter company name" />
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                <label className="form-label text-[10px]">Business Type *</label>
                <SearchableSelect value={form.businessType || 'B2B'} onChange={value => set('businessType', value)} options={['B2B', 'B2C']} />
              </div>
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">Company Type *</label>
                <SearchableSelect value={form.companyType || 'PVT'} onChange={value => set('companyType', value)} options={['PVT', 'Partnership', 'LLP', 'Individual']} />
              </div>
            </div>
          </div>

          {/* Contact persons */}
          <div className="bg-white rounded-xl border border-slate-300 p-3.5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <div>
                  <h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider">Contact Persons</h3>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-none">Select a primary contact with the star icon.</p>
                </div>
              </div>
            </div>
            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.25fr_1fr_auto] gap-2 items-end bg-slate-50 rounded-lg border border-slate-200 mb-3"><label><span className="form-label text-[9px] mb-0.5">Name *</span><input value={contactDraft.name} onChange={(event) => setContact('name', event.target.value)} className="form-input text-[11px] py-1" placeholder="Contact name" /></label><label><span className="form-label text-[9px] mb-0.5">Designation</span><input value={contactDraft.designation} onChange={(event) => setContact('designation', event.target.value)} className="form-input text-[11px] py-1" placeholder="Designation" /></label><label><span className="form-label text-[9px] mb-0.5">Email</span><input type="email" value={contactDraft.email} onChange={(event) => setContact('email', event.target.value)} className="form-input text-[11px] py-1" placeholder="Email address" /></label><label><span className="form-label text-[9px] mb-0.5">Phone</span><input value={contactDraft.phone} onChange={(event) => setContact('phone', event.target.value)} className="form-input text-[11px] py-1" placeholder="Phone number" /></label><button type="button" onClick={addContact} className="btn-primary h-[26px] px-2.5 text-[10px]"><Plus className="w-3.5 h-3.5" /> Add</button></div>
            {form.contacts.length > 0 ? <div className="border border-slate-200 rounded-lg overflow-x-auto"><table className="w-full min-w-[650px] text-[11px]"><thead className="bg-slate-50 text-slate-600 text-[9px] uppercase tracking-wider"><tr><th className="px-3 py-1.5 text-left font-semibold">Contact Person</th><th className="px-3 py-1.5 text-left font-semibold">Designation</th><th className="px-3 py-1.5 text-left font-semibold">Email</th><th className="px-3 py-1.5 text-left font-semibold">Phone</th><th className="px-3 py-1.5 text-center font-semibold">Primary</th><th className="px-3 py-1.5 text-right font-semibold">Action</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{form.contacts.map((contact, index) => <tr key={`${contact.email || contact.name}-${index}`}><td className="px-3 py-1.5 font-medium text-slate-700">{contact.name}</td><td className="px-3 py-1.5 text-slate-600">{contact.designation || '—'}</td><td className="px-3 py-1.5 text-slate-600">{contact.email || '—'}</td><td className="px-3 py-1.5 text-slate-600">{contact.phone || '—'}</td><td className="px-3 py-1.5 text-center"><button type="button" onClick={() => setPrimaryContact(index)} title="Set as primary" className={`p-0.5 rounded ${contact.primary ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}><Star className={`w-3.5 h-3.5 ${contact.primary ? 'fill-current' : ''}`} /></button></td><td className="px-3 py-1.5 text-right"><button type="button" onClick={() => removeContact(index)} className="p-0.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button></td></tr>)}</tbody></table></div> : <div className="px-2 py-2 text-[10px] text-slate-400 text-center">No contacts added yet.</div>}
          </div>

          {canManageCredentials && (
            <div className="bg-white rounded-xl border border-indigo-200 p-3.5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-3 border-b border-indigo-100 pb-2">
                <div><h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider">Agent portal credentials</h3><p className="mt-0.5 text-[9px] text-slate-400">The agent can sign in using this login code or their primary email.</p></div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700"><input type="checkbox" checked={form.portalEnabled !== false} onChange={(event) => set('portalEnabled', event.target.checked)} className="accent-indigo-600" /> Portal enabled</label>
              </div>
              {form.portalEnabled !== false && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label><span className="form-label text-[10px]">Login Code (auto-generated)</span><input value={form.loginCode || ''} onChange={(event) => set('loginCode', event.target.value.toUpperCase())} className="form-input text-xs py-1.5 font-mono" placeholder={editAgent ? 'Existing code or leave blank' : 'Leave blank: AG001'} /><span className="mt-1 block text-[9px] text-slate-400">A short unique code such as AG001 is generated when blank. You may enter a custom code using letters, numbers, hyphens, or underscores.</span></label>
                <label><span className="form-label text-[10px]">{editAgent ? 'Reset Password' : 'Temporary Password'}</span><div className="relative"><input type={showPortalPassword ? 'text' : 'password'} value={form.portalPassword || ''} onChange={(event) => set('portalPassword', event.target.value)} className="form-input text-xs py-1.5 pr-9" placeholder={editAgent ? 'Leave blank to keep the current password' : 'Leave blank: Agent@123'} autoComplete="new-password" /><button type="button" onClick={() => setShowPortalPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" title={showPortalPassword ? 'Hide password' : 'Show password'}>{showPortalPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button></div><span className="mt-1 block text-[9px] text-slate-400">For a new agent, a blank password uses the matching simple pattern, for example Agent@123. An Administrator can reveal or reset it later.</span></label>
              </div>}
            </div>
          )}

          {/* Location */}
          <div className="bg-white rounded-xl border border-slate-300 p-3.5 shadow-sm relative overflow-hidden">
            <h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2">
              <MapPin className="w-3.5 h-3.5 text-blue-500" /> Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">Country</label>
                <SearchableSelect value={form.country || ''} onChange={value => { set('country', value); set('state', ''); set('city', ''); }} options={countries.map(c => c.name)} placeholder="Select country" />
              </div>
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">State</label>
                <SearchableSelect value={form.state || ''} onChange={value => { set('state', value); set('city', ''); }} options={states} placeholder="Select state" isDisabled={!form.country} />
              </div>
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">City</label>
                <SearchableSelect value={form.city || ''} onChange={value => set('city', value)} options={cities} placeholder="Select city" isDisabled={!form.state} />
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                <label className="form-label text-[10px]">Market</label>
                <SearchableSelect value={form.market || ''} onChange={value => set('market', value)} options={markets.map(m => m.name)} placeholder="Select market" />
              </div>
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">Landline</label>
                <input type="text" value={form.landline || ''} onChange={e => set('landline', e.target.value)} className="form-input text-xs py-1.5" />
              </div>
              <div className="col-span-full lg:col-span-2">
                <label className="form-label text-[10px]">Address</label>
                <input type="text" value={form.address || ''} onChange={e => set('address', e.target.value)} className="form-input text-xs py-1.5" placeholder="Full address" />
              </div>
            </div>
          </div>

          {/* Finance & Setup */}
          <div className="bg-white rounded-xl border border-slate-300 p-3.5 shadow-sm relative overflow-hidden">
            <h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Finance & Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">Sales Person *</label>
                <input type="text" value={form.salesPerson || 'TripNest'} onChange={e => set('salesPerson', e.target.value)} className="form-input text-xs py-1.5" />
              </div>
              <div className="col-span-1 lg:col-span-1">
                <label className="form-label text-[10px]">Currency</label>
                <SearchableSelect value={form.currency || 'INR'} onChange={value => set('currency', value)} options={currencies.map(c => c.name)} />
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">Markup Category *</label>
                <SearchableSelect value={form.markupCategory || ''} onChange={value => { const category = markupCategories.find(item => item.name === value); setForm(current => ({ ...current, markupCategory: value, markup: Number(category?.markupPercent || 0) })); }} options={markupCategories} placeholder="Select markup category" />
              </div>
              <div className="col-span-1 lg:col-span-1">
                <label className="form-label text-[10px]">Markup %</label>
                <input type="number" value={form.markup || ''} readOnly className="form-input text-xs py-1.5 bg-slate-100 text-slate-500 cursor-not-allowed" title="Markup is set by the selected markup category" />
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">Credit Limit (฿)</label>
                <input type="number" value={form.creditLimit || 100000} onChange={e => set('creditLimit', Number(e.target.value))} className="form-input text-xs py-1.5" />
              </div>
              <div className="col-span-full sm:col-span-2 lg:col-span-2">
                <label className="form-label text-[10px]">Payment Terms</label>
                <SearchableSelect value={form.paymentTerms || ''} onChange={value => set('paymentTerms', value)} options={paymentTermsOptions} placeholder="Select payment terms" />
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="form-label text-[10px]">Status</label>
                <SearchableSelect value={form.status || 'Active'} onChange={value => set('status', value)} options={['Active', 'Inactive']} />
              </div>
              <div className="col-span-1 sm:col-span-3 lg:col-span-3">
                <label className="form-label text-[10px]">GST Number</label>
                <input type="text" value={form.gstNumber || ''} onChange={e => set('gstNumber', e.target.value)} className="form-input text-xs py-1.5" />
              </div>
              <div className="col-span-1 sm:col-span-3 lg:col-span-3">
                <label className="form-label text-[10px]">State GST Code</label>
                <input type="text" value={form.stateGstCode || ''} onChange={e => set('stateGstCode', e.target.value)} className="form-input text-xs py-1.5" />
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-xl border border-slate-300 p-3.5 shadow-sm relative overflow-hidden">
            <h3 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2">
              <Paperclip className="w-3.5 h-3.5 text-blue-500" /> Attachments & Notes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div className="col-span-1 flex flex-col gap-1">
                 <label className="form-label text-[10px] mb-0">Company Logo</label>
                 {(() => {
                   const existingUrl = typeof form.companyLogo === 'string' ? form.companyLogo : form.companyLogo?.url;
                   return existingUrl && !attachments.companyLogo && (
                     <div className="flex items-center gap-2 mb-0.5">
                       <img src={existingUrl} alt="Current" className="w-6 h-6 object-cover rounded border border-slate-200" />
                       <a href={existingUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate">View current logo</a>
                     </div>
                   )
                 })()}
                 <input type="file" accept="image/*" onChange={e => setAttachments(v => ({ ...v, companyLogo: e.target.files?.[0] || null }))} className={`form-input p-0.5 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold cursor-pointer transition-colors ${attachments.companyLogo || form.companyLogo ? 'file:bg-green-100 file:text-green-700 bg-green-50/50 border-green-200' : 'file:bg-blue-50 file:text-blue-700'}`} />
               </div>
               <div className="col-span-1 flex flex-col gap-1">
                 <label className="form-label text-[10px] mb-0">Declaration Upload</label>
                 {form.declaration?.url && !attachments.declaration && (
                   <div className="flex items-center gap-2 mb-0.5">
                     <a href={form.declaration.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate">View current document</a>
                   </div>
                 )}
                 <input type="file" accept="image/*,application/pdf" onChange={e => setAttachments(v => ({ ...v, declaration: e.target.files?.[0] || null }))} className={`form-input p-0.5 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold cursor-pointer transition-colors ${attachments.declaration || form.declaration ? 'file:bg-green-100 file:text-green-700 bg-green-50/50 border-green-200' : 'file:bg-blue-50 file:text-blue-700'}`} />
               </div>
               <div className="col-span-full">
                 <label className="form-label text-[10px]">Notes</label>
                 <input type="text" value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="form-input text-xs py-1.5" placeholder="Any additional notes" />
               </div>
             </div>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewAgent}
        onClose={() => setViewAgent(null)}
        title={viewAgent?.name || 'Agent Details'}
        size="lg"
        footer={
          <>
            <button onClick={() => setViewAgent(null)} className="btn-secondary">Close</button>
            <button onClick={() => { const a = viewAgent; setViewAgent(null); openEdit(a); }} className="btn-primary text-xs h-8 px-3 flex-shrink-0">
              <Edit className="w-4 h-4" /> Edit Agent
            </button>
          </>
        }
      >
        {viewAgent && (
          <div className="space-y-3">
            {/* Agent Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-300 p-2.5 shadow-sm">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-300 shadow-sm flex items-center justify-center text-blue-600 text-lg font-bold flex-shrink-0">
                  {viewAgent.companyLogo?.url
                    ? <img src={viewAgent.companyLogo.url} alt={viewAgent.name} className="w-full h-full object-cover" />
                    : viewAgent.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <div className="text-base font-bold text-slate-900 leading-tight break-words">{viewAgent.name}</div>
                    <StatusBadge status={viewAgent.status} size="xs" />
                  </div>
                  <div className="text-xs text-slate-500 break-words">{viewAgent.contactPerson || 'No contact person'}</div>
                </div>
              </div>
              
              {/* Attachments */}
              {(viewAgent.companyLogo?.url || viewAgent.declaration?.url) && (
                <div className="flex gap-2 sm:flex-shrink-0 flex-wrap">
                  {viewAgent.companyLogo?.url && (
                    <a href={viewAgent.companyLogo.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-slate-300 shadow-sm text-blue-600 text-[11px] font-bold hover:bg-blue-100 transition-all">
                      <Image className="w-3.5 h-3.5" /> Logo
                    </a>
                  )}
                  {viewAgent.declaration?.url && (
                    <a href={viewAgent.declaration.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-slate-300 shadow-sm text-purple-600 text-[11px] font-bold hover:bg-purple-100 transition-all">
                      <FileText className="w-3.5 h-3.5" /> Declaration
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Details Grid: 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              
              {/* Col 1: Business Profile */}
              <div className="bg-white rounded-xl p-3 border border-slate-300 shadow-[0_1px_3px_rgb(0,0,0,0.02)]">
                <h4 className="text-[11px] font-bold text-slate-800 mb-2.5 uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Business Profile</h4>
                <div className="space-y-2">
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Business Type</div><div className="text-xs font-medium text-slate-800">{viewAgent.businessType || '—'} {viewAgent.companyType && `(${viewAgent.companyType})`}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Market</div><div className="text-xs font-medium text-slate-800">{viewAgent.market || '—'}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Location</div><div className="text-xs font-medium text-slate-800">{[viewAgent.city, viewAgent.state, viewAgent.country].filter(Boolean).join(', ') || '—'}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Address</div><div className="text-xs font-medium text-slate-800 break-words leading-tight">{viewAgent.address || '—'}</div></div>
                </div>
              </div>

              {/* Col 2: Contact Info */}
              <div className="bg-white rounded-xl p-3 border border-slate-300 shadow-[0_1px_3px_rgb(0,0,0,0.02)]">
                <h4 className="text-[11px] font-bold text-slate-800 mb-2.5 uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-orange-500" /> Contact Info</h4>
                <div className="space-y-2">
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Sales Person</div><div className="text-xs font-medium text-slate-800">{viewAgent.salesPerson || '—'}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Email</div><div className="text-xs font-medium text-slate-800 break-all">{viewAgent.email || '—'}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Phone</div><div className="text-xs font-medium text-slate-800">{viewAgent.phone || '—'}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Landline</div><div className="text-xs font-medium text-slate-800">{viewAgent.landline || '—'}</div></div>
                </div>
              </div>

              {/* Col 3: Finance & Tax */}
              <div className="bg-white rounded-xl p-3 border border-slate-300 shadow-[0_1px_3px_rgb(0,0,0,0.02)]">
                <h4 className="text-[11px] font-bold text-slate-800 mb-2.5 uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-green-500" /> Finance & Tax</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Currency</div><div className="text-xs font-medium text-slate-800">{viewAgent.currency || '—'}</div></div>
                    <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Markup</div><div className="text-xs font-medium text-slate-800">{viewAgent.markup !== undefined ? `${viewAgent.markup}%` : '—'}</div></div>
                  </div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Credit Limit</div><div className="text-xs font-medium text-slate-800">{fmt(viewAgent.creditLimit)}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">Payment Terms</div><div className="text-xs font-medium text-slate-800 leading-tight">{viewAgent.paymentTerms || '—'}</div></div>
                  <div><div className="text-[9px] text-slate-400 font-semibold uppercase">GST / State Code</div><div className="text-xs font-medium text-slate-800">{viewAgent.gstNumber || '—'} {viewAgent.stateGstCode ? `(${viewAgent.stateGstCode})` : ''}</div></div>
                </div>
              </div>
            </div>

            {canManageCredentials && <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Agent portal</div><div className="mt-0.5 text-xs font-semibold text-slate-700">Login code: <span className="font-mono">{viewAgent.loginCode || 'Not configured'}</span></div></div><button type="button" onClick={() => revealCredentials(viewAgent)} className="btn-secondary h-8 px-3 text-xs border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100"><Eye className="h-3.5 w-3.5" /> Reveal credentials</button></div>
              <p className="mt-1.5 text-[10px] text-indigo-700">Only Administrators can reveal or reset a saved password. Use this only to send the agent their access details securely.</p>
            </div>}

            {/* Notes */}
            {viewAgent.notes && (
              <div className="bg-yellow-50/50 rounded-xl p-2.5 border border-slate-300">
                <div className="text-[9px] text-yellow-600 font-semibold uppercase tracking-wider mb-1">Notes</div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{viewAgent.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(revealedCredentials)} onClose={() => setRevealedCredentials(null)} title="Agent login credentials" size="sm" footer={<button onClick={() => setRevealedCredentials(null)} className="btn-primary">Close</button>}>
        {revealedCredentials && <div className="space-y-3"><p className="text-sm text-slate-600">Send these credentials securely to <b>{revealedCredentials.agent.name}</b>.</p><div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm"><div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Login code</div><div className="mt-1 select-all font-mono font-bold text-slate-900">{revealedCredentials.loginCode || 'Not configured'}</div><div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-indigo-600">Password</div><div className="mt-1 select-all font-mono font-bold text-slate-900">{revealedCredentials.password || 'Reset the password to issue portal access.'}</div></div><p className="text-[11px] text-amber-700">Do not paste these credentials into public chats or save them in shared documents.</p></div>}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          try { await deleteAgent(deleteId); toast.success('Agent deleted.'); }
          catch (err) { toast.error(err.message); }
        }}
        title="Delete Agent"
        message="Are you sure you want to delete this agent? This action cannot be undone."
      />

      {/* Close menu backdrop */}
      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
}
