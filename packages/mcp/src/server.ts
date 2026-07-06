/**
 * Tahu MCP Server — Model Context Protocol integration.
 * Exposes Tahu knowledge tools to AI agents (Claude, Codex, OpenCode, etc.)
 *
 * Tools provided:
 * - tahu_search_wiki    — semantic + fulltext search
 * - tahu_get_wiki       — get full wiki article
 * - tahu_search_docs    — search original documents
 * - tahu_list_documents — list documents with filters
 */

interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const TOOLS: McpTool[] = [
  {
    name: 'tahu_search_wiki',
    description: 'Search the Tahu knowledge base for wiki articles matching a query. Returns titles, snippets, and sources.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default: 5)' },
        category: { type: 'string', description: 'Filter by category' },
      },
      required: ['query'],
    },
  },
  {
    name: 'tahu_get_wiki',
    description: 'Retrieve the full content of a wiki article by ID, including its version history.',
    inputSchema: {
      type: 'object',
      properties: {
        wikiId: { type: 'string', description: 'Wiki article ID' },
      },
      required: ['wikiId'],
    },
  },
  {
    name: 'tahu_search_documents',
    description: 'Search original documents in the Tahu knowledge base.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default: 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'tahu_list_documents',
    description: 'List documents with optional filters by category or status.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        status: { type: 'string', description: 'Filter by status (processing, completed, failed)' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
    },
  },
  {
    name: 'tahu_agent_query',
    description: 'Ask a question to the Tahu knowledge base. Uses AI to generate an answer with citations from wiki articles.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Your question' },
      },
      required: ['question'],
    },
  },
]

/**
 * Handle an MCP tool call — dispatch to the appropriate handler.
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  env: { DB: D1Database; API_KEY?: string; LLM_API_KEY?: string },
): Promise<string> {
  const db = env.DB

  switch (toolName) {
    case 'tahu_search_wiki': {
      const query = (args.query as string) || ''
      const limit = Math.min((args.limit as number) || 5, 20)
      const category = args.category as string | undefined

      const ftsQuery = query.split(/\s+/).filter(Boolean).map(t => `"${t}"`).join(' OR ')
      let sql = `SELECT w.id, w.title, w.category, snippet(documents_fts, 2, '**', '**', '...', 40) as snippet
        FROM documents_fts fts JOIN documents d ON d.rowid = fts.rowid
        JOIN sources s ON s.document_id = d.id
        JOIN wiki_articles w ON w.id = s.wiki_id
        WHERE documents_fts MATCH ?`
      const params: unknown[] = [ftsQuery]
      if (category) { sql += ' AND w.category = ?'; params.push(category) }
      sql += ' ORDER BY rank LIMIT ?'
      params.push(limit)

      const { results } = await db.prepare(sql).bind(...params).all()
      return JSON.stringify({ results })
    }

    case 'tahu_get_wiki': {
      const wikiId = args.wikiId as string
      const article = await db.prepare('SELECT * FROM wiki_articles WHERE id = ?').bind(wikiId).first()
      const versions = await db.prepare(
        'SELECT version_num, change_summary, created_at FROM wiki_versions WHERE wiki_id = ? ORDER BY version_num DESC',
      ).bind(wikiId).all()
      return JSON.stringify({ article, versions: versions.results })
    }

    case 'tahu_search_documents': {
      const query = (args.query as string) || ''
      const limit = Math.min((args.limit as number) || 5, 20)
      const ftsQuery = query.split(/\s+/).filter(Boolean).map(t => `"${t}"`).join(' OR ')
      const { results } = await db.prepare(
        `SELECT d.id, d.title, d.category, d.status, snippet(documents_fts, 2, '**', '**', '...', 40) as snippet
         FROM documents_fts fts JOIN documents d ON d.rowid = fts.rowid
         WHERE documents_fts MATCH ? ORDER BY rank LIMIT ?`,
      ).bind(ftsQuery, limit).all()
      return JSON.stringify({ results })
    }

    case 'tahu_list_documents': {
      const category = args.category as string | undefined
      const status = args.status as string | undefined
      const limit = Math.min((args.limit as number) || 20, 100)
      let sql = 'SELECT id, title, category, status, created_at FROM documents WHERE 1=1'
      const params: unknown[] = []
      if (category) { sql += ' AND category = ?'; params.push(category) }
      if (status) { sql += ' AND status = ?'; params.push(status) }
      sql += ' ORDER BY created_at DESC LIMIT ?'
      params.push(limit)
      const { results } = await db.prepare(sql).bind(...params).all()
      return JSON.stringify({ results })
    }

    case 'tahu_agent_query': {
      const apiKey = env.LLM_API_KEY || env.API_KEY
      if (!apiKey) return JSON.stringify({ error: 'LLM API key not configured' })

      // Search wiki first
      const question = args.question as string
      const ftsQuery = question.split(/\s+/).filter(Boolean).map(t => `"${t}"`).join(' OR ')
      const { results: sources } = await db.prepare(
        `SELECT w.id, w.title, snippet(documents_fts, 2, '', '', '...', 30) as snippet
         FROM documents_fts fts JOIN documents d ON d.rowid = fts.rowid
         JOIN sources s ON s.document_id = d.id JOIN wiki_articles w ON w.id = s.wiki_id
         WHERE documents_fts MATCH ? ORDER BY rank LIMIT 3`,
      ).bind(ftsQuery).all()

      const rows = sources as Record<string, unknown>[]
      let context = 'Knowledge Base:\n'
      for (const s of rows) {
        const article = await db.prepare('SELECT content FROM wiki_articles WHERE id = ?').bind(s.id).first() as Record<string, string> | null
        context += `\n### ${s.title}\n${article?.content?.slice(0, 1500) || ''}`
      }

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Jawab dalam Bahasa Indonesia. Gunakan konteks yang disediakan. Sebut sumber jika ada.' },
            { role: 'user', content: `${context}\n\nPertanyaan: ${question}` },
          ],
          max_tokens: 500,
        }),
      })
      const data = await response.json() as { choices: [{ message: { content: string } }] }
      return JSON.stringify({
        answer: data.choices?.[0]?.message?.content || 'Tidak dapat menjawab',
        sources: rows.map(r => ({ id: r.id, title: r.title })),
      })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}
