const number = (value) => Number(value || 0);
const payableSupplier = (item) => item.yachtSupplier || item.transferVehicleSupplier || item.vehicleSupplierName || item.supplier || item.supplierName || 'Unassigned';
const payableSupplierId = (item) => item.yachtSupplier ? item.yachtSupplierId : (item.transferVehicleSupplier || item.vehicleSupplierName ? item.transferVehicleSupplierId : item.supplierId);
const supplierName = (value) => {
  if (value && typeof value === 'object') return String(value.name || value.supplierName || value.label || '').trim();
  return String(value || '').trim();
};
const dateOnly = (value) => String(value || '').slice(0, 10);
const supplierOverrideFor = (booking = {}, lineKey = '') => {
  const saved = booking?.supplierOverrides?.[lineKey];
  if (saved?.supplier) return saved;
  // A payment voucher records the actual supplier at the time of travel.
  // Use it as a safe fallback for older bookings saved before overrides were
  // added, without changing the original quotation/service supplier.
  const payment = (booking?.payments || [])
    .filter((payment) => payment?.type === 'Supplier Payment' && payment?.status === 'Paid' && payment?.supplier)
    .filter((payment) => (payment.allocations || (payment.lineId ? [{ lineId: payment.lineId }] : [])).some((allocation) => allocation?.lineId === lineKey))
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))[0];
  return payment?.operationalSupplierOverride || (payment?.supplier ? { supplier: payment.supplier, supplierId: payment.supplierId || '' } : null);
};
const addCalendarDays = (value, days) => {
  const date = dateOnly(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const calendarDate = new Date(`${date}T00:00:00Z`);
  calendarDate.setUTCDate(calendarDate.getUTCDate() + days);
  return calendarDate.toISOString().slice(0, 10);
};

/** A non-hotel supplier payment is due the day after the customer checks out. */
export const supplierPaymentDueDate = (booking = {}) => addCalendarDays(
  booking.departureDate || booking.endDate || booking.travelEndDate || booking.arrivalDate,
  1,
);

/** Default timing for an operational supplier payment. Saved service dates
 * always win so an Operations user can correct an individual booking. */
export const supplierPaymentTiming = (booking = {}, line = {}) => {
  const item = line.item || {};
  if (line.kind === 'hotel') {
    const travelDate = dateOnly(line.checkIn || item.checkIn || item.serviceDate || item.date);
    const cutOffDate = dateOnly(item.cutoffDate || item.dueDate) || addCalendarDays(travelDate, -7);
    return {
      cutOffDate,
      paymentDate: dateOnly(item.paymentDate) || cutOffDate,
    };
  }
  const serviceDate = dateOnly(line.serviceDate || item.serviceDate || item.date || item.transferDate || item.startDate);
  return {
    cutOffDate: dateOnly(item.cutoffDate || item.dueDate) || serviceDate,
    paymentDate: dateOnly(item.paymentDate) || supplierPaymentDueDate(booking),
  };
};

export const paymentLineKey = (kind, item, index) => `${kind}:${item?.id || index}`;

/** Operations may reassign transport and sightseeing-ticket payables. This is
 * an actual-supplier payment override, not a quotation or rate-contract edit. */
export const canOverrideSupplierForPaymentLine = (line = {}) => (
  line.kind === 'service'
  && (
    line.component === 'transfer'
    || /transfer/i.test(String(line.type || ''))
    || /yacht/i.test(String(line.type || ''))
    || (line.component === 'ticket' && /sightseeing/i.test(String(line.type || '')))
  )
);

const applyOperationalSupplierOverride = (booking, line) => {
  if (!canOverrideSupplierForPaymentLine(line)) return line;
  const override = supplierOverrideFor(booking, line.key);
  return override?.supplier ? { ...line, supplier: override.supplier, supplierId: override.supplierId || line.supplierId || '' } : line;
};

const paidSupplierAllocationLineIds = (booking = {}) => new Set(
  (booking.payments || [])
    .filter((payment) => payment?.status === 'Paid' && payment?.type === 'Supplier Payment')
    .flatMap((payment) => payment.allocations || (payment.lineId ? [{ lineId: payment.lineId }] : []))
    .map((allocation) => allocation?.lineId)
    .filter(Boolean),
);

const standardServicePaymentLine = (booking, item, index) => {
  const serviceDate = dateOnly(item.serviceDate || item.date || item.transferDate || item.startDate);
  const timing = supplierPaymentTiming(booking, { kind: 'service', item, serviceDate });
  return {
    key: paymentLineKey('service', item, index), kind: 'service', type: item.type || 'Service', item,
    sourceServiceKey: paymentLineKey('service', item, index),
    name: item.name || 'Service', supplier: payableSupplier(item), supplierId: payableSupplierId(item) || '',
    serviceDate, dueDate: timing.cutOffDate,
    totalCost: number(item.totalSupplierCost || item.cost || item.supplierCost),
    totalSelling: number(item.totalSellingPrice || item.selling || item.sellingPrice),
  };
};

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const sightseeingPaymentBreakdown = (item, totalCost, totalSelling) => {
  const hasTicketCost = hasOwn(item, 'sightseeingTicketSupplierCost');
  const hasVehicleCost = hasOwn(item, 'sightseeingTransferVehicleCost');
  const inferredTicketCost = number(item.adultSupplierRate) * number(item.adults)
    + number(item.childSupplierRate) * number(item.children);
  const ticketCost = Math.min(totalCost, Math.max(0, hasTicketCost ? number(item.sightseeingTicketSupplierCost) : inferredTicketCost));
  const transferCost = hasVehicleCost
    ? Math.min(Math.max(0, number(item.sightseeingTransferVehicleCost)), totalCost - ticketCost)
    : Math.max(0, totalCost - ticketCost);
  const hasVehicleSelling = hasOwn(item, 'sightseeingTransferVehicleSellingPrice');
  const proportionalTransferSelling = totalCost > 0 ? Math.round(totalSelling * transferCost / totalCost) : 0;
  const transferSelling = Math.min(totalSelling, Math.max(0, hasVehicleSelling ? number(item.sightseeingTransferVehicleSellingPrice) : proportionalTransferSelling));
  return { ticketCost, transferCost, ticketSelling: Math.max(0, totalSelling - transferSelling), transferSelling };
};

const sightseeingPaymentLines = (booking, item, index, paidLineIds) => {
  const legacyLine = standardServicePaymentLine(booking, item, index);
  const ticketSupplier = supplierName(item.supplier || item.supplierName);
  const transferSupplier = supplierName(item.transferVehicleSupplier || item.vehicleSupplierName);
  const { ticketCost, transferCost, ticketSelling, transferSelling } = sightseeingPaymentBreakdown(item, legacyLine.totalCost, legacyLine.totalSelling);
  const transferType = String(item.transferOptionType || item.transferType || item.basis || '').trim().toUpperCase();
  // Ticket Only must not create a zero-value transfer line in payments or
  // invoices. Only an actual SIC/PVT transfer is tracked separately.
  const hasSelectedTransfer = ['SIC', 'PVT', 'PRIVATE'].includes(transferType);
  const canSplit = String(item.type || '').toLowerCase() === 'sightseeing' && hasSelectedTransfer;

  // Retain the original line on historical paid bookings so saved payment
  // allocations continue to point at a valid accounting record.
  if (!canSplit || paidLineIds.has(legacyLine.key)) return [applyOperationalSupplierOverride(booking, legacyLine)];

  const lines = [];
  lines.push({
    ...legacyLine,
    key: paymentLineKey('sightseeing-ticket', item, index), type: 'Sightseeing Ticket', component: 'ticket',
    name: `${legacyLine.name} · Ticket`, supplier: ticketSupplier || legacyLine.supplier, supplierId: item.supplierId || legacyLine.supplierId || '',
    totalCost: ticketCost, totalSelling: ticketSelling,
  });
  lines.push({
    ...legacyLine,
    key: paymentLineKey('sightseeing-transfer', item, index), type: 'Sightseeing Transfer', component: 'transfer',
    name: `${legacyLine.name} · Transfer`, supplier: transferSupplier || legacyLine.supplier, supplierId: item.transferVehicleSupplierId || item.vehicleSupplierId || legacyLine.supplierId || '',
    totalCost: transferCost, totalSelling: transferSelling,
  });
  return lines.map((line) => applyOperationalSupplierOverride(booking, line));
};

/**
 * Each booking line is an independent ledger account.  A client collection or
 * supplier disbursement is never allowed to silently apply to every service.
 */
export function bookingPaymentLines(booking = {}) {
  const paidLineIds = paidSupplierAllocationLineIds(booking);
  return [
    ...(booking.hotels || []).map((item, index) => {
      const checkIn = dateOnly(item.checkIn || item.serviceDate || item.date);
      const checkOut = dateOnly(item.checkOut);
      const timing = supplierPaymentTiming(booking, { kind: 'hotel', item, checkIn, checkOut });
      return {
        key: paymentLineKey('hotel', item, index), kind: 'hotel', type: 'Hotel', item,
        name: item.name || item.hotel || 'Hotel', supplier: item.supplier || item.supplierName || 'Unassigned',
        checkIn, checkOut, dueDate: timing.cutOffDate,
        totalCost: number(item.totalSupplierCost || item.totalCost || item.supplierCost),
        totalSelling: number(item.totalSellingPrice || item.totalSell || item.sellingPrice),
      };
    }),
    ...(booking.services || []).filter((item) => item.type !== 'Hotel')
      .flatMap((item, index) => sightseeingPaymentLines(booking, item, index, paidLineIds)),
  ];
}

const creditNoteAmount = (note) => number(note?.totalAmount || (number(note?.taxableAmount) + number(note?.cgstAmount) + number(note?.sgstAmount) + number(note?.igstAmount)));

export const CLIENT_PAYMENT_SCOPES = [
  { key: 'full', label: 'Full Payment' },
  { key: 'hotel', label: 'Hotel Payment' },
  { key: 'transfer', label: 'Transfer Payment' },
  { key: 'sightseeing', label: 'Sightseeing Payment' },
  { key: 'other', label: 'Other Activities Payment' },
];

export const normaliseClientPaymentScope = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  return CLIENT_PAYMENT_SCOPES.find((scope) => scope.key === raw || scope.label.toLowerCase() === raw)?.label || 'Full Payment';
};

