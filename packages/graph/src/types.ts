export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'project'
  | 'regulation'
  | 'budget'
  | 'date'
  | 'concept'
  | 'event'
  | 'other'

export interface Entity {
  id: string
  name: string
  type: EntityType
  aliases: string[]
  description?: string
  metadata: Record<string, unknown>
  wikiSources: string[]
  confidence: number
  createdAt: string
}

export interface Relation {
  id: string
  fromEntity: string
  toEntity: string
  relationType: string
  weight: number
  sourceWiki?: string
  createdAt: string
}

export interface GraphNode {
  id: string
  label: string
  type: EntityType
  group: string
  value: number
}

export interface GraphEdge {
  from: string
  to: string
  label: string
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface EntityQueryResult {
  entity: Entity
  related: { entity: Entity; relation: Relation }[]
  depth: number
}
