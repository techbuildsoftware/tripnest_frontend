import { jsPDF } from 'jspdf';
import { getDisplayTimeZone } from './date';

const money = (value, currency = 'THB') => `${currency} ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const text = (value, fallback = '—') => String(value ?? '').trim() || fallback;
const date = (value) => {
  const serialized = String(value || '');
  const raw = serialized.slice(0, 10);
  if (!raw) return '—';
  const parsed = new Date(serialized.includes('T') ? serialized : `${raw}T00:00:00Z`);
  const timeZone = serialized.includes('T') ? getDisplayTimeZone() : 'UTC';
  return Number.isNaN(parsed.getTime()) ? raw : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone }).format(parsed);
};

const NAVY = [15, 41, 86];
const SLATE = [71, 85, 105];
const MUTED = [100, 116, 139];
const INK = [15, 23, 42];
const LINE = [214, 222, 233];
const SOFT = [243, 246, 251];
const L = 15;
const R = 195;
const W = R - L;

const setText = (pdf, color, size, style = 'normal') => { pdf.setTextColor(...color); pdf.setFontSize(size); pdf.setFont('helvetica', style); };

const sectionTitle = (pdf, title, y) => {
  pdf.setFillColor(...NAVY);
  pdf.rect(L, y, 2.2, 6, 'F');
  setText(pdf, NAVY, 9.5, 'bold');
  pdf.text(title.toUpperCase(), L + 5, y + 4.6);
  pdf.setDrawColor(...LINE);
  pdf.setLineWidth(0.25);
  pdf.line(L + 8 + pdf.getTextWidth(title.toUpperCase()), y + 3.4, R, y + 3.4);
  return y + 10;
};

const field = (pdf, label, value, x, y, width) => {
  setText(pdf, MUTED, 7, 'bold');
  pdf.text(label.toUpperCase(), x, y);
  setText(pdf, INK, 10, 'bold');
  const lines = pdf.splitTextToSize(text(value), width);
  pdf.text(lines, x, y + 5);
  return y + 5 + lines.length * 4.2;
};

const infoCard = (pdf, title, rows, x, y, width) => {
  const inner = width - 10;
  const measured = rows.map(([, value]) => pdf.splitTextToSize(text(value), inner));
  const height = 11 + measured.reduce((sum, lines) => sum + 9.5 + (lines.length - 1) * 4.2, 0) + 2;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(...LINE);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, width, height, 2, 2, 'FD');
  pdf.setFillColor(...SOFT);
  pdf.roundedRect(x, y, width, 8, 2, 2, 'F');
  pdf.rect(x, y + 4, width, 4, 'F');
  setText(pdf, NAVY, 8, 'bold');
  pdf.text(title.toUpperCase(), x + 5, y + 5.3);
  let cy = y + 14;
  rows.forEach(([label, value], index) => {
    setText(pdf, MUTED, 6.8, 'bold');
    pdf.text(label.toUpperCase(), x + 5, cy);
    setText(pdf, INK, 9.5, 'bold');
    pdf.text(measured[index], x + 5, cy + 4.4);
    cy += 9.5 + (measured[index].length - 1) * 4.2;
  });
  return height;
};

const table = (pdf, rows, y) => {
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) { pdf.setFillColor(...SOFT); pdf.rect(L, y - 4.6, W, 8.4, 'F'); }
    setText(pdf, SLATE, 8.5, 'bold');
    pdf.text(label, L + 4, y + 0.6);
    setText(pdf, INK, 9.5, 'normal');
    pdf.text(pdf.splitTextToSize(text(value), 110), L + 60, y + 0.6);
    y += 8.4;
  });
  pdf.setDrawColor(...LINE);
  pdf.setLineWidth(0.25);
  pdf.line(L, y - 4.6, R, y - 4.6);
  return y + 3;
};

const maybeAddPage = (pdf, y, required = 30) => {
  if (y + required <= 272) return y;
  pdf.addPage();
  return 20;
};

export function paymentInvoiceFileName(payment) {
  const suffix = String(payment?.ref || payment?.reference || payment?.id || 'payment').replace(/[^a-z0-9_-]/gi, '-');
  return `buildsoftware-${payment?.type === 'Supplier Payment' ? 'supplier-payment-voucher' : 'payment-receipt'}-${suffix}.pdf`;
}

export function createPaymentInvoicePdf({ booking, payment }) {
  const currency = booking?.invoiceSettings?.currency || booking?.currency || 'THB';
  const isSupplier = payment?.type === 'Supplier Payment';
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const reference = text(payment?.ref || payment?.reference || payment?.id);
  const status = text(payment?.approvalStatus || payment?.status, 'Confirmed');

  // ── Header band ──
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, 210, 42, 'F');
  pdf.setFillColor(148, 163, 184);
  pdf.rect(0, 42, 210, 1.2, 'F');
  setText(pdf, [186, 199, 222], 8, 'bold');
  pdf.text('BUILDSOFTWARE CO. LTD.', L, 14);
  setText(pdf, [255, 255, 255], 22, 'bold');
  pdf.text(isSupplier ? 'PAYMENT VOUCHER' : 'PAYMENT RECEIPT', L, 25);
  setText(pdf, [186, 199, 222], 8.5, 'normal');
  pdf.text(isSupplier ? 'Supplier payment confirmation' : 'Official acknowledgement of payment received', L, 32);
  // reference box
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(128, 10, 67, 22, 2, 2, 'F');
  setText(pdf, MUTED, 6.8, 'bold');
  pdf.text(isSupplier ? 'VOUCHER NO.' : 'RECEIPT NO.', 133, 16);
  setText(pdf, NAVY, 9.5, 'bold');
  pdf.text(pdf.splitTextToSize(reference, 57)[0], 133, 21.5);
  setText(pdf, MUTED, 6.8, 'bold');
  pdf.text('DATE ISSUED', 133, 27);
  setText(pdf, INK, 8.5, 'bold');
  pdf.text(date(payment?.date), 160, 27);

  let y = 54;

  // ── Amount hero ──
  pdf.setFillColor(...SOFT);
  pdf.setDrawColor(...LINE);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(L, y, W, 28, 2.5, 2.5, 'FD');
  pdf.setFillColor(...NAVY);
  pdf.roundedRect(L, y, 3, 28, 1.5, 1.5, 'F');
  setText(pdf, MUTED, 8, 'bold');
  pdf.text(isSupplier ? 'AMOUNT PAID TO SUPPLIER' : 'AMOUNT RECEIVED', L + 9, y + 9);
  setText(pdf, NAVY, 21, 'bold');
  pdf.text(money(payment?.amount, currency), L + 9, y + 21);
  // status pill
  const pill = status.toUpperCase();
  setText(pdf, [255, 255, 255], 8, 'bold');
  const pw = pdf.getTextWidth(pill) + 10;
  pdf.setFillColor(...(/paid|confirm|approv/i.test(status) ? [30, 107, 74] : [146, 94, 18]));
  pdf.roundedRect(R - pw - 6, y + 6, pw, 7, 3.5, 3.5, 'F');
  pdf.text(pill, R - pw - 1, y + 10.8);
  setText(pdf, MUTED, 7.5, 'normal');
  pdf.text(`${text(payment?.method)}  |  ${date(payment?.date)}`, R - 6, y + 21, { align: 'right' });
  y += 36;

  // ── Two info cards ──
  const colW = (W - 6) / 2;
  const leftRows = isSupplier
    ? [['Supplier', payment?.supplier], ['Bank', payment?.bankName], ['Payment method', payment?.method]]
    : [['Received from', payment?.supplier], ['Bank', payment?.bankName], ['Payment method', payment?.method]];
  const rightRows = [['Booking ID', booking?.id], ['Guest', booking?.guestName], ['Quotation ID', booking?.quotationId || booking?.queryId]];
  const h1 = infoCard(pdf, isSupplier ? 'Paid to' : 'Received from', leftRows, L, y, colW);
  const h2 = infoCard(pdf, 'Booking reference', rightRows, L + colW + 6, y, colW);
  y += Math.max(h1, h2) + 9;

  // ── Detail table ──
  y = maybeAddPage(pdf, y, 50);
  y = sectionTitle(pdf, isSupplier ? 'Service details' : 'Invoice details', y);
  const serviceRows = isSupplier
    ? [
        ['Service', payment?.related],
        ['Confirmation no.', payment?.confirmationNo],
        ['Cut-off date', date(payment?.cutoffDate)],
        ['Service status', payment?.serviceStatus || payment?.status],
      ]
    : [
        ['Invoice', payment?.related || 'Booking Invoice'],
        ['Invoice type', booking?.invoiceSettings?.invoiceType || 'Invoice'],
        ['Invoice due date', date(booking?.invoiceSettings?.dueDate || booking?.paymentDeadline)],
        ['Booking destination', booking?.destination],
        ['Approval', status],
      ];
  y = table(pdf, serviceRows, y + 2);

  if (isSupplier && payment?.costBreakdown) {
    y = maybeAddPage(pdf, y, 50);
    y = sectionTitle(pdf, 'Supplier cost breakdown', y);
    const breakdown = payment.costBreakdown;
    y = table(pdf, [
      ['Adults', `${Number(breakdown.adultCount || 0)} x ${money(breakdown.adultCost, currency)}`],
      ['Children', `${Number(breakdown.childCount || 0)} x ${money(breakdown.childCost, currency)}`],
      ['Infants', `${Number(breakdown.infantCount || 0)} x ${money(breakdown.infantCost, currency)}`],
      ['Guide / vehicle / tax', `${money(breakdown.guideCost, currency)} / ${money(breakdown.vehicleCost, currency)} / ${money(breakdown.taxAmount, currency)}`],
    ], y + 2);
  }

  if (payment?.remarks) {
    y = maybeAddPage(pdf, y, 30);
    y = sectionTitle(pdf, 'Remarks', y);
    const notes = pdf.splitTextToSize(String(payment.remarks), W - 10);
    const boxH = notes.length * 4.4 + 7;
    pdf.setFillColor(...SOFT);
    pdf.setDrawColor(...LINE);
    pdf.roundedRect(L, y - 1, W, boxH, 2, 2, 'FD');
    setText(pdf, INK, 9, 'normal');
    pdf.text(notes, L + 5, y + 4.5);
    y += boxH + 6;
  }

  // ── Signatures ──
  y = maybeAddPage(pdf, y, 34);
  y = Math.max(y + 8, 232);
  pdf.setDrawColor(...SLATE);
  pdf.setLineWidth(0.3);
  pdf.line(L, y, L + 70, y);
  pdf.line(R - 70, y, R, y);
  setText(pdf, MUTED, 7.5, 'bold');
  pdf.text(isSupplier ? 'AUTHORISED BY (BUILDSOFTWARE)' : 'RECEIVED BY (BUILDSOFTWARE)', L, y + 5);
  pdf.text(isSupplier ? 'ACKNOWLEDGED BY (SUPPLIER)' : 'ACKNOWLEDGED BY (CLIENT)', R - 70, y + 5);

  // ── Footer on every page ──
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFillColor(...NAVY);
    pdf.rect(0, 284, 210, 13, 'F');
    setText(pdf, [203, 213, 225], 7.2, 'normal');
    pdf.text('System-generated payment document. Keep this with the payment attachment and supplier/client confirmation.', L, 289.5);
    pdf.text(`Page ${page} of ${pages}`, R, 289.5, { align: 'right' });
    setText(pdf, [148, 163, 184], 6.8, 'normal');
    pdf.text(`${reference}  |  Generated ${date(new Date().toISOString())}`, L, 293.5);
  }
  return pdf;
}

export function openPaymentInvoicePdf({ booking, payment }) {
  const pdf = createPaymentInvoicePdf({ booking, payment });
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank', 'noopener,noreferrer');
  if (!tab) pdf.save(paymentInvoiceFileName(payment));
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
