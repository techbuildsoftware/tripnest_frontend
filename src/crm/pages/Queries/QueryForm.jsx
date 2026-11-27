import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Copy, X, FileText, Plus, Trash2,
  ChevronDown, ChevronUp, Pencil, Bold, Italic, Underline, Link,
  List, AlignLeft, AlignCenter, AlignRight, AlertCircle, CalendarDays,
  Users, Plane, BedDouble, Briefcase, UserCircle, Info, ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { formatDate, todayIsoInTimeZone } from '../../lib/date';
import useSalesMaster from '../../hooks/useSalesMaster';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import RichTextEditor from '../../components/ui/RichTextEditor';

const priorities = ['Cold', 'Normal', 'Medium', 'High', 'Urgent'];
const statuses   = ['New', 'Working', 'Quoted', 'Confirmed', 'Lost'];
const COUNTRY_DIAL_CODES = [
  { code: '+66', label: '🇹🇭 Thailand (+66)' },
  { code: '+91', label: '🇮🇳 India (+91)' },
  { code: '+1', label: '🇺🇸 United States / Canada (+1)' },
  { code: '+44', label: '🇬🇧 United Kingdom (+44)' },
  { code: '+61', label: '🇦🇺 Australia (+61)' },
  { code: '+971', label: '🇦🇪 United Arab Emirates (+971)' },
  { code: '+65', label: '🇸🇬 Singapore (+65)' },
  { code: '+60', label: '🇲🇾 Malaysia (+60)' },
  { code: '+62', label: '🇮🇩 Indonesia (+62)' },
  { code: '+86', label: '🇨🇳 China (+86)' },
  { code: '+81', label: '🇯🇵 Japan (+81)' },
  { code: '+82', label: '🇰🇷 South Korea (+82)' },
  { code: '+49', label: '🇩🇪 Germany (+49)' },
  { code: '+33', label: '🇫🇷 France (+33)' },
  { code: '+39', label: '🇮🇹 Italy (+39)' },
  { code: '+34', label: '🇪🇸 Spain (+34)' },
  { code: '+31', label: '🇳🇱 Netherlands (+31)' },
  { code: '+41', label: '🇨🇭 Switzerland (+41)' },
  { code: '+7', label: '🇷🇺 Russia / Kazakhstan (+7)' },
  { code: '+55', label: '🇧🇷 Brazil (+55)' },
  { code: '+27', label: '🇿🇦 South Africa (+27)' },
];
const splitCountryCode = (phone) => {
  const value = String(phone || '').replace(/[\s()-]/g, '');
  const match = [...COUNTRY_DIAL_CODES].sort((left, right) => right.code.length - left.code.length).find((item) => value.startsWith(item.code));
  return match ? { countryCode: match.code, number: value.slice(match.code.length) } : { countryCode: '', number: value };
};
const internationalPhone = (countryCode, phone) => {
  const value = String(phone || '').trim();
  if (!value) return '';
  if (value.startsWith('+')) return value.replace(/[\s()-]/g, '');
  return `${countryCode || '+66'}${value.replace(/[^\d]/g, '')}`;
};

const priorityColor = (p, active) => {
  if (!active) return 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
  if (p === 'Urgent') return 'bg-red-500 text-white border border-red-500';
  if (p === 'High')   return 'bg-orange-500 text-white border border-orange-500';
  if (p === 'Medium') return 'bg-yellow-400 text-white border border-yellow-400';
  if (p === 'Normal') return 'bg-primary-600 text-white border border-primary-600';
  return 'bg-slate-500 text-white border border-slate-500';
};

// Compute nights between two date strings
const dateValue = (value) => {
  const raw = String(value || '').slice(0, 10);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const display = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  if (display) return Date.UTC(Number(display[3]), Number(display[2]) - 1, Number(display[1]));
  return Number.NaN;
};

const getNights = (from, to) => {
  const start = dateValue(from);
  const end = dateValue(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '—';
  const diff = end - start;
  const n = Math.round(diff / 86400000);
  return n > 0 ? n : '—';
};

const dayAfter = (date) => {
  return shiftCalendarDate(date, 1);
};

const shiftCalendarDate = (date, days) => {
  const value = dateValue(date);
  if (!Number.isFinite(value)) return '';
  return new Date(value + Number(days || 0) * 86400000).toISOString().slice(0, 10);
};

// Keep these controls outside QueryForm. Defining them inside the page creates
// a new React component type on each keystroke, which unmounts the input and
// makes the cursor disappear while a user is typing.
function QueryInput({ label, field, form, setField, errors, type = 'text', required, placeholder, readOnly, className = '' }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={form[field] || ''}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => !readOnly && setField(field, type === 'number' ? Number(event.target.value) : event.target.value)}
        className={`form-input ${readOnly ? 'bg-slate-50 cursor-default' : ''} ${errors[field] ? 'border-red-400 ring-1 ring-red-400' : ''} ${className}`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );
}

function QuerySelect({ label, field, options, form, setField, errors, required, placeholder }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select value={form[field] || ''} onChange={(event) => setField(field, event.target.value)} className={`form-select ${errors[field] ? 'border-red-400 ring-1 ring-red-400' : ''}`}>
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );
}

const isoFromDisplayDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const display = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!display) return null;
  const [, day, month, year] = display;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : null;
};

// Native date inputs render in the browser/OS locale (often MM/DD/YYYY).
// This control keeps the stored value ISO for comparisons, while consistently
// displaying the CRM format requested by the user: DD-MM-YYYY.
function SegmentDateInput({ value, onChange, min, max, className = '' }) {
  const pickerRef = useRef(null);
  const [draft, setDraft] = useState(value ? formatDate(value, '') : '');
  useEffect(() => { setDraft(value ? formatDate(value, '') : ''); }, [value]);
  const useNativeMobilePicker = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const calendarValue = isoFromDisplayDate(value) || '';
  const calendarMin = isoFromDisplayDate(min) || undefined;
  const calendarMax = isoFromDisplayDate(max) || undefined;
  const commit = () => {
    const parsed = isoFromDisplayDate(draft);
    if (parsed === null) { toast.error('Enter the date as DD-MM-YYYY.'); return; }
    onChange(parsed);
  };
  const change = (event) => {
    const next = event.target.value;
    setDraft(next);
    const parsed = isoFromDisplayDate(next);
    // Commit as soon as a complete valid date is entered. This means the Add
    // button uses the new date even when it is clicked immediately afterwards.
    if (parsed) onChange(parsed);
  };
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  };
  return <div className="w-full">
    {/* Mobile browsers only open their native calendar from a real, tappable
        date field. Keeping this input visible avoids the unreliable hidden
        input + programmatic click approach on iOS and Android. */}
    <input
      type="date"
      value={calendarValue}
      min={calendarMin}
      max={calendarMax}
      onChange={(event) => {
        setDraft(formatDate(event.target.value, ''));
        onChange(event.target.value);
      }}
      className={`form-input w-full ${useNativeMobilePicker ? 'block' : 'hidden'} ${className}`}
      aria-label="Choose date"
    />
    <div className={`relative w-full ${useNativeMobilePicker ? 'hidden' : 'block'}`}>
      <input type="text" inputMode="numeric" value={draft} onChange={change} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} placeholder="DD-MM-YYYY" maxLength={10} className={`form-input pr-7 ${className}`} aria-label="Date in DD-MM-YYYY format" />
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openPicker} className="absolute inset-y-0 right-0 grid w-7 place-items-center text-slate-500 hover:text-primary-600" title="Choose date"><CalendarDays className="h-4 w-4" /></button>
      <input ref={pickerRef} type="date" value={calendarValue} min={calendarMin} max={calendarMax} onChange={(event) => { setDraft(formatDate(event.target.value, '')); onChange(event.target.value); }} tabIndex={-1} aria-hidden="true" className="absolute h-px w-px opacity-0 pointer-events-none" />
    </div>
  </div>;
}


