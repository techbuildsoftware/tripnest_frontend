import { ApiError, db, get, post, ok } from './core';

export const DEMO_ADMIN = { identifier: 'admin@buildsoftware.in', password: 'Admin@123' };
export const DEMO_AGENT = { identifier: 'AGENT-AGT-2026-001', password: 'Agent@123' };

const staffUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status });
const agentUser = (a) => ({ id: a.id, name: a.contactPerson || a.name, email: a.email, role: 'Agent', agentId: a.id, agentName: a.name, loginCode: a.loginCode, status: 'Active' });

export function userFromToken(token) {
  const m = /^demo\.(.+)$/.exec(String(token || ''));
  if (!m) return null;
  const id = m[1];
  const agent = db().agents.find((a) => a.id === id);
  if (agent) return agentUser(agent);
  const user = db().users.find((u) => u.id === id);
  return user ? staffUser(user) : null;
}

post('/auth/login', ({ body }) => {
  const identifier = String(body.identifier || '').trim().toLowerCase();
  const password = String(body.password || '');
  const agent = db().agents.find((a) => a.loginCode?.toLowerCase() === identifier || a.email?.toLowerCase() === identifier);
  if (agent && agent.portalPassword === password) return { token: `demo.${agent.id}`, user: agentUser(agent) };
  const user = db().users.find((u) => u.email.toLowerCase() === identifier);
  if (user && password === DEMO_ADMIN.password) return { token: `demo.${user.id}`, user: staffUser(user) };
  throw new ApiError('Invalid credentials. Use the demo login shown on the sign-in screen.', 401);
});
get('/auth/me', ({ ctx }) => {
  if (!ctx.user) throw new ApiError('Not authenticated.', 401);
  return { user: ctx.user };
});
export { ok };
