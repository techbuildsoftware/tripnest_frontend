import { clone, nowIso } from '../util';
import { db, get, notFound, ok, post, save } from './core';

post('/agent-quotation-share/:id/link', ({ params, body }) => {
  const q = db().quotations.find((x) => x.id === params.id);
  if (!q) throw notFound('Quotation');
  const token = `share-${q.id.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
  db().shareLinks[token] = { quotationId: q.id, templateId: body?.templateId, createdAt: nowIso() };
  save();
  return ok({ token, shortCode: token.slice(-6) });
});
get('/agent-quotation-share/:token', ({ params }) => {
  const link = db().shareLinks[params.token];
  const q = link && db().quotations.find((x) => x.id === link.quotationId);
  if (!q) throw notFound('Shared quotation');
  const agent = db().agents.find((a) => a.id === q.agentId);
  const template = db().pdfTemplates.find((t) => t.id === link.templateId) || db().pdfTemplates.find((t) => t.documentType === 'quotation' && t.isDefault);
  const d = db();
  return ok({
    quotation: clone(q), agent: { name: agent?.name || q.agentName, logo: agent?.companyLogo || null, email: agent?.email, phone: agent?.phone }, template: { config: clone(template?.config || {}) },
    mediaMasters: clone({ hotels: d.hotels, sightseeing: d.sightseeingModule, restaurants: d.activityM.restaurants, transfers: d.operationsM.transfers, ferryClasses: d.operationsM['ferry-classes'], vehicles: d.operationsM.vehicles, yachts: d.yachts, suppliers: d.suppliers, agents: d.agents, b2c: d.b2c }),
  });
});
