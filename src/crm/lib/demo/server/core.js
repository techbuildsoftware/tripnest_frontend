// Shared helpers for the in-browser API.
import { getDb, save } from '../db';
import { clone, nowIso } from '../util';

export class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const notFound = (what = 'Record') => new ApiError(`${what} not found.`, 404);

export const ok = (data, extra = {}) => ({ data, ...extra });

export const db = () => getDb();
export const helpers = {};
export { save };

// ── Route table ──────────────────────────────────────────────────────────────
const routes = [];
const compile = (pattern) => {
  const keys = [];
  const source = pattern.replace(/\/:([a-zA-Z]+)/g, (_, key) => { keys.push(key); return '/([^/]+)'; });
  return { regex: new RegExp(`^${source}$`), keys };
};
export const route = (method, pattern, handler) => routes.push({ method, ...compile(pattern), handler });
export const get = (pattern, handler) => route('GET', pattern, handler);
export const post = (pattern, handler) => route('POST', pattern, handler);
export const put = (pattern, handler) => route('PUT', pattern, handler);
export const patch = (pattern, handler) => route('PATCH', pattern, handler);
export const del = (pattern, handler) => route('DELETE', pattern, handler);

export function match(method, path) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.regex.exec(path);
    if (m) return { handler: r.handler, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

// ── Collection helpers ───────────────────────────────────────────────────────
export function nextId(list, prefix, pad = 3, start = 0) {
  let max = start;
  list.forEach((item) => {
    const id = String(item?.id || '');
    if (!id.startsWith(prefix)) return;
    const n = Number(id.slice(prefix.length).replace(/\D/g, ''));
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}

export const stampNew = (record) => ({ ...record, createdAt: record.createdAt || nowIso(), updatedAt: nowIso() });
export const stampUpdate = (record) => ({ ...record, updatedAt: nowIso() });

const compareValues = (a, b) => {
  if (a === b) return 0;
  if (a === undefined || a === null || a === '') return 1;
  if (b === undefined || b === null || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

export function sortRecords(rows, sortBy, sortDir = 'asc') {
  if (!sortBy) return rows;
  const dir = String(sortDir).toLowerCase() === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a?.[sortBy]; const right = b?.[sortBy];
    const result = compareValues(left, right);
    return result === 1 || result === -1 ? (left === undefined || left === null || left === '' ? 1 : right === undefined || right === null || right === '' ? -1 : result * dir) : 0;
  });
}

const searchable = (record) => {
  try {
    return JSON.stringify(record, (key, value) => (typeof value === 'string' && value.startsWith('data:') ? undefined : value)).toLowerCase();
  } catch { return ''; }
};

export function searchRecords(rows, term) {
  const needle = String(term || '').trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => searchable(row).includes(needle));
}

export function paginate(rows, query) {
  const limit = Number(query.get('limit')) || 0;
  const page = Math.max(1, Number(query.get('page')) || 1);
  if (!limit) return { rows, pagination: { page: 1, limit: rows.length, total: rows.length, totalPages: 1 } };
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { rows: rows.slice(start, start + limit), pagination: { page, limit, total, totalPages } };
}

export function statusSummary(rows, field = 'status') {
  const statusCounts = {};
  rows.forEach((row) => { const key = row?.[field] || 'Unknown'; statusCounts[key] = (statusCounts[key] || 0) + 1; });
  return { total: rows.length, statusCounts };
}

/** Standard list response with search, sort, pagination and a status summary. */
export function listResponse(rows, query, { sortBy: defaultSort, sortDir: defaultDir, summaryRows, summaryField, present = (x) => x, summary } = {}) {
  const searched = searchRecords(rows, query.get('search'));
  const sorted = sortRecords(searched, query.get('sortBy') || defaultSort, query.get('sortDir') || defaultDir);
  const { rows: pageRows, pagination } = paginate(sorted, query);
  const out = { data: clone(pageRows.map(present)), pagination };
  if (query.get('summary') !== 'false') out.summary = summary || statusSummary(summaryRows || searchRecords(rows, query.get('search')), summaryField);
  return out;
}

/** Generic CRUD for a flat collection stored at db()[key]. */
export function crud(basePath, key, { prefix, pad = 3, present = (x) => x, prepare = (x) => x, beforeDelete, afterWrite, sortBy, sortDir, filter, summaryField, summaryFn, idStart = 0, defaults = {} } = {}) {
  const list = () => db()[key];
  get(basePath, ({ query, ctx }) => {
    let rows = list();
    if (filter) rows = filter(rows, query, ctx);
    return listResponse(rows, query, { sortBy, sortDir, present, summaryField, summary: summaryFn ? summaryFn(list(), query, ctx) : undefined });
  });
  get(`${basePath}/:id`, ({ params }) => {
    const row = list().find((item) => item.id === params.id);
    if (!row) throw notFound();
    return ok(clone(present(row)));
  });
  post(basePath, ({ body, ctx }) => {
    const id = body.id || nextId(list(), typeof prefix === 'function' ? prefix() : prefix, pad, idStart);
    const record = prepare(stampNew({ status: 'Active', ...defaults, ...clone(body), id }), null, ctx);
    list().unshift(record);
    afterWrite?.(record, null, ctx);
    save();
    return ok(clone(present(record)));
  });
  put(`${basePath}/:id`, ({ params, body, ctx }) => {
    const index = list().findIndex((item) => item.id === params.id);
    if (index < 0) throw notFound();
    const previous = list()[index];
    const record = prepare(stampUpdate({ ...previous, ...clone(body), id: previous.id, createdAt: previous.createdAt }), previous, ctx);
    list()[index] = record;
    afterWrite?.(record, previous, ctx);
    save();
    return ok(clone(present(record)));
  });
  del(`${basePath}/:id`, ({ params, ctx }) => {
    const index = list().findIndex((item) => item.id === params.id);
    if (index < 0) throw notFound();
    const [removed] = list().splice(index, 1);
    beforeDelete?.(removed, ctx);
    save();
    return ok({ id: removed.id });
  });
}
