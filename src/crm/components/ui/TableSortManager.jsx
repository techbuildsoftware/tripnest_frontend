import { useEffect } from 'react';

const nonSortableHeadings = new Set(['#', 'action', 'actions', 'select', 'copy', 'remove', 'delete']);

const headerLabel = (header) => String(header?.textContent || '')
  .replace(/[↕↑↓]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const dateValue = (value) => {
  const iso = value.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const display = value.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (display) return Date.UTC(Number(display[3]), Number(display[2]) - 1, Number(display[1]));
  return null;
};

const valueForCell = (cell) => {
  const raw = String(cell?.dataset.sortValue || cell?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
  const normalized = raw.toLowerCase();
  if (!raw || ['—', '-', 'not assigned', 'n/a'].includes(normalized)) return { empty: true, value: '' };
  const date = dateValue(raw);
  if (date !== null) return { empty: false, value: date, type: 'number' };
  const amount = raw
    .replace(/[฿$€£₹,%]/g, '')
    .replace(/,/g, '')
    .trim();
  if (/^[+-]?\d+(?:\.\d+)?$/.test(amount)) return { empty: false, value: Number(amount), type: 'number' };
  return { empty: false, value: raw, type: 'text' };
};

const directDataRows = (tbody, columnIndex) => [...tbody.children].filter((row) => (
  row.tagName === 'TR'
  && row.children[columnIndex]
  && !row.querySelector('td[colspan], th[colspan]')
));

const isDocumentTable = (table) => Boolean(table.closest(
  '.pdf-flow-preview, .pdf-preview-content, .standard-quotation-document, .voucher-page, .civ-root, [data-voucher-document="true"]',
));
const clearSorting = (table) => {
  const headers = table.tHead?.rows?.[table.tHead.rows.length - 1]?.cells || [];
  [...headers].forEach((header) => {
    delete header.dataset.sortHeader;
    delete header.dataset.sortColumn;
    delete header.dataset.sortDirection;
    delete header.dataset.sortDisabled;
    header.removeAttribute('aria-sort');
    header.removeAttribute('role');
    header.removeAttribute('tabindex');
  });
};

function decorateTable(table) {
  // PDF/client-preview tables are document content, not interactive data
  // grids. Never add sorting affordances to them (or to their exported copy).
  if (table.dataset.sortable === 'false' || isDocumentTable(table)) {
    clearSorting(table);
    return;
  }
  const headerRow = table.tHead?.rows?.[table.tHead.rows.length - 1];
  if (!headerRow) return;
  [...headerRow.cells].forEach((header, index) => {
    const label = headerLabel(header);
    const disabled = header.dataset.sortable === 'false' || nonSortableHeadings.has(label);
    if (disabled) {
      header.dataset.sortDisabled = 'true';
      return;
    }
    header.dataset.sortHeader = 'true';
    header.dataset.sortColumn = String(index);
    header.tabIndex = 0;
    header.setAttribute('role', 'button');
    if (!header.title) header.title = `Sort by ${headerLabel(header) || 'this column'}`;
  });
}

function sortTable(table, header, requestedDirection) {
  const columnIndex = Number(header.dataset.sortColumn);
  if (!Number.isInteger(columnIndex)) return;
  const currentDirection = header.dataset.sortDirection;
  const direction = requestedDirection || (currentDirection === 'ascending' ? 'descending' : 'ascending');
  const multiplier = direction === 'ascending' ? 1 : -1;

  [...table.tBodies].forEach((tbody) => {
    const rows = directDataRows(tbody, columnIndex)
      .map((row, index) => ({ row, index, sort: valueForCell(row.children[columnIndex]) }));
    if (rows.length < 2) return;
    rows.sort((left, right) => {
      if (left.sort.empty !== right.sort.empty) return left.sort.empty ? 1 : -1;
      if (left.sort.type === 'number' && right.sort.type === 'number') {
        return (left.sort.value - right.sort.value) * multiplier || left.index - right.index;
      }
      return String(left.sort.value).localeCompare(String(right.sort.value), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * multiplier || left.index - right.index;
    });
    // Avoid touching the DOM when a mutation observer has re-applied an
    // unchanged sort. This keeps controlled inputs in editable tables stable.
    const reordered = rows.some(({ row }, index) => row !== directDataRows(tbody, columnIndex)[index]);
    if (reordered) rows.forEach(({ row }) => tbody.appendChild(row));
  });

  const headers = table.tHead?.rows?.[table.tHead.rows.length - 1]?.cells || [];
  [...headers].forEach((item) => {
    item.removeAttribute('aria-sort');
    delete item.dataset.sortDirection;
  });
  header.dataset.sortDirection = direction;
  header.setAttribute('aria-sort', direction);
}

/**
 * Applies sorting to operational data tables without requiring each page to
 * duplicate sorting UI or comparison logic. Printable voucher and PDF tables
 * are documents, so they always opt out. Action/copy/select columns are also
 * excluded automatically.
 */
export default function TableSortManager() {
  useEffect(() => {
    const root = document.body;
    const activeSorts = new Map();
    let scheduled = false;
    const prepare = () => {
      root.querySelectorAll('table').forEach(decorateTable);
      activeSorts.forEach((sort, table) => {
        if (!root.contains(table) || isDocumentTable(table)) {
          activeSorts.delete(table);
          clearSorting(table);
          return;
        }
        const header = table.tHead?.rows?.[table.tHead.rows.length - 1]?.cells?.[sort.columnIndex];
        if (header) sortTable(table, header, sort.direction);
      });
    };
    const onClick = (event) => {
      const header = event.target.closest('th[data-sort-header="true"]');
      if (!header || header.dataset.sortDisabled === 'true') return;
      if (event.target.closest('button, input, select, textarea, a, label')) return;
      // Pages that already use a server-side sort handler retain that handler.
      // The manager handles every remaining visible data column consistently.
      if (header.classList.contains('cursor-pointer')) return;
      const table = header.closest('table');
      if (table) {
        sortTable(table, header);
        activeSorts.set(table, {
          columnIndex: Number(header.dataset.sortColumn),
          direction: header.dataset.sortDirection,
        });
      }
    };
    const onKeyDown = (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      const header = event.target.closest('th[data-sort-header="true"]');
      if (!header || header.dataset.sortDisabled === 'true' || header.classList.contains('cursor-pointer')) return;
      event.preventDefault();
      const table = header.closest('table');
      if (table) {
        sortTable(table, header);
        activeSorts.set(table, {
          columnIndex: Number(header.dataset.sortColumn),
          direction: header.dataset.sortDirection,
        });
      }
    };
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        prepare();
      });
    });
    prepare();
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeyDown);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
