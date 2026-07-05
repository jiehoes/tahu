import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
}

export const search = new Hono<{ Bindings: Bindings }>()

search.post(
  '/',
  zValidator(
    'json',
    z.object({
      query: z.string().min(1).max(500),
      type: z.enum(['fulltext', 'hybrid']).default('fulltext'),
      category: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  ),
  async (c) => {
    const { query, type, category, limit } = c.req.valid('json')

    // Build FTS5 query
    const ftsQuery = query
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"`)
      .join(' OR ')

    let sql = `
      SELECT
        d.id,
        d.title,
        d.category,
        d.status,
        d.file_size,
        d.mime_type,
        d.tags,
        d.created_at,
        d.updated_at,
        snippet(documents_fts, 2, '<mark>', '</mark>', '...', 40) as snippet
      FROM documents_fts fts
      JOIN documents d ON d.rowid = fts.rowid
      WHERE documents_fts MATCH ?
    `

    const params: unknown[] = [ftsQuery]

    if (category) {
      sql += ' AND d.category = ?'
      params.push(category)
    }

    sql += ' ORDER BY rank LIMIT ?'
    params.push(limit)

    const { results } = await c.env.DB.prepare(sql).bind(...params).all()
    const rows = results as Record<string, unknown>[]

    return c.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        snippet: row.snippet as string,
        tags: JSON.parse((row.tags as string) || '[]'),
        createdAt: row.created_at,
      })),
      meta: {
        query,
        type,
        total: rows.length,
      },
    })
  },
)
