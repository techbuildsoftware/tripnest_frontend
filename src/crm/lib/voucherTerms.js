const textFromHtml = (value) => String(value || '')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .trim();

export const hasVoucherTermText = (value) => Boolean(textFromHtml(value));

export const voucherTermEntries = (voucher = {}) => [
  ['Important notes', voucher.termsHtml],
  ['Hotel terms & conditions', voucher.hotelTermsHtml],
  ['Sightseeing terms & conditions', voucher.sightseeingTermsHtml],
  ['Transfer terms & conditions', voucher.transferTermsHtml],
].filter(([, html]) => hasVoucherTermText(html));

export const hasVoucherTerms = (voucher = {}) => voucherTermEntries(voucher).length > 0;

// All editorial voucher templates use the same headings and rich-text content.
// This keeps a selected terms template visible regardless of the PDF design.
export const composeVoucherTermsHtml = (voucher = {}) => voucherTermEntries(voucher)
  .map(([title, html]) => `<h3>${title}</h3>${title === 'Sightseeing terms & conditions' && voucher.voucherType === 'sightseeing' ? '<div style="float:right;border:4px solid #16a34a;color:#16a34a;padding:4px 10px;font-size:20px;font-weight:900;letter-spacing:3px;transform:rotate(-12deg);opacity:.58">PAID</div>' : ''}${html}`)
  .join('');
