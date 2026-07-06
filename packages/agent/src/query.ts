import { chatCompletion, type LLMConfig, type ChatMessage } from './llm'

interface AgentQueryOptions {
  query: string
  context?: string
  maxTokens?: number
}

interface AgentQueryResult {
  answer: string
  sources: { wikiId: string; title: string; relevance: number; snippet: string }[]
  confidence: number
  model: string
}

/**
 * Query the knowledge base using an LLM with retrieved context.
 */
export async function agentQuery(
  config: LLMConfig,
  db: D1Database,
  options: AgentQueryOptions,
): Promise<AgentQueryResult> {
  // Step 1: Search for relevant wiki articles
  const ftsQuery = options.query.split(/\s+/).filter(Boolean).map(t => `"${t}"`).join(' OR ')
  const { results } = await db.prepare(
    `SELECT w.id, w.title, snippet(documents_fts, 2, '', '', '...', 30) as snippet
     FROM documents_fts fts
     JOIN wiki_articles w ON w.id = (SELECT wiki_id FROM sources WHERE document_id = (SELECT id FROM documents WHERE rowid = fts.rowid) LIMIT 1)
     WHERE documents_fts MATCH ?
     ORDER BY rank LIMIT 5`,
  ).bind(ftsQuery).all()

  const sources = (results as Record<string, unknown>[]).map((r, i) => ({
    wikiId: r.id as string,
    title: r.title as string,
    relevance: 1 - i * 0.15,
    snippet: (r.snippet as string) || '',
  }))

  // Step 2: Build context from wiki articles
  let contextText = options.context || ''
  if (sources.length > 0) {
    const wikiIds = sources.map(s => `'${s.wikiId}'`).join(',')
    const { results: articles } = await db.prepare(
      `SELECT title, content FROM wiki_articles WHERE id IN (${wikiIds})`,
    ).all()

    contextText += '\n\n--- Knowledge Base Articles ---\n'
    for (const article of articles as Record<string, string>[]) {
      contextText += `\n## ${article.title}\n${article.content?.slice(0, 2000) || ''}\n`
    }
  }

  // Step 3: Call LLM
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Kamu adalah Tahu AI, asisten knowledge management. 
Gunakan knowledge base yang disediakan untuk menjawab pertanyaan.
Jika informasi tidak cukup, katakan dengan jujur.
Selalu sebutkan sumber dari knowledge base jika digunakan.
Jawab dalam Bahasa Indonesia.`,
    },
    {
      role: 'user',
      content: `Context:\n${contextText}\n\nPertanyaan: ${options.query}`,
    },
  ]

  const response = await chatCompletion(config, {
    messages,
    maxTokens: options.maxTokens ?? 1000,
    temperature: 0.3,
  })

  // Step 4: Calculate confidence
  const confidence = sources.length > 0
    ? Math.min(0.95, 0.5 + sources.length * 0.15)
    : 0.3

  return {
    answer: response.content,
    sources,
    confidence,
    model: response.model,
  }
}

/**
 * Generate a summary of one or more documents/wiki articles.
 */
export async function generateSummary(
  config: LLMConfig,
  texts: { title: string; content: string }[],
  options?: { maxTokens?: number; language?: string },
): Promise<string> {
  const combined = texts.map(t => `## ${t.title}\n${t.content.slice(0, 3000)}`).join('\n\n')
  const lang = options?.language || 'id'

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Buat ringkasan komprehensif dalam Bahasa ${lang === 'id' ? 'Indonesia' : 'English'}. 
Sertakan poin-poin utama dari setiap sumber.`,
    },
    { role: 'user', content: `Buat ringkasan dari:\n\n${combined}` },
  ]

  const response = await chatCompletion(config, {
    messages,
    maxTokens: options?.maxTokens ?? 500,
  })

  return response.content
}

/**
 * AI-assisted tagging and categorization.
 */
export async function suggestTags(
  config: LLMConfig,
  content: string,
): Promise<{ tags: string[]; category: string; confidence: number }> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Analisis konten dokumen dan berikan:
1. Kategori yang sesuai (satu kata)
2. 3-5 tag yang relevan
3. Confidence score (0-1)

Response format JSON: {"category":"...","tags":["...","..."],"confidence":0.X}`,
    },
    { role: 'user', content: content.slice(0, 3000) },
  ]

  const response = await chatCompletion(config, { messages, maxTokens: 200, temperature: 0.1 })

  try {
    const parsed = JSON.parse(response.content)
    return {
      tags: parsed.tags || [],
      category: parsed.category || 'uncategorized',
      confidence: parsed.confidence || 0.5,
    }
  } catch {
    return { tags: [], category: 'uncategorized', confidence: 0 }
  }
}

/**
 * Generate citations from wiki sources.
 */
export function generateCitations(
  sources: { wikiId: string; title: string }[],
): string {
  if (sources.length === 0) return ''

  let citations = '\n\n---\n**Sumber:**\n'
  for (let i = 0; i < sources.length; i++) {
    citations += `${i + 1}. [${sources[i].title}](/wiki/${sources[i].wikiId})\n`
  }
  return citations
}
