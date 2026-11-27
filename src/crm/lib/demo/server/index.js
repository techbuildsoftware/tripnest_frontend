// In-browser replacement for the REST backend. `handle()` mimics fetch + JSON.
import { ensureDb } from '../db';
import { ApiError, match } from './core';
import { userFromToken } from './auth';
import './collections';
import './bookings';
import './accounts';
import './dashboard';
import './share';
import './misc';

const LATENCY_MS = 60;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** @returns {Promise<any>} parsed JSON payload; throws ApiError on failure. */
export async function handle(method, fullPath, { body, token } = {}) {
  await ensureDb();
  await wait(LATENCY_MS);
  const [path, search = ''] = fullPath.split('?');
  const found = match(String(method).toUpperCase(), path.replace(/\/+$/, '') || '/');
  if (!found) throw new ApiError(`Route not found: ${method} ${path}`, 404);
  const user = userFromToken(token);
  if (!user && !path.startsWith('/auth/') && !path.startsWith('/payment-portal/') && !path.startsWith('/agent-quotation-share/')) throw new ApiError('Please sign in to continue.', 401);
  let parsed = body;
  if (typeof body === 'string') { try { parsed = JSON.parse(body); } catch { parsed = {}; } }
  const result = await found.handler({ params: found.params, query: new URLSearchParams(search), body: parsed || {}, ctx: { user } });
  // Responses are cloned so pages can never mutate the in-memory database by accident.
  return result === undefined ? null : result;
}
export { ApiError };
