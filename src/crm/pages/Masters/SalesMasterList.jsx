import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Plus, Search, Tag, Trash2, ArrowLeft, Eye, Calendar, Hash } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { apiClient } from "../../lib/api";
import SearchableSelect from "../../components/ui/SearchableSelect";
import useSystemMaster from "../../hooks/useSystemMaster";
import { formatDate } from "../../lib/date";
import PageLoader from "../../components/ui/PageLoader";

const LABELS = {
  markets: "Market",
  "lead-sources": "Lead Source",
  "query-types": "Query Type",
  "hotel-categories": "Hotel Category",
  "room-types": "Room Type",
  "room-categories": "Room Category",
  "meal-plans": "Meal Plan",
  amenities: "Amenity",
  "markup-categories": "Markup Category",
  destinations: "Destination",
  locations: "Location",
};

const HINTS = {
  markets: "Geographic markets used across agents and queries",
  "lead-sources": "Marketing and referral channels for incoming queries",
  "query-types": "Category types assigned to customer queries",
  "hotel-categories": "Star ratings and hotel classification levels",
  "room-types": "Room configurations available across hotels",
  "room-categories": "Room classifications used when creating hotel rate contracts",
  "meal-plans": "Meal plan options: BB, HB, FB, AI, etc.",
  amenities: "Hotel facilities and amenities list",
  "markup-categories": "Reusable agent markup percentages",
  destinations: "Destinations used by hotels, transfers and operations",
  locations: "Specific locations and landmarks within destinations",
};

const TYPE_COLORS = {
  markets: "bg-blue-100 text-blue-600",
  "lead-sources": "bg-orange-100 text-orange-600",
  "query-types": "bg-purple-100 text-purple-600",
  "hotel-categories": "bg-amber-100 text-amber-600",
  "room-types": "bg-green-100 text-green-600",
  "room-categories": "bg-emerald-100 text-emerald-600",
  "meal-plans": "bg-rose-100 text-rose-600",
  amenities: "bg-teal-100 text-teal-600",
  "markup-categories": "bg-indigo-100 text-indigo-600",
  destinations: "bg-sky-100 text-sky-600",
  locations: "bg-cyan-100 text-cyan-600",
};

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-xs font-medium text-slate-800 leading-snug">{value}</div>
    </div>
  );
}

