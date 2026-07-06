import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = { DB: D1Database }

export const export_ = new Hono<{ Bindings: Bindings }>()

// ─── GET /export/markdown ──────────────────────────────────

export_.get('/markdown', async (c) => {
  const wikiId = c.req.query('wikiId')
  if (!wikiId) {
    return c.json({ success: false, error: { code: 'MISSING_PARAM', message: 'wikiId required' } }, 400)
  }

  const article = await c.env.DB.prepare(
    'SELECT * FROM wiki_articles WHERE id = ?',
  ).bind(wikiId).first() as Record<string, unknown> | null

  if (!article) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Wiki not found' } }, 404)
  }

  const content = article.content as string

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${(article.title as string).replace(/[^a-zA-Z0-9]/g, '_')}.md"`,
    },
  })
})

// ─── GET /export/json ──────────────────────────────────────

export_.get('/json', async (c) => {
  const wikiId = c.req.query('wikiId')
  if (!wikiId) {
    return c.json({ success: false, error: { code: 'MISSING_PARAM', message: 'wikiId required' } }, 400)
  }

  const article = await c.env.DB.prepare(
    'SELECT * FROM wiki_articles WHERE id = ?',
  ).bind(wikiId).first() as Record<string, unknown> | null
  if (!article) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Wiki not found' } }, 404)
  }

  const { results: versions } = await c.env.DB.prepare(
    'SELECT version_num, change_summary, created_at FROM wiki_versions WHERE wiki_id = ? ORDER BY version_num DESC',
  ).bind(wikiId).all()

  return c.json({
    success: true,
    data: {
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category,
      tags: JSON.parse((article.tags as string) || '[]'),
      version: article.current_version,
      versions,
      exportedAt: new Date().toISOString(),
    },
  })
})

// ─── GET /export/bulk ──────────────────────────────────────

export_.get('/bulk', async (c) => {
  const category = c.req.query('category')
  const format = c.req.query('format') || 'json'

  let sql = 'SELECT * FROM wiki_articles'
  const params: unknown[] = []

  if (category) {
    sql += ' WHERE category = ?'
    params.push(category)
  }

  sql += ' ORDER BY updated_at DESC LIMIT 100'

  if (params.length > 0) {
    const { results } = await c.env.DB.prepare(sql).bind(...params).all()
    return format === 'json'
      ? c.json({ success: true, data: results, exportedAt: new Date().toISOString() })
      : c.json({ success: false, error: { code: 'UNSUPPORTED', message: 'Only JSON bulk export supported currently' } }, 400)
  }

  const { results } = await c.env.DB.prepare(sql).all()
  return c.json({ success: true, data: results, exportedAt: new Date().toISOString() })
})
