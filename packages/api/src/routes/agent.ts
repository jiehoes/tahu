import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { agentQuery, generateSummary, suggestTags, generateCitations, type LLMConfig } from '@tahu/agent'

type Bindings = {
  DB: D1Database
  LLM_API_KEY?: string
  LLM_PROVIDER?: string
  LLM_MODEL?: string
}

export const agent = new Hono<{ Bindings: Bindings }>()

function getLLMConfig(c: any): LLMConfig | null {
  const apiKey = c.env.LLM_API_KEY || c.env.API_KEY
  if (!apiKey) return null
  return {
    provider: (c.env.LLM_PROVIDER || 'deepseek') as LLMConfig['provider'],
    apiKey,
    model: c.env.LLM_MODEL || undefined,
  }
}

// ─── POST /agent/query ────────────────────────────────────

agent.post(
  '/query',
  zValidator('json', z.object({
    query: z.string().min(1).max(2000),
    context: z.string().optional(),
    maxTokens: z.number().optional(),
  })),
  async (c) => {
    const config = getLLMConfig(c)
    if (!config) {
      return c.json({ success: false, error: { code: 'LLM_NOT_CONFIGURED', message: 'LLM API key not set' } }, 503)
    }

    const { query, context, maxTokens } = c.req.valid('json')
    const result = await agentQuery(config, c.env.DB, { query, context, maxTokens })

    return c.json({
      success: true,
      data: {
        answer: result.answer + generateCitations(result.sources),
        sources: result.sources,
        confidence: result.confidence,
        model: result.model,
      },
    })
  },
)

// ─── POST /agent/summarize ─────────────────────────────────

agent.post(
  '/summarize',
  zValidator('json', z.object({
    wikiIds: z.array(z.string()).min(1).max(10),
    maxTokens: z.number().optional(),
    language: z.string().optional(),
  })),
  async (c) => {
    const config = getLLMConfig(c)
    if (!config) {
      return c.json({ success: false, error: { code: 'LLM_NOT_CONFIGURED', message: 'LLM API key not set' } }, 503)
    }

    const { wikiIds, maxTokens, language } = c.req.valid('json')

    // Fetch wiki articles
    const ids = wikiIds.map(id => `'${id}'`).join(',')
    const { results } = await c.env.DB.prepare(
      `SELECT title, content FROM wiki_articles WHERE id IN (${ids})`,
    ).all()

    const articles = (results as Record<string, string>[]).map(r => ({
      title: r.title,
      content: r.content,
    }))

    const summary = await generateSummary(config, articles, { maxTokens, language })

    return c.json({ success: true, data: { summary, articleCount: articles.length } })
  },
)

// ─── POST /agent/tags ──────────────────────────────────────

agent.post(
  '/tags',
  zValidator('json', z.object({
    content: z.string().min(1).max(10000),
  })),
  async (c) => {
    const config = getLLMConfig(c)
    if (!config) {
      return c.json({ success: false, error: { code: 'LLM_NOT_CONFIGURED', message: 'LLM API key not set' } }, 503)
    }

    const { content } = c.req.valid('json')
    const result = await suggestTags(config, content)

    return c.json({ success: true, data: result })
  },
)

// ─── MCP Info endpoint ─────────────────────────────────────

agent.get('/mcp/info', (c) => {
  const { TOOLS } = require('@tahu/mcp')
  return c.json({
    success: true,
    data: {
      name: 'tahu-mcp',
      version: '0.1.0',
      description: 'Tahu Knowledge OS — MCP Server',
      tools: TOOLS,
    },
  })
})

// ─── MCP tool call ─────────────────────────────────────────

agent.post('/mcp/call', zValidator('json', z.object({
  tool: z.string(),
  args: z.record(z.unknown()).default({}),
})), async (c) => {
  const { tool, args } = c.req.valid('json')
  const { handleToolCall } = require('@tahu/mcp')
  
  const result = await handleToolCall(tool, args, {
    DB: c.env.DB,
    API_KEY: c.env.LLM_API_KEY || c.env.API_KEY,
    LLM_API_KEY: c.env.LLM_API_KEY,
  })

  return c.json({ success: true, data: JSON.parse(result) })
})