const SectionHeader = ({ icon: Icon, title, children }) => {
  const match = String(title).match(/^(\d+)\.\s*(.*)$/);
  return (
    <div className="flex items-center justify-between gap-2 -mx-3 -mt-3 px-3 py-2 mb-2.5 sm:-mx-3.5 sm:-mt-3.5 sm:px-3.5 bg-gradient-to-r from-slate-50 via-white to-white rounded-t-xl border-b border-slate-200">
      <div className="flex items-center gap-2 min-w-0">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
          <Icon className="h-3.5 w-3.5" />
        </div>
        {match && <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-blue-600 px-1 text-[9px] font-extrabold text-white">{match[1]}</span>}
        <h2 className="truncate text-[12.5px] sm:text-[13px] font-extrabold text-slate-800">{match ? match[2] : title}</h2>
      </div>
      {children}
    </div>
  );
};

export default function QueryForm() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { queries, addQuery, updateQuery, agents, addAgent, fetchRecord, refreshData } = useApp();
  const { user } = useAuth();
  const agentPortal = user?.role === 'Agent';
  // Never allow a malformed or incomplete master response to break the new
  // enquiry page. The API guarantees an array, but this also protects an
  // already-open tab while a newly created master record is refreshing.
  const agentRecords = useMemo(() => (Array.isArray(agents) ? agents : []).filter(Boolean), [agents]);
  const availableAgents = useMemo(() => (
    agentPortal
      ? agentRecords.filter((agent) => String(agent?.id || '') === String(user?.agentId || ''))
      : agentRecords
  ), [agentPortal, agentRecords, user?.agentId]);

  const marketMasters      = useSalesMaster('markets');
  const queryTypes         = useSalesMaster('query-types');
  const leadSourceMasters  = useSalesMaster('lead-sources');
  const destinationMasters = useOperationsMaster('destinations');
  const markupCategories   = useSalesMaster('markup-categories');

  const [b2cClients, setB2cClients] = useState([]);
  const [quickCreateType, setQuickCreateType] = useState(null);
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);
  const [quickCreate, setQuickCreate] = useState({ name: '', contactPerson: '', email: '', phone: '', market: '', markupCategory: '' });
  const [queryTitleMasters, setQueryTitleMasters] = useState([]);
  const [showQueryTitleMasterModal, setShowQueryTitleMasterModal] = useState(false);
  const [savingQueryTitleMaster, setSavingQueryTitleMaster] = useState(false);
  const [queryTitleMasterForm, setQueryTitleMasterForm] = useState({ name: '', importantNotes: '' });
  const [companySettings, setCompanySettings] = useState(null);
  useEffect(() => {
    let active = true;
    apiClient.get('/b2c')
      .then((r) => { if (active) setB2cClients((Array.isArray(r.data) ? r.data : []).filter((client) => client?.status === 'Active')); })
      .catch(() => { if (active) setB2cClients([]); });
    return () => { active = false; };
  }, []);

  // Always resolve the selector from the current Agent Master. This makes a
  // newly added, edited, or deactivated agent available here immediately
  // instead of relying on an older in-memory list from another screen.
  useEffect(() => {
    refreshData(['agents']).catch((error) => console.error('Could not refresh agents:', error));
  }, [refreshData]);

  useEffect(() => {
    let active = true;
    apiClient.get('/settings')
      .then((response) => { if (active) setCompanySettings(response.data?.company || null); })
      .catch(() => { if (active) setCompanySettings(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiClient.get('/query-title-masters')
      .then((response) => { if (active) setQueryTitleMasters(response.data || []); })
      .catch(() => { if (active) setQueryTitleMasters([]); });
    return () => { active = false; };
  }, []);

  const existing = id ? queries.find(q => q.id === id) : null;
  const hydratedQueryRef = useRef('');

  useEffect(() => {
    if (!id || id === 'new') return;
    fetchRecord('queries', id).catch((error) => toast.error(error.message));
  }, [id, fetchRecord]);

  const [form, setForm] = useState(existing || {
    queryDate: todayIsoInTimeZone(),
    travelDate: '', endDate: '',
    agentId: '', agentName: '',
    clientType: 'Agent',
    contactPerson: '', contactEmail: '',
    landlineNumber: '', mobileCountryCode: '+66', mobileNumber: '',
    guestName: '', guests: [{ id: 'guest-1', name: '', phone: '' }], queryTitle: '', queryTitleMasterId: '',
    ccMails: [],
    market: '', destination: '',
    travelSegments: [],
    adults: '', children: '', infants: '',
    childAges: [], childHeights: [], infantAges: [],
    roomAllocation: { sgl: 0, dbl: 0, adultExtraBed: 0, cwb: 0, cnb: 0, inf: 0 },
    leadSource: '', serviceType: '',
    operationPerson: '',
    salesPerson: '', company: '',
    priority: 'Medium',
    status: 'New',
    otherInformation: '', importantNotes: '',
  });

  useEffect(() => {
    const version = existing ? `${existing.id}:${existing.updatedAt || ''}` : '';
    if (!existing || hydratedQueryRef.current === version) return;
    hydratedQueryRef.current = version;
    const parsedMobile = splitCountryCode(existing.mobileNumber);
    setForm({
      ...existing,
      mobileCountryCode: parsedMobile.countryCode || existing.mobileCountryCode || '+66',
      mobileNumber: parsedMobile.number || existing.mobileNumber || '',
      importantNotes: existing.importantNotes || existing.otherInformation || '',
    });
  }, [existing]);

  // An agent always creates an enquiry for their own Agent Master. The API
  // enforces this too; this keeps the UI honest and the selector uncluttered.
  useEffect(() => {
    if (!agentPortal) return;
    const ownAgent = availableAgents[0];
    if (!ownAgent) return;
    const contacts = Array.isArray(ownAgent.contacts) ? ownAgent.contacts.filter(Boolean) : [];
    const primary = contacts.find((contact) => contact.primary) || contacts[0] || {};
    setForm((current) => ({
      ...current,
      clientType: 'Agent', agentId: ownAgent.id, agentName: ownAgent.name,
      leadSource: 'Agent',
      contactPerson: current.contactPerson || primary.name || ownAgent.contactPerson || '',
      contactEmail: current.contactEmail || primary.email || ownAgent.email || '',
    }));
  }, [agentPortal, availableAgents]);

  const queryTitleOptions = useMemo(() => {
    const activeTitles = queryTitleMasters.filter((item) => item.status !== 'Inactive').map((item) => ({ value: item.id, label: item.name }));
    const currentTitle = String(form.queryTitle || '').trim();
    const hasCurrentTitle = activeTitles.some((item) => item.value === form.queryTitleMasterId || item.label === currentTitle);
    return currentTitle && !hasCurrentTitle ? [{ value: currentTitle, label: `${currentTitle} (legacy)` }, ...activeTitles] : activeTitles;
  }, [form.queryTitle, form.queryTitleMasterId, queryTitleMasters]);
  const selectQueryTitleMaster = (value) => {
    const selected = queryTitleMasters.find((item) => item.id === value);
    if (!selected) {
      setForm((current) => ({ ...current, queryTitleMasterId: '', queryTitle: value }));
      return;
    }
    setForm((current) => ({ ...current, queryTitleMasterId: selected.id, queryTitle: selected.name, importantNotes: selected.importantNotes || '' }));
  };
  const openCreateQueryTitleMaster = () => {
    setQueryTitleMasterForm({ name: '', importantNotes: '' });
    setShowQueryTitleMasterModal(true);
  };
  const saveQueryTitleMaster = async () => {
    const name = queryTitleMasterForm.name.trim();
    const textOnlyNotes = String(queryTitleMasterForm.importantNotes || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!name) return toast.error('Enter a query title.');
    if (!textOnlyNotes) return toast.error('Enter the rich-text important notes for this query title.');
    try {
      setSavingQueryTitleMaster(true);
      const created = (await apiClient.post('/query-title-masters', { name, importantNotes: queryTitleMasterForm.importantNotes })).data;
      setQueryTitleMasters((current) => [...current, created].sort((left, right) => left.name.localeCompare(right.name)));
      setForm((current) => ({ ...current, queryTitleMasterId: created.id, queryTitle: created.name, importantNotes: created.importantNotes || '' }));
      setShowQueryTitleMasterModal(false);
      toast.success('Query title master created and selected.');
    } catch (error) {
      toast.error(error.message || 'Unable to create the query title master.');
    } finally {
      setSavingQueryTitleMaster(false);
    }
  };

  const [errors, setErrors] = useState({});
  const emptyNewSeg = { departureDestination: '', arrivalDestination: '', fromDate: '', toDate: '' };
  const [newSeg, setNewSeg] = useState(emptyNewSeg);
  const [editingTravelDates, setEditingTravelDates] = useState(false);
  const lastTravelSegment = form.travelSegments?.at(-1);
  const previousSegmentEnd = lastTravelSegment?.toDate || '';
  const nextSegmentDefaults = (segments = form.travelSegments || []) => {
    const previous = segments.at(-1);
    return {
      ...emptyNewSeg,
      // Continue a multi-city journey without asking the user to re-enter the
      // same handover details: the previous arrival is this leg's departure,
      // and its checkout date is this leg's start date.
      departureDestination: previous?.arrivalDestination || '',
      fromDate: previous?.toDate || '',
    };
  };
  useEffect(() => {
    // This covers an already-saved query opened for editing. Never overwrite
    // a partially entered new leg while the user is working on it.
    setNewSeg((current) => (current.departureDestination || current.arrivalDestination || current.fromDate || current.toDate)
      ? current
      : { ...emptyNewSeg, departureDestination: lastTravelSegment?.arrivalDestination || '', fromDate: previousSegmentEnd || '' });
  }, [lastTravelSegment?.arrivalDestination, previousSegmentEnd]);
  const setNS = (k, v) => setNewSeg(prev => {
    if (k === 'fromDate' && previousSegmentEnd && v < previousSegmentEnd) {
      toast.error(`The next destination must start on or after ${formatDate(previousSegmentEnd)}.`);
      return prev;
    }
    if (k === 'toDate' && prev.fromDate && v <= prev.fromDate) {
      toast.error('To Date must be after From Date.');
      return prev;
    }
    // Moving a start date forward invalidates an earlier selected check-out.
    if (k === 'fromDate' && prev.toDate && prev.toDate <= v) return { ...prev, fromDate: v, toDate: '' };
    return { ...prev, [k]: v };
  });
  const set = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors((current) => {
      if (!current[k]) return current;
      const { [k]: ignored, ...remaining } = current;
      return remaining;
    });
  };
  const guestRows = form.guests?.length
    ? form.guests
    : [{ id: 'guest-1', name: form.guestName || '', phone: '' }];
  const updateGuest = (index, field, value) => {
    setForm((current) => {
      const guests = (current.guests?.length
        ? current.guests
        : [{ id: 'guest-1', name: current.guestName || '', phone: '' }]
      ).map((guest, guestIndex) => guestIndex === index ? { ...guest, [field]: value } : guest);
      return { ...current, guests, guestName: guests[0]?.name || '' };
    });
    setErrors((current) => {
      if (!current.guests) return current;
      const { guests: ignored, ...remaining } = current;
      return remaining;
    });
  };
  const addGuest = () => setForm((current) => ({
    ...current,
    guests: [...(current.guests?.length ? current.guests : [{ id: 'guest-1', name: current.guestName || '', phone: '' }]), {
      id: `guest-${Date.now()}`,
      name: '',
      phone: '',
    }],
  }));
  const removeGuest = (index) => setForm((current) => {
    const currentGuests = current.guests?.length
      ? current.guests
      : [{ id: 'guest-1', name: current.guestName || '', phone: '' }];
    const guests = currentGuests.length === 1
      ? [{ id: currentGuests[0].id || 'guest-1', name: '', phone: '' }]
      : currentGuests.filter((_, guestIndex) => guestIndex !== index);
    return { ...current, guests, guestName: guests[0]?.name || '' };
  });

  useEffect(() => {
    if (existing) return;
    setForm((current) => {
      const defaults = {
        leadSource: current.leadSource || (current.clientType === 'Agent' ? 'Agent' : 'B2C'),
        operationPerson: current.operationPerson || user?.name || '',
        salesPerson: current.salesPerson || user?.name || '',
        company: current.company || companySettings?.name?.trim() || '',
      };
      return Object.entries(defaults).some(([key, value]) => current[key] !== value) ? { ...current, ...defaults } : current;
    });
  }, [existing, user?.name, companySettings?.name]);

  // Keep per-child data aligned with the passenger counts without overwriting
  // values already entered or loaded from a saved enquiry.
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      childAges:  Array.from({ length: prev.children || 0 }, (_, i) => prev.childAges?.[i] ?? ''),
      childHeights: Array.from({ length: prev.children || 0 }, (_, i) => prev.childHeights?.[i] ?? ''),
      infantAges: Array.from({ length: prev.infants || 0 },  (_, i) => prev.infantAges?.[i] ?? ''),
    }));
  }, [form.children, form.infants]);

  const clientOptions = useMemo(() => (form.clientType === 'Agent' ? availableAgents : (Array.isArray(b2cClients) ? b2cClients : []))
    .filter((person) => person && person.status !== 'Inactive')
    .map((person) => ({
      value: person.id,
      // Keep the Agent picker clean: business users select the company by
      // name, while the selected agent's primary contact/email still fills
      // the contact fields below for saving and communication.
      label: form.clientType === 'Agent'
        ? person.name
        : [person.name, person.email || person.phone].filter(Boolean).join(' · '),
    })), [form.clientType, availableAgents, b2cClients]);

  const selectClient = (clientId) => {
    const list = form.clientType === 'Agent' ? availableAgents : (Array.isArray(b2cClients) ? b2cClients : []);
    const person = list.find((item) => String(item.id) === String(clientId));
    const contacts = Array.isArray(person?.contacts) ? person.contacts.filter(Boolean) : [];
    const primaryContact = contacts.find((contact) => contact.primary) || contacts[0];
    const sourceMobile = form.clientType === 'B2C' ? person?.phone || '' : primaryContact?.phone || person?.phone || '';
    const parsedMobile = splitCountryCode(sourceMobile);
    setForm((previous) => ({
      ...previous,
      agentId: clientId,
      agentName: person?.name || '',
      market: person?.market || previous.market,
      contactPerson: form.clientType === 'B2C' ? person?.name || previous.contactPerson : primaryContact?.name || person?.contactPerson || previous.contactPerson,
      contactEmail: form.clientType === 'B2C' ? person?.email || previous.contactEmail : primaryContact?.email || person?.email || previous.contactEmail,
      mobileCountryCode: parsedMobile.countryCode || previous.mobileCountryCode || '+66',
      mobileNumber: parsedMobile.number || previous.mobileNumber,
      landlineNumber: form.clientType === 'Agent' ? person?.landline || previous.landlineNumber : previous.landlineNumber,
    }));
    setErrors((current) => {
      const { agentName, contactPerson, contactEmail, landlineNumber, mobileNumber, ...remaining } = current;
      return remaining;
    });
  };

  const openQuickCreate = () => {
    setQuickCreate({ name: '', contactPerson: '', email: '', phone: '', market: form.market || '', markupCategory: markupCategories[0]?.name || '' });
    setQuickCreateType(form.clientType);
  };

  const saveQuickCreate = async () => {
    const name = quickCreate.name.trim();
    if (!name) return toast.error(`${quickCreateType === 'Agent' ? 'Agent' : 'B2C client'} name is required.`);
    const people = quickCreateType === 'Agent' ? agentRecords : (Array.isArray(b2cClients) ? b2cClients : []);
    const duplicate = people.find((person) => person && String(person.name || '').trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setQuickCreateType(null);
      if (quickCreateType === form.clientType) selectClient(duplicate.id);
      return toast.error(`"${duplicate.name}" already exists and has been selected.`);
    }
    if (quickCreateType === 'Agent' && !quickCreate.markupCategory) return toast.error('Select a markup category for the new agent.');
    setQuickCreateSaving(true);
    try {
      let created;
      if (quickCreateType === 'Agent') {
        const contactName = quickCreate.contactPerson.trim() || name;
        created = await addAgent({
          name,
          contactPerson: contactName,
          email: quickCreate.email.trim(),
          phone: quickCreate.phone.trim(),
          contacts: [{ name: contactName, email: quickCreate.email.trim(), phone: quickCreate.phone.trim(), primary: true }],
          market: quickCreate.market,
          markupCategory: quickCreate.markupCategory,
          businessType: 'B2B', companyType: 'Individual', currency: 'THB',
          status: 'Active', creditLimit: 0, paymentTerms: '',
        });
      } else {
        created = (await apiClient.post('/b2c', {
          name,
          email: quickCreate.email.trim(),
          phone: quickCreate.phone.trim(),
          salesPerson: user?.name || '',
          status: 'Active', country: 'Thailand', familyMembers: [],
        })).data;
        setB2cClients((current) => [created, ...current]);
      }
      if (quickCreateType === form.clientType) selectClient(created.id);
      setQuickCreateType(null);
      toast.success(`${quickCreateType === 'Agent' ? 'Agent' : 'B2C client'} added to its master and selected.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setQuickCreateSaving(false);
    }
  };

  const updateSegments = (segments) => {
    const arrivals = [...new Set(segments.map(s => s.arrivalDestination).filter(Boolean))];
    setForm(prev => ({
      ...prev,
      travelSegments: segments,
      destination: arrivals.join(' + '),
      travelDate: segments[0]?.fromDate || '',
      endDate: segments.at(-1)?.toDate || '',
    }));
  };

  const addSegment = () =>
    updateSegments([...(form.travelSegments || []), { departureDestination: '', arrivalDestination: '', fromDate: '', toDate: '' }]);

  const updateSegField = (idx, field, val) =>
    updateSegments(form.travelSegments.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  const updateTravelDate = (index, field, value) => {
    const segments = form.travelSegments || [];
    const current = segments[index];
    if (!current) return;
    if (index !== 0 || field !== 'fromDate' || !value) return;
    if (current.fromDate) {
      const delta = Math.round((dateValue(value) - dateValue(current.fromDate)) / 86400000);
      if (Number.isFinite(delta)) {
        updateSegments(segments.map((segment) => ({
          ...segment,
          fromDate: shiftCalendarDate(segment.fromDate, delta),
          toDate: shiftCalendarDate(segment.toDate, delta),
        })));
      }
      return;
    }
    updateSegments([{ ...current, fromDate: value }, ...segments.slice(1)]);
  };

  const adjustSegmentNights = (index, amount) => {
    setForm((previous) => {
      const segments = previous.travelSegments || [];
      const segment = segments[index];
      const nights = Number(getNights(segment?.fromDate, segment?.toDate));
      if (!segment || !Number.isFinite(nights) || nights + amount < 1) return previous;
      const travelSegments = segments.map((entry, segmentIndex) => {
        if (segmentIndex < index) return entry;
        if (segmentIndex === index) return { ...entry, toDate: shiftCalendarDate(entry.toDate, amount) };
        return {
          ...entry,
          fromDate: shiftCalendarDate(entry.fromDate, amount),
          toDate: shiftCalendarDate(entry.toDate, amount),
        };
      });
      const arrivals = [...new Set(travelSegments.map((entry) => entry.arrivalDestination).filter(Boolean))];
      return {
        ...previous,
        travelSegments,
        destination: arrivals.join(' + '),
        travelDate: travelSegments[0]?.fromDate || '',
        endDate: travelSegments.at(-1)?.toDate || '',
      };
    });
  };

  const removeSegment = (idx) =>
    updateSegments(form.travelSegments.filter((_, i) => i !== idx));

  const savedPayload = () => {
    const people = form.clientType === 'Agent' ? availableAgents : (Array.isArray(b2cClients) ? b2cClients : []);
    const selectedClient = people.find((person) => String(person.id) === String(form.agentId));
    const contacts = Array.isArray(selectedClient?.contacts) ? selectedClient.contacts.filter(Boolean) : [];
    const primaryContact = contacts.find((contact) => contact.primary) || contacts[0];
    const { mobileCountryCode, mobileNumber, ...queryFields } = form;
    const fallbackPhone = primaryContact?.phone || selectedClient?.phone || '';
    return {
      ...queryFields,
      guests: (form.guests || []).filter((guest) => String(guest?.name || '').trim() || String(guest?.phone || '').trim()),
      agentName: selectedClient?.name || form.agentName || '',
      contactPerson: form.contactPerson || (form.clientType === 'B2C' ? selectedClient?.name : primaryContact?.name || selectedClient?.contactPerson) || '',
      contactEmail: form.contactEmail || primaryContact?.email || selectedClient?.email || '',
      mobileNumber: internationalPhone(mobileCountryCode, mobileNumber || fallbackPhone),
      landlineNumber: form.landlineNumber || selectedClient?.landline || '',
      leadSource: form.leadSource || (form.clientType === 'Agent' ? 'Agent' : 'B2C'),
      operationPerson: form.operationPerson || user?.name || '',
      salesPerson: form.salesPerson || user?.name || '',
      company: form.company || companySettings?.name?.trim() || '',
    };
  };

  const validate = (candidate = form) => {
    const errs = {};
    if (!candidate.travelSegments?.length) errs.travelSegments = 'Add at least one destination leg';
    if (candidate.travelSegments?.some(s => !s.departureDestination || !s.arrivalDestination || !s.fromDate || !s.toDate))
      errs.travelSegments = 'Complete all fields in each destination leg';
    (candidate.travelSegments || []).forEach((segment, index, segments) => {
      if (!segment.fromDate || !segment.toDate) return;
      if (segment.toDate <= segment.fromDate) errs.travelSegments = `Leg ${index + 1}: To Date must be after From Date`;
      if (index > 0 && segment.fromDate < segments[index - 1].toDate) {
        errs.travelSegments = `Leg ${index + 1} must start on or after the previous leg ends (${formatDate(segments[index - 1].toDate)}).`;
      }
    });
    if (!candidate.agentName && candidate.clientType === 'Agent') errs.agentName = 'Agent is required';
    if (!String(candidate.queryTitle || '').trim()) errs.queryTitle = 'Select a Query Title master or create a new one';
    if (!candidate.contactPerson) errs.contactPerson = 'Contact person is required';
    if ((candidate.guests || []).some((guest) => !String(guest?.name || '').trim() || !String(guest?.phone || '').trim())) {
      errs.guests = 'Every guest needs both a name and phone number';
    }
    if (!candidate.operationPerson) errs.operationPerson = 'Operation person is required';
    if (!candidate.salesPerson) errs.salesPerson = 'Sales person is required';
    if (!candidate.company) errs.company = 'Company is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    const payload = savedPayload();
    if (!validate(payload)) return;
    try {
      if (existing) { await updateQuery(id, payload); toast.success('Query updated!'); }
      else { await addQuery(payload); toast.success('Query created!'); }
      navigate('/app/queries');
    } catch (err) { toast.error(err.message); }
  };

  const handleSaveAndQuote = async () => {
    const payload = savedPayload();
    if (!validate(payload)) return;
    try {
      const saved = existing ? await updateQuery(id, payload) : await addQuery(payload);
      navigate(`/quotations/new?query=${encodeURIComponent(saved.id)}`);
      toast.success('Redirecting to quotation builder...');
    } catch (err) { toast.error(err.message); }
  };

  const handleDuplicate = async () => {
    const dup = { ...form, id: undefined, queryDate: todayIsoInTimeZone(), status: 'New' };
    try { await addQuery(dup); toast.success('Query duplicated!'); navigate('/app/queries'); }
    catch (err) { toast.error(err.message); }
  };

  const handleAddSegment = () => {
    if (!newSeg.departureDestination || !newSeg.arrivalDestination || !newSeg.fromDate || !newSeg.toDate) {
      toast.error('Please fill all destination fields before adding.');
      return;
    }
    if (newSeg.toDate <= newSeg.fromDate) {
      toast.error('To Date must be after From Date.');
      return;
    }
    if (previousSegmentEnd && newSeg.fromDate < previousSegmentEnd) {
      toast.error(`The next destination must start on or after ${formatDate(previousSegmentEnd)}.`);
      return;
    }
    const nextSegments = [...(form.travelSegments || []), { ...newSeg }];
    updateSegments(nextSegments);
    setNewSeg(nextSegmentDefaults(nextSegments));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  const steps = [
    { num: 1, label: 'Basic Info', active: true },
    { num: 2, label: 'Guest Details', active: false },
    { num: 3, label: 'Trip Details', active: false },
    { num: 4, label: 'Services & Rooms', active: false },
    { num: 5, label: 'Other Info', active: false },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 px-3 sm:px-6 py-2 md:py-3 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-[0_2px_10px_rgb(0,0,0,0.02)] sticky top-0 z-20">
        <div className="flex items-center gap-2.5 sm:gap-3 md:w-[280px]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/app/queries')} title="Back to queries" aria-label="Back to queries" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /></button>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><Users className="h-[18px] w-[18px]" /></span>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-primary-900 flex items-center gap-2 leading-tight">
                New Query
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-500 font-medium mt-0.5">
                Create a new query with complete details
              </p>
            </div>
          </div>
        </div>
        
        {/* Stepper Removed */}
        <div className="hidden lg:flex flex-1"></div>

        <div className="flex items-center md:justify-end gap-1.5 sm:gap-2.5 w-full md:w-auto">
          {/* Status Select (kept for functionality) */}
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className="form-select text-xs font-bold text-slate-700 py-1.5 w-24 sm:w-28 border-slate-200 shadow-sm focus:border-primary-500 focus:ring-primary-500/20 rounded-md cursor-pointer"
          >
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => navigate('/app/queries')} className="flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all">
            <X className="w-3.5 h-3.5 text-slate-400" /> <span className="hidden sm:inline">Cancel</span>
          </button>
          <button onClick={handleSave} className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={handleSaveAndQuote} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 shadow-sm transition-all whitespace-nowrap">
            <span className="sm:hidden">Save & Quote</span><span className="hidden sm:inline">Save & Create Quotation</span> <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 [&_.form-input]:!h-8 [&_.form-select]:!h-8 [&_.form-input]:!py-0 [&_.form-select]:!py-0 [&_.form-input]:!text-xs [&_.form-select]:!text-xs [&_input:not([type=checkbox]):not([type=radio])]:!py-1.5 [&_select]:!py-1.5 [&_label]:!text-[10.5px]">
        <div className="w-full grid grid-cols-1 xl:grid-cols-2 items-start gap-3">
          
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-3">
            
            {/* Block 1: Client / Agent Information */}
            <div className="order-1 bg-white rounded-xl border border-slate-300 shadow-sm p-3 sm:p-3.5 xl:col-start-1 xl:row-start-1">
              <SectionHeader icon={Users} title="1. Client / Agent Information" />
              
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-2.5 sm:gap-3 items-end">
                  <div className="w-full">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Type <span className="text-red-500">*</span></label>
                    <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200 rounded-lg w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setForm(current => ({ ...current, clientType: 'Agent', agentId: '', agentName: '', leadSource: 'Agent' }));
                          setErrors(current => { const { agentName, ...remaining } = current; return remaining; });
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${form.clientType === 'Agent' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        Agent
                      </button>
                      {!agentPortal && <button
                        type="button"
                        onClick={() => {
                          setForm(current => ({ ...current, clientType: 'B2C', agentId: '', agentName: '', leadSource: 'B2C' }));
                          setErrors(current => { const { agentName, ...remaining } = current; return remaining; });
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${form.clientType === 'B2C' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        Direct Client
                      </button>}
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {form.clientType === 'Agent' ? 'Agent / Client' : 'Direct Client'} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          value={form.agentId || ''}
                          onChange={selectClient}
                          options={clientOptions}
                          placeholder={form.clientType === 'Agent' ? 'Search or select agent/client' : 'Search or select client'}
                          hasError={Boolean(errors.agentName)}
                        />
                        {errors.agentName && <p className="text-[10px] text-red-500 mt-1">{errors.agentName}</p>}
                      </div>
                      {!agentPortal && <button type="button" onClick={openQuickCreate} className="px-6 py-2 border border-primary-600 text-primary-700 rounded-lg text-[13px] font-bold hover:bg-primary-50 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                        <Plus className="w-4 h-4" /> New
                      </button>}
                    </div>
                  </div>
                </div>

                <div className="max-w-[250px]">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Query Date <span className="text-red-500">*</span></label>
                  <SegmentDateInput value={form.queryDate || ''} onChange={(value) => set('queryDate', value)} />
                  {errors.queryDate && <p className="text-[10px] text-red-500 mt-1">{errors.queryDate}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                  <QueryInput label="Contact Person Name" field="contactPerson" form={form} setField={set} errors={errors} required placeholder="Enter contact person name" readOnly={!!form.agentId} className="rounded-lg" />
                  <QueryInput label="Contact Person Email" field="contactEmail" form={form} setField={set} errors={errors} type="email" placeholder="Enter email address" readOnly={!!form.agentId} className="rounded-lg" />
                  
                  <div className="min-w-0">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number</label>
                    <div className="flex w-full min-w-0">
                      <select
                        value={COUNTRY_DIAL_CODES.some((item) => item.code === (form.mobileCountryCode || '+66')) ? (form.mobileCountryCode || '+66') : '+66'}
                        onChange={(event) => set('mobileCountryCode', event.target.value)}
                        aria-label="Mobile country calling code"
                        className="h-8 max-w-[154px] border border-r-0 border-slate-200 rounded-l-lg bg-slate-50 px-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      >
                        {COUNTRY_DIAL_CODES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                      </select>
                      <input
                        type="text"
                        value={form.mobileNumber || ''}
                        onChange={(e) => !form.agentId && set('mobileNumber', e.target.value)}
                        readOnly={!!form.agentId}
                        placeholder="Enter mobile number"
                        className={`form-input min-w-0 flex-1 rounded-lg ${form.agentId ? 'bg-slate-50 cursor-default' : ''}`}
                      />
                    </div>
                  </div>
                  
                  <QueryInput label="Landline Number" field="landlineNumber" form={form} setField={set} errors={errors} placeholder="Enter landline number" readOnly={!!form.agentId} className="rounded-lg" />
                </div>
              </div>
            </div>

            {/* Block 3: Guest Details */}
            <div className="order-2 bg-white rounded-xl border border-slate-300 shadow-sm p-3 sm:p-3.5 xl:col-start-1 xl:row-start-2">
              <SectionHeader icon={Users} title="2. Guest Details">
                <div className="flex gap-2">
                  <button type="button" onClick={addGuest} className="px-3 py-1.5 border border-primary-200 text-primary-600 rounded-lg text-xs font-bold hover:bg-primary-50 flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Guest
                  </button>
                </div>
              </SectionHeader>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5">Guest Name</th>
                      <th className="px-3 py-2.5">Phone Number</th>
                      <th className="px-3 py-2.5 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guestRows.map((guest, index) => (
                      <tr key={guest.id || index}>
                        <td className="px-3 py-2 text-center text-xs font-bold text-slate-500">{index + 1}</td>
                        <td className="px-3 py-2">
                          <input className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" value={guest.name || ''} onChange={(e) => updateGuest(index, 'name', e.target.value)} placeholder="Enter full name" />
                        </td>
                        <td className="px-3 py-2">
                          <input className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" value={guest.phone || ''} onChange={(e) => updateGuest(index, 'phone', e.target.value)} placeholder="Enter phone" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => removeGuest(index)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {errors.guests && <p className="text-[10px] text-red-500 mt-2">{errors.guests}</p>}
            </div>

            {/* Block 5: Trip & Service Information */}
            <div className="order-4 bg-white rounded-xl border border-slate-300 shadow-sm p-3 sm:p-3.5 xl:col-start-1 xl:row-start-4">
              <SectionHeader icon={Briefcase} title="4. Trip & Service Information" />
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-3 items-end">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Service Type <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      value={form.serviceType || ''}
                      onChange={(val) => set('serviceType', val)}
                      options={queryTypes.map(x => x.name)}
                      placeholder="Complete Package"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                     <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {/* Adults */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Adults</label>
                          <div className="flex items-center border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 bg-white min-w-0">
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-1.5 sm:mr-2 flex-shrink-0" />
                            <input type="number" min="0" value={form.adults || ''} onChange={e => set('adults', e.target.value === '' ? '' : Number(e.target.value))} className="w-full min-w-0 text-sm font-semibold outline-none bg-transparent" placeholder="0" />
                          </div>
                        </div>
                        {/* Children */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Children</label>
                          <div className="flex items-center border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 bg-white min-w-0">
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-1.5 sm:mr-2 flex-shrink-0" />
                            <input type="number" min="0" value={form.children || ''} onChange={e => set('children', e.target.value === '' ? '' : Number(e.target.value))} className="w-full min-w-0 text-sm font-semibold outline-none bg-transparent" placeholder="0" />
                          </div>
                        </div>
                        {/* Infants */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Infants</label>
                          <div className="flex items-center border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 bg-white min-w-0">
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-1.5 sm:mr-2 flex-shrink-0" />
                            <input type="number" min="0" value={form.infants || ''} onChange={e => set('infants', e.target.value === '' ? '' : Number(e.target.value))} className="w-full min-w-0 text-sm font-semibold outline-none bg-transparent" placeholder="0" />
                          </div>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Age and height details */}
                {((Number(form.children) > 0) || (Number(form.infants) > 0)) && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {Array.from({ length: Number(form.children || 0) }).map((_, i) => (
                      <div key={`child-${i}`} className="flex flex-col items-center gap-1.5 bg-white p-2 border border-slate-200 rounded-md">
                        <span className="text-[10px] bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded">Child {i + 1}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Age</span>
                            <input type="number" min="2" max="17" value={form.childAges?.[i] || ''} onChange={e => {
                                const ages = [...(form.childAges || [])];
                                ages[i] = e.target.value === '' ? '' : Number(e.target.value);
                                set('childAges', ages);
                              }}
                              className="w-10 text-center text-xs form-input py-1 px-1 rounded-sm"
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Height (cm)</span>
                            <input type="number" min="0" value={form.childHeights?.[i] || ''} onChange={e => {
                                const heights = [...(form.childHeights || [])];
                                heights[i] = e.target.value === '' ? '' : Number(e.target.value);
                                set('childHeights', heights);
                              }}
                              className="w-12 text-center text-xs form-input py-1 px-1 rounded-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {Array.from({ length: Number(form.infants || 0) }).map((_, i) => (
                      <div key={`infant-${i}`} className="flex flex-col items-center gap-1.5 bg-white p-2 border border-slate-200 rounded-md">
                        <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">Infant {i + 1}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Age</span>
                            <input type="number" min="0" max="1" value={form.infantAges?.[i] || ''} onChange={e => {
                                const ages = [...(form.infantAges || [])];
                                ages[i] = e.target.value === '' ? '' : Number(e.target.value);
                                set('infantAges', ages);
                              }}
                              className="w-10 text-center text-xs form-input py-1 px-1 rounded-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
              </div>
            </div>
            {/* Block 2: Travel Date & Destination */}
            <div className="order-3 bg-white rounded-xl border border-slate-300 shadow-sm p-3 sm:p-3.5 xl:col-start-1 xl:row-start-3">
              <SectionHeader icon={Plane} title="3. Travel Date & Destination" />
              
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Mobile layout: one card per leg, with a roomy add-leg form (the 6-column table below is for sm+) */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">Destination legs</span>
                    <button type="button" onClick={() => setEditingTravelDates((current) => !current)} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-primary-700">
                      <Pencil className="w-3 h-3" /> {editingTravelDates ? 'Done' : 'Edit dates'}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(form.travelSegments || []).map((seg, idx) => (
                      <div key={idx} className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 text-[12px] font-bold text-slate-800">
                            <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[9px] flex-shrink-0">Leg {idx + 1}</span>
                            <span className="truncate">{seg.departureDestination || '—'}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{seg.arrivalDestination || '—'}</span>
                          </div>
                          <button type="button" onClick={() => removeSegment(idx)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                          <div className="min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">From</div>
                            {editingTravelDates && idx === 0
                              ? <SegmentDateInput value={seg.fromDate || ''} onChange={(value) => updateTravelDate(idx, 'fromDate', value)} className="w-full text-[11px] py-1 px-2 rounded-md" />
                              : <div className="text-[11px] font-semibold text-slate-700">{formatDate(seg.fromDate)}</div>}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">To</div>
                            <div className="text-[11px] font-semibold text-slate-700">{formatDate(seg.toDate)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5 text-center">Nights</div>
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => adjustSegmentNights(idx, -1)} disabled={Number(getNights(seg.fromDate, seg.toDate)) <= 1} className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 disabled:opacity-40">−</button>
                              <span className="text-[11px] font-bold text-slate-700 w-4 text-center">{getNights(seg.fromDate, seg.toDate)}</span>
                              <button type="button" onClick={() => adjustSegmentNights(idx, 1)} className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
                    <div className="text-[10px] font-bold text-slate-600">Add destination</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="min-w-0">
                        <label className="block text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Departure</label>
                        <select className="form-select w-full text-[11px] py-1.5 px-2 rounded-md" value={newSeg.departureDestination} onChange={e => setNS('departureDestination', e.target.value)}>
                          <option value="">Select city</option>
                          {destinationMasters.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Arrival *</label>
                        <select className="form-select w-full text-[11px] py-1.5 px-2 rounded-md" value={newSeg.arrivalDestination} onChange={e => setNS('arrivalDestination', e.target.value)}>
                          <option value="">Select destination</option>
                          {destinationMasters.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">From date *</label>
                        <SegmentDateInput value={newSeg.fromDate} min={previousSegmentEnd || undefined} onChange={(value) => setNS('fromDate', value)} className="w-full text-[11px] py-1.5 px-2 rounded-md h-[30px]" />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">To date *</label>
                        <SegmentDateInput value={newSeg.toDate} min={dayAfter(newSeg.fromDate) || undefined} onChange={(value) => setNS('toDate', value)} className="w-full text-[11px] py-1.5 px-2 rounded-md h-[30px]" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        {getNights(newSeg.fromDate, newSeg.toDate)} <span className="font-medium text-slate-400">nights</span>
                      </div>
                      <button type="button" onClick={handleAddSegment} className="flex-1 bg-primary-600 text-white rounded-md px-3 py-1.5 text-[11px] font-bold hover:bg-primary-700">Add destination</button>
                    </div>
                  </div>
                </div>
                <table className="hidden sm:table w-full table-fixed text-left [&_td_.form-input]:!text-[11px] [&_td_.form-select]:!text-[11px] [&_td_.form-select]:!pr-6">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[19%]" />
                    <col className="w-[21%]" />
                    <col className="w-[21%]" />
                    <col className="w-[13%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-2 whitespace-nowrap">Departure From</th>
                      <th className="px-2 py-2 whitespace-nowrap">Arrival Destination <span className="text-red-500">*</span></th>
                      <th className="px-2 py-2 whitespace-nowrap">From Date <span className="text-red-500">*</span></th>
                      <th className="px-2 py-2 whitespace-nowrap">To Date <span className="text-red-500">*</span></th>
                      <th className="px-2 py-2 text-center whitespace-nowrap">Nights</th>
                      <th className="px-2 py-2 text-center w-8">
                        <button
                          onClick={() => setEditingTravelDates((current) => !current)}
                          className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(form.travelSegments || []).map((seg, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-2 text-[11px] font-medium text-slate-700">{seg.departureDestination || '—'}</td>
                        <td className="px-2 py-2 text-[11px] font-medium text-slate-700">{seg.arrivalDestination || '—'}</td>
                        <td className="px-2 py-2">
                          {editingTravelDates && idx === 0 ? <SegmentDateInput value={seg.fromDate || ''} onChange={(value) => updateTravelDate(idx, 'fromDate', value)} className="text-[11px] py-1 px-2 rounded-md" /> : <div className="text-[11px] text-slate-600">{formatDate(seg.fromDate)}</div>}
                        </td>
                        <td className="px-2 py-2 text-[11px] text-slate-600">{formatDate(seg.toDate)}</td>
                        <td className="px-2 py-2">
                           <div className="flex items-center justify-center gap-1">
                            <button type="button" onClick={() => adjustSegmentNights(idx, -1)} disabled={Number(getNights(seg.fromDate, seg.toDate)) <= 1} className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                            <span className="text-[11px] font-bold text-slate-700 w-4 text-center">{getNights(seg.fromDate, seg.toDate)}</span>
                            <button type="button" onClick={() => adjustSegmentNights(idx, 1)} className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">+</button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeSegment(idx)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Add new segment inline row inside the table to align columns */}
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="px-2 py-2">
                        <select className="form-select w-full text-[11px] py-1.5 px-2 rounded-md" value={newSeg.departureDestination} onChange={e => setNS('departureDestination', e.target.value)}>
                          <option value="">Departure city</option>
                          {destinationMasters.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select className="form-select w-full text-[11px] py-1.5 px-2 rounded-md" value={newSeg.arrivalDestination} onChange={e => setNS('arrivalDestination', e.target.value)}>
                          <option value="">Select destination</option>
                          {destinationMasters.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <SegmentDateInput value={newSeg.fromDate} min={previousSegmentEnd || undefined} onChange={(value) => setNS('fromDate', value)} className="w-full text-[11px] py-1.5 px-2 rounded-md h-[26px]" />
                      </td>
                      <td className="px-2 py-2">
                        <SegmentDateInput value={newSeg.toDate} min={dayAfter(newSeg.fromDate) || undefined} onChange={(value) => setNS('toDate', value)} className="w-full text-[11px] py-1.5 px-2 rounded-md h-[26px]" />
                      </td>
                      <td className={`px-2 py-2 text-center text-[11px] font-bold ${getNights(newSeg.fromDate, newSeg.toDate) === '—' ? 'text-slate-400' : 'text-primary-700'}`}>
                        {getNights(newSeg.fromDate, newSeg.toDate)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={handleAddSegment}
                          className="w-full bg-primary-600 text-white rounded px-2 py-1.5 text-[11px] font-bold hover:bg-primary-700"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {errors.travelSegments && (
                  <div className="p-2">
                    <p className="text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.travelSegments}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-3">

            {/* Block 4: Room Allocation */}
            <div className="order-5 bg-white rounded-xl border border-slate-300 shadow-sm p-3 sm:p-3.5 xl:col-start-2 xl:row-start-1">
              <SectionHeader icon={BedDouble} title="5. Room Allocation">
                <span className="hidden sm:inline text-[10px] text-slate-500 font-medium">Auto-saved and used when creating quotation.</span>
              </SectionHeader>
              <div className="grid grid-cols-3 gap-x-2 sm:gap-x-4 gap-y-3 lg:grid-cols-3">
                {[['sgl', 'SGL Room'], ['dbl', 'DBL Room'], ['adultExtraBed', 'Adult Extra Bed'], ['cwb', 'CWB Room'], ['cnb', 'CNB Room'], ['inf', 'INF Room']].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">{label}</label>
                    <input type="number" min="0" value={form.roomAllocation?.[field] || ''} onChange={(event) => {
                      const roomAllocation = { ...(form.roomAllocation || {}), [field]: event.target.value === '' ? 0 : Math.max(0, Number(event.target.value)) };
                      setForm((current) => ({ ...current, roomAllocation, rooms: Number(roomAllocation.sgl || 0) + Number(roomAllocation.dbl || 0) }));
                    }} className="w-full text-xs border border-slate-200 rounded-lg px-2 sm:px-3 py-2 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" placeholder="0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Block 6: Operation & Assignment */}
            <div className="order-6 bg-white rounded-xl border border-slate-300 shadow-sm p-3 sm:p-3.5 xl:col-start-2 xl:row-start-2">
              <SectionHeader icon={UserCircle} title="6. Operation & Assignment" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={form.leadSource || ''}
                    onChange={e => set('leadSource', e.target.value)}
                    className={`form-select text-xs py-2 rounded-lg ${errors.leadSource ? 'border-red-400' : ''}`}
                  >
                    <option value="">Select</option>
                    {leadSourceMasters.map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority</label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {priorities.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => set('priority', p)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1.5 ${form.priority === p ? (p === 'High' || p === 'Urgent' ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : p === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-sm' : 'bg-green-50 text-green-600 border-green-200 shadow-sm') : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {form.priority === p && <div className={`w-1.5 h-1.5 rounded-full ${p === 'High' || p === 'Urgent' ? 'bg-red-500' : p === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`}></div>}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Operation Person <span className="text-red-500">*</span></label>
                  <input
                    className={`form-input text-xs py-2 rounded-lg ${errors.operationPerson ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    value={form.operationPerson || ''}
                    onChange={e => set('operationPerson', e.target.value)}
                    placeholder="Enter name"
                  />
                  {errors.operationPerson && <p className="text-[10px] text-red-500 mt-1">{errors.operationPerson}</p>}
                </div>
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Sales Person <span className="text-red-500">*</span></label>
                  <select
                    value={form.salesPerson || ''}
                    onChange={e => set('salesPerson', e.target.value)}
                    className={`form-select text-xs py-2 rounded-lg ${errors.salesPerson ? 'border-red-400' : ''}`}
                  >
                    <option value="">Select user</option>
                    {user?.name && <option value={user.name}>{user.name}</option>}
                  </select>
                  {errors.salesPerson && <p className="text-[10px] text-red-500 mt-1">{errors.salesPerson}</p>}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Company <span className="text-red-500">*</span></label>
                  <select
                    value={form.company || ''}
                    onChange={e => set('company', e.target.value)}
                    className={`form-select text-xs py-2 rounded-lg ${errors.company ? 'border-red-400' : ''}`}
                  >
                    <option value="">{companySettings ? 'Select company' : 'Loading...'}</option>
                    {companySettings?.name && <option value={companySettings.name.trim()}>{companySettings.name.trim()}</option>}
                  </select>
                  {errors.company && <p className="text-[10px] text-red-500 mt-1">{errors.company}</p>}
                </div>
              </div>
            </div>

            {/* Block 7: Other Information */}
            <div className="order-7 bg-white rounded-xl border border-slate-300 shadow-sm p-3 sm:p-3.5 xl:col-start-2 xl:row-start-3">
              <SectionHeader icon={Info} title="7. Other Information" />
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2"><label className="block text-[11px] font-bold text-slate-700">Query Title <span className="text-red-500">*</span></label><button type="button" onClick={openCreateQueryTitleMaster} className="text-[10px] font-bold text-primary-700 hover:text-primary-800">+ New query title</button></div>
                    <SearchableSelect value={form.queryTitleMasterId || form.queryTitle || ''} onChange={selectQueryTitleMaster} options={queryTitleOptions} placeholder="Select query title master" compact={false} hasError={Boolean(errors.queryTitle)} />
                    {errors.queryTitle && <p className="text-[10px] text-red-500 mt-1">{errors.queryTitle}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Add CC Emails</label>
                    <input
                      className="form-input text-xs py-2 rounded-lg"
                      value={(form.ccMails || []).join(', ')}
                      onChange={e => set('ccMails', e.target.value.split(/[;,\n]/).map(x => x.trim()).filter(Boolean))}
                      placeholder="eg: abc@example.com, xyz@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Important Notes <span className="text-slate-400 font-medium">(from the selected Query Title master)</span></label>
                  <RichTextEditor value={form.importantNotes || ''} onChange={(value) => set('importantNotes', value)} placeholder="Select a Query Title master, or create one with its rich-text important notes..." />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(quickCreateType)}
        onClose={() => !quickCreateSaving && setQuickCreateType(null)}
        title={quickCreateType === 'Agent' ? 'Create Agent Master' : 'Create B2C Master'}
        icon={{ icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' }}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setQuickCreateType(null)} disabled={quickCreateSaving} className="btn-secondary">Cancel</button>
            <button type="button" onClick={saveQuickCreate} disabled={quickCreateSaving} className="btn-primary">
              {quickCreateSaving ? 'Saving…' : `Create ${quickCreateType || 'record'}`}
            </button>
          </>
        }
      >
        <div className="space-y-2.5 [&_.form-input]:!h-8 [&_.form-input]:!py-0 [&_.form-input]:!text-xs [&_.form-label]:!mb-0.5 [&_.form-label]:!text-[10px]">
          <p className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-800">
            <Info className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            This record is saved to the {quickCreateType === 'Agent' ? 'Agent' : 'B2C'} Master and selected for this enquiry immediately.
          </p>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-3">
            <label className="sm:col-span-3">
              <span className="form-label">{quickCreateType === 'Agent' ? 'Agent company name' : 'Client name'} *</span>
              <input value={quickCreate.name} onChange={(event) => setQuickCreate((current) => ({ ...current, name: event.target.value }))} className="form-input" placeholder={quickCreateType === 'Agent' ? 'Enter agent company name' : 'Enter client name'} autoFocus />
            </label>
            {quickCreateType === 'Agent' && (
              <label>
                <span className="form-label">Contact person</span>
                <input value={quickCreate.contactPerson} onChange={(event) => setQuickCreate((current) => ({ ...current, contactPerson: event.target.value }))} className="form-input" placeholder="Contact name" />
              </label>
            )}
            <label>
              <span className="form-label">Email</span>
              <input type="email" value={quickCreate.email} onChange={(event) => setQuickCreate((current) => ({ ...current, email: event.target.value }))} className="form-input" placeholder="Email address" />
            </label>
            <label>
              <span className="form-label">Mobile number</span>
              <input value={quickCreate.phone} onChange={(event) => setQuickCreate((current) => ({ ...current, phone: event.target.value }))} className="form-input" placeholder="Mobile number" />
            </label>
            {quickCreateType === 'Agent' && (
              <>
                <label>
                  <span className="form-label">Market</span>
                  <SearchableSelect value={quickCreate.market} onChange={(value) => setQuickCreate((current) => ({ ...current, market: value }))} options={marketMasters} placeholder="Select market" />
                </label>
                <label>
                  <span className="form-label">Markup category *</span>
                  <SearchableSelect value={quickCreate.markupCategory} onChange={(value) => setQuickCreate((current) => ({ ...current, markupCategory: value }))} options={markupCategories} placeholder="Select markup category" />
                </label>
              </>
            )}
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={showQueryTitleMasterModal}
        onClose={() => !savingQueryTitleMaster && setShowQueryTitleMasterModal(false)}
        title="Create Query Title Master"
        size="lg"
        footer={<><button type="button" onClick={() => setShowQueryTitleMasterModal(false)} disabled={savingQueryTitleMaster} className="btn-secondary">Cancel</button><button type="button" onClick={saveQueryTitleMaster} disabled={savingQueryTitleMaster} className="btn-primary">{savingQueryTitleMaster ? 'Saving…' : 'Create & Select'}</button></>}
      >
        <div className="space-y-2.5">
          <p className="text-xs text-slate-500">This master keeps the query title and its Important Notes together. The selected notes are copied into the query as rich text.</p>
          <label><span className="form-label">Query Title *</span><input value={queryTitleMasterForm.name} onChange={(event) => setQueryTitleMasterForm((current) => ({ ...current, name: event.target.value }))} className="form-input" placeholder="For example: Thailand Family Discovery" autoFocus /></label>
          <label><span className="form-label">Important Notes *</span><RichTextEditor value={queryTitleMasterForm.importantNotes} onChange={(value) => setQueryTitleMasterForm((current) => ({ ...current, importantNotes: value }))} placeholder="Use bullets, numbering, headings and emphasis exactly as it should appear on the query..." /></label>
        </div>
      </Modal>
    </div>
  );
}