const clientPaymentScopeForLine = (line = {}) => {
  const type = String(line.type || '').trim().toLowerCase();
  if (line.kind === 'hotel' || type === 'hotel') return 'hotel';
  if (line.component === 'transfer' || type.includes('transfer')) return 'transfer';
  if (type.includes('sightseeing')) return 'sightseeing';
  return 'other';
};

/** Calculation inputs persisted with the booking invoice, not with suppliers. */
export function bookingInvoiceDetails(booking = {}) {
  const serviceTotal = bookingPaymentLines(booking).reduce((sum, line) => sum + line.totalSelling, 0);
  const settings = booking.invoiceSettings || {};
  const baseAmount = number(booking.totalSelling || serviceTotal);
  const hasPercentDiscount = settings.discountPercent !== undefined && settings.discountPercent !== null && settings.discountPercent !== '';
  const discountPercent = Math.min(100, Math.max(0, number(settings.discountPercent)));
  const discount = hasPercentDiscount ? Math.round(baseAmount * discountPercent) / 100 : Math.min(Math.max(0, number(settings.discount)), baseAmount);
  const taxableAmount = Math.max(0, baseAmount - discount);
  const vatPercent = Math.max(0, number(settings.vatPercent));
  const gstInclusive = settings.taxTreatment === 'GST Include';
  const taxAmount = gstInclusive ? taxableAmount * (vatPercent / (100 + vatPercent || 1)) : taxableAmount * (vatPercent / 100);
  const bankCharges = Math.max(0, number(settings.bankCharges));
  const beforeCredits = gstInclusive ? taxableAmount + bankCharges : taxableAmount + taxAmount + bankCharges;
  const creditNotes = (booking.creditNotes || []).filter((note) => note?.status !== 'Cancelled');
  const creditTotal = creditNotes.reduce((sum, note) => sum + creditNoteAmount(note), 0);
  const debitNotes = (booking.debitNotes || []).filter((note) => note?.status !== 'Cancelled');
  const debitTotal = debitNotes.reduce((sum, note) => sum + creditNoteAmount(note), 0);
  return { baseAmount, discount, discountPercent: hasPercentDiscount ? discountPercent : 0, taxableAmount, vatPercent, taxAmount, bankCharges, creditTotal, debitTotal, beforeCredits, total: Math.max(0, beforeCredits - creditTotal + debitTotal), settings };
}

