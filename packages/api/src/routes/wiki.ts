import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { NotFoundError, generateId } from '@tahu/core'
import {
  generateWikiArticle,
  createVersion,
  generateChangeSummary,
  createCandidate,
  approveCandidate,
  rejectCandidate,
} from '@tahu/wiki'
import { parseDocument } from '@tahu/parser'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = { DB: D1Database }

export const wiki = new Hono<{ Bindings: Bindings }>()

// ─── POST /wiki/generate ──────────────────────────────────

wiki.post(
  '/generate',
  zValidator(
    'json',
    z.object({
      documentId: z.string().min(1),
      title: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
  async (c) => {
    const { documentId, title, category, tags } = c.req.valid('json')

    // Get document
    const doc = await c.env.DB.prepare(
      'SELECT * FROM documents WHERE id = ?',
    ).bind(documentId).first() as Record<string, unknown> | null

    if (!doc) throw new NotFoundError('Document', documentId)

    // For now, generate from title/content if we have text content stored
    // In production, fetch from R2 and parse
    const parseResult = await parseDocument(
      `# ${doc.title}\n\nKonten dari dokumen: ${doc.title}`,
      doc.mime_type as string,
      doc.title as string,
    )

    const article = generateWikiArticle(parseResult, {
      documentId,
      category: category || (doc.category as string),
      tags: tags || JSON.parse((doc.tags as string) || '[]'),
      title: title || (doc.title as string),
    })

    // Save wiki article
    const now = new Date().toISOString()
    await c.env.DB.prepare(
      `INSERT INTO wiki_articles (id, title, content, category, status, current_version, tags, sources, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'published', 1, ?, ?, ?, ?)`,
    ).bind(
      article.id, article.title, article.content,
      article.category, JSON.stringify(article.tags),
      JSON.stringify(article.sources), now, now,
    ).run()

    // Save first version
    const v1 = createVersion(article.id, 1, article.content, 'Initial version')
    await c.env.DB.prepare(
      `INSERT INTO wiki_versions (id, wiki_id, version_num, content, change_summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(v1.id, v1.wikiId, v1.versionNum, v1.content, v1.changeSummary, v1.createdAt).run()

    // Create source link
    const sourceId = generateId()
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO sources (id, document_id, wiki_id, created_at)
       VALUES (?, ?, ?, ?)`,
    ).bind(sourceId, documentId, article.id, now).run()

    return c.json({ success: true, data: article }, 201)
  },
)

// ─── GET /wiki ─────────────────────────────────────────────

wiki.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || '20'), 100)
  const category = c.req.query('category')
  const status = c.req.query('status')

  let query = 'SELECT id, title, category, status, current_version, tags, created_at, updated_at FROM wiki_articles WHERE 1=1'
  const params: unknown[] = []

  if (category) { query += ' AND category = ?'; params.push(category) }
  if (status) { query += ' AND status = ?'; params.push(status) }

  query += ' ORDER BY updated_at DESC LIMIT ?'
  params.push(limit + 1)

  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  const rows = results as Record<string, unknown>[]
  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows

  return c.json({
    success: true,
    data: data.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      status: r.status,
      version: r.current_version,
      tags: JSON.parse((r.tags as string) || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    pagination: { nextCursor: hasMore ? data[data.length - 1]?.id as string : null, hasMore },
  })
})

// ─── GET /wiki/:id ─────────────────────────────────────────

wiki.get('/:id', async (c) => {
  const id = c.req.param('id')
  const article = await c.env.DB.prepare('SELECT * FROM wiki_articles WHERE id = ?').bind(id).first() as Record<string, unknown> | null
  if (!article) throw new NotFoundError('Wiki article', id)

  return c.json({
    success: true,
    data: {
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category,
      status: article.status,
      currentVersion: article.current_version,
      tags: JSON.parse((article.tags as string) || '[]'),
      sources: JSON.parse((article.sources as string) || '[]'),
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    },
  })
})

// ─── GET /wiki/:id/versions ────────────────────────────────

wiki.get('/:id/versions', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT id, version_num, change_summary, created_by, created_at FROM wiki_versions WHERE wiki_id = ? ORDER BY version_num DESC',
  ).bind(id).all()
  const rows = results as Record<string, unknown>[]

  return c.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      versionNum: r.version_num,
      changeSummary: r.change_summary,
      createdBy: r.created_by,
      createdAt: r.created_at,
    })),
  })
})

// ─── GET /wiki/:id/versions/:versionNum ────────────────────

wiki.get('/:id/versions/:versionNum', async (c) => {
  const { id, versionNum } = c.req.param()
  const version = await c.env.DB.prepare(
    'SELECT * FROM wiki_versions WHERE wiki_id = ? AND version_num = ?',
  ).bind(id, Number(versionNum)).first() as Record<string, unknown> | null
  if (!version) throw new NotFoundError('Version', `${id}/v${versionNum}`)

  return c.json({
    success: true,
    data: {
      id: version.id,
      wikiId: version.wiki_id,
      versionNum: version.version_num,
      content: version.content,
      changeSummary: version.change_summary,
      createdBy: version.created_by,
      createdAt: version.created_at,
    },
  })
})

