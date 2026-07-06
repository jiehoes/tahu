import type { Context, Next } from 'hono'
import { generateId } from '@tahu/core'

interface AuditEntry {
  id: string
  action: string
  resource: string
  resourceId?: string
  actor: string
  details: Record<string, unknown>
  tenantId: string
  createdAt: string
}

/**
 * Audit log middleware — records all mutating operations.
 */
export function auditLog(action: string, resource: string) {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()

    await next()

    const duration = Date.now() - startTime
    const actor = (c.get('userId') as string) || c.req.header('x-api-key') || 'anonymous'
    const tenantId = (c.get('tenantId') as string) || 'default'
    const resourceId = c.req.param('id') || c.req.param('wikiId') || c.req.param('candidateId')

    const entry: AuditEntry = {
      id: generateId(),
      action,
      resource,
      resourceId,
      actor: String(actor).slice(0, 50),
      details: {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration,
      },
      tenantId,
      createdAt: new Date().toISOString(),
    }

    // Save to D1 — fire and forget
    try {
      await c.env.DB.prepare(
        `INSERT INTO audit_log (id, action, resource, resource_id, actor, details, tenant_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        entry.id, entry.action, entry.resource, entry.resourceId || null,
        entry.actor, JSON.stringify(entry.details), entry.tenantId, entry.createdAt,
      ).run()
    } catch {
      // Audit failure should not break the request
      console.error('Failed to write audit log')
    }
  }
}
