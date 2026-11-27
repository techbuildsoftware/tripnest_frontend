import React, { useEffect, useState } from 'react';
import { Save, Building2, Users, DollarSign, FileText, Bell, Settings as SettingsIcon, Shield, Sparkles, Mail, Send, Phone, Globe, MapPin, Clock, ChevronRight, Lock, UserPlus, BadgeCheck, X as XIcon, MessageCircle, QrCode, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';
import Modal from '../../components/ui/Modal';

const companyLogoUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(companyLogoUrl).find(Boolean) || '';
  if (typeof value === 'object') return companyLogoUrl(value.url || value.secureUrl || value.secure_url || value.imageUrl || value.src || value.path);
  return '';
};

const shortDate = (value) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const SETTINGS_SECTIONS = [
  { id: 'company', label: 'Company Profile', icon: Building2, tone: 'bg-blue-50 text-blue-600', grad: 'from-blue-600 to-indigo-600', desc: 'Business name, contact details and logo shown on documents' },
  { id: 'users', label: 'Users', icon: Users, tone: 'bg-violet-50 text-violet-600', grad: 'from-violet-600 to-purple-600', desc: 'Manage team members, roles and access' },
  { id: 'currency', label: 'Currency & Tax', icon: DollarSign, tone: 'bg-emerald-50 text-emerald-600', grad: 'from-emerald-600 to-teal-600', desc: 'Exchange rates, tax rules and default currency' },
  { id: 'quotation', label: 'Quotation Settings', icon: FileText, tone: 'bg-amber-50 text-amber-600', grad: 'from-amber-500 to-orange-500', desc: 'Defaults used when building new quotations' },
  { id: 'notifications', label: 'Notifications', icon: Bell, tone: 'bg-rose-50 text-rose-600', grad: 'from-rose-500 to-pink-600', desc: 'Choose which alerts and reminders you receive' },
  { id: 'email', label: 'Supplier Email', icon: Mail, tone: 'bg-sky-50 text-sky-600', grad: 'from-sky-500 to-cyan-600', desc: 'SMTP account used to email hotel suppliers' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, tone: 'bg-emerald-50 text-emerald-600', grad: 'from-emerald-500 to-green-600', desc: 'Connect devices and send through PulseSend' },
  { id: 'ai', label: 'AI Itinerary', icon: Sparkles, tone: 'bg-fuchsia-50 text-fuchsia-600', grad: 'from-fuchsia-500 to-purple-600', desc: 'AI assistant behaviour for itinerary writing' },
  { id: 'system', label: 'System Preferences', icon: SettingsIcon, tone: 'bg-slate-100 text-slate-600', grad: 'from-slate-600 to-slate-800', desc: 'Global application behaviour and preferences' },
];

// Input with a leading icon, used for the company profile fields.
const IconField = ({ icon: Icon, children }) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    {children}
  </div>
);

