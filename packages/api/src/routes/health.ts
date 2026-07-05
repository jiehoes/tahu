import { Hono } from 'hono'

export const health = new Hono()

health.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    },
  })
})
