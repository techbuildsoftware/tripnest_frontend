import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Save, Ship } from 'lucide-react';
import { apiClient } from '../../../lib/api';
import useOperationsMaster from '../../../hooks/useOperationsMaster';
import { Badge } from './YachtUI';
import { BasicTab, DocumentsTab, ImagesTab, InclusionsTab, PickupTab, PoliciesTab, RatesTab, SpecsTab } from './YachtSections';

const tabs = [
  ['basic', 'Basic Details'], ['rates', 'Rates & Seasons'], ['specs', 'Yacht Specifications'], ['images', 'Images & Layout'],
  ['inclusions', 'Inclusions & Exclusions'], ['pickup', 'Pickup & Route'], ['policies', 'Policies'], ['documents', 'Documents'],
];
const defaults = () => ({ name: '', type: 'Luxury Motor Yacht', destination: '', category: 'Private Charter', startingPier: '', googleMapLink: '', maxCapacity: 20, recommendedPax: 12, weekdayDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], weekendDays: ['Saturday', 'Sunday'], status: 'Active', supplierIds: [], brand: '', year: '', length: '', width: '', cruisingSpeed: '', engineType: '', cabins: 0, bathrooms: 0, crewIncluded: 'Captain + 2 Crew', crewLanguage: 'Thai / English', maxOvernightPax: 0, durationOptions: ['3 Hours', '4 Hours'], amenities: { onboardBBQ: false, jacuzzi: false, waterSlide: false, snorkelingEquipment: false, fishingEquipment: false, kayakSUP: false, towelsProvided: false, lifeJackets: true, airConditioning: false, soundSystem: false, flybridge: false, insurance: true }, description: '', rates: [], images: [], documents: [], inclusions: [], exclusions: [], route: {}, policies: {} });

export default function YachtEditor({ yacht, onBack, onSaved }) {
  const destinations = useOperationsMaster('destinations');
  const [activeTab, setActiveTab] = useState('basic');
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(() => ({ ...defaults(), ...yacht, startingPier: yacht.startingPier || yacht.route?.pickupPier || '', amenities: { ...defaults().amenities, ...(yacht.amenities || {}) }, route: yacht.route || {}, policies: yacht.policies || {}, rates: yacht.rates || [], images: yacht.images || [], documents: yacht.documents || [], inclusions: yacht.inclusions || [], exclusions: yacht.exclusions || [] }));
  const [saving, setSaving] = useState(false);
  React.useEffect(() => {
    let active = true;
    apiClient.get('/suppliers').then((response) => {
      if (!active) return;
      setSuppliers((response.data || []).filter((supplier) => {
        const types = Array.isArray(supplier?.type) ? supplier.type : [supplier?.type];
        return supplier?.status !== 'Inactive' && types.some((type) => String(type || '').toLowerCase() === 'yacht');
      }));
    }).catch(() => { if (active) setSuppliers([]); });
    return () => { active = false; };
  }, []);
  const imageInputRef = useRef(null); const documentInputRef = useRef(null); const mapInputRef = useRef(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setNested = (key, field, value) => setForm((current) => ({ ...current, [key]: { ...(current[key] || {}), [field]: value } }));
  const upload = async (field, files) => {
    const incoming = Array.from(files || []); if (!incoming.length) return [];
    const data = new FormData(); incoming.forEach((file) => data.append(field, file));
    const response = await apiClient.upload('/uploads?folder=yachts', data);
    return (response.data || []).filter((file) => file.field === field);
  };
  const uploadImages = async (event, asMainImage = false) => { try { const files = Array.from(event.target.files || []); event.target.value = ''; if (!asMainImage && (form.images || []).length + files.length > 10) return toast.error('A yacht can have up to 10 images.'); setSaving(true); const uploaded = await upload('yachtImages', files); set('images', (asMainImage ? [...uploaded, ...form.images] : [...form.images, ...uploaded]).slice(0, 10)); toast.success('Images are ready. Save the yacht to keep them.'); } catch (error) { toast.error(error.message); } finally { setSaving(false); } };
  const uploadRouteMap = async (event) => { try { const files = Array.from(event.target.files || []); event.target.value = ''; setSaving(true); const [file] = await upload('yachtRouteMap', files); if (file) setNested('route', 'routeMap', file); toast.success('Route map is ready. Save the yacht to keep it.'); } catch (error) { toast.error(error.message); } finally { setSaving(false); } };
  const uploadDocument = async (documentData, files) => { try { setSaving(true); const [file] = await upload('yachtDocuments', files); if (!file) return; set('documents', [...form.documents, { id: `document-${Date.now()}`, name: documentData.name || file.name, type: file.contentType === 'application/pdf' ? 'PDF' : 'Image', expiryDate: documentData.expiryDate || '', file }]); toast.success('Document is ready. Save the yacht to keep it.'); } catch (error) { toast.error(error.message); } finally { setSaving(false); } };
  const save = async () => { if (!form.name.trim() || !form.destination || !form.type) return toast.error('Yacht name, type and destination are required.'); setSaving(true); try { const payload = { ...form, maxCapacity: Number(form.maxCapacity), recommendedPax: Number(form.recommendedPax), year: form.year === '' ? undefined : Number(form.year), length: Number(form.length) || 0, width: Number(form.width) || 0, cabins: Number(form.cabins) || 0, bathrooms: Number(form.bathrooms) || 0, maxOvernightPax: Number(form.maxOvernightPax) || 0 }; const response = yacht.id ? await apiClient.put(`/yachts/${encodeURIComponent(yacht.id)}`, payload) : await apiClient.post('/yachts', payload); onSaved(response.data); toast.success(yacht.id ? 'Yacht updated.' : 'Yacht created.'); } catch (error) { toast.error(error.message || 'Could not save yacht.'); } finally { setSaving(false); } };
  const content = useMemo(() => ({ basic: <BasicTab form={form} set={set} destinations={destinations} suppliers={suppliers} inputRef={imageInputRef} onUpload={uploadImages} />, rates: <RatesTab form={form} set={set} />, specs: <SpecsTab form={form} set={set} setNested={setNested} />, images: <ImagesTab form={form} set={set} inputRef={imageInputRef} onUpload={uploadImages} />, inclusions: <InclusionsTab form={form} set={set} />, pickup: <PickupTab form={form} setNested={setNested} inputRef={mapInputRef} onUpload={uploadRouteMap} />, policies: <PoliciesTab form={form} setNested={setNested} />, documents: <DocumentsTab form={form} set={set} inputRef={documentInputRef} onUpload={uploadDocument} /> })[activeTab], [activeTab, form, destinations, suppliers]);
  return <div className="min-h-full bg-slate-50"><header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><button type="button" onClick={onBack} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button><Ship className="h-5 w-5 text-blue-600" /><div><h1 className="text-[15px] font-bold text-slate-800">{form.name || 'New Yacht'}</h1><p className="max-w-xl truncate text-[10px] text-slate-500">{form.description || 'Manage yacht details, charter rates, images, documents and policies.'}</p></div></div><div className="flex items-center gap-2"><Badge active={form.status === 'Active'}>{form.status}</Badge><button type="button" disabled={saving} onClick={save} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}{saving ? 'Saving...' : 'Save Yacht'}</button></div></header><nav className="flex overflow-x-auto border-b border-slate-200 bg-white px-5"><div className="flex min-w-max">{tabs.map(([id, label], index) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[11px] font-semibold ${activeTab === id ? 'border-blue-600 bg-blue-50/70 text-blue-700' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}><span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{index + 1}</span>{label}</button>)}</div></nav><main className="p-4">{content}</main></div>;
}
