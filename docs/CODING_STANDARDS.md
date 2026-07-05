# Coding Standards — Tahu

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Runtime | Cloudflare Workers | latest |
| Language | TypeScript | 5.x+ |
| API Framework | Hono | 4.x |
| Database | Cloudflare D1 (SQLite) | — |
| Object Storage | Cloudflare R2 | — |
| Vector DB | Cloudflare Vectorize | — |
| Queue | Cloudflare Queues | — |
| AI (Edge) | Workers AI | — |
| MCP | @modelcontextprotocol/sdk | latest |
| Package Manager | pnpm | 9.x+ |
| Linter | Biome | latest |
| Testing | Vitest | 2.x+ |
| CI/CD | GitHub Actions | — |

---

## Project Structure

```
tahu/
├── packages/
│   ├── core/                    # @tahu/core
│   │   ├── src/
│   │   │   ├── types/           # Shared TypeScript types
│   │   │   ├── errors/          # Error classes
│   │   │   ├── validation/      # Zod schemas
│   │   │   └── utils/           # Shared utilities
│   │   └── package.json
│   │
│   ├── documents/               # @tahu/documents
│   │   ├── src/
│   │   │   ├── upload.ts        # Document upload handler
│   │   │   ├── parser.ts        # Document parser
│   │   │   ├── metadata.ts      # Metadata extraction
│   │   │   └── storage.ts       # R2 storage operations
│   │   └── package.json
│   │
│   ├── wiki/                    # @tahu/wiki
│   │   ├── src/
│   │   │   ├── generator.ts     # Wiki generation
│   │   │   ├── versioning.ts    # Version management
│   │   │   ├── candidate.ts     # Knowledge candidate
│   │   │   └── validator.ts     # Content validation
│   │   └── package.json
│   │
│   ├── knowledge-graph/         # @tahu/knowledge-graph
│   │   ├── src/
│   │   │   ├── entity.ts        # Entity extraction
│   │   │   ├── relation.ts      # Relation extraction
│   │   │   └── query.ts         # Graph queries
│   │   └── package.json
│   │
│   ├── search/                  # @tahu/search
│   │   ├── src/
│   │   │   ├── fulltext.ts      # Full-text search (D1 FTS)
│   │   │   ├── semantic.ts      # Vector search (Vectorize)
│   │   │   └── hybrid.ts        # Hybrid search combiner
│   │   └── package.json
│   │
│   ├── agent/                   # @tahu/agent
│   │   ├── src/
│   │   │   ├── query.ts         # Agent query handler
│   │   │   ├── mcp-server.ts    # MCP server implementation
│   │   │   ├── tools/           # MCP tool definitions
│   │   │   └── providers/       # LLM provider adapters
│   │   └── package.json
│   │
│   └── api/                     # @tahu/api
│       ├── src/
│       │   ├── index.ts         # Hono app entry
│       │   ├── routes/          # Route handlers
│       │   ├── middleware/       # Auth, rate-limit, logging
│       │   └── openapi/         # OpenAPI spec generation
│       └── package.json
│
├── workers/                     # Cloudflare Worker entry points
│   ├── api/                     # Main API worker
│   │   ├── src/index.ts
│   │   └── wrangler.toml
│   └── mcp/                     # MCP Server worker
│       ├── src/index.ts
│       └── wrangler.toml
│
├── pages/                       # Frontend (optional)
│   └── ...
│
├── packages/                    # Monorepo root
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
└── vitest.workspace.ts
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | `kebab-case.ts` | `wiki-generator.ts` |
| Directories | `kebab-case` | `knowledge-graph/` |
| Functions | `camelCase` | `generateWiki()` |
| Variables | `camelCase` | `documentId` |
| Types/Interfaces | `PascalCase` | `WikiArticle` |
| Classes | `PascalCase` | `DocumentParser` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE` |
| API routes | `kebab-case` | `/api/v1/wiki-articles` |
| DB tables | `snake_case` | `wiki_articles` |
| DB columns | `snake_case` | `created_at` |
| Env vars | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| Package names | `@tahu/scope` | `@tahu/core` |