const SMTP_PRESETS = [
  { id: 'godaddy-titan', label: 'GoDaddy Professional Email', detail: 'Titan / Professional Email', host: 'smtpout.secureserver.net', port: 465, secure: true },
  { id: 'godaddy-titan-starttls', label: 'GoDaddy Professional Email (STARTTLS)', detail: 'Use only when GoDaddy asks for port 587', host: 'smtpout.secureserver.net', port: 587, secure: false },
  { id: 'godaddy-m365', label: 'GoDaddy Microsoft 365', detail: 'Requires SMTP Auth + app password for MFA', host: 'smtp.office365.com', port: 587, secure: false },
  { id: 'google', label: 'Google Workspace / Gmail', detail: 'Requires Google App Password for 2-step verification', host: 'smtp.gmail.com', port: 465, secure: true },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('company');
  const [company, setCompany] = useState({
    name: 'TripNest CRM',
    email: 'admin@tripnest.com',
    phone: '+66 76 345 678',
    address: '123 Phuket Road, Phuket 83000, Thailand',
    website: 'www.tripnest.com',
    currency: 'THB',
    timezone: 'Asia/Bangkok',
    logo: null,
  });
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState('');

  const [quotSettings, setQuotSettings] = useState({
    defaultMarkup: 0,
    defaultValidDays: 7,
    defaultCurrency: 'THB',
    autoSaveInterval: 30,
    showSupplierInClient: false,
    defaultMealPlan: 'RB',
    defaultHotelCategory: '4 Star',
  });

  const [notifSettings, setNotifSettings] = useState({
    quotationFollowup: true,
    paymentDue: true,
    supplierConfirmation: true,
    arrivalReminder: true,
    emailNotifications: true,
    browserNotifications: false,
  });
  const [aiSettings, setAiSettings] = useState({ provider: 'openai', model: '', customModel: '', openaiApiKey: '', geminiApiKey: '', hasOpenaiApiKey: false, hasGeminiApiKey: false });
  const [savingAi, setSavingAi] = useState(false);
  const [emailSettings, setEmailSettings] = useState({ host: 'smtpout.secureserver.net', port: 465, secure: true, username: '', fromName: '', fromEmail: '', password: '', hasPassword: false, configured: false });
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [whatsappSettings, setWhatsappSettings] = useState({ baseUrl: 'https://api.pulsesend.app/api', apiKey: '', hasApiKey: false, configured: false, defaultConnectedPhoneNumber: '' });
  const [whatsappSessions, setWhatsappSessions] = useState([]);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [whatsappAccount, setWhatsappAccount] = useState(null);
  const [loadingWhatsappAccount, setLoadingWhatsappAccount] = useState(false);
  const [whatsappAccountError, setWhatsappAccountError] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [connectingWhatsapp, setConnectingWhatsapp] = useState(false);
  const [reconnectingSessionId, setReconnectingSessionId] = useState('');
  const [whatsappQr, setWhatsappQr] = useState(null);
  const [deviceName, setDeviceName] = useState('');

  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Sales' });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settingsResponse, usersResponse, aiResponse, emailResponse] = await Promise.all([apiClient.get('/settings'), apiClient.get('/users'), apiClient.get('/ai/settings'), apiClient.get('/supplier-emails/settings')]);
        const settings = settingsResponse.data;
        if (settings.company) setCompany((current) => ({ ...current, ...settings.company }));
        if (settings.quotation) setQuotSettings((current) => ({ ...current, ...settings.quotation }));
        if (settings.notifications) setNotifSettings((current) => ({ ...current, ...settings.notifications }));
        setUsers(usersResponse.data);
        setAiSettings((current) => ({ ...current, ...(aiResponse.data || {}) }));
        setEmailSettings((current) => ({ ...current, ...(emailResponse.data || {}), password: '' }));
        try {
          const whatsappResponse = await apiClient.get('/whatsapp/settings');
          setWhatsappSettings((current) => ({ ...current, ...(whatsappResponse.data || {}), apiKey: '' }));
        } catch {
          // Settings can still open for a non-administrator. Device management
          // remains deliberately restricted to administrators.
        }
      } catch (error) { toast.error(`Could not load settings: ${error.message}`); }
    };
    loadSettings();
  }, []);

  const chooseCompanyLogo = (file) => {
    setCompanyLogoFile(file || null);
    if (companyLogoPreview) URL.revokeObjectURL(companyLogoPreview);
    setCompanyLogoPreview(file ? URL.createObjectURL(file) : '');
  };
  const handleSave = async () => {
    const key = activeSection === 'company' ? 'company' : activeSection === 'quotation' ? 'quotation' : activeSection === 'notifications' ? 'notifications' : null;
    if (!key) { toast.success('No changes to save in this section.'); return; }
    let value = key === 'company' ? company : key === 'quotation' ? quotSettings : notifSettings;
    try {
      if (key === 'company' && companyLogoFile) {
        const formData = new FormData();
        formData.append('companyLogo', companyLogoFile);
        const uploaded = (await apiClient.upload('/uploads?folder=company', formData)).data?.[0];
        if (!uploaded) throw new Error('The company logo could not be uploaded.');
        value = { ...company, logo: uploaded };
      }
      await apiClient.put(`/settings/${key}`, { value });
      if (key === 'company') {
        setCompany(value);
        if (companyLogoPreview) URL.revokeObjectURL(companyLogoPreview);
        setCompanyLogoPreview('');
        setCompanyLogoFile(null);
      }
      toast.success('Settings saved!');
    }
    catch (error) { toast.error(error.message); }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) { toast.error('Name, email and password are required.'); return; }
    try {
      const user = (await apiClient.post('/users', newUser)).data;
      setUsers((current) => [...current, user]); setShowUserForm(false); setNewUser({ name: '', email: '', password: '', role: 'Sales' });
      toast.success('User added!');
    } catch (error) { toast.error(error.message); }
  };
  const saveAiSettings = async () => {
    setSavingAi(true);
    try {
      const saved = (await apiClient.put('/ai/settings', aiSettings)).data;
      setAiSettings((current) => ({ ...current, ...saved, openaiApiKey: '', geminiApiKey: '' }));
      toast.success('AI provider settings saved securely.');
    } catch (error) { toast.error(error.message); }
    finally { setSavingAi(false); }
  };
  const saveEmailSettings = async () => {
    setSavingEmail(true);
    try {
      const saved = (await apiClient.put('/supplier-emails/settings', emailSettings)).data;
      setEmailSettings((current) => ({ ...current, ...saved, password: '' }));
      toast.success('Supplier SMTP settings saved securely.');
    } catch (error) { toast.error(error.message); }
    finally { setSavingEmail(false); }
  };
  const testEmailSettings = async () => {
    setTestingEmail(true);
    try { toast.success((await apiClient.post('/supplier-emails/settings/test', {})).data?.message || 'SMTP connection verified.'); }
    catch (error) { toast.error(error.message); }
    finally { setTestingEmail(false); }
  };
  const applySmtpPreset = (preset) => setEmailSettings((current) => ({ ...current, host: preset.host, port: preset.port, secure: preset.secure }));
  const loadWhatsappSessions = async ({ force = false } = {}) => {
    setLoadingWhatsapp(true);
    try {
      const response = await apiClient.get(`/whatsapp/sessions${force ? '?refresh=1' : ''}`, { retry: false, timeoutMs: 4_000 });
      setWhatsappSessions(response.data || []);
    } catch (error) {
      setWhatsappSessions([]);
      if (whatsappSettings.configured) toast.error(error.message);
    } finally { setLoadingWhatsapp(false); }
  };
  const loadWhatsappAccount = async ({ force = false } = {}) => {
    if (!whatsappSettings.configured) return;
    setLoadingWhatsappAccount(true);
    setWhatsappAccountError('');
    try {
      const response = await apiClient.get(`/whatsapp/account${force ? '?refresh=1' : ''}`, { retry: false, timeoutMs: 4_000 });
      setWhatsappAccount(response.data || null);
    } catch (error) {
      setWhatsappAccount(null);
      setWhatsappAccountError(error.message || 'Could not load the PulseSend subscription.');
    } finally { setLoadingWhatsappAccount(false); }
  };
  const saveWhatsappSettings = async () => {
    setSavingWhatsapp(true);
    try {
      const saved = (await apiClient.put('/whatsapp/settings', whatsappSettings)).data;
      setWhatsappSettings((current) => ({ ...current, ...saved, apiKey: '' }));
      toast.success('WhatsApp settings saved securely.');
      if (saved?.configured) await Promise.all([loadWhatsappSessions({ force: true }), loadWhatsappAccount({ force: true })]);
    } catch (error) { toast.error(error.message); }
    finally { setSavingWhatsapp(false); }
  };
  const startWhatsappConnection = async () => {
    if (!whatsappSettings.configured && !whatsappSettings.apiKey.trim()) {
      toast.error('Save the PulseSend API key before connecting a device.');
      return;
    }
    setConnectingWhatsapp(true);
    try {
      if (whatsappSettings.apiKey.trim()) await saveWhatsappSettings();
      const response = await apiClient.post('/whatsapp/connect', { displayName: deviceName || 'TripNest WhatsApp', waitForQr: true });
      const connection = response.data || {};
      setWhatsappQr(connection);
      setDeviceName('');
      toast.success(connection.status === 'connected' ? 'WhatsApp device connected.' : 'Scan the QR code in WhatsApp Linked Devices.');
      await loadWhatsappSessions({ force: true });
    } catch (error) { toast.error(error.message); }
    finally { setConnectingWhatsapp(false); }
  };
  const refreshWhatsappQr = async (sessionId) => {
    try {
      const response = await apiClient.get(`/whatsapp/sessions/${sessionId}/qr`, { retry: false, timeoutMs: 4_000 });
      const connection = response.data || {};
      setWhatsappQr(connection);
      if (connection.status === 'connected') {
        toast.success('WhatsApp device connected.');
        await loadWhatsappSessions({ force: true });
      }
    } catch (error) { toast.error(error.message); }
  };
  const reconnectWhatsapp = async (sessionId) => {
    setReconnectingSessionId(sessionId);
    try {
      const response = await apiClient.post(`/whatsapp/sessions/${sessionId}/reconnect`, { fresh: true });
      setWhatsappQr(response.data || {});
      toast.success('New QR code requested. Scan it from WhatsApp Linked Devices.');
      await loadWhatsappSessions({ force: true });
    } catch (error) { toast.error(error.message); }
    finally { setReconnectingSessionId(''); }
  };

  useEffect(() => {
    if (activeSection !== 'whatsapp' || !whatsappSettings.configured) return undefined;
    loadWhatsappSessions();
    loadWhatsappAccount();
    return undefined;
  }, [activeSection, whatsappSettings.configured]);

  useEffect(() => {
    const sessionId = whatsappQr?.sessionId || whatsappQr?.id || whatsappQr?._id;
    if (!sessionId || whatsappQr?.status === 'connected') return undefined;
    const timer = window.setInterval(() => { refreshWhatsappQr(sessionId); }, 5_000);
    return () => window.clearInterval(timer);
  }, [whatsappQr?.sessionId, whatsappQr?.id, whatsappQr?._id, whatsappQr?.status]);

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><SettingsIcon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h1 className="page-title">Settings</h1>
          <p className="truncate text-xs sm:text-sm text-slate-500">Configure your CRM preferences and system settings</p>
        </div>
        <button
          type="button"
          onClick={() => { if (window.confirm('Reset all demo data to its original state? Your changes will be lost.')) window.__resetDemoData?.(); }}
          className="ml-auto shrink-0 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50"
        >
          Reset demo data
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        {/* Sidebar */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="card border-slate-300 p-1.5 grid grid-cols-2 gap-1 sm:grid-cols-3 md:block md:space-y-0.5 md:sticky md:top-3">
            {SETTINGS_SECTIONS.map(section => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2 px-1.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all text-left ${active ? 'bg-slate-100 border border-slate-300 text-slate-900' : 'border border-transparent text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${active ? 'bg-blue-600 text-white shadow-sm' : section.tone}`}><section.icon className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1 truncate">{section.label}</span>
                  <ChevronRight className={`hidden md:block h-3.5 w-3.5 shrink-0 ${active ? 'text-slate-500' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 [&_.card]:border-slate-300 [&_.section-title]:hidden">
          {(() => {
            const meta = SETTINGS_SECTIONS.find((item) => item.id === activeSection) || SETTINGS_SECTIONS[0];
            return (
              <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.tone}`}><meta.icon className="h-5 w-5" /></span>
                <div className="min-w-0"><h2 className="text-sm font-extrabold leading-tight text-slate-900">{meta.label}</h2><p className="text-[11px] text-slate-500">{meta.desc}</p></div>
              </div>
            );
          })()}
          {activeSection === 'company' && (
            <div className="card p-3 sm:p-4 space-y-3">
              <h2 className="section-title">Company Profile</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className="form-label">Company Name</label>
                  <IconField icon={Building2}><input type="text" value={company.name} onChange={e => setCompany(prev => ({ ...prev, name: e.target.value }))} className="form-input pl-9" /></IconField>
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <IconField icon={Mail}><input type="email" value={company.email} onChange={e => setCompany(prev => ({ ...prev, email: e.target.value }))} className="form-input pl-9" /></IconField>
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <IconField icon={Phone}><input type="text" value={company.phone} onChange={e => setCompany(prev => ({ ...prev, phone: e.target.value }))} className="form-input pl-9" /></IconField>
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Address</label>
                  <div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><textarea value={company.address} onChange={e => setCompany(prev => ({ ...prev, address: e.target.value }))} className="form-input pl-9" rows={2} /></div>
                </div>
                <div>
                  <label className="form-label">Website</label>
                  <IconField icon={Globe}><input type="text" value={company.website} onChange={e => setCompany(prev => ({ ...prev, website: e.target.value }))} className="form-input pl-9" /></IconField>
                </div>
                <div>
                  <label className="form-label">Timezone</label>
                  <IconField icon={Clock}><select value={company.timezone} onChange={e => setCompany(prev => ({ ...prev, timezone: e.target.value }))} className="form-select pl-9">
                    <option>Asia/Bangkok</option>
                    <option>Asia/Kolkata</option>
                    <option>Asia/Singapore</option>
                    <option>Asia/Dubai</option>
                  </select></IconField>
                </div>
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                      {(companyLogoPreview || companyLogoUrl(company.logo)) ? <img src={companyLogoPreview || companyLogoUrl(company.logo)} alt="Company logo" className="h-full w-full object-contain" /> : <Building2 className="h-6 w-6 text-slate-300" />}
                    </div>
                    <div className="min-w-0 flex-1"><label className="form-label">Company Logo</label><p className="mb-2 text-xs text-slate-500">Used on client invoices and payment links. PNG, JPG, or WEBP up to 8 MB.</p><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseCompanyLogo(event.target.files?.[0] || null)} className="form-input max-w-sm p-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700" /></div>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} className="btn-primary w-full justify-center sm:w-auto"><Save className="w-4 h-4" /> Save Changes</button>
            </div>
          )}

          {activeSection === 'quotation' && (
            <div className="card p-3 sm:p-4 space-y-3">
              <h2 className="section-title">Quotation Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="form-label">Default Markup %</label>
                  <input type="number" value={quotSettings.defaultMarkup} onChange={e => setQuotSettings(prev => ({ ...prev, defaultMarkup: Number(e.target.value) }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Default Valid Days</label>
                  <input type="number" value={quotSettings.defaultValidDays} onChange={e => setQuotSettings(prev => ({ ...prev, defaultValidDays: Number(e.target.value) }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Default Currency</label>
                  <select value={quotSettings.defaultCurrency} onChange={e => setQuotSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))} className="form-select">
                    {['THB', 'Usd', 'Inr', 'Eur', 'Aed', 'Sgd'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Default Hotel Category</label>
                  <select value={quotSettings.defaultHotelCategory} onChange={e => setQuotSettings(prev => ({ ...prev, defaultHotelCategory: e.target.value }))} className="form-select">
                    {['3 Star', '4 Star', '5 Star', 'Boutique'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={quotSettings.showSupplierInClient} onChange={e => setQuotSettings(prev => ({ ...prev, showSupplierInClient: e.target.checked }))} className="w-4 h-4 rounded" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">Show Supplier in Client View</div>
                      <div className="text-xs text-slate-500">Warning: This will expose supplier information to clients</div>
                    </div>
                  </label>
                </div>
              </div>
              <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4" /> Save Settings</button>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="card p-3 sm:p-4 space-y-3">
              <h2 className="section-title">Notification Settings</h2>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {[
                  { key: 'quotationFollowup', icon: FileText, label: 'Quotation Follow-up Reminders', desc: 'Alert when follow-up date is due' },
                  { key: 'paymentDue', icon: DollarSign, label: 'Payment Due Alerts', desc: 'Alert before payment deadlines' },
                  { key: 'supplierConfirmation', icon: Shield, label: 'Supplier Confirmation Pending', desc: 'Alert when suppliers haven\'t confirmed' },
                  { key: 'arrivalReminder', icon: Clock, label: 'Arrival Day Reminders', desc: 'Daily briefing on arrivals and departures' },
                  { key: 'emailNotifications', icon: Mail, label: 'Email Notifications', desc: 'Receive alerts via email' },
                  { key: 'browserNotifications', icon: Globe, label: 'Browser Notifications', desc: 'Receive push notifications in browser' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><item.icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </div>
                    <div className={`relative inline-flex shrink-0 h-5 w-9 rounded-full transition-colors ${notifSettings[item.key] ? 'bg-primary-600' : 'bg-slate-300'}`}
                      onClick={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}>
                      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${notifSettings[item.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>
              <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4" /> Save Settings</button>
            </div>
          )}

          {activeSection === 'ai' && (
            <div className="card p-3 sm:p-4 space-y-3">
              <div><h2 className="section-title">AI itinerary generator</h2><p className="mt-1 text-xs text-slate-500">Your provider key is encrypted on the server and is never returned to the browser. Choose the provider and model used when generating voucher itinerary days.</p></div>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                <label><span className="form-label">AI provider</span><select value={aiSettings.provider} onChange={(event) => setAiSettings((current) => ({ ...current, provider: event.target.value }))} className="form-select"><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select></label>
                <label><span className="form-label">Model</span><select value={aiSettings.model} onChange={(event) => setAiSettings((current) => ({ ...current, model: event.target.value }))} className="form-select"><option value="">Use provider default</option>{(aiSettings.provider === 'gemini' ? ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'] : ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o']).map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
                <label className="sm:col-span-2"><span className="form-label">Custom model (optional)</span><input value={aiSettings.customModel || ''} onChange={(event) => setAiSettings((current) => ({ ...current, customModel: event.target.value }))} className="form-input" placeholder="For example: a future provider model ID" /><span className="mt-1 block text-[11px] text-slate-400">When set, this model overrides the selected list model.</span></label>
                <label><span className="form-label">OpenAI API key {aiSettings.hasOpenaiApiKey && <span className="text-emerald-600">(saved)</span>}</span><input type="password" value={aiSettings.openaiApiKey || ''} onChange={(event) => setAiSettings((current) => ({ ...current, openaiApiKey: event.target.value }))} className="form-input" placeholder={aiSettings.hasOpenaiApiKey ? 'Leave blank to keep the saved key' : 'sk-...'} autoComplete="new-password" /></label>
                <label><span className="form-label">Gemini API key {aiSettings.hasGeminiApiKey && <span className="text-emerald-600">(saved)</span>}</span><input type="password" value={aiSettings.geminiApiKey || ''} onChange={(event) => setAiSettings((current) => ({ ...current, geminiApiKey: event.target.value }))} className="form-input" placeholder={aiSettings.hasGeminiApiKey ? 'Leave blank to keep the saved key' : 'AIza...'} autoComplete="new-password" /></label>
              </div>
              <button onClick={saveAiSettings} disabled={savingAi} className="btn-primary disabled:opacity-60"><Save className="w-4 h-4" /> {savingAi ? 'Saving...' : 'Save AI settings'}</button>
            </div>
          )}

          {activeSection === 'email' && (
            <div className="card space-y-3 p-3 sm:p-4">
              <div>
                <h2 className="section-title">Supplier email delivery</h2>
                <p className="mt-1 text-xs text-slate-500">Configure the mailbox used to send supplier-service requests from each booking. The password is encrypted on the server and is never returned to this panel.</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <strong>Choose the provider that hosts your actual mailbox.</strong> A GoDaddy domain can use GoDaddy Professional Email, GoDaddy Microsoft 365, or Google Workspace; each uses a different SMTP server.
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{SMTP_PRESETS.map((preset) => { const active = emailSettings.host === preset.host && Number(emailSettings.port) === preset.port && Boolean(emailSettings.secure) === preset.secure; return <button type="button" key={preset.id} onClick={() => applySmtpPreset(preset)} className={`rounded-xl border p-3 text-left transition ${active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}><span className="block text-xs font-extrabold text-slate-800">{preset.label}</span><span className="mt-1 block text-[10px] leading-snug text-slate-500">{preset.detail}</span><span className="mt-2 block font-mono text-[10px] text-slate-600">{preset.host}:{preset.port}</span></button>; })}</div>
              {emailSettings.host === 'smtp.gmail.com' && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900">Google SMTP is currently selected. If your mailbox was verified as GoDaddy Professional Email, click <strong>GoDaddy Professional Email</strong> above before saving.</div>}
              {String(emailSettings.host || '').toLowerCase().includes('gmail') && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Google / Google Workspace:</strong> use <code>smtp.gmail.com</code> with port 465 + SSL, and enter a Google <strong>App Password</strong> when two-step verification is enabled. Your normal Google password will be rejected.</div>}
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                <label><span className="form-label">SMTP host</span><input value={emailSettings.host || ''} onChange={(event) => setEmailSettings((current) => ({ ...current, host: event.target.value }))} className="form-input" placeholder="smtpout.secureserver.net" /></label>
                <label><span className="form-label">SMTP port</span><input type="number" min="1" max="65535" value={emailSettings.port || ''} onChange={(event) => setEmailSettings((current) => ({ ...current, port: Number(event.target.value) }))} className="form-input" placeholder="465" /></label>
                <label><span className="form-label">Mailbox login email</span><input type="email" value={emailSettings.username || ''} onChange={(event) => setEmailSettings((current) => ({ ...current, username: event.target.value }))} className="form-input" placeholder="reservations@yourdomain.com" autoComplete="username" /></label>
                <label><span className="form-label">Mailbox password {emailSettings.hasPassword && <span className="text-emerald-600">(saved)</span>}</span><input type="password" value={emailSettings.password || ''} onChange={(event) => setEmailSettings((current) => ({ ...current, password: event.target.value }))} className="form-input" placeholder={emailSettings.hasPassword ? 'Leave blank to keep saved password' : 'Enter mailbox password'} autoComplete="new-password" /></label>
                <label><span className="form-label">Sender name</span><input value={emailSettings.fromName || ''} onChange={(event) => setEmailSettings((current) => ({ ...current, fromName: event.target.value }))} className="form-input" placeholder="TripNest Pvt Ltd" /></label>
                <label><span className="form-label">From email</span><input type="email" value={emailSettings.fromEmail || ''} onChange={(event) => setEmailSettings((current) => ({ ...current, fromEmail: event.target.value }))} className="form-input" placeholder="reservations@yourdomain.com" /></label>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2"><input type="checkbox" checked={emailSettings.secure !== false} onChange={(event) => setEmailSettings((current) => ({ ...current, secure: event.target.checked }))} className="h-4 w-4 rounded" /><span><span className="block text-sm font-semibold text-slate-800">Use SSL / secure SMTP</span><span className="block text-xs text-slate-500">Keep enabled for the GoDaddy port 465 configuration.</span></span></label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={saveEmailSettings} disabled={savingEmail} className="btn-primary disabled:opacity-60"><Save className="h-4 w-4" /> {savingEmail ? 'Saving...' : 'Save SMTP settings'}</button>
                <button onClick={testEmailSettings} disabled={testingEmail || !emailSettings.configured} className="btn-secondary disabled:opacity-60"><Send className="h-4 w-4" /> {testingEmail ? 'Checking...' : 'Verify connection'}</button>
              </div>
              {!emailSettings.configured && <p className="text-xs font-medium text-amber-700">Complete and save all SMTP fields before verifying or sending supplier email.</p>}
            </div>
          )}

          {activeSection === 'whatsapp' && (
            <div className="card space-y-4 p-3 sm:p-4">
              <div><h2 className="section-title">PulseSend WhatsApp</h2><p className="mt-1 text-xs text-slate-500">Your PulseSend key is encrypted on the server and never returned to this page. Every sending number is managed here.</p></div>
              {whatsappSettings.configured && <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xs font-extrabold text-indigo-950">PulseSend subscription</h3><p className="mt-0.5 text-[11px] text-indigo-800">Live workspace and subscription details from PulseSend.</p></div><button type="button" onClick={() => loadWhatsappAccount({ force: true })} disabled={loadingWhatsappAccount} className="btn-secondary text-xs disabled:opacity-60"><RefreshCw className={'h-3.5 w-3.5 ' + (loadingWhatsappAccount ? 'animate-spin' : '')} /> Refresh status</button></div>
                {loadingWhatsappAccount ? <div className="mt-3 flex items-center gap-2 text-xs text-indigo-700"><Loader2 className="h-4 w-4 animate-spin" /> Loading subscription status...</div> : whatsappAccountError ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">{whatsappAccountError}</div> : whatsappAccount && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-indigo-100 bg-white p-2.5"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Plan</div><div className="mt-1 text-xs font-extrabold text-slate-800">{whatsappAccount.subscription?.planName || 'PulseSend'}</div><div className="mt-0.5 text-[10px] capitalize text-slate-500">{whatsappAccount.subscription?.billingCycle || 'Billing cycle unavailable'}</div></div>
                  <div className="rounded-lg border border-indigo-100 bg-white p-2.5"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Status</div><div className={'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ' + (whatsappAccount.subscription?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{whatsappAccount.subscription?.isActive ? 'Active' : (whatsappAccount.subscription?.status || 'Unknown')}</div><div className="mt-1 text-[10px] capitalize text-slate-500">{whatsappAccount.workspace?.accountType || 'Workspace'}</div></div>
                  <div className="rounded-lg border border-indigo-100 bg-white p-2.5"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Subscription left</div><div className="mt-1 text-xs font-extrabold text-slate-800">{whatsappAccount.subscription?.daysRemaining == null ? 'Not reported' : `${whatsappAccount.subscription.daysRemaining} day${whatsappAccount.subscription.daysRemaining === 1 ? '' : 's'}`}</div><div className="mt-0.5 text-[10px] text-slate-500">Ends {shortDate(whatsappAccount.subscription?.expiresAt)}</div></div>
                  <div className="rounded-lg border border-indigo-100 bg-white p-2.5"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Messages left</div><div className="mt-1 text-xs font-extrabold text-slate-800">{whatsappAccount.subscription?.messagesRemaining == null ? 'Not reported' : whatsappAccount.subscription.messagesRemaining}</div><div className="mt-0.5 text-[10px] text-slate-500">{whatsappAccount.subscription?.messagesRemaining == null ? 'Provider did not return a quota' : `${whatsappAccount.subscription.messagesUsed || 0} used`}</div></div>
                </div>}
                {whatsappAccount && <div className="mt-2 text-[10px] text-indigo-800">Workspace: <strong>{whatsappAccount.workspace?.name || 'PulseSend workspace'}</strong>{whatsappAccount.workspace?.email ? ` · ${whatsappAccount.workspace.email}` : ''} · {whatsappSessions.filter((session) => session.status === 'connected').length} connected number{whatsappSessions.filter((session) => session.status === 'connected').length === 1 ? '' : 's'} · {whatsappSessions.reduce((total, session) => total + (Number(session.messagesSentToday) || 0), 0)} sent today</div>}
              </div>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="form-label">PulseSend API key {whatsappSettings.hasApiKey && <span className="text-emerald-600">(saved)</span>}</span><input type="password" autoComplete="new-password" value={whatsappSettings.apiKey || ''} onChange={(event) => setWhatsappSettings((current) => ({ ...current, apiKey: event.target.value }))} className="form-input" placeholder={whatsappSettings.hasApiKey ? 'Leave blank to keep the saved key' : 'Paste the raw PulseSend API key'} /></label>
                <label><span className="form-label">PulseSend API base URL</span><input value={whatsappSettings.baseUrl || ''} onChange={(event) => setWhatsappSettings((current) => ({ ...current, baseUrl: event.target.value }))} className="form-input" placeholder="https://api.pulsesend.app/api" /></label>
                <label><span className="form-label">Default sender for automatic messages</span><select value={whatsappSettings.defaultConnectedPhoneNumber || ''} onChange={(event) => setWhatsappSettings((current) => ({ ...current, defaultConnectedPhoneNumber: event.target.value }))} className="form-select"><option value="">Choose automatically when only one is connected</option>{whatsappSessions.filter((session) => session.status === 'connected' && session.phoneNumber).map((session) => <option key={session.id} value={session.phoneNumber}>{session.phoneNumber} · {session.displayName}</option>)}</select></label>
              </div>
              <div className="flex flex-wrap gap-2"><button onClick={saveWhatsappSettings} disabled={savingWhatsapp} className="btn-primary disabled:opacity-60"><Save className="w-4 h-4" /> {savingWhatsapp ? 'Saving...' : 'Save WhatsApp settings'}</button><button onClick={() => loadWhatsappSessions({ force: true })} disabled={!whatsappSettings.configured || loadingWhatsapp} className="btn-secondary disabled:opacity-60"><RefreshCw className={'w-4 h-4 ' + (loadingWhatsapp ? 'animate-spin' : '')} /> Refresh devices</button></div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-extrabold text-emerald-900">Connect another number</h3><p className="mt-0.5 text-[11px] text-emerald-800">WhatsApp on the phone → Linked Devices → Link a Device → scan this QR.</p></div><span className={whatsappSettings.configured ? 'rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700' : 'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700'}>{whatsappSettings.configured ? 'API key saved' : 'API key required'}</span></div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} className="form-input flex-1" placeholder="Device name, e.g. Sales WhatsApp" /><button type="button" onClick={startWhatsappConnection} disabled={connectingWhatsapp} className="btn-primary whitespace-nowrap disabled:opacity-60"><QrCode className="w-4 h-4" /> {connectingWhatsapp ? 'Getting QR...' : 'Add device / show QR'}</button></div>
                {whatsappQr && <div className="mt-3 grid gap-3 rounded-xl border border-emerald-200 bg-white p-3 sm:grid-cols-[auto,1fr]"><div className="grid min-h-44 min-w-44 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">{whatsappQr.qrCode ? <img src={whatsappQr.qrCode} alt="Scan this WhatsApp QR code" className="h-40 w-40 object-contain" /> : <span className="px-3 text-center text-xs font-semibold text-slate-500">{whatsappQr.status === 'connected' ? 'Device connected' : 'Waiting for a QR code...'}</span>}</div><div className="flex min-w-0 flex-col justify-center"><span className="text-xs font-extrabold text-slate-800">{whatsappQr.displayName || 'WhatsApp device'}</span><span className="mt-1 text-[11px] text-slate-500">Status: <strong className="capitalize text-slate-700">{String(whatsappQr.status || 'connecting').replace('_', ' ')}</strong></span><p className="mt-2 text-[11px] leading-relaxed text-slate-500">The QR refreshes automatically while it is waiting. If it expires, request a new QR.</p>{(whatsappQr.sessionId || whatsappQr.id || whatsappQr._id) && whatsappQr.status !== 'connected' && <button type="button" onClick={() => refreshWhatsappQr(whatsappQr.sessionId || whatsappQr.id || whatsappQr._id)} className="btn-secondary mt-3 w-fit text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh QR now</button>}</div></div>}
              </div>

              <div><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-extrabold text-slate-800">Connected devices</h3><span className="text-[11px] font-medium text-slate-500">{whatsappSessions.length} device{whatsappSessions.length === 1 ? '' : 's'}</span></div><div className="space-y-2">{loadingWhatsapp ? <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading devices...</div> : whatsappSessions.length ? whatsappSessions.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"><div className="min-w-0"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" /><span className="truncate text-xs font-extrabold text-slate-800">{session.phoneNumber || session.displayName}</span><span className={session.status === 'connected' ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600'}>{session.status}</span></div><p className="mt-1 text-[10px] text-slate-500">{session.displayName}{session.messagesSentToday ? ' · ' + session.messagesSentToday + ' sent today' : ''}</p></div>{session.status !== 'connected' && <button type="button" onClick={() => reconnectWhatsapp(session.id)} disabled={reconnectingSessionId === session.id} className="btn-secondary text-xs disabled:opacity-60"><RefreshCw className={'h-3.5 w-3.5 ' + (reconnectingSessionId === session.id ? 'animate-spin' : '')} /> Reconnect</button>}</div>) : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">No devices are connected yet.</div>}</div></div>
            </div>
          )}

          {activeSection === 'users' && (
            <div className="card p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="section-title">Users & Roles</h2>
                <button onClick={() => setShowUserForm(true)} className="btn-primary text-sm"><Users className="w-4 h-4" /> Add User</button>
              </div>
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">{user.name.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-11 sm:ml-0">
                      <span className="badge-blue badge text-xs whitespace-nowrap">{user.role}</span>
                      <span className="badge-green badge text-xs whitespace-nowrap">{user.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeSection === 'currency' || activeSection === 'system') && (
            <div className="card p-3 sm:p-4">
              <h2 className="section-title mb-4">{SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label}</h2>
              <div className="py-12 text-center text-slate-400">
                <SettingsIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Configure {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label.toLowerCase()} settings here.</p>
                <button onClick={handleSave} className="btn-primary mt-4 mx-auto"><Save className="w-4 h-4" /> Save Settings</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal isOpen={showUserForm} onClose={() => setShowUserForm(false)} title="Add User"
        footer={<><button onClick={() => setShowUserForm(false)} className="btn-secondary"><XIcon className="w-4 h-4" /> Cancel</button><button onClick={handleCreateUser} className="btn-primary"><UserPlus className="w-4 h-4" /> Add User</button></>}>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-sm"><UserPlus className="h-4 w-4" /></span>
            <p className="text-[11px] leading-snug text-slate-600">Create a team login. The user can change the temporary password after signing in.</p>
          </div>
          <label><span className="form-label">Name</span><IconField icon={Users}><input className="form-input pl-9" placeholder="Full name" value={newUser.name} onChange={e => setNewUser(v => ({ ...v, name: e.target.value }))} /></IconField></label>
          <label><span className="form-label">Email</span><IconField icon={Mail}><input className="form-input pl-9" type="email" placeholder="name@company.com" value={newUser.email} onChange={e => setNewUser(v => ({ ...v, email: e.target.value }))} /></IconField></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="form-label">Temporary Password</span><IconField icon={Lock}><input className="form-input pl-9" type="password" placeholder="Temporary password" value={newUser.password} onChange={e => setNewUser(v => ({ ...v, password: e.target.value }))} /></IconField></label>
            <label><span className="form-label">Role</span><IconField icon={BadgeCheck}><select className="form-select pl-9" value={newUser.role} onChange={e => setNewUser(v => ({ ...v, role: e.target.value }))}>{['Administrator', 'Sales', 'Operations', 'Accounts'].map(role => <option key={role}>{role}</option>)}</select></IconField></label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
