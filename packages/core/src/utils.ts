/**
 * Generate a ULID-like ID (time-sortable, URL-safe).
 * Uses crypto.randomUUID() with timestamp prefix for ordering.
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  return `${timestamp}${random}`
}

/**
 * Simple slug generator for titles.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

/**
 * Truncate text to maxLength, adding ellipsis if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Safe JSON parse with default value.
 */
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}