// ─── POST /wiki/:id/candidates ─────────────────────────────

wiki.post(
  '/:id/candidates',
  zValidator(
    'json',
    z.object({
      content: z.string().min(1),
      source: z.enum(['chat', 'document', 'agent', 'manual']).default('manual'),
      confidenceScore: z.number().min(0).max(1).optional(),
      title: z.string().optional(),
    }),
  ),
  async (c) => {
    const wikiId = c.req.param('id')
    const { content, source, confidenceScore } = c.req.valid('json')

    // Verify wiki exists
    const article = await c.env.DB.prepare('SELECT id, title FROM wiki_articles WHERE id = ?').bind(wikiId).first()
    if (!article) throw new NotFoundError('Wiki article', wikiId)

    const candidate = createCandidate({
      wikiId,
      title: (article as Record<string, string>).title,
      content,
      source,
      confidenceScore,
    })

    // Save to DB
    await c.env.DB.prepare(
      `INSERT INTO knowledge_candidates (id, wiki_id, title, content, source, confidence_score, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      candidate.id, candidate.wikiId, candidate.title, candidate.content,
      candidate.source, candidate.confidenceScore, candidate.status, candidate.createdAt,
    ).run()

    return c.json({ success: true, data: candidate }, 201)
  },
)

// ─── GET /wiki/candidates ──────────────────────────────────

wiki.get('/candidates', async (c) => {
  const status = c.req.query('status') || 'pending_review'
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM knowledge_candidates WHERE status = ? ORDER BY created_at DESC LIMIT 50',
  ).bind(status).all()
  const rows = results as Record<string, unknown>[]

  return c.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      wikiId: r.wiki_id,
      title: r.title,
      content: r.content,
      source: r.source,
      confidenceScore: r.confidence_score,
      status: r.status,
      createdBy: r.created_by,
      createdAt: r.created_at,
      reviewNotes: r.review_notes,
      reviewedAt: r.reviewed_at,
    })),
  })
})

// ─── POST /wiki/candidates/:id/approve ─────────────────────

wiki.post('/candidates/:id/approve', zValidator('json', z.object({
  reviewerId: z.string().optional(),
  notes: z.string().optional(),
})), async (c) => {
  const candidateId = c.req.param('id')
  const { reviewerId, notes } = c.req.valid('json')

  const row = await c.env.DB.prepare(
    'SELECT * FROM knowledge_candidates WHERE id = ?',
  ).bind(candidateId).first() as Record<string, unknown> | null
  if (!row) throw new NotFoundError('Candidate', candidateId)

  const candidate = approveCandidate(
    {
      id: row.id as string,
      wikiId: row.wiki_id as string | null,
      title: row.title as string,
      content: row.content as string,
      source: row.source as CandidateSource,
      confidenceScore: row.confidence_score as number,
      status: 'pending_review',
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as string,
      reviewNotes: null,
      reviewedAt: null,
    },
    reviewerId || 'system',
    notes,
  )

  await c.env.DB.prepare(
    `UPDATE knowledge_candidates SET status = ?, review_notes = ?, reviewer_id = ?, reviewed_at = ? WHERE id = ?`,
  ).bind(candidate.status, candidate.reviewNotes, reviewerId, candidate.reviewedAt, candidateId).run()

  // If candidate has wikiId, update the wiki article
  if (candidate.wikiId) {
    const article = await c.env.DB.prepare('SELECT * FROM wiki_articles WHERE id = ?').bind(candidate.wikiId).first() as Record<string, unknown>
    const newVersion = article.current_version as number + 1
    const summary = generateChangeSummary(article.content as string, candidate.content)

    const v = createVersion(candidate.wikiId, newVersion, candidate.content, summary, reviewerId)
    await c.env.DB.prepare(
      `INSERT INTO wiki_versions (id, wiki_id, version_num, content, change_summary, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(v.id, v.wikiId, v.versionNum, v.content, v.changeSummary, v.createdBy, v.createdAt).run()

    await c.env.DB.prepare(
      `UPDATE wiki_articles SET content = ?, current_version = ?, updated_at = ? WHERE id = ?`,
    ).bind(candidate.content, newVersion, candidate.reviewedAt, candidate.wikiId).run()
  }

  return c.json({ success: true, data: candidate })
})

// ─── POST /wiki/candidates/:id/reject ──────────────────────

wiki.post('/candidates/:id/reject', zValidator('json', z.object({
  reviewerId: z.string().optional(),
  notes: z.string().min(1, 'Rejection notes required'),
})), async (c) => {
  const candidateId = c.req.param('id')
  const { reviewerId, notes } = c.req.valid('json')

  const row = await c.env.DB.prepare('SELECT * FROM knowledge_candidates WHERE id = ?').bind(candidateId).first() as Record<string, unknown> | null
  if (!row) throw new NotFoundError('Candidate', candidateId)

  await c.env.DB.prepare(
    `UPDATE knowledge_candidates SET status = 'rejected', review_notes = ?, reviewer_id = ?, reviewed_at = ? WHERE id = ?`,
  ).bind(notes, reviewerId, new Date().toISOString(), candidateId).run()

  return c.json({ success: true })
})
