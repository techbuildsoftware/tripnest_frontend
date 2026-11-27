const safeSegment = (value, fallback) => {
  const cleaned = String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned || fallback;
};

// Use the established client-facing format everywhere: guest name followed by
// the quotation number. The same helper is used by download, Print / Save as
// PDF, email attachments and WhatsApp, so none of those paths can diverge.
export const quotationPdfFilename = (quotation = {}) => {
  const guestName = safeSegment(
    quotation.guestName
      || quotation.b2cName
      || quotation.guests?.find((guest) => guest?.isLeader)?.name
      || quotation.guests?.[0]?.name,
    '',
  );
  const quotationNumber = safeSegment(
    quotation.quotationNo || quotation.quotationNumber || quotation.id,
    'Quotation',
  );
  return guestName ? `${guestName}_${quotationNumber}` : quotationNumber;
};

export const voucherPdfFilename = (booking = {}, voucher = {}) => {
  const voucherLabels = {
    hotel: 'Hotel Voucher',
    sightseeing: 'Sightseeing Voucher',
    transfer: 'Transfer Voucher',
    other: 'Other Service Voucher',
    combined: 'Confirmation Voucher',
  };
  const voucherLabel = voucherLabels[voucher.voucherType] || 'Confirmation Voucher';
  return `${safeSegment(
  voucher.guests?.find((guest) => guest?.isLeader)?.name
    || voucher.guests?.[0]?.name
    || booking.guestName
    || booking.guests?.find((guest) => guest?.isLeader)?.name
    || booking.guests?.[0]?.name,
  'Guest',
).replace(/_/g, ' ')} ${voucherLabel}`;
};
