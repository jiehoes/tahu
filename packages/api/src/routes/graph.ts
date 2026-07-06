import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { generateId } from '@tahu/core'
import { extractEntities, extractRelations, buildVisualization, queryGraph, disambiguate, buildExtractionPrompt } from '@tahu/graph'

type Bindings = { DB: D1Database; LLM_API_KEY?: string }

export const graph = new Hono<{ Bindings: Bindings }>()

// ─── POST /graph/extract ──────────────────────────────────

graph.post(
  '/extract',
  zValidator('json', z.object({
    wikiId: z.string().min(1),
    useAI: z.boolean().default(false),
  })),
  async (c) => {
    const { wikiId, useAI } = c.req.valid('json')

    // Get wiki article
    const article = await c.env.DB.prepare(
      'SELECT * FROM wiki_articles WHERE id = ?',
    ).bind(wikiId).first() as Record<string, unknown> | null
    if (!article) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Wiki not found' } }, 404)

    const content = article.content as string

    // Extract entities (simple)
    let entities = extractEntities(content, wikiId)
    entities = disambiguate(entities)

    // Extract relations
    const relations = extractRelations(entities, wikiId)

    // Save entities to DB
    const now = new Date().toISOString()
    for (const e of entities.slice(0, 50)) {
      try {
        await c.env.DB.prepare(
          `INSERT OR IGNORE INTO entities (id, name, type, description, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(e.id, e.name, e.type, e.description || null, JSON.stringify({ aliases: e.aliases, sources: e.wikiSources, confidence: e.confidence }), now).run()
      } catch (err) {
        console.error('Failed to insert entity:', e.name, err)
      }
    }

    return c.json({
      success: true,
      data: {
        entityCount: entities.length,
        relationCount: relations.length,
        entities: entities.slice(0, 5),
      },
    }, 201)
  },
)

// ─── GET /graph/entities ──────────────────────────────────

graph.get('/entities', async (c) => {
  const type = c.req.query('type')
  const search = c.req.query('search')
  const limit = Math.min(Number(c.req.query('limit') || '20'), 100)

  let sql = 'SELECT * FROM entities WHERE 1=1'
  const params: unknown[] = []

  if (type) { sql += ' AND type = ?'; params.push(type) }
  if (search) {
    sql += ' AND (name LIKE ? OR metadata LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const rows = results as Record<string, unknown>[]

  return c.json({
    success: true,
    data: rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      description: r.description,
      metadata: JSON.parse((r.metadata as string) || '{}'),
      createdAt: r.created_at,
    })),
  })
})

// ─── GET /graph/entities/:id ───────────────────────────────

graph.get('/entities/:id', async (c) => {
  const id = c.req.param('id')
  const depth = Math.min(Number(c.req.query('depth') || '1'), 3)

  // Get entity
  const entity = await c.env.DB.prepare('SELECT * FROM entities WHERE id = ?').bind(id).first() as Record<string, unknown> | null
  if (!entity) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } }, 404)

  // Get relations
  const { results: relRows } = await c.env.DB.prepare(
    'SELECT * FROM relations WHERE from_entity = ? OR to_entity = ?',
  ).bind(id, id).all()

  const entityMap = new Map<string, Record<string, unknown>>()
  const relatedIds = new Set<string>()

  for (const rel of relRows as Record<string, unknown>[]) {
    const otherId = rel.from_entity === id ? rel.to_entity : rel.from_entity
    relatedIds.add(otherId as string)
  }

  // Fetch related entities
  let relatedEntities: Record<string, unknown>[] = []
  if (relatedIds.size > 0) {
    const ids = Array.from(relatedIds).map(i => `'${i}'`).join(',')
    const { results } = await c.env.DB.prepare(`SELECT * FROM entities WHERE id IN (${ids})`).all()
    relatedEntities = results as Record<string, unknown>[]
  }

  return c.json({
    success: true,
    data: {
      entity: {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        description: entity.description,
        metadata: JSON.parse((entity.metadata as string) || '{}'),
        createdAt: entity.created_at,
      },
      relations: (relRows as Record<string, unknown>[]).map(r => ({
        id: r.id,
        fromEntity: r.from_entity,
        toEntity: r.to_entity,
        relationType: r.relation_type,
        weight: r.weight,
        sourceWiki: r.source_wiki,
      })),
      relatedEntities: relatedEntities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        description: e.description,
      })),
    },
  })
})

// ─── GET /graph/visualization ───────────────────────────────

graph.get('/visualization', async (c) => {
  const wikiId = c.req.query('wikiId')
  const limit = Math.min(Number(c.req.query('limit') || '50'), 200)

  let entitySql = 'SELECT * FROM entities'
  let relationSql = 'SELECT * FROM relations'
  const params: unknown[] = []

  if (wikiId) {
    entitySql += " WHERE metadata LIKE ?"
    params.push(`%${wikiId}%`)
    relationSql += ' WHERE source_wiki = ?'
  }

  entitySql += ' LIMIT ?'
  params.push(limit)

  const { results: entities } = await c.env.DB.prepare(entitySql).bind(...params).all()
  const entityRows = entities as Record<string, unknown>[]

  // Get relations between these entities
  const entityIds = entityRows.map(e => `'${e.id}'`).join(',')
  const { results: rels } = await c.env.DB.prepare(
    `SELECT * FROM relations WHERE from_entity IN (${entityIds}) AND to_entity IN (${entityIds}) LIMIT ?`,
  ).bind(limit).all()
  const relRows = rels as Record<string, unknown>[]

  const nodes = entityRows.map(e => ({
    id: e.id,
    label: e.name,
    type: e.type,
    group: e.type,
    value: 1,
  }))

  const edges = relRows.map(r => ({
    from: r.from_entity,
    to: r.to_entity,
    label: r.relation_type,
    weight: r.weight,
  }))

  return c.json({ success: true, data: { nodes, edges } })
})

// ─── POST /graph/recommend ─────────────────────────────────

graph.post(
  '/recommend',
  zValidator('json', z.object({
    entityIds: z.array(z.string()).min(1).max(5),
    limit: z.number().default(5),
  })),
  async (c) => {
    const { entityIds, limit } = c.req.valid('json')

    // Find entities that share relations with the given ones but aren't directly connected
    const ids = entityIds.map(i => `'${i}'`).join(',')
    const { results } = await c.env.DB.prepare(
      `SELECT DISTINCT e.id, e.name, e.type, COUNT(r.id) as connection_count
       FROM entities e
       JOIN relations r ON (r.from_entity = e.id OR r.to_entity = e.id)
       WHERE (r.from_entity IN (${ids}) OR r.to_entity IN (${ids}))
       AND e.id NOT IN (${ids})
       GROUP BY e.id
       ORDER BY connection_count DESC
       LIMIT ?`,
    ).bind(limit).all()

    return c.json({
      success: true,
      data: (results as Record<string, unknown>[]).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        relevance: Number(r.connection_count),
        reason: `${r.connection_count} shared connections`,
      })),
    })
  },
)
