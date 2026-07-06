import { generateId } from '@tahu/core'
import type { Entity, Relation } from './types'

const RELATION_TYPES: Record<string, string[]> = {
  organization: ['manages', 'funds', 'oversees', 'reports_to', 'located_in'],
  project: ['funded_by', 'managed_by', 'located_in', 'impacts', 'part_of'],
  budget: ['allocated_to', 'approved_by', 'belongs_to', 'used_for'],
  regulation: ['regulates', 'issued_by', 'affects', 'amends', 'references'],
  location: ['contains', 'borders', 'part_of'],
  person: ['leads', 'works_at', 'manages', 'reports_to', 'appointed_by'],
}

/**
 * Extract relations between entities based on their types and co-occurrence in wiki articles.
 */
export function extractRelations(entities: Entity[], wikiId: string): Relation[] {
  const relations: Relation[] = []
  const seen = new Set<string>()

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i]!
      const b = entities[j]!

      const possibleTypes = getPossibleRelations(a.type, b.type)
      if (possibleTypes.length === 0) continue

      const key = `${a.id}:${b.id}`
      if (seen.has(key)) continue
      seen.add(key)

      relations.push({
        id: generateId(),
        fromEntity: a.id,
        toEntity: b.id,
        relationType: possibleTypes[0]!,
        weight: 0.5,
        sourceWiki: wikiId,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return relations
}

function getPossibleRelations(typeA: string, typeB: string): string[] {
  const types = [typeA, typeB].sort()
  const key = types.join(':')

  // Common relation patterns
  if (key.includes('project') && key.includes('budget')) return ['funded_by']
  if (key.includes('project') && key.includes('location')) return ['located_in']
  if (key.includes('project') && key.includes('organization')) return ['managed_by']
  if (key.includes('organization') && key.includes('location')) return ['located_in']
  if (key.includes('regulation') && key.includes('organization')) return ['regulates']
  if (key.includes('budget') && key.includes('organization')) return ['allocated_to']
  if (key.includes('person') && key.includes('organization')) return ['works_at']
  if (key.includes('concept') && key.includes('project')) return ['related_to']
  if (key.includes('event') && key.includes('location')) return ['happened_in']

  // Default: related_to if they share a wiki source
  return ['related_to']
}

/**
 * Build graph visualization data (nodes + edges) for rendering.
 */
export function buildVisualization(
  entities: Entity[],
  relations: Relation[],
): { nodes: { id: string; label: string; type: string; group: string; value: number }[]; edges: { from: string; to: string; label: string; weight: number }[] } {
  const entityMap = new Map(entities.map(e => [e.id, e]))

  const nodes = entities.map(e => ({
    id: e.id,
    label: e.name,
    type: e.type,
    group: e.type,
    value: e.wikiSources.length,
  }))

  const edges = relations
    .filter(r => entityMap.has(r.fromEntity) && entityMap.has(r.toEntity))
    .map(r => ({
      from: r.fromEntity,
      to: r.toEntity,
      label: r.relationType,
      weight: r.weight,
    }))

  return { nodes, edges }
}

/**
 * Query entities related to a specific entity up to a given depth.
 */
export function queryGraph(
  entityId: string,
  entities: Entity[],
  relations: Relation[],
  depth = 1,
): { entity: Entity | null; related: { entity: Entity; relation: Relation }[]; depth: number } {
  const entityMap = new Map(entities.map(e => [e.id, e]))
  const entity = entityMap.get(entityId) || null

  const related: { entity: Entity; relation: Relation }[] = []
  const visited = new Set<string>([entityId])

  let currentIds = [entityId]

  for (let d = 0; d < depth; d++) {
    const nextIds: string[] = []
    for (const id of currentIds) {
      const directRelations = relations.filter(r => r.fromEntity === id || r.toEntity === id)
      for (const rel of directRelations) {
        const otherId = rel.fromEntity === id ? rel.toEntity : rel.fromEntity
        if (visited.has(otherId)) continue
        visited.add(otherId)
        const otherEntity = entityMap.get(otherId)
        if (otherEntity) {
          related.push({ entity: otherEntity, relation: rel })
          nextIds.push(otherId)
        }
      }
    }
    currentIds = nextIds
  }

  return { entity, related, depth }
}
