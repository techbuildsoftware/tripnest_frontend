import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, MessageCircle, Phone, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';

const initialMessageFor = (name) => name ? `Hello ${name},` : 'Hello,';

export default function WhatsAppSendDialog({
  title = 'Send WhatsApp message',
  recipientName = '',
  recipientPhone = '',
  initialMessage = '',
  attachment = null,
  preparingAttachment = false,
  requireAttachment = false,
  pdfTemplates = [],
  selectedPdfTemplateId = '',
  onPdfTemplateChange,
  onClose,
  onSent,
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [phone, setPhone] = useState(recipientPhone || '');
  const [message, setMessage] = useState(initialMessage || initialMessageFor(recipientName));
  const [sender, setSender] = useState('');

  const connectedSessions = useMemo(
    () => sessions.filter((session) => session.status === 'connected' && session.phoneNumber),
    [sessions],
  );
  const hasAttachment = Boolean(attachment?.blob || attachment?.base64);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    apiClient.get('/whatsapp/sessions', { retry: false, timeoutMs: 4_000 })
      .then((response) => { if (active) setSessions(response.data || []); })
      .catch((error) => { if (active) { setSessions([]); setLoadError(error.message || 'Could not check connected devices.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadAttempt]);

  useEffect(() => {
    if (connectedSessions.length === 1) setSender(connectedSessions[0].phoneNumber);
    if (connectedSessions.length > 1 && !connectedSessions.some((session) => session.phoneNumber === sender)) setSender('');
  }, [connectedSessions, sender]);

  const submit = async () => {
    if (!phone.trim()) return toast.error('Enter the recipient WhatsApp number.');
    if (!message.trim()) return toast.error('Enter a message to send.');
    if (connectedSessions.length > 1 && !sender) return toast.error('Choose the WhatsApp number to send from.');
    if (!connectedSessions.length) return toast.error('Connect a WhatsApp device in Settings before sending.');
    if (preparingAttachment || (requireAttachment && !hasAttachment) || (attachment && !hasAttachment)) return toast.error('Please wait for the PDF attachment to finish preparing.');
    setSending(true);
    try {
      let attachmentPayload = {};
      if (attachment?.blob) {
        const filename = attachment.filename || 'quotation.pdf';
        const formData = new FormData();
        formData.append('documentFiles', attachment.blob, filename);
        const uploaded = await apiClient.upload('/uploads?folder=quotation-whatsapp', formData);
        const file = Array.isArray(uploaded?.data) ? uploaded.data.find((item) => item?.url) : null;
        if (!file?.url) throw new Error('The quotation PDF could not be uploaded for WhatsApp.');
        attachmentPayload = { media: [{ url: file.url, type: 'document', name: filename }] };
      } else if (attachment?.base64) {
        attachmentPayload = { base64Files: [{ name: attachment.filename || 'quotation.pdf', mimeType: 'application/pdf', body: attachment.base64 }] };
      }
      const response = await apiClient.post('/whatsapp/send', {
        phone: phone.trim(),
        content: message.trim(),
        connectedPhoneNumber: sender,
        ...attachmentPayload,
      });
      toast.success('WhatsApp message submitted to PulseSend.');
      onSent?.(response.data);
      onClose?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay z-[80]" onMouseDown={onClose}>
      <div className="modal-content max-w-lg w-full p-0 overflow-hidden" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-slate-200 bg-emerald-50 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white"><MessageCircle className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-slate-800">{title}</h3><p className="text-[11px] text-slate-500">Sent through your connected PulseSend WhatsApp device.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-3 p-4">
          <label><span className="form-label">Recipient WhatsApp number</span><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={phone} onChange={(event) => setPhone(event.target.value)} className="form-input pl-9" placeholder="+919876543210" /></div></label>
          {loading ? <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking connected WhatsApp devices...</div> : loadError ? <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><span>{loadError}</span><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="shrink-0 font-bold text-amber-800 underline">Retry</button></div> : connectedSessions.length > 1 ? <label><span className="form-label">Send from</span><select value={sender} onChange={(event) => setSender(event.target.value)} className="form-select"><option value="">Choose a connected number</option>{connectedSessions.map((session) => <option key={session.id} value={session.phoneNumber}>{session.phoneNumber} · {session.displayName}</option>)}</select></label> : connectedSessions.length === 1 ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">Sending from <strong>{connectedSessions[0].phoneNumber}</strong>. Connect another device in Settings to choose a sender.</div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">No connected device. Go to Settings → WhatsApp to scan a QR code.</div>}
          {onPdfTemplateChange && <label><span className="form-label">Quotation PDF template</span><select value={selectedPdfTemplateId} onChange={(event) => onPdfTemplateChange(event.target.value)} className="form-select" disabled={!pdfTemplates.length || preparingAttachment}>{pdfTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.isDefault ? ' (Default)' : ''}</option>)}</select><span className="mt-1 block text-[10px] text-slate-500">The selected client-safe template is generated and attached to this WhatsApp message.</span></label>}
          {(preparingAttachment || attachment || requireAttachment) && <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">{preparingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}<span>{preparingAttachment ? 'Preparing client-safe quotation PDF…' : attachment?.filename ? `${attachment.filename} will be sent as a PDF attachment.` : 'The quotation PDF attachment is not ready yet.'}</span></div>}
          <label><span className="form-label">Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} maxLength={4096} className="form-input min-h-28" placeholder="Write a message..." /><span className="mt-1 block text-right text-[10px] text-slate-400">{message.length}/4096</span></label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="button" onClick={submit} disabled={sending || loading || preparingAttachment || Boolean(loadError) || !connectedSessions.length || (requireAttachment && !hasAttachment) || (attachment !== null && !hasAttachment)} className="btn-primary disabled:opacity-60">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? 'Sending...' : (attachment || requireAttachment) ? 'Send WhatsApp with PDF' : 'Send WhatsApp'}</button></footer>
      </div>
    </div>
  );
}
