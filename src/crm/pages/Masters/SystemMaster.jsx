import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, FileText, Folder, Plus, Search, Upload, ArrowLeft, Trash2, MapPin, Car, Compass, PlaneLanding, PlaneTakeoff, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchableSelect from '../../components/ui/SearchableSelect';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import { apiClient } from '../../lib/api';
import { formatDate } from '../../lib/date';
import PageLoader from '../../components/ui/PageLoader';

const definitions = {
  itinerary: {
    title: 'Itinerary', singular: 'Itinerary', button: 'Add Itinerary',
    hint: 'Reusable itinerary templates linked to operational masters',
    columns: [['name', 'Title'], ['arrivalDeparture', 'Arrival / Departure'], ['destination', 'Destination'], ['transfer', 'Transfer'], ['sightseeing', 'Sightseeing'], ['sightseeingVariantName', 'Variant']],
  },
  'arrival-departure': { title: 'Arrival / Departure', singular: 'Arrival / Departure', button: 'Add Arrival / Departure', hint: 'Arrival and departure reference templates', columns: [['name', 'Name']] },
  documents: { title: 'My Documents', singular: 'Folder', button: 'Create Folder', hint: 'Shared folders and master documents', columns: [['name', 'Folder Name'], ['files', 'Files']] },
  'guest-documents': { title: 'Guest Document List', singular: 'Document Type', button: 'Add Document Type', hint: 'Document types requested from guests', columns: [['name', 'Name']] },
  'feedback-types': { title: 'Feedback Type', singular: 'Feedback Type', button: 'Add Feedback Type', hint: 'Feedback categories used by query types', columns: [['name', 'Name']] },
};

const empty = (type) => type === 'itinerary'
  ? { name: '', destination: '', previousDestination: '', arrivalDeparture: 'NA', transfer: '', transferServiceType: '', sightseeing: '', sightseeingVariantId: '', sightseeingVariantName: '', transferOptionId: '', transferOptionType: '', sightseeingSelections: [], description: '', status: 'Active' }
  : { name: '', status: 'Active', files: [] };
const TICKET_ONLY_OPTION_VALUE = '__ticket_only__';