export default function SalesMasterList({ type }) {
  const navigate = useNavigate();
  const title = LABELS[type] || type;
  const hint = HINTS[type] || "Manage master data";
  const chipColor = TYPE_COLORS[type] || "bg-slate-100 text-slate-600";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const emptyForm = () => ({ name: "", status: "Active", ...(type === "query-types" ? { feedbackTypes: [] } : {}), ...(type === "room-types" ? { size: "" } : {}), ...(type === "markup-categories" ? { markupPercent: "" } : {}) });
  const [form, setForm] = useState(emptyForm);
  const feedbackTypes = useSystemMaster("feedback-types");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/sales-masters/${type}`);
      setItems(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setItems([]);
    setSearch("");
    load();
  }, [type]);

  const open = (item = null) => {
    setEditing(item);
    setForm(item
      ? { ...item, ...(type === "query-types" ? { feedbackTypes: item.feedbackTypes || [] } : {}), ...(type === "room-types" ? { size: item.size || "" } : {}), ...(type === "markup-categories" ? { markupPercent: item.markupPercent ?? "" } : {}) }
      : emptyForm()
    );
    setIsOpen(true);
  };

  const close = () => { setEditing(null); setIsOpen(false); };

  const save = async () => {
    if (!form.name.trim()) return toast.error(`${title} name is required.`);
    try {
      const payload = type === "query-types"
        ? form
        : { name: form.name, status: form.status, ...(type === "room-types" ? { size: form.size } : {}), ...(type === "markup-categories" ? { markupPercent: Number(form.markupPercent) } : {}) };
      const res = editing
        ? await apiClient.put(`/sales-masters/${type}/${editing.id}`, payload)
        : await apiClient.post(`/sales-masters/${type}`, payload);
      setItems(all => editing ? all.map(x => (x.id === editing.id ? res.data : x)) : [...all, res.data]);
      close();
      toast.success(`${title} saved.`);
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/sales-masters/${type}/${deleteId}`);
      setItems(all => all.filter(x => x.id !== deleteId));
      toast.success(`${title} deleted.`);
    } catch (err) { toast.error(err.message); }
  };

  const filtered = items.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => navigate("/masters")} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0 mt-0.5" title="Go Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">{title}</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">{loading ? "Loading records..." : `${items.length} ${items.length === 1 ? "record" : "records"}`} · {hint}</p>
          </div>
        </div>
        <div className="flex-1 max-w-xl mx-0 md:mx-8">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all" placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <button onClick={() => open()} className="btn-primary text-xs h-8 px-3 flex-shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add {title}
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageLoader label={`Loading ${title.toLowerCase()} records...`} /> : <><div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="table-header">Name</th>
                {type === "query-types" && <th className="table-header">Feedback Types</th>}
                {type === "room-types" && <th className="table-header">Size</th>}
                {type === "markup-categories" && <th className="table-header">Markup %</th>}
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(item => (
                <tr key={item.id} className="table-row hover:bg-primary-50/30 cursor-pointer" onClick={() => setViewing(item)}>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${chipColor}`}>
                        <Tag className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-900">{item.name}</span>
                    </div>
                  </td>
                  {type === "query-types" && <td className="table-cell text-slate-500">{item.feedbackTypes?.join(", ") || "—"}</td>}
                  {type === "room-types" && <td className="table-cell text-slate-500">{item.size || "—"}</td>}
                  {type === "markup-categories" && <td className="table-cell text-slate-700 font-medium">{item.markupPercent}%</td>}
                  <td className="table-cell">
                    <span className={item.status === "Active" ? "badge badge-green" : "badge badge-red"}>{item.status}</span>
                  </td>
                  <td className="table-cell text-slate-400">{formatDate(item.createdAt)}</td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setViewing(item); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); open(item); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><Tag className="w-6 h-6 text-slate-300" /></div>
            <p className="text-sm font-medium text-slate-500">{search ? `No ${title.toLowerCase()}s match "${search}"` : `No ${title.toLowerCase()}s yet`}</p>
            {!search && <button onClick={() => open()} className="btn-primary mt-4 mx-auto"><Plus className="w-3.5 h-3.5 mr-1" /> Add first {title}</button>}
          </div>
        )}</>}
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || `${title} Details`} size="md"
        footer={<><button onClick={() => setViewing(null)} className="btn-secondary">Close</button><button onClick={() => { const v = viewing; setViewing(null); open(v); }} className="btn-primary text-xs h-8 px-3 flex-shrink-0"><Edit className="w-4 h-4" /> Edit {title}</button></>}>
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-200 p-3 shadow-sm">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${chipColor}`}>{viewing.name?.charAt(0)?.toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <div className="text-base font-bold text-slate-900 leading-tight break-words">{viewing.name}</div>
                  <span className={viewing.status === "Active" ? "badge badge-green" : "badge badge-red"}>{viewing.status}</span>
                </div>
                <div className="text-xs text-slate-500">{title} · {hint}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-blue-400" /> Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" value={viewing.name} />
                <Field label="Status" value={viewing.status} />
                {type === "room-types" && <Field label="Room Size" value={viewing.size} />}
                {type === "markup-categories" && <Field label="Markup %" value={viewing.markupPercent !== undefined ? `${viewing.markupPercent}%` : undefined} />}
                {type === "query-types" && (
                  <div className="col-span-2">
                    <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Feedback Types</div>
                    {viewing.feedbackTypes?.length ? (
                      <div className="flex flex-wrap gap-1">{viewing.feedbackTypes.map(ft => <span key={ft} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-medium border border-purple-100">{ft}</span>)}</div>
                    ) : <div className="text-xs text-slate-400">—</div>}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Record Info</h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Created" value={formatDate(viewing.createdAt)} />
                <Field label="Last Updated" value={formatDate(viewing.updatedAt)} />
                <Field label="ID" value={viewing.id} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isOpen} onClose={close} title={`${editing ? "Edit" : "Add"} ${title}`} size={type === "query-types" ? "lg" : "md"}
        footer={<><button className="btn-secondary py-1 text-sm" onClick={close}>Cancel</button><button className="btn-primary py-1 text-sm flex-shrink-0" onClick={save}>Save {title}</button></>}>
        <div className="bg-white -mx-6 -my-4 p-4">
          <div className={`grid gap-3 grid-cols-1 ${["query-types","room-types","markup-categories"].includes(type) ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <label>
              <span className="form-label text-[10px]">Name *</span>
              <input className="form-input text-xs py-1.5" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} placeholder={`Enter ${title.toLowerCase()} name`} />
            </label>
            {type === "query-types" && (
              <label>
                <span className="form-label text-[10px]">Feedback Types</span>
                <SearchableSelect compact isMulti options={feedbackTypes} value={form.feedbackTypes} onChange={value => setForm(v => ({ ...v, feedbackTypes: value }))} placeholder="Select feedback types" />
                <p className="text-[10px] text-slate-400 mt-1">Managed from the Feedback Types system master.</p>
              </label>
            )}
            {type === "room-types" && <label><span className="form-label text-[10px]">Room Size</span><input className="form-input text-xs py-1.5" value={form.size || ""} onChange={e => setForm(v => ({ ...v, size: e.target.value }))} placeholder="e.g. 35 sq m" /></label>}
            {type === "markup-categories" && <label><span className="form-label text-[10px]">Markup % *</span><input type="number" min="0" max="100" step="0.01" className="form-input text-xs py-1.5" value={form.markupPercent} onChange={e => setForm(v => ({ ...v, markupPercent: e.target.value }))} placeholder="e.g. 15" /></label>}
            <label>
              <span className="form-label text-[10px]">Status</span>
              <SearchableSelect compact value={form.status} onChange={value => setForm(v => ({ ...v, status: value }))} options={["Active","Inactive"]} />
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={`Delete ${title}`} message={`Are you sure you want to delete this ${title.toLowerCase()}? This action cannot be undone.`} />
    </div>
  );
}
