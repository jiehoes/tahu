import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const analytics = new Hono<{ Bindings: Bindings }>()

// ─── GET /analytics/overview ───────────────────────────────

analytics.get('/overview', async (c) => {
  const tenantId = (c.get('tenantId') as string) || 'default'

  const queries = [
    c.env.DB.prepare('SELECT COUNT(*) as count FROM documents').first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM wiki_articles').first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM entities').first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM relations').first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM knowledge_candidates WHERE status = 'pending_review'").first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM audit_log').first(),
  ]

  const [docs, wiki, entities, relations, candidates, audits] = await Promise.all(queries)

  return c.json({
    success: true,
    data: {
      documents: (docs as Record<string, number>).count,
      wikiArticles: (wiki as Record<string, number>).count,
      entities: (entities as Record<string, number>).count,
      relations: (relations as Record<string, number>).count,
      pendingCandidates: (candidates as Record<string, number>).count,
      auditEntries: (audits as Record<string, number>).count,
    },
  })
})

// ─── GET /analytics/documents ──────────────────────────────

analytics.get('/documents', async (c) => {
  const tenantId = (c.get('tenantId') as string) || 'default'

  const { results } = await c.env.DB.prepare(
    `SELECT category, COUNT(*) as count FROM documents WHERE tenant_id = ? GROUP BY category ORDER BY count DESC`,
  ).bind(tenantId).all()

  const { results: byStatus } = await c.env.DB.prepare(
    `SELECT status, COUNT(*) as count FROM documents WHERE tenant_id = ? GROUP BY status`,
  ).bind(tenantId).all()

  return c.json({
    success: true,
    data: {
      byCategory: results,
      byStatus,
    },
  })
})

// ─── GET /analytics/activity ───────────────────────────────

analytics.get('/activity', async (c) => {
  const tenantId = (c.get('tenantId') as string) || 'default'
  const days = Math.min(Number(c.req.query('days') || '7'), 90)

  const { results } = await c.env.DB.prepare(
    `SELECT date(created_at) as date, action, COUNT(*) as count
     FROM audit_log
     WHERE tenant_id = ? AND created_at >= date('now', '-${days} days')
     GROUP BY date(created_at), action
     ORDER BY date DESC
     LIMIT 100`,
  ).bind(tenantId).all()

  return c.json({ success: true, data: results })
})
