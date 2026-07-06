import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { documents } from './routes/documents'
import { wiki } from './routes/wiki'
import { agent } from './routes/agent'
import { graph } from './routes/graph'
import { search } from './routes/search'
import { health } from './routes/health'
import { auth } from './middleware/auth'
import { errorHandler } from './middleware/error-handler'

const app = new Hono()

// Global middleware
app.use('*', cors())
app.use('*', logger())
app.use('*', errorHandler)

// Public routes
app.route('/health', health)

// Protected routes
app.use('/api/v1/*', auth)
app.route('/api/v1/documents', documents)
app.route('/api/v1/wiki', wiki)
app.route('/api/v1/agent', agent)
app.route('/api/v1/graph', graph)
app.route('/api/v1/search', search)

export default app