/** Client collections settle the adjusted booking invoice, not individual services. */
export function bookingInvoicePaymentState(booking = {}) {
  const invoice = bookingInvoiceDetails(booking);
  const paid = (booking.payments || [])
    .filter((payment) => payment.status === 'Paid' && ['Client Payment', 'Receivable'].includes(payment.type))
    .reduce((sum, payment) => sum + number(payment.amount), 0);
  return { ...invoice, paid, remaining: Math.max(0, invoice.total - paid) };
}

/** Client collections can be requested as one invoice or as one service family.
 * Service-family totals are proportional after invoice adjustments so their sum
 * always equals the live client invoice total. */
export function bookingClientPaymentScopes(booking = {}) {
  const invoice = bookingInvoicePaymentState(booking);
  const lines = bookingPaymentLines(booking);
  const rawTotals = Object.fromEntries(CLIENT_PAYMENT_SCOPES.filter((scope) => scope.key !== 'full').map((scope) => [scope.key, 0]));
  lines.forEach((line) => { rawTotals[clientPaymentScopeForLine(line)] += number(line.totalSelling); });
  const rawGrandTotal = Object.values(rawTotals).reduce((total, value) => total + value, 0);
  const payments = (booking.payments || []).filter((payment) => payment?.status === 'Paid' && ['Client Payment', 'Receivable'].includes(payment.type));
  const totalPaid = payments.reduce((total, payment) => total + number(payment.amount), 0);
  let allocatedTotal = 0;
  return CLIENT_PAYMENT_SCOPES.map((scope, index, all) => {
    const total = scope.key === 'full'
      ? invoice.total
      : index === all.length - 1
        ? Math.max(0, invoice.total - allocatedTotal)
        : rawGrandTotal > 0 ? Math.round(rawTotals[scope.key] * invoice.total / rawGrandTotal * 100) / 100 : 0;
    if (scope.key !== 'full') allocatedTotal += total;
    const paid = scope.key === 'full'
      ? totalPaid
      : payments.filter((payment) => normaliseClientPaymentScope(payment.clientPaymentScope) === scope.label).reduce((sum, payment) => sum + number(payment.amount), 0);
    return { ...scope, total, paid, remaining: Math.max(0, Math.min(total - paid, invoice.remaining)) };
  });
}

