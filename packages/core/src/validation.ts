import { z } from 'zod'
import { CreateDocumentInput, PaginationSchema, SearchQuerySchema } from './types'

/**
 * Validate input and return parsed data or throw ValidationError.
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const { ValidationError } = require('./errors')
    throw new ValidationError('Validation failed', {
      issues: result.error.issues,
    })
  }
  return result.data
}

// Re-export commonly used schemas for convenience
export { CreateDocumentInput, PaginationSchema, SearchQuerySchema }
