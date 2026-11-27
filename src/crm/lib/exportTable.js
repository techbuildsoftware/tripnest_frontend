// Shared table export. Writes a styled Excel-compatible (.xls) file so the
// heading row keeps its colour, borders and number formats when opened.
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export function downloadExcelTable({ filename, head, rows }) {
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Calibri,Arial;font-size:11pt}th{background:#173567;color:#ffffff;font-weight:bold;border:1px solid #0f2547;padding:6px 10px;text-align:left}td{border:1px solid #cbd5e1;padding:5px 10px;mso-number-format:"\\@"}td.n{mso-number-format:"#,##0.00";text-align:right}tr:nth-child(even) td{background:#f1f5f9}</style></head><body><table><thead><tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td${typeof value === 'number' ? ' class="n"' : ''}>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
