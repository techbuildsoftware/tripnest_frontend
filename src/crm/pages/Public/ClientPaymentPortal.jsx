import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleDollarSign, Clock3, Download, FileText } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { formatDate } from '../../lib/date';
import LogoImg from '../../assets/logo-color.png';

const amount = (value, currency = 'THB') => `${currency === 'THB' ? '฿' : `${currency} `}${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CompanyHeader({ company, scopeLabel, onDownload }) {
  const name = company?.name || 'TripNest';
  const logo = typeof company?.logo === 'string' ? company.logo.trim() : '';
  const details = [company?.email, company?.phone, company?.website, company?.address].filter(Boolean);
  return (
    <header className="bg-gradient-to-r from-slate-900 to-blue-950 px-6 py-7 text-white sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-20 shrink-0 place-items-center rounded-xl bg-white p-2">
            <img src={logo || LogoImg} alt={`${name} logo`} className="max-h-full max-w-full object-contain" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = LogoImg; }} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">{name}</p>
            <h1 className="text-xl font-extrabold">{scopeLabel}</h1>
          </div>
        </div>
        <button onClick={onDownload} className="payment-print-hidden inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20">
          <Download className="h-3.5 w-3.5" /> Download PDF
        </button>
      </div>
      {details.length > 0 && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-100">{details.map((detail) => <span key={detail}>{detail}</span>)}</div>}
    </header>
  );
}

export default function ClientPaymentPortal() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    let active = true;
    apiClient.get(`/payment-portal/${encodeURIComponent(token || '')}`)
      .then((response) => active && setState({ loading: false, data: response.data, error: '' }))
      .catch((error) => active && setState({ loading: false, data: null, error: error.message }));
    return () => { active = false; };
  }, [token]);

  if (state.loading) return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm font-semibold text-slate-500">Loading payment statement…</div>;
  if (state.error || !state.data) return <div className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><FileText className="mx-auto h-10 w-10 text-red-400" /><h1 className="mt-4 text-lg font-extrabold text-slate-900">Payment link unavailable</h1><p className="mt-2 text-sm text-slate-500">{state.error || 'This payment statement could not be found.'}</p></div></div>;

  const { invoice, payments, schedules = [], currency, guestName, bookingId, destination, travelDate, scopeLabel = 'Full Payment', company = {} } = state.data;
  const companyName = company.name || 'TripNest';
  const complete = invoice.remaining <= 0;
  const cards = [
    { label: `${scopeLabel} total`, value: invoice.total, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Received', value: invoice.paid, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: complete ? 'Payment complete' : 'Balance pending', value: invoice.remaining, icon: complete ? CheckCircle2 : Clock3, color: complete ? 'text-emerald-600 bg-emerald-50' : 'text-orange-600 bg-orange-50' },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <style>{`@media print { body { background: white !important; } .payment-print-hidden { display: none !important; } }`}</style>
      <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CompanyHeader company={company} scopeLabel={scopeLabel} onDownload={() => window.print()} />
        <div className="border-b border-blue-900/20 bg-[#173763] px-6 pb-6 text-white sm:px-8">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div><span className="text-blue-200">Guest</span><p className="font-bold">{guestName}</p></div>
            <div><span className="text-blue-200">Booking</span><p className="font-bold">{bookingId}</p></div>
            <div><span className="text-blue-200">Travel</span><p className="font-bold">{destination || '—'} {travelDate ? `· ${formatDate(travelDate)}` : ''}</p></div>
          </div>
        </div>
        <div className="p-5 sm:p-8">
          <p className="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">This client document shows the {scopeLabel.toLowerCase()} total only. Hotel, transfer, sightseeing and activity price breakdowns are not included.</p>
          <div className="grid gap-3 sm:grid-cols-3">{cards.map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-xl border border-slate-200 p-4"><span className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}><Icon className="h-4 w-4" /></span><p className="mt-3 text-lg font-extrabold text-slate-900">{amount(value, currency)}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>)}</div>
          {schedules.length > 0 && <div className="mt-7 overflow-hidden rounded-xl border border-blue-200"><div className="border-b border-blue-100 bg-blue-50 px-4 py-3"><h2 className="text-sm font-extrabold text-blue-950">Your planned payment schedule</h2><p className="mt-0.5 text-xs text-blue-700">These are the planned instalments for this payment.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[520px]"><thead className="bg-slate-50 text-left"><tr>{['Due date', 'Planned amount', 'Status', 'Note'].map((label) => <th key={label} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{schedules.map((schedule) => <tr key={schedule.id || `${schedule.dueDate}-${schedule.amount}`}><td className="px-4 py-3 text-sm font-semibold text-slate-700">{formatDate(schedule.dueDate)}</td><td className="px-4 py-3 text-sm font-bold text-slate-900">{amount(schedule.amount, currency)}</td><td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">{schedule.status}</span></td><td className="px-4 py-3 text-sm text-slate-500">{schedule.note || '—'}</td></tr>)}</tbody></table></div></div>}
          <div className="mt-7 overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><h2 className="text-sm font-extrabold text-slate-800">Payment history</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[600px]"><thead className="bg-slate-50 text-left"><tr>{['Date', 'Reference', 'Method', 'Amount', 'Status'].map((label) => <th key={label} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{payments.map((payment) => <tr key={payment.id || `${payment.date}-${payment.amount}`}><td className="px-4 py-3 text-sm text-slate-600">{formatDate(payment.date)}</td><td className="px-4 py-3 text-sm font-medium text-slate-800">{payment.reference || '—'}</td><td className="px-4 py-3 text-sm text-slate-600">{payment.method}</td><td className="px-4 py-3 text-sm font-bold text-slate-900">{amount(payment.amount, currency)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{payment.status}</span></td></tr>)}{!payments.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-sm text-slate-400">No payments have been recorded yet.</td></tr>}</tbody></table></div></div>
          <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><CircleDollarSign className="h-4 w-4 text-slate-400" />This is a read-only payment statement. For a payment question, please contact {companyName}.</p>
        </div>
      </section>
    </main>
  );
}
