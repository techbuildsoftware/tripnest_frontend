import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ImagePlus, Loader2, Percent, Printer, ShieldCheck, WalletCards } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { downloadPdfFromElement, pdfLayoutOptionsFromConfig, printPdfDocument } from '../../lib/directPdfDownload';
import { quotationPdfFilename } from '../../lib/documentFilename';
import { DEFAULT_PDF_CONFIG } from '../Quotations/PDFDesigner/data/pdfConfig';
import { applyClientPdfVisibility, quotationForPdf } from '../Quotations/PDFDesigner/data/quotationPdf';
import PdfLayoutFrame from '../Quotations/PDFDesigner/components/PdfLayoutFrame';
import { renderPdfTemplate } from '../Quotations/QuotationPreview';

const money = (amount) => `฿${Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

function adjustedQuotation(quotation, markup, mode) {
  const base = Number(quotation?.pricing?.totalSelling ?? quotation?.totalSelling ?? 0);
  const requested = Math.max(0, Number(markup || 0));
  const markupAmount = mode === 'percent' ? Math.round((base * requested) / 100) : requested;
  const totalSelling = Math.round((base + markupAmount) * 100) / 100;
  return {
    ...quotation,
    totalSelling,
    pricing: { ...(quotation?.pricing || {}), totalSelling },
  };
}

export default function AgentQuotationShare() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [markup, setMarkup] = useState('0');
  const [markupMode, setMarkupMode] = useState('amount');
  const [logo, setLogo] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    let active = true;
    apiClient.get(`/agent-quotation-share/${encodeURIComponent(token || '')}`)
      .then((response) => active && setState({ loading: false, data: response.data, error: '' }))
      .catch((error) => active && setState({ loading: false, data: null, error: error.message || 'Unable to load this quotation.' }));
    return () => { active = false; };
  }, [token]);

  const quotation = useMemo(() => adjustedQuotation(state.data?.quotation, markup, markupMode), [state.data?.quotation, markup, markupMode]);
  const originalPrice = Number(state.data?.quotation?.pricing?.totalSelling ?? state.data?.quotation?.totalSelling ?? 0);
  const agentMarkup = Math.max(0, Number(quotation?.pricing?.totalSelling || 0) - originalPrice);
  const brand = useMemo(() => ({
    name: companyName.trim() || state.data?.agent?.name || 'Travel Partner',
    logo: logo || state.data?.agent?.logo || '',
    email: state.data?.agent?.email || '',
    phone: state.data?.agent?.phone || '',
  }), [companyName, logo, state.data?.agent]);
  const templateConfig = useMemo(() => ({
    ...DEFAULT_PDF_CONFIG,
    ...(state.data?.template?.config || {}),
    clientPreview: true,
    showClientPrice: true,
    // An agent share is always branded with the agent's current/local logo.
    logo: 'agent-or-b2c',
    // This page is a presentation for the agent. Unlike an internal template
    // editor, it must show every included service image.
    showHotelImages: true,
    showActivityImages: true,
    showTransferImages: true,
  }), [state.data?.template?.config]);
  const pdfQuotation = useMemo(() => {
    const enriched = quotationForPdf(quotation, state.data?.mediaMasters || {});
    return applyClientPdfVisibility({
      ...enriched,
      logo: brand.logo,
      companyDetails: {
        ...enriched.companyDetails,
        name: brand.name,
        email: brand.email,
        phone: brand.phone,
      },
    }, templateConfig);
  }, [brand, quotation, state.data?.mediaMasters, templateConfig]);

  const chooseLogo = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return window.alert('Please choose an image file for the logo.');
    if (file.size > 5 * 1024 * 1024) return window.alert('Please choose a logo smaller than 5 MB.');
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ''));
    reader.onerror = () => window.alert('The selected logo could not be read.');
    reader.readAsDataURL(file);
  };

  const download = async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      await downloadPdfFromElement(printRef.current, quotationPdfFilename(quotation), undefined, pdfLayoutOptionsFromConfig(templateConfig));
    } catch (error) {
      window.alert(error.message || 'Unable to download the quotation PDF.');
    } finally {
      setDownloading(false);
    }
  };
  const print = async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      await printPdfDocument(printRef.current, quotationPdfFilename(quotation), undefined, pdfLayoutOptionsFromConfig(templateConfig));
    } catch (error) {
      window.alert(error.message || 'Unable to open the quotation print dialog.');
    } finally {
      setDownloading(false);
    }
  };

  if (state.loading) return <main className="min-h-screen grid place-items-center bg-slate-50 text-sm font-semibold text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading agent quotation…</main>;
  if (state.error || !state.data) return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><section className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm"><h1 className="text-lg font-extrabold text-slate-900">Quotation link unavailable</h1><p className="mt-2 text-sm text-slate-500">{state.error || 'This link could not be found.'}</p></section></main>;

  return <main className="min-h-screen bg-slate-100 p-4 md:p-6">
    <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-5">
        <div className="flex items-center gap-2 text-slate-900"><ShieldCheck className="h-5 w-5 text-emerald-600" /><div><h1 className="text-base font-extrabold">Agent quotation</h1><p className="text-[11px] text-slate-500">Your private presentation controls</p></div></div>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="text-xs font-bold text-slate-700">Company name</span><span className="mt-0.5 block text-[11px] text-slate-500">Defaults to the agent name and appears in the PDF header.</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder={state.data?.agent?.name || 'Travel Partner'} className="form-input mt-2 h-9 text-sm" /></label>
          <label className="block"><span className="text-xs font-bold text-slate-700">Logo</span><span className="mt-0.5 block text-[11px] text-slate-500">Your saved agent logo is used by default.</span><div className="mt-2 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{brand.logo ? <img src={brand.logo} alt="Agent logo" className="h-full w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-slate-400" />}</div><input type="file" accept="image/*" onChange={(event) => chooseLogo(event.target.files?.[0])} className="block w-full text-[11px] text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-blue-50 file:px-2 file:py-1.5 file:text-[11px] file:font-bold file:text-blue-700 hover:file:bg-blue-100" /></div>{logo && <button type="button" onClick={() => setLogo('')} className="mt-2 text-[11px] font-semibold text-blue-700 hover:underline">Restore default logo</button>}</label>
          <div className="border-t border-slate-100 pt-4"><div className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Percent className="h-3.5 w-3.5 text-blue-600" /> Agent markup</div><p className="mt-0.5 text-[11px] text-slate-500">This increases only your downloaded quotation.</p><div className="mt-2 flex gap-2"><input min="0" step="0.01" type="number" value={markup} onChange={(event) => setMarkup(event.target.value)} className="form-input h-9 min-w-0 flex-1 text-sm" aria-label="Agent markup fee" /><select value={markupMode} onChange={(event) => setMarkupMode(event.target.value)} className="form-select h-9 w-24 text-xs"><option value="amount">THB</option><option value="percent">%</option></select></div></div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700"><WalletCards className="h-3.5 w-3.5" /> Your selling price</div><div className="mt-1 text-xl font-extrabold text-slate-900">{money(quotation?.pricing?.totalSelling)}</div><div className="mt-1 text-[11px] text-slate-600">Original {money(originalPrice)} · Markup {money(agentMarkup)}</div></div>
          <div className="grid grid-cols-2 gap-2"><button onClick={download} disabled={downloading} className="btn-primary flex h-10 items-center justify-center gap-2 disabled:opacity-60"><Download className="h-4 w-4" />{downloading ? 'Preparing…' : 'Download PDF'}</button><button onClick={print} disabled={downloading} className="btn-secondary flex h-10 items-center justify-center gap-2 disabled:opacity-60"><Printer className="h-4 w-4" />Print</button></div>
          <p className="rounded-lg bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-500">Your company name, logo and markup are applied only to this browser’s agent PDF. They never update the original quotation.</p>
        </div>
      </aside>
      <section className="min-w-0 overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-5"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-extrabold text-slate-800">{state.data.template?.name || 'Quotation'} preview</h2><p className="text-[11px] text-slate-500">{quotation.id} · {brand.name}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Agent version</span></div><PdfLayoutFrame config={templateConfig}>{renderPdfTemplate(pdfQuotation, templateConfig, true, true)}</PdfLayoutFrame><div ref={printRef} aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, width: 595, pointerEvents: 'none' }}>{renderPdfTemplate(pdfQuotation, templateConfig, true, true)}</div></section>
    </div>
  </main>;
}
