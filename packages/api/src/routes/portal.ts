import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = { DB: D1Database }

export const portal = new Hono<{ Bindings: Bindings }>()

// Public read-only knowledge portal — NO auth required

// ─── GET /portal/wiki ──────────────────────────────────────

portal.get('/wiki', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || '20'), 50)
  const category = c.req.query('category')

  let sql = "SELECT id, title, category, tags, current_version, created_at, updated_at FROM wiki_articles WHERE status = 'published'"
  const params: unknown[] = []

  if (category) {
    sql += ' AND category = ?'
    params.push(category)
  }

  sql += ' ORDER BY updated_at DESC LIMIT ?'
  params.push(limit)

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()

  return c.json({
    success: true,
    data: (results as Record<string, unknown>[]).map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      tags: JSON.parse((r.tags as string) || '[]'),
      version: r.current_version,
      updatedAt: r.updated_at,
    })),
  })
})

// ─── GET /portal/wiki/:id ──────────────────────────────────

portal.get('/wiki/:id', async (c) => {
  const id = c.req.param('id')
  const article = await c.env.DB.prepare(
    "SELECT * FROM wiki_articles WHERE id = ? AND status = 'published'",
  ).bind(id).first() as Record<string, unknown> | null

  if (!article) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Article not found or not published' } }, 404)
  }

  return c.json({
    success: true,
    data: {
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category,
      tags: JSON.parse((article.tags as string) || '[]'),
      version: article.current_version,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    },
  })
})

// ─── GET /portal/search ────────────────────────────────────

portal.get('/search', async (c) => {
  const q = c.req.query('q')
  if (!q) {
    return c.json({ success: false, error: { code: 'MISSING_PARAM', message: 'Query parameter q required' } }, 400)
  }

  const ftsQuery = q.split(/\s+/).filter(Boolean).map(t => `"${t}"`).join(' OR ')
  const limit = Math.min(Number(c.req.query('limit') || '10'), 20)

  const { results } = await c.env.DB.prepare(
    `SELECT w.id, w.title, w.category, snippet(documents_fts, 2, '<mark>', '</mark>', '...', 40) as snippet
     FROM documents_fts fts
     JOIN documents d ON d.rowid = fts.rowid
     JOIN sources s ON s.document_id = d.id
     JOIN wiki_articles w ON w.id = s.wiki_id
     WHERE documents_fts MATCH ? AND w.status = 'published'
     ORDER BY rank LIMIT ?`,
  ).bind(ftsQuery, limit).all()

  return c.json({ success: true, data: results })
})

// ─── GET /portal/stats ─────────────────────────────────────

portal.get('/stats', async (c) => {
  const [docs, wiki, entities] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM documents').first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM wiki_articles WHERE status = 'published'").first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM entities').first(),
  ])

  return c.json({
    success: true,
    data: {
      documents: (docs as Record<string, number>).count,
      wikiArticles: (wiki as Record<string, number>).count,
      entities: (entities as Record<string, number>).count,
    },
  })
})