function paidForLine(payments, lineKey, types) {
  return payments
    .filter((payment) => payment.status === 'Paid' && types.includes(payment.type))
    .flatMap((payment) => payment.allocations || (payment.lineId ? [{ lineId: payment.lineId, amount: payment.amount }] : []))
    .filter((allocation) => allocation.lineId === lineKey)
    .reduce((sum, allocation) => sum + number(allocation.amount), 0);
}

function supplierSettlement(payments, lineKey) {
  return payments
    .filter((payment) => payment.status === 'Paid' && payment.type === 'Supplier Payment')
    .flatMap((payment) => payment.allocations || (payment.lineId ? [{ lineId: payment.lineId, amount: payment.amount }] : []))
    .find((allocation) => allocation.lineId === lineKey && allocation.settleSupplierBalance);
}

export function linePaymentState(booking = {}, line) {
  const payments = booking.payments || [];
  const hasAllocation = (types) => payments.some((payment) => types.includes(payment.type) && (payment.allocations || []).some((allocation) => allocation.lineId === line.key));
  const supplierPaid = hasAllocation(['Supplier Payment']) ? paidForLine(payments, line.key, ['Supplier Payment']) : number(line.item?.paid);
  const clientPaid = hasAllocation(['Client Payment', 'Receivable']) ? paidForLine(payments, line.key, ['Client Payment', 'Receivable']) : 0;
  const settlement = supplierSettlement(payments, line.key);
  const supplierSavings = settlement ? Math.max(0, line.totalCost - supplierPaid) : 0;
  const effectiveSupplierCost = settlement ? supplierPaid : line.totalCost;
  return {
    supplierPaid,
    supplierRemaining: settlement ? 0 : Math.max(0, line.totalCost - supplierPaid),
    // A zero-cost line still needs an explicit settlement receipt. Without
    // this guard it appears paid before Operations has confirmed that no
    // supplier payment is required.
    supplierSettled: Boolean(settlement) || (Number(line.totalCost || 0) > 0 && supplierPaid >= Number(line.totalCost || 0)),
    supplierSavings,
    effectiveSupplierCost,
    clientPaid,
    clientRemaining: Math.max(0, line.totalSelling - clientPaid),
    plannedProfit: line.totalSelling - line.totalCost,
    grossProfit: line.totalSelling - effectiveSupplierCost,
    realisedCash: clientPaid - supplierPaid,
  };
}

