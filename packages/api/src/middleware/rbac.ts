import type { Context, Next } from 'hono'
import { ForbiddenError } from '@tahu/core'

export type Role = 'admin' | 'curator' | 'viewer'

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  curator: 2,
  viewer: 1,
}

/**
 * RBAC middleware — requires a minimum role to access the route.
 * Usage: app.use('/admin/*', rbac('admin'))
 */
export function rbac(minRole: Role) {
  return async (c: Context, next: Next) => {
    const userRole = (c.get('userRole') as Role) || 'viewer'

    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
      throw new ForbiddenError(`Requires ${minRole} role, current: ${userRole}`)
    }

    await next()
  }
}

/**
 * Inject user role from API key or JWT into context.
 * Extends the existing auth middleware.
 */
export async function roleInjector(c: Context, next: Next) {
  const apiKey = c.req.header('x-api-key')
  
  // Check if there's a role mapping for this API key
  if (apiKey && c.env.API_KEY_ROLES) {
    try {
      const roles = JSON.parse(c.env.API_KEY_ROLES) as Record<string, Role>
      c.set('userRole', roles[apiKey] || 'viewer')
    } catch {
      c.set('userRole', 'viewer')
    }
  } else {
    // Default: API key users are curators, anonymous are viewers
    c.set('userRole', apiKey ? 'curator' : 'viewer')
  }

  await next()
}

/**
 * Tenant isolation — scope queries to a tenant ID.
 */
export function getTenantId(c: Context): string {
  return (c.get('tenantId') as string) || 'default'
}