export default function SystemMaster({ type }) {
  const navigate = useNavigate();
  const meta = definitions[type];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itinerarySources, setItinerarySources] = useState({ transfers: [], sightseeing: [], loading: false, error: '' });
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(empty(type));
  const [newFiles, setNewFiles] = useState([]);
  const destinations = useOperationsMaster('destinations');
  const transfers = itinerarySources.transfers;
  const sightseeing = itinerarySources.sightseeing;

  const load = async () => {
    setLoading(true);
    if (type === 'itinerary') setItinerarySources((current) => ({ ...current, loading: true, error: '' }));
    try {
      const master = await apiClient.get(`/system-masters/${type}`);
      setItems(master.data);
      if (type === 'itinerary') {
        // Keep selector failures separate from the itinerary list. This makes
        // a temporary master API problem visible instead of incorrectly
        // presenting every selector as "no active records".
        const [transferResult, sightseeingResult] = await Promise.allSettled([
          apiClient.get('/operations-masters/transfers'),
          apiClient.get('/sightseeing-module'),
        ]);
        const sourceError = [transferResult, sightseeingResult]
          .find((result) => result.status === 'rejected')?.reason?.message || '';
        setItinerarySources({
          transfers: transferResult.status === 'fulfilled' ? (transferResult.value.data || []).filter((item) => item.status === 'Active') : [],
          sightseeing: sightseeingResult.status === 'fulfilled' ? (sightseeingResult.value.data || []).filter((item) => item.status === 'Active') : [],
          loading: false,
          error: sourceError,
        });
      }
    } catch (error) { toast.error(error.message); }
    finally {
      setLoading(false);
      if (type !== 'itinerary') setItinerarySources({ transfers: [], sightseeing: [], loading: false, error: '' });
    }
  };

  useEffect(() => { setItems([]); setSearch(''); setForm(empty(type)); load(); }, [type]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const open = (item = null) => {
    setEditing(item);
    setNewFiles([]);
    if (item && type === 'itinerary') {
      const legacySelection = item.sightseeing ? [{
        sightseeing: item.sightseeing,
        sightseeingVariantId: item.sightseeingVariantId || '',
        sightseeingVariantName: item.sightseeingVariantName || '',
        transferOptionId: item.transferOptionId || '',
        transferOptionType: item.transferOptionType || '',
      }] : [];
      setForm({ ...empty(type), ...item, sightseeingSelections: item.sightseeingSelections?.length ? item.sightseeingSelections : legacySelection, files: item.files || [] });
    } else setForm(item ? { ...empty(type), ...item, files: item.files || [] } : empty(type));
    setIsOpen(true);
  };
  const close = () => { setEditing(null); setNewFiles([]); setIsOpen(false); };

  const remove = async () => {
    try {
      await apiClient.delete(`/system-masters/${type}/${deleteId}`);
      setItems((current) => current.filter((item) => item.id !== deleteId));
      setDeleteId(null);
      toast.success(`${meta.singular} deleted.`);
    } catch (error) { toast.error(error.message); }
  };

  const save = async () => {
    if (!form.name?.trim()) return toast.error(`${meta.singular} name is required.`);
    if (type === 'itinerary' && !form.destination) return toast.error('Destination is required.');
    if (type === 'itinerary' && form.transfer && !form.transferServiceType) return toast.error('Select whether this itinerary transfer is Private or SIC.');
    if (type === 'itinerary' && form.sightseeingSelections?.some((selection) => !selection.sightseeing || !selection.sightseeingVariantId)) return toast.error('Select a sightseeing and active variant for every sightseeing row.');
    try {
      // Files belong only to DocumentFolder.  Sending this UI-only default on
      // an itinerary (or another strict system-master schema) causes Mongoose
      // to reject the request in strict "throw" mode.
      const data = { ...form };
      if (type === 'documents') {
        let files = form.files || [];
        if (newFiles.length) {
          const payload = new FormData();
          newFiles.forEach((file) => payload.append('documentFiles', file));
          const result = await apiClient.upload('/uploads?folder=documents', payload);
          files = [...files, ...result.data.map(({ field, ...file }) => file)];
        }
        data.files = files;
      } else {
        delete data.files;
      }
      const result = editing?.id
        ? await apiClient.put(`/system-masters/${type}/${editing.id}`, data)
        : await apiClient.post(`/system-masters/${type}`, data);
      setItems((current) => editing?.id
        ? current.map((item) => item.id === editing.id ? result.data : item)
        : [result.data, ...current]);
      close();
      toast.success(`${meta.singular} saved.`);
    } catch (error) { toast.error(error.message); }
  };

  const filtered = items.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));
  const value = (item, key) => {
    if (key === 'files') return item.files?.length ? `${item.files.length} file${item.files.length === 1 ? '' : 's'}` : 'No files';
    if (key === 'sightseeing' && item.sightseeingSelections?.length) return item.sightseeingSelections.map((selection) => masterName(selection.sightseeing)).filter(Boolean).join(', ');
    if (key === 'sightseeingVariantName' && item.sightseeingSelections?.length) return item.sightseeingSelections.map((selection) => selection.sightseeingVariantName).filter(Boolean).join(', ');
    return item[key] || '—';
  };

  // System-master responses intentionally serialize references as names, so
  // retain names as selector values. The server resolves them back to the
  // live master IDs on save.
  const destinationOptions = destinations.map((item) => ({ value: item.name, label: item.name }));
  const masterName = (value) => typeof value === 'object' && value !== null
    ? String(value.name || value.label || value.value || '')
    : String(value || '');
  const sameMasterName = (left, right) => masterName(left).trim().toLocaleLowerCase() === masterName(right).trim().toLocaleLowerCase();
  const isForSelectedDestination = (item, destination = form.destination) => sameMasterName(item?.destination, destination);
  // An itinerary spans both ends of a route.  Offer the live master records
  // for either end, so a Krabi → Phuket itinerary can include Krabi or
  // Phuket sightseeing as well as transfers for either destination.
  const routeDestinations = [...new Set([form.destination, form.previousDestination].filter(Boolean).map((destination) => masterName(destination).trim()))];
  const isForRouteDestination = (item) => routeDestinations.some((destination) => isForSelectedDestination(item, destination));
  const transferOptions = (routeDestinations.length ? transfers.filter(isForRouteDestination) : []).map((item) => ({
    value: item.name,
    label: [item.name, item.destination].filter(Boolean).join(' · '),
  }));
  const sightseeingOptions = (routeDestinations.length ? sightseeing.filter(isForRouteDestination) : []).map((item) => ({
    value: item.name,
    label: [item.name, item.destination, item.category].filter(Boolean).join(' · '),
  }));
  const sightseeingSelections = Array.isArray(form.sightseeingSelections) ? form.sightseeingSelections : [];
  const updateSightseeingSelection = (index, patch) => setForm((current) => {
    const next = (current.sightseeingSelections || []).map((selection, selectionIndex) => selectionIndex === index ? { ...selection, ...patch } : selection);
    const first = next[0] || {};
    return { ...current, sightseeingSelections: next, sightseeing: first.sightseeing || '', sightseeingVariantId: first.sightseeingVariantId || '', sightseeingVariantName: first.sightseeingVariantName || '', transferOptionId: first.transferOptionId || '', transferOptionType: first.transferOptionType || '' };
  });
  const addSightseeingSelection = () => setForm((current) => ({ ...current, sightseeingSelections: [...(current.sightseeingSelections || []), { sightseeing: '', sightseeingVariantId: '', sightseeingVariantName: '', transferOptionId: '', transferOptionType: 'Ticket Only' }] }));
  const removeSightseeingSelection = (index) => setForm((current) => {
    const next = (current.sightseeingSelections || []).filter((_, selectionIndex) => selectionIndex !== index);
    const first = next[0] || {};
    return { ...current, sightseeingSelections: next, sightseeing: first.sightseeing || '', sightseeingVariantId: first.sightseeingVariantId || '', sightseeingVariantName: first.sightseeingVariantName || '', transferOptionId: first.transferOptionId || '', transferOptionType: first.transferOptionType || '' };
  });

  const itineraryEditor = type === 'itinerary' && (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white"><MapPin className="h-4 w-4" /></div>
          <div><h3 className="text-sm font-bold text-slate-800">Itinerary details</h3><p className="mt-0.5 text-xs text-slate-600">Build a reusable route from the active Transfer and Sightseeing Masters. Only live master records can be selected.</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label>
          <span className="form-label">Title *</span>
          <input className="form-input" value={form.name || ''} onChange={(event) => set('name', event.target.value)} placeholder="e.g. DMK Airport → Pattaya Hotel & Evening Show" />
        </label>
        <label>
          <span className="form-label">Status</span>
          <SearchableSelect options={['Active', 'Inactive']} value={form.status} onChange={(next) => set('status', next)} placeholder="Select status" />
        </label>
        <label>
          <span className="form-label">Destination *</span>
          <SearchableSelect options={destinationOptions} value={form.destination} onChange={(next) => setForm((current) => {
            const selectedTransfer = transfers.find((item) => sameMasterName(item.name, current.transfer));
            const nextRouteDestinations = [next, current.previousDestination].filter(Boolean);
            const keepTransfer = nextRouteDestinations.some((destination) => isForSelectedDestination(selectedTransfer, destination));
            const sightseeingSelections = (current.sightseeingSelections || []).filter((selection) => {
              const selectedSightseeing = sightseeing.find((item) => sameMasterName(item.name, selection.sightseeing));
              return nextRouteDestinations.some((destination) => isForSelectedDestination(selectedSightseeing, destination));
            });
            const firstSightseeing = sightseeingSelections[0] || {};
            return {
              ...current,
              destination: next,
              transfer: keepTransfer ? current.transfer : '',
              transferServiceType: keepTransfer ? current.transferServiceType : '',
              sightseeingSelections,
              sightseeing: firstSightseeing.sightseeing || '',
              sightseeingVariantId: firstSightseeing.sightseeingVariantId || '',
              sightseeingVariantName: firstSightseeing.sightseeingVariantName || '',
              transferOptionId: firstSightseeing.transferOptionId || '',
              transferOptionType: firstSightseeing.transferOptionType || '',
            };
          })} placeholder="Select destination" />
        </label>
        <label>
          <span className="form-label">Previous destination</span>
          <SearchableSelect options={destinationOptions} value={form.previousDestination} onChange={(next) => setForm((current) => {
            const selectedTransfer = transfers.find((item) => sameMasterName(item.name, current.transfer));
            const nextRouteDestinations = [current.destination, next].filter(Boolean);
            const keepTransfer = nextRouteDestinations.some((destination) => isForSelectedDestination(selectedTransfer, destination));
            const sightseeingSelections = (current.sightseeingSelections || []).filter((selection) => {
              const selectedSightseeing = sightseeing.find((item) => sameMasterName(item.name, selection.sightseeing));
              return nextRouteDestinations.some((destination) => isForSelectedDestination(selectedSightseeing, destination));
            });
            const firstSightseeing = sightseeingSelections[0] || {};
            return {
              ...current,
              previousDestination: next,
              transfer: keepTransfer ? current.transfer : '',
              transferServiceType: keepTransfer ? current.transferServiceType : '',
              sightseeingSelections,
              sightseeing: firstSightseeing.sightseeing || '',
              sightseeingVariantId: firstSightseeing.sightseeingVariantId || '',
              sightseeingVariantName: firstSightseeing.sightseeingVariantName || '',
              transferOptionId: firstSightseeing.transferOptionId || '',
              transferOptionType: firstSightseeing.transferOptionType || '',
            };
          })} placeholder="Select previous destination" />
        </label>
      </div>

      <fieldset>
        <legend className="form-label">Is this an arrival or departure?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            ['NA', 'Not applicable', MapPin],
            ['Arrival', 'Arrival', PlaneLanding],
            ['Departure', 'Departure', PlaneTakeoff],
          ].map(([option, label, Icon]) => (
            <label key={option} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${form.arrivalDeparture === option ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
              <input type="radio" name="arrival-departure" className="accent-blue-600" checked={form.arrivalDeparture === option} onChange={() => set('arrivalDeparture', option)} />
              <Icon className="h-4 w-4" />{label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label>
            <span className="form-label flex items-center gap-1.5"><Car className="h-3.5 w-3.5 text-blue-600" />Transfer</span>
            <SearchableSelect options={transferOptions} value={form.transfer} onChange={(next) => setForm((current) => ({ ...current, transfer: next, transferServiceType: current.transfer === next ? current.transferServiceType : '' }))} placeholder={!routeDestinations.length ? 'Select destination first' : itinerarySources.loading ? 'Loading active transfers...' : transferOptions.length ? 'Search active transfer master...' : 'No active transfers for this route'} />
            <span className="mt-1 block text-[10px] text-slate-400">Linked from Transfer Master · matches the selected or previous destination</span>
          </label>
          <fieldset>
            <legend className="form-label flex items-center gap-1.5">Transfer basis</legend>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              {[['PVT', 'Private'], ['SIC', 'SIC']].map(([value, label]) => (
                <button key={value} type="button" disabled={!form.transfer} onClick={() => set('transferServiceType', value)} className={`flex-1 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${form.transferServiceType === value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-blue-50'}`}>{label}</button>
              ))}
            </div>
            <span className="mt-1 block text-[10px] text-slate-400">The quotation uses this SIC or Private basis and finds its valid contract for that travel date.</span>
          </fieldset>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 bg-violet-50 px-3 py-2.5">
          <div><h4 className="flex items-center gap-1.5 text-xs font-extrabold text-violet-950"><Compass className="h-3.5 w-3.5" />Sightseeing, ticket & transfer</h4><p className="mt-0.5 text-[10px] text-violet-700">Add every sightseeing item for this itinerary. Each row keeps its variant plus the Ticket Only, SIC, or private transfer choice for the quotation builder.</p></div>
          <button type="button" onClick={addSightseeingSelection} className="btn-secondary h-8 px-2.5 text-xs text-violet-700 border-violet-200 hover:bg-violet-100"><Plus className="h-3.5 w-3.5" /> Add sightseeing</button>
        </div>
        <div className="space-y-3 p-3">
          {!sightseeingSelections.length && <p className="rounded-lg border border-dashed border-violet-200 bg-white/70 px-3 py-2 text-xs text-slate-500">No sightseeing has been added. Transfer-only itinerary masters are supported.</p>}
          {sightseeingSelections.map((selection, index) => {
            const selected = sightseeing.find((item) => sameMasterName(item.name, selection.sightseeing));
            const variants = (selected?.variants || []).filter((variant) => variant.status === 'Active').map((variant) => ({ value: variant.id, label: [variant.name, variant.category].filter(Boolean).join(' · ') }));
            // Match the quotation builder: an activity can always be sold as
            // Ticket Only, while SIC and Private appear only when the selected
            // variant has an active transfer option of that type.
            const transfers = (selected?.transfers || []).filter((transfer) => transfer.status === 'Active' && (!transfer.variantId || String(transfer.variantId) === String(selection.sightseeingVariantId || '')));
            const transferOptions = [
              { value: TICKET_ONLY_OPTION_VALUE, label: 'Ticket Only · no transfer' },
              ...transfers.map((transfer) => ({ value: transfer.id, label: [transfer.type === 'PVT' ? 'Private transfer' : transfer.type, transfer.route, transfer.details].filter(Boolean).join(' · ') })),
            ];
            const transferValue = selection.transferOptionId || (selection.transferOptionType === 'Ticket Only' ? TICKET_ONLY_OPTION_VALUE : '');
            return <div key={`${selection.sightseeing || 'new'}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-violet-100 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <label><span className="form-label flex items-center gap-1.5"><Compass className="h-3.5 w-3.5 text-violet-600" />Sightseeing {index + 1} *</span><SearchableSelect options={sightseeingOptions} value={selection.sightseeing || ''} onChange={(next) => updateSightseeingSelection(index, { sightseeing: next, sightseeingVariantId: '', sightseeingVariantName: '', transferOptionId: '', transferOptionType: '' })} placeholder={routeDestinations.length ? (itinerarySources.loading ? 'Loading active sightseeing...' : sightseeingOptions.length ? 'Search active sightseeing master...' : 'No active sightseeing for this route') : 'Select destination first'} /></label>
              <label><span className="form-label">Variant *</span><SearchableSelect options={variants} value={selection.sightseeingVariantId || ''} onChange={(next) => { const variant = (selected?.variants || []).find((item) => item.id === next); updateSightseeingSelection(index, { sightseeingVariantId: next, sightseeingVariantName: variant?.name || '', transferOptionId: '', transferOptionType: 'Ticket Only' }); }} placeholder={itinerarySources.loading ? 'Loading variants...' : variants.length ? 'Select active sightseeing variant' : 'Select sightseeing first'} /></label>
              <label><span className="form-label">Ticket / transfer</span><SearchableSelect options={transferOptions} value={transferValue} onChange={(next) => { const transfer = transfers.find((item) => item.id === next); updateSightseeingSelection(index, next === TICKET_ONLY_OPTION_VALUE ? { transferOptionId: '', transferOptionType: 'Ticket Only' } : { transferOptionId: next, transferOptionType: transfer?.type || '' }); }} placeholder={!selection.sightseeingVariantId ? 'Select variant first' : 'Ticket Only, SIC, or Private'} isDisabled={!selection.sightseeingVariantId} /></label>
              <button type="button" onClick={() => removeSightseeingSelection(index)} className="btn-secondary h-9 px-2 text-rose-600 hover:border-rose-200 hover:bg-rose-50" title={`Remove sightseeing ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>;
          })}
        </div>
      </section>
      {itinerarySources.error && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Could not load all linked masters: {itinerarySources.error}</p>}

      <label className="block">
        <span className="form-label">Description</span>
        <textarea className="form-input min-h-36 resize-y" rows="6" value={form.description || ''} onChange={(event) => set('description', event.target.value)} placeholder="Explain the route, arrival/departure handling, transfer, activity and guest instructions..." />
      </label>
    </div>
  );

  const itineraryFields = type === 'itinerary' && <>
    <label><span className="form-label">Destination *</span><SearchableSelect options={destinations} value={form.destination} onChange={(v) => set('destination', v)} /></label>
    <label><span className="form-label">Previous Destination</span><SearchableSelect options={destinations} value={form.previousDestination} onChange={(v) => set('previousDestination', v)} /></label>
    <label><span className="form-label">Arrival / Departure</span><SearchableSelect options={['NA', 'Arrival', 'Departure']} value={form.arrivalDeparture} onChange={(v) => set('arrivalDeparture', v)} /></label>
    <label><span className="form-label">Transfer</span><SearchableSelect options={transfers} value={form.transfer} onChange={(v) => set('transfer', v)} /></label>
    <label><span className="form-label">Sightseeing</span><SearchableSelect options={sightseeing} value={form.sightseeing} onChange={(v) => set('sightseeing', v)} /></label>
    <label><span className="form-label">Description</span><textarea className="form-input h-10" rows="2" value={form.description || ''} onChange={(event) => set('description', event.target.value)} placeholder="Describe this itinerary template" /></label>
  </>;

  const documentFields = type === 'documents' && <div className="md:col-span-2 flex flex-col gap-1"><span className="form-label mb-0">Upload documents</span>{form.files?.length > 0 && newFiles.length === 0 && <div className="flex flex-wrap gap-2 mb-1">{form.files.map(file => <a key={file.key} href={file.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100"><FileText className="w-3 h-3" />{file.name}</a>)}</div>}<input className={`form-input p-0.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold cursor-pointer transition-colors ${newFiles.length > 0 ? 'file:bg-green-100 file:text-green-700 hover:file:bg-green-200 bg-green-50/50 border-green-200' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`} type="file" accept="image/*,application/pdf" multiple onChange={(event) => setNewFiles(Array.from(event.target.files || []))} /><p className="mt-1 text-[10px] text-slate-400">Images and PDFs, maximum 8 MB each. Existing documents are kept when editing.</p></div>;

  return <div className="p-6 space-y-5">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => navigate("/masters")} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex-shrink-0 mt-0.5" title="Go Back"><ArrowLeft className="w-4 h-4" /></button>
        <div><h1 className="text-base font-bold text-slate-900 leading-none">{meta.title}</h1><p className="text-[10px] text-slate-500 mt-0.5 leading-none">{loading ? 'Loading records…' : `${items.length} ${items.length === 1 ? 'record' : 'records'}`} · {meta.hint}</p></div>
      </div>
      <div className="flex-1 max-w-xl mx-0 md:mx-8">
        <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" /><input className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm transition-all" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${meta.title.toLowerCase()}...`} /></div>
      </div>
      <button className="btn-primary text-xs h-8 px-3 flex-shrink-0" onClick={() => open()}><Plus className="w-3.5 h-3.5 mr-1" />{meta.button}</button>
    </div>
    <div className="card overflow-hidden">{loading ? <PageLoader label={`Loading ${meta.title.toLowerCase()} records…`} /> : <><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50 border-b border-slate-200">{meta.columns.map(([, label]) => <th key={label} className="table-header">{label}</th>)}<th className="table-header">Status</th><th className="table-header">Created</th><th className="table-header text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id} className="table-row hover:bg-primary-50/30">{meta.columns.map(([key], index) => <td key={key} className="table-cell">{index === 0 ? <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">{type === 'documents' ? <Folder className="w-4 h-4 text-amber-500" /> : <FileText className="w-4 h-4 text-primary-600" />}</span><span className="font-medium text-slate-900">{value(item, key)}</span></div> : key === 'files' && item.files?.length ? <div className="flex flex-wrap gap-2">{item.files.map((file) => <a key={file.key} href={file.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs">{file.name}</a>)}</div> : <span className="text-slate-500">{value(item, key)}</span>}</td>)}<td className="table-cell"><span className={item.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>{item.status}</span></td><td className="table-cell text-slate-400">{formatDate(item.createdAt)}</td><td className="table-cell text-right"><button className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" onClick={() => open(item)} title="Edit"><Edit className="w-3.5 h-3.5" /></button><button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setDeleteId(item.id)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="py-16 text-center"><div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center"><Folder className="w-6 h-6 text-slate-300" /></div><p className="text-sm font-medium text-slate-500">{search ? `No results match “${search}”` : `No ${meta.title.toLowerCase()} created yet`}</p><button className="btn-primary mt-4 mx-auto" onClick={() => open()}><Plus className="w-3.5 h-3.5 mr-1" />{meta.button}</button></div>}</>}</div>
    <Modal isOpen={isOpen} onClose={close} title={type === 'itinerary' ? `${editing?.id ? 'Edit' : 'Add'} Itinerary${editing?.name ? ` · ${editing.name}` : ''}` : `${editing?.id ? 'Edit' : type === 'documents' ? 'Create' : 'Add'} ${meta.singular}`} size={type === 'itinerary' ? '2xl' : type === 'documents' ? 'lg' : 'md'} footer={<><button className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary text-xs h-8 px-3 flex-shrink-0" onClick={save}>{type === 'documents' ? <Upload className="w-4 h-4" /> : type === 'itinerary' ? <Save className="w-4 h-4" /> : null}Save {meta.singular}</button></>}>
      {itineraryEditor || <>
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
        {(type === 'itinerary' || type === 'documents') && (
          <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <span className="w-1 h-3 rounded-full bg-blue-500"></span>
            {meta.singular} Details
          </h3>
        )}
        <div className={`grid gap-2.5 sm:gap-3 grid-flow-dense grid-cols-1 md:grid-cols-2 ${type === 'itinerary' ? 'lg:grid-cols-4' : ''}`}>
          <label>
            <span className="form-label">{type === 'itinerary' ? 'Title' : `${meta.singular} Name`} *</span>
            <input className="form-input" value={form.name || ''} onChange={(event) => set('name', event.target.value)} placeholder={`Enter ${meta.singular.toLowerCase()} name`} />
          </label>
          {itineraryFields}
          {documentFields}
          <label>
            <span className="form-label">Status</span>
            <SearchableSelect options={['Active', 'Inactive']} value={form.status} onChange={(v) => set('status', v)} />
          </label>
        </div>
      </div>
      </>}
    </Modal>
    <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title={`Delete ${meta.singular}`} message={`Are you sure you want to delete this ${meta.singular.toLowerCase()}? This cannot be undone.`} />
  </div>;
}
