import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { NotFoundError, generateId } from '@tahu/core'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
}

export const documents = new Hono<{ Bindings: Bindings }>()

// ─── POST /documents ──────────────────────────────────────

documents.post(
  '/',
  zValidator(
    'form',
    z.object({
      title: z.string().min(1).max(500),
      category: z.string().optional(),
      tags: z.string().optional(),
    }),
  ),
  async (c) => {
    const { title, category, tags } = c.req.valid('form')
    const body = await c.req.parseBody()
    const file = body['file'] as File | undefined

    if (!file) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } },
        422,
      )
    }

    const id = generateId()
    const storageKey = `documents/${id}/original.${file.name.split('.').pop() || 'bin'}`

    // Upload to R2
    await c.env.BUCKET.put(storageKey, file.stream(), {
      httpMetadata: { contentType: file.type },
    })

    // Save metadata to D1
    const tagList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    const now = new Date().toISOString()

    await c.env.DB.prepare(
      `INSERT INTO documents (id, title, category, status, file_size, mime_type, storage_key, tags, created_at, updated_at)
       VALUES (?, ?, ?, 'processing', ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, title, category || null, file.size, file.type, storageKey, JSON.stringify(tagList), now, now)
      .run()

    return c.json(
      {
        success: true,
        data: {
          id,
          title,
          category: category || null,
          status: 'processing',
          fileSize: file.size,
          mimeType: file.type,
          storageKey,
          tags: tagList,
          createdAt: now,
          updatedAt: now,
        },
      },
      201,
    )
  },
)

// ─── GET /documents ────────────────────────────────────────

documents.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || '20'), 100)
  const cursor = c.req.query('cursor')
  const category = c.req.query('category')
  const status = c.req.query('status')

  let query = 'SELECT * FROM documents WHERE 1=1'
  const params: unknown[] = []

  if (category) {
    query += ' AND category = ?'
    params.push(category)
  }
  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }

  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit + 1)

  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  const rows = results as Record<string, unknown>[]

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (data[data.length - 1]?.id as string) : null

  return c.json({
    success: true,
    data: data.map(parseDocumentRow),
    pagination: { nextCursor, hasMore },
  })
})

// ─── GET /documents/:id ────────────────────────────────────

documents.get('/:id', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first()

  if (!result) {
    throw new NotFoundError('Document', id)
  }

  return c.json({ success: true, data: parseDocumentRow(result as Record<string, unknown>) })
})

// ─── DELETE /documents/:id ─────────────────────────────────

documents.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const doc = await c.env.DB.prepare('SELECT storage_key FROM documents WHERE id = ?').bind(id).first()

  if (!doc) {
    throw new NotFoundError('Document', id)
  }

  const storageKey = (doc as Record<string, string>).storage_key
  await c.env.BUCKET.delete(storageKey)
  await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(id).run()

  return c.json({ success: true }, 200)
})

// ─── Helpers ───────────────────────────────────────────────

function parseDocumentRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    storageKey: row.storage_key,
    tags: JSON.parse((row.tags as string) || '[]'),
    metadata: JSON.parse((row.metadata as string) || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