export function accountLedger(bookings = []) {
  const invoices = bookings.map((booking) => ({ booking, ...bookingInvoicePaymentState(booking) }));
  const rows = invoices.flatMap(({ booking, total: clientInvoiceTotal, paid: clientInvoicePaid, remaining: clientInvoiceRemaining }) => bookingPaymentLines(booking).map((line) => ({
    bookingId: booking.id,
    guestName: booking.guestName || 'Client',
    agentName: booking.agentName || 'Direct client',
    arrivalDate: booking.arrivalDate || '',
    paymentDeadline: booking.invoiceSettings?.dueDate || booking.paymentDeadline || booking.arrivalDate || '',
    bookingStatus: booking.status || '',
    clientInvoiceTotal,
    clientInvoicePaid,
    clientInvoiceRemaining,
    ...line,
    ...linePaymentState(booking, line),
  })));
  const sum = (key) => rows.reduce((total, row) => total + number(row[key]), 0);
  const payments = bookings.flatMap((booking) => (booking.payments || []).map((payment) => ({ ...payment, bookingId: booking.id, guestName: booking.guestName || 'Client' })));
  return {
    rows,
    payments,
    totals: {
      clientInvoiced: invoices.reduce((total, invoice) => total + invoice.total, 0),
      sellingTotal: sum('totalSelling'),
      clientReceived: invoices.reduce((total, invoice) => total + invoice.paid, 0),
      clientOutstanding: invoices.reduce((total, invoice) => total + invoice.remaining, 0),
      supplierCommitted: sum('totalCost'), supplierPaid: sum('supplierPaid'), supplierOutstanding: sum('supplierRemaining'),
      supplierSavings: sum('supplierSavings'),
      // Quoted markup is the profit agreed in the quotation. Total profit
      // also includes a saving when a supplier is settled below that cost.
      markupProfit: sum('plannedProfit'),
      grossProfit: sum('grossProfit'),
      realisedCash: invoices.reduce((total, invoice) => total + invoice.paid, 0) - sum('supplierPaid'),
    },
  };
}
