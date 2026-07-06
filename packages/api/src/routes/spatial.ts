import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = { DB: D1Database }

export const spatial = new Hono<{ Bindings: Bindings }>()

// ─── POST /spatial/search ─────────────────────────────────

spatial.post(
  '/search',
  zValidator('json', z.object({
    query: z.string().min(1),
    entityType: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    radiusKm: z.number().default(50),
    limit: z.number().default(20),
  })),
  async (c) => {
    const { query, entityType, lat, lng, radiusKm, limit } = c.req.valid('json')

    // Search entities with location type or matching query
    const params: unknown[] = [`%${query}%`]
    let sql = "SELECT * FROM entities WHERE (name LIKE ? OR metadata LIKE ?)"
    params.push(`%${query}%`)

    if (entityType) {
      sql += ' AND type = ?'
      params.push(entityType)
    }

    sql += ' LIMIT ?'
    params.push(limit)

    const { results } = await c.env.DB.prepare(sql).bind(...params).all()
    const entities = results as Record<string, unknown>[]

    // Find wiki articles that reference these entities
    const enriched = await Promise.all(
      entities.map(async (e) => {
        const { results: wikiRefs } = await c.env.DB.prepare(
          'SELECT w.id, w.title FROM wiki_articles w JOIN sources s ON s.wiki_id = w.id WHERE s.document_id IN (SELECT DISTINCT document_id FROM sources WHERE wiki_id IN (SELECT DISTINCT s2.wiki_id FROM entities e2 JOIN sources s2 ON s2.document_id LIKE ?)) LIMIT 5',
        ).bind(`%${e.id}%`).all()

        return {
          id: e.id,
          name: e.name,
          type: e.type,
          metadata: JSON.parse((e.metadata as string) || '{}'),
          relatedWiki: wikiRefs as Record<string, string>[],
        }
      }),
    )

    // If lat/lng provided, add distance context
    let spatialContext = ''
    if (lat !== undefined && lng !== undefined) {
      spatialContext = `Radius: ${radiusKm}km around (${lat}, ${lng})`
    }

    return c.json({
      success: true,
      data: { entities: enriched, spatialContext, total: entities.length },
    })
  },
)

// ─── GET /spatial/entities ─────────────────────────────────

spatial.get('/entities', async (c) => {
  const type = c.req.query('type') || 'location'
  const limit = Math.min(Number(c.req.query('limit') || '50'), 200)

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM entities WHERE type = ? ORDER BY name LIMIT ?",
  ).bind(type, limit).all()

  return c.json({
    success: true,
    data: (results as Record<string, unknown>[]).map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      description: r.description,
      metadata: JSON.parse((r.metadata as string) || '{}'),
    })),
  })
})

// ─── GET /spatial/relations ────────────────────────────────

spatial.get('/relations', async (c) => {
  const entityId = c.req.query('entityId')
  if (!entityId) {
    return c.json({ success: false, error: { code: 'MISSING_PARAM', message: 'entityId required' } }, 400)
  }

  const { results: relations } = await c.env.DB.prepare(
    'SELECT * FROM relations WHERE from_entity = ? OR to_entity = ? LIMIT 50',
  ).bind(entityId, entityId).all()

  const relatedIds = new Set<string>()
  for (const r of relations as Record<string, string>[]) {
    relatedIds.add(r.from_entity === entityId ? r.to_entity : r.from_entity)
  }

  let relatedEntities: Record<string, unknown>[] = []
  if (relatedIds.size > 0) {
    const ids = Array.from(relatedIds).map(i => `'${i}'`).join(',')
    const { results } = await c.env.DB.prepare(
      `SELECT id, name, type, metadata FROM entities WHERE id IN (${ids})`,
    ).all()
    relatedEntities = results as Record<string, unknown>[]
  }

  return c.json({
    success: true,
    data: {
      relations: (relations as Record<string, unknown>[]).map(r => ({
        id: r.id,
        from: r.from_entity,
        to: r.to_entity,
        type: r.relation_type,
        weight: r.weight,
      })),
      entities: relatedEntities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        metadata: JSON.parse((e.metadata as string) || '{}'),
      })),
    },
  })
})