---

## TypeScript Rules

### Strict Mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Prefer Type Over Interface
```typescript
// ✅ Good
type WikiArticle = {
  id: string
  title: string
  content: string
  version: number
}

// ❌ Avoid (unless intentionally using declaration merging)
interface IWikiArticle { ... }
```

### Use Zod for Runtime Validation
```typescript
import { z } from 'zod'

const WikiArticleSchema = z.object({
  id: z.string().ulid(),
  title: z.string().min(1).max(200),
  content: z.string(),
  version: z.number().int().positive(),
})

type WikiArticle = z.infer<typeof WikiArticleSchema>
```

### Avoid `any`
```typescript
// ❌ Bad
function process(data: any): any { ... }

// ✅ Good — use unknown + type guard
function process(data: unknown): Result { ... }

// ✅ OK — when you really don't know yet
function process(data: Record<string, unknown>): Result { ... }
```

---

## Error Handling

### Custom Error Classes
```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details: Record<string, unknown> = {}
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      `${resource} with ID '${id}' not found`,
      404
    )
  }
}
```

### Never Throw Raw Errors
```typescript
// ❌ Bad
throw new Error('Document not found')

// ✅ Good
throw new NotFoundError('Document', documentId)
```

---

## API Handler Pattern

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

const wikiRoute = new Hono()

wikiRoute.get('/:id',
  zValidator('param', z.object({ id: z.string().ulid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const wiki = await wikiService.getById(id)

    if (!wiki) {
      return c.json({
        success: false,
        error: { code: 'WIKI_NOT_FOUND', message: `Wiki '${id}' not found` }
      }, 404)
    }

    return c.json({ success: true, data: wiki })
  }
)
```

---

## Database (D1) Rules

### Always Use Migrations
```sql
-- migrations/0001_create_documents.sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category);
```

### Use Prepared Statements
```typescript
// ✅ Good
const stmt = db.prepare('SELECT * FROM documents WHERE id = ?')
const doc = await stmt.bind(id).first()

// ❌ Avoid
const doc = await db.prepare(`SELECT * FROM documents WHERE id = '${id}'`).first()
```

---

## Testing

### Unit Test Pattern
```typescript
import { describe, it, expect } from 'vitest'

describe('WikiGenerator', () => {
  it('generates wiki from parsed document', async () => {
    const generator = new WikiGenerator()
    const result = await generator.generate({
      title: 'Test Doc',
      content: '## Section 1\n\nContent...',
      metadata: { language: 'id' }
    })

    expect(result.title).toBe('Test Doc')
    expect(result.content).toContain('# Test Doc')
    expect(result.version).toBe(1)
  })

  it('throws on empty content', async () => {
    const generator = new WikiGenerator()
    await expect(
      generator.generate({ title: 'Empty', content: '', metadata: {} })
    ).rejects.toThrow(AppError)
  })
})
```

### Coverage Target
- Packages: 80%+
- Workers/Routes: 90%+
- Critical paths (auth, knowledge update): 100%

---

## Git Conventions

### Branch Names
```
feat/wiki-generator
fix/document-parser-bug
docs/api-guidelines
refactor/search-engine
```

### Commit Messages
```
feat(wiki): add wiki version history endpoint
fix(documents): handle PDF parsing timeout
docs(api): document search endpoint
refactor(graph): extract entity extraction to separate module
test(documents): add parser integration tests
```

---

## Performance Guidelines

- **Workers CPU time**: target < 50ms (free tier), < 30s (paid)
- **Response size**: max 1MB per response
- **Upload size**: max 50MB per document
- **Database queries**: max 3 queries per request
- **Vector search**: return top 20 results max
- **Cache**: leverage Cloudflare Cache API where possible

---

## Security Checklist

- [ ] All inputs validated with Zod
- [ ] SQL injection prevented via prepared statements
- [ ] File uploads validated (type, size, content)
- [ ] Auth on all non-public endpoints
- [ ] Rate limiting on all endpoints
- [ ] CORS configured correctly
- [ ] Sensitive data never in logs
- [ ] API keys never in code
