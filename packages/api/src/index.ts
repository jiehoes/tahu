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
import { roleInjector } from './middleware/rbac'
import { errorHandler } from './middleware/error-handler'
import { analytics } from './routes/analytics'

const app = new Hono()

// Global middleware
app.use('*', cors())
app.use('*', logger())
app.use('*', errorHandler)

// Public routes
app.route('/health', health)

// Protected routes
app.use('/api/v1/*', auth)
app.use('/api/v1/*', roleInjector)
app.route('/api/v1/documents', documents)
app.route('/api/v1/wiki', wiki)
app.route('/api/v1/agent', agent)
app.route('/api/v1/graph', graph)
app.route('/api/v1/search', search)
app.route('/api/v1/analytics', analytics)

export default app
