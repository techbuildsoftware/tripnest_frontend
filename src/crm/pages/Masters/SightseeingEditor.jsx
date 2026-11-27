import React, { useEffect, useState } from 'react';
import { ArrowLeft, ImagePlus, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';
import SearchableSelect from '../../components/ui/SearchableSelect';
import RichTextEditor from '../../components/ui/RichTextEditor';
import useOperationsMaster from '../../hooks/useOperationsMaster';

const empty = () => ({ name: '', status: 'Active', activityType: 'Standard Activity', destination: '', duration: '', timing: '', operatingDays: [], items: [], childAgeSlabs: [], images: [], details: '', termsHtml: '', usefulInformation: '' });
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SightseeingEditor() {
  const navigate = useNavigate();
  const { sightseeingId } = useParams();
  // The explicit /masters/sightseeing/new route has no route parameter.
  // Older links may include the literal "new", so support both forms.
  const isNew = !sightseeingId || sightseeingId === 'new';
  const destinations = useOperationsMaster('destinations');
  const [form, setForm] = useState(empty());
  const [itemDraft, setItemDraft] = useState('');
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [slabDraft, setSlabDraft] = useState({ minAge: '', maxAge: '' });
  const [newImages, setNewImages] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Reuse items that have already been saved on other sightseeing records.
  // This keeps wording consistent for pricing and quotation/PDF output.
  useEffect(() => {
    let active = true;
    apiClient.get('/activity-masters/sightseeing').then((response) => {
      const values = [...new Set(response.data.flatMap((record) => record.items || []).map((item) => String(item).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      if (active) setItemSuggestions(values);
    }).catch(() => { /* The form remains usable if suggestions cannot load. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isNew) { setForm(empty()); setLoading(false); return; }
    let active = true;
    apiClient.get(`/activity-masters/sightseeing/${encodeURIComponent(sightseeingId)}`).then((response) => {
      const record = response.data;
      if (active) setForm({ ...empty(), ...record, items: record.items || [], childAgeSlabs: record.childAgeSlabs || [], images: record.images || (record.image ? [record.image] : []) });
    }).catch((error) => { toast.error(error.message); navigate('/app/masters/sightseeing'); }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [isNew, sightseeingId, navigate]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const addItem = (selectedItem = itemDraft) => {
    const value = String(selectedItem || '').trim();
    if (!value) return toast.error('Enter an item name first.');
    if (form.items.some((item) => item.toLowerCase() === value.toLowerCase())) return toast.error('That item has already been added.');
    set('items', [...form.items, value]); setItemDraft('');
  };
  const matchingItems = itemDraft.trim().length ? itemSuggestions.filter((item) => item.toLowerCase().includes(itemDraft.trim().toLowerCase()) && !form.items.some((selected) => selected.toLowerCase() === item.toLowerCase())).slice(0, 8) : [];
  const addSlab = () => {
    const minAge = Number(slabDraft.minAge); const maxAge = Number(slabDraft.maxAge);
    if (slabDraft.minAge === '' || slabDraft.maxAge === '' || minAge < 0 || maxAge < minAge) return toast.error('Enter a valid child age range.');
    set('childAgeSlabs', [...form.childAgeSlabs, { minAge, maxAge }]); setSlabDraft({ minAge: '', maxAge: '' });
  };
  const removeSavedImage = (index) => {
    const images = form.images.filter((_, imageIndex) => imageIndex !== index);
    setForm((current) => ({ ...current, images, image: images[0] || null }));
  };
  const save = async () => {
    if (!form.name.trim() || !form.destination) return toast.error('Activity name and destination are required.');
    setSaving(true);
    try {
      let images = form.images || [];
      if (newImages.length) {
        const data = new FormData(); newImages.forEach((image) => data.append('activityImages', image));
        const response = await apiClient.upload('/uploads?folder=sightseeing', data);
        images = [...images, ...response.data.filter((file) => file.field === 'activityImages')];
      }
      const payload = { ...form, images, image: images[0] || null };
      if (isNew) await apiClient.post('/activity-masters/sightseeing', payload);
      else await apiClient.put(`/activity-masters/sightseeing/${encodeURIComponent(form.id || sightseeingId)}`, payload);
      toast.success(isNew ? 'Sightseeing created.' : 'Sightseeing updated.');
      navigate('/app/masters/sightseeing');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-[55vh] flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /></div>;
  return <div className="p-6 max-w-[1900px] mx-auto">
    <div className="flex items-center justify-between gap-3 mb-5"><div><h1 className="text-base font-bold text-slate-900 leading-none">{isNew ? 'Add Sightseeing' : 'Edit Sightseeing'}</h1><p className="text-[10px] text-slate-500 mt-0.5 leading-none">Create activities, items, child age slabs and PDF-ready details.</p></div><button type="button" onClick={() => navigate('/app/masters/sightseeing')} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Back</button></div>
    <div className="card p-5 lg:p-6"><div className="grid grid-cols-1 xl:grid-cols-2 gap-7 xl:gap-8">
      <section className="space-y-4"><h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><span className="text-blue-600">→</span> Sightseeing Information</h2>
        <label><span className="form-label">Activity Name *</span><input className="form-input" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Enter activity name" /></label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><label><span className="form-label">Status</span><SearchableSelect value={form.status} onChange={(value) => set('status', value)} options={['Active', 'Inactive']} /></label><label><span className="form-label">Activity Type</span><SearchableSelect value={form.activityType} onChange={(value) => set('activityType', value)} options={['Standard Activity', 'Private Activity', 'Ticket Only']} /></label></div>
        <div><span className="form-label">Add More Items</span><div className="flex gap-2"><div className="relative flex-1"><input className="form-input" autoComplete="off" value={itemDraft} onChange={(event) => setItemDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addItem(); } }} placeholder="Search or enter an item name" />{matchingItems.length > 0 && <div className="absolute z-30 top-full mt-1 left-0 right-0 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">{matchingItems.map((item) => <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addItem(item)} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">{item}</button>)}</div>}</div><button type="button" onClick={() => addItem()} className="btn-secondary px-3" title="Add item"><Plus className="w-3.5 h-3.5 mr-1" /></button></div><p className="mt-1.5 text-xs text-slate-400">Suggestions are taken from items already saved in sightseeing records.</p>{form.items.length > 0 && <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-2 text-left w-14">Sr.</th><th className="px-3 py-2 text-left">Item Name</th><th className="px-3 py-2 w-14" /></tr></thead><tbody>{form.items.map((item, index) => <tr key={`${item}-${index}`} className="border-t border-slate-100"><td className="px-3 py-2 text-slate-500">{index + 1}</td><td className="px-3 py-2 text-slate-700">{item}</td><td className="px-3 py-2"><button type="button" onClick={() => set('items', form.items.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody></table></div>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><label><span className="form-label">Destination *</span><SearchableSelect value={form.destination} onChange={(value) => set('destination', value)} options={destinations} placeholder="Select destination" /></label><label><span className="form-label">Activity Images</span><div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2"><input type="file" accept="image/*" multiple onChange={(event) => setNewImages(Array.from(event.target.files || []))} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-blue-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-700" /></div></label><label><span className="form-label">Tour Duration</span><input className="form-input" value={form.duration || ''} onChange={(event) => set('duration', event.target.value)} placeholder="e.g. 4 hours" /></label><label><span className="form-label">Timings</span><input className="form-input" value={form.timing || ''} onChange={(event) => set('timing', event.target.value)} placeholder="e.g. 09:00 to 13:00" /></label></div>
        {(form.images.length > 0 || newImages.length > 0) && <div className="flex flex-wrap gap-2">{form.images.map((image, index) => <div key={image.key || index} className="relative"><img src={image.url} alt={image.name || ''} className="w-16 h-16 rounded-lg object-cover border border-slate-200" /><button type="button" onClick={() => removeSavedImage(index)} className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-white text-red-500 shadow border border-slate-200"><X className="w-3 h-3" /></button></div>)}{newImages.map((image, index) => <div key={`${image.name}-${index}`} className="w-16 h-16 rounded-lg border border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center px-1 text-center text-[10px] text-blue-700"><ImagePlus className="w-4 h-4 mb-1" />New</div>)}</div>}
        <label><span className="form-label">Operating Days</span><SearchableSelect isMulti value={form.operatingDays || []} onChange={(value) => set('operatingDays', value.includes('All') ? days : value)} options={['All', ...days]} placeholder="Select operating days" /></label>
      </section>
      <section className="space-y-4"><h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><span className="text-blue-600">→</span> Other Information</h2>
        <div className="rounded-lg border border-slate-200 overflow-hidden"><div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] items-end gap-2 px-3 py-3 bg-slate-50"><span className="form-label mb-2 sm:mb-1">Create Child Age Slab</span><input type="number" min="0" className="form-input" value={slabDraft.minAge} onChange={(event) => setSlabDraft((current) => ({ ...current, minAge: event.target.value }))} placeholder="Min age" /><input type="number" min="0" className="form-input" value={slabDraft.maxAge} onChange={(event) => setSlabDraft((current) => ({ ...current, maxAge: event.target.value }))} placeholder="Max age" /><button type="button" onClick={addSlab} className="btn-secondary px-3" title="Add child age slab"><Plus className="w-3.5 h-3.5 mr-1" /></button></div>{form.childAgeSlabs.length > 0 && <table className="w-full text-sm"><thead className="bg-slate-700 text-white"><tr><th className="px-3 py-2 text-left w-14">Sr.</th><th className="px-3 py-2 text-left">Child Age</th><th className="px-3 py-2 w-14" /></tr></thead><tbody>{form.childAgeSlabs.map((slab, index) => <tr key={`${slab.minAge}-${slab.maxAge}-${index}`} className="border-t border-slate-200"><td className="px-3 py-2">{index + 1}</td><td className="px-3 py-2">{slab.minAge} yrs – {slab.maxAge} yrs</td><td className="px-3 py-2"><button type="button" onClick={() => set('childAgeSlabs', form.childAgeSlabs.filter((_, slabIndex) => slabIndex !== index))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody></table>}</div>
        <label><span className="form-label">Details <small className="font-normal text-slate-400">(PDF-ready rich text)</small></span><RichTextEditor value={form.details || ''} onChange={(value) => set('details', value)} /></label>
        <label><span className="form-label">Terms & Conditions <small className="font-normal text-slate-400">(shown on the voucher)</small></span><RichTextEditor value={form.termsHtml || ''} onChange={(value) => set('termsHtml', value)} /></label>
        <label><span className="form-label">Useful Information</span><textarea rows="3" className="form-input" value={form.usefulInformation || ''} onChange={(event) => set('usefulInformation', event.target.value)} placeholder="Useful instructions, inclusions or notes" /></label>
      </section>
    </div><div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100"><button type="button" onClick={() => navigate('/app/masters/sightseeing')} className="btn-secondary">Cancel</button><button type="button" disabled={saving} onClick={save} className="btn-primary text-xs h-8 px-3 flex-shrink-0">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{isNew ? 'Save Sightseeing' : 'Update Sightseeing'}</button></div></div>
  </div>;
}
