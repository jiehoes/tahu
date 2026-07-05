import type { Context, Next } from 'hono'
import { AppError } from '@tahu/core'

/**
 * Global error handler middleware.
 * Catches all errors and returns standardized JSON error response.
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (err) {
    if (err instanceof AppError) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        },
        err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
      )
    }

    console.error('Unhandled error:', err)
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500,
    )
  }
}
