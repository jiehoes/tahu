import type { D1Database } from '@cloudflare/workers-types'
import { generateId } from '@tahu/core'

type EventType = 'document.uploaded' | 'wiki.generated' | 'wiki.updated' | 'candidate.approved' | 'entity.extracted'
type WorkflowAction = 'generate_wiki' | 'extract_entities' | 'generate_summary' | 'suggest_tags' | 'cross_link' | 'rebuild_search'

interface WorkflowRule {
  event: EventType
  action: WorkflowAction
  enabled: boolean
}

/**
 * Workflow engine — event-driven automation rules.
 * When an event fires, matching rules trigger actions automatically.
 */
export class WorkflowEngine {
  private rules: WorkflowRule[] = []

  constructor() {
    // Default rules
    this.rules = [
      { event: 'document.uploaded', action: 'suggest_tags', enabled: true },
    ]
  }

  addRule(rule: WorkflowRule) {
    this.rules.push(rule)
  }

  /**
   * Trigger an event and execute matching workflow actions.
   */
  async trigger(
    event: EventType,
    payload: Record<string, unknown>,
    deps: { db: D1Database; apiKey?: string; baseUrl?: string },
  ): Promise<{ event: EventType; actionsTriggered: WorkflowAction[]; results: string[] }> {
    const matching = this.rules.filter(r => r.event === event && r.enabled)
    const results: string[] = []

    for (const rule of matching) {
      try {
        const result = await this.executeAction(rule.action, payload, deps)
        results.push(result)
      } catch (err) {
        results.push(`Failed: ${rule.action} — ${err}`)
      }
    }

    return { event, actionsTriggered: matching.map(r => r.action), results }
  }

  private async executeAction(
    action: WorkflowAction,
    payload: Record<string, unknown>,
    deps: { db: D1Database; apiKey?: string; baseUrl?: string },
  ): Promise<string> {
    switch (action) {
      case 'suggest_tags': {
        const { documentId, content } = payload
        if (!content || !deps.apiKey) return 'No content or API key — skipped'

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deps.apiKey}` },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'Suggest 3-5 tags and 1 category for this document. JSON: {"tags":[],"category":""}' },
              { role: 'user', content: String(content).slice(0, 2000) },
            ],
            max_tokens: 100,
            temperature: 0.1,
          }),
        })

        const data = await response.json() as { choices: [{ message: { content: string } }] }
        const parsed = JSON.parse(data.choices[0]?.message?.content || '{}')
        const tags = parsed.tags || []
        const category = parsed.category || ''

        if (tags.length > 0) {
          await deps.db.prepare(
            'UPDATE documents SET tags = ? WHERE id = ?',
          ).bind(JSON.stringify(tags), documentId).run()
        }
        if (category) {
          await deps.db.prepare(
            'UPDATE documents SET category = ?, status = ? WHERE id = ?',
          ).bind(category, 'completed', documentId).run()
        }

        return `Tagged: ${tags.join(', ')} [${category}]`
      }

      default:
        return `Action ${action} not yet implemented`
    }
  }
}

// Singleton
export const workflow = new WorkflowEngine()
