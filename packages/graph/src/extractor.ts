import { generateId } from '@tahu/core'
import type { Entity, EntityType } from './types'

/**
 * Rule-based entity extraction for Indonesian text.
 * Uses regex patterns to identify common entity types.
 */
export function extractEntities(text: string, sourceWikiId: string): Entity[] {
  const entities: Entity[] = []
  const seen = new Set<string>()

  const patterns: { type: EntityType; regex: RegExp; normalize?: (m: string) => string }[] = [
    // Organizations
    {
      type: 'organization',
      regex: /\b(Kementerian\s+\w+|Dinas\s+\w+|Badan\s+\w+|Bappeda|DPRD|PEMDA|Pemprov|Pemkab|Pemkot|BPK|BPKP|KPK|Bappenas|BPS)\b/gi,
    },
    // Locations
    {
      type: 'location',
      regex: /\b(Kabupaten\s+\w+|Kota\s+\w+|Provinsi\s+\w+|Kecamatan\s+\w+|Desa\s+\w+|Kelurahan\s+\w+)\b/gi,
    },
    // Budget amounts
    {
      type: 'budget',
      regex: /\bRp\s*[\d.,]+\s*(miliar|juta|triliun|M|JT|T)?\b/gi,
      normalize: (m) => m.replace(/\s+/g, ' ').trim(),
    },
    // Dates
    {
      type: 'date',
      regex: /\b(20\d{2})\b/g,
      normalize: (m) => `Tahun ${m}`,
    },
    // Projects
    {
      type: 'project',
      regex: /\b(Proyek\s+\w+|Program\s+\w+|Pembangunan\s+\w+|Rehabilitasi\s+\w+|Peningkatan\s+\w+)\b/gi,
    },
    // Persons (simple: capitalized names with titles)
    {
      type: 'person',
      regex: /\b(Ir\.|Dr\.|Prof\.|H\.|Drs\.|Dra\.|Bapak|Ibu)\s+[A-Z]\w+(?:\s+[A-Z]\w+)?\b/g,
    },
    // Regulations
    {
      type: 'regulation',
      regex: /\b(UU|PP|Perpres|Perda|Permen|Kepmen|SK)\s*(No\.?\s*)?\d+[\/\w\s-]*\b/gi,
    },
    // Concepts/keywords
    {
      type: 'concept',
      regex: /\b(infrastruktur|ekonomi|pendidikan|kesehatan|lingkungan|transportasi|energi|pertanian|pariwisata|teknologi)\b/gi,
    },
  ]

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern.regex)
    for (const match of matches) {
      const name = pattern.normalize ? pattern.normalize(match[0]) : match[0]
      const normalized = name.toLowerCase().trim()
      if (seen.has(normalized) || name.length < 3) continue
      seen.add(normalized)

      entities.push({
        id: generateId(),
        name,
        type: pattern.type,
        aliases: [name],
        wikiSources: [sourceWikiId],
        confidence: 0.7,
        metadata: {},
        createdAt: new Date().toISOString(),
      })
    }
  }

  return entities
}

/**
 * AI-assisted entity extraction prompt builder.
 * Returns a prompt that can be sent to an LLM for high-quality extraction.
 */
export function buildExtractionPrompt(text: string, language = 'id'): string {
  const lang = language === 'id' ? 'Indonesia' : 'English'
  return `Ekstrak semua entitas penting dari teks berikut dalam Bahasa ${lang}. 
Kembalikan dalam format JSON array:
[{"name":"...","type":"person|organization|location|project|regulation|budget|concept|event","aliases":["..."],"description":"..."}]

Teks:
${text.slice(0, 4000)}`
}

/**
 * Simple disambiguation: merge entities with similar names.
 */
export function disambiguate(entities: Entity[]): Entity[] {
  const merged = new Map<string, Entity>()

  for (const entity of entities) {
    const key = entity.name.toLowerCase().trim()
    const existing = merged.get(key)

    if (existing) {
      // Merge
      existing.aliases = [...new Set([...existing.aliases, ...entity.aliases])]
      existing.wikiSources = [...new Set([...existing.wikiSources, ...entity.wikiSources])]
      existing.confidence = Math.max(existing.confidence, entity.confidence)
      existing.metadata = { ...existing.metadata, ...entity.metadata }
    } else {
      merged.set(key, entity)
    }
  }

  return Array.from(merged.values())
}
