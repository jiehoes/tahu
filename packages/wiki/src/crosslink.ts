// D1Database interface (available in Workers runtime)
interface D1DatabaseLike {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
      run(): Promise<void>
    }
  }
}

interface RelatedArticle {
  id: string
  title: string
  relevance: number
  reason: string
}

/**
 * Find articles related to a wiki article based on shared tags, category, and content.
 */
export async function findRelatedArticles(
  db: D1DatabaseLike,
  wikiId: string,
  limit = 5,
): Promise<RelatedArticle[]> {
  // Get the source article
  const article = await db.prepare(
    'SELECT id, title, category, tags FROM wiki_articles WHERE id = ?',
  ).bind(wikiId).first() as Record<string, string> | null
  if (!article) return []

  const tags: string[] = JSON.parse(article.tags || '[]')
  const category = article.category

  const related: Map<string, RelatedArticle> = new Map()

  // Find by same category
  if (category) {
    const { results } = await db.prepare(
      'SELECT id, title, category, tags FROM wiki_articles WHERE category = ? AND id != ? LIMIT ?',
    ).bind(category, wikiId, limit).all()
    for (const row of results as Record<string, unknown>[]) {
      if (!related.has(row.id as string)) {
        related.set(row.id as string, {
          id: row.id as string,
          title: row.title as string,
          relevance: 0.6,
          reason: `Kategori yang sama: ${category}`,
        })
      }
    }
  }

  // Find by shared tags
  for (const tag of tags) {
    const { results } = await db.prepare(
      "SELECT id, title, category, tags FROM wiki_articles WHERE tags LIKE ? AND id != ? LIMIT ?",
    ).bind(`%${tag}%`, wikiId, limit).all()
    for (const row of results as Record<string, unknown>[]) {
      const id = row.id as string
      if (!related.has(id)) {
        related.set(id, {
          id,
          title: row.title as string,
          relevance: 0.4,
          reason: `Tag terkait: #${tag}`,
        })
      } else {
        // Boost relevance if already related
        const existing = related.get(id)!
        related.set(id, { ...existing, relevance: Math.min(1, existing.relevance + 0.2) })
      }
    }
  }

  return Array.from(related.values())
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
}

/**
 * Create cross-reference links between two articles.
 */
export function createCrossLink(fromTitle: string, toId: string, toTitle: string): string {
  return `- [${toTitle}](/wiki/${toId})`
}
