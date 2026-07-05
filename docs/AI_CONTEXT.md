# AI Context — Tahu

## What This Project Is

Tahu adalah platform **Knowledge Operating System** — bukan chatbot, bukan RAG demo.
Platform ini mengubah dokumen menjadi Living Knowledge Base dalam format Markdown.

## Core Rules for AI Agents

### 1. Knowledge is Immutable at Source
- Dokumen asli **tidak pernah diubah**
- Semua output (Wiki, summary, graph) adalah **layer baru** di atas dokumen asli
- Selalu simpan reference ke dokumen sumber

### 2. Chat is NOT Knowledge
- Percakapan hanya menghasilkan **Knowledge Candidate**
- Knowledge Candidate harus melewati: Confidence Score → Review → Publish
- Jangan pernah langsung menulis ke Wiki dari chat

### 3. API First — Always
- Semua fitur harus tersedia via REST API
- UI adalah consumer, bukan pemilik logika bisnis
- Setiap endpoint harus punya request/response schema yang jelas

### 4. Markdown is Canonical
- Format utama penyimpanan: `.md`
- Bukan JSON, bukan HTML, bukan format proprietary
- Setiap Wiki article harus valid Markdown + frontmatter YAML

### 5. AI Agnostic
- Tidak ada hard dependency ke provider AI tertentu
- Gunakan abstraction layer untuk LLM calls
- Support: OpenAI, Anthropic, Gemini, DeepSeek, Ollama, local models

## Project Structure

```
/
├── packages/
│   ├── core/              # Shared types, utilities
│   ├── documents/         # Document Manager + Parser
│   ├── wiki/              # Wiki Engine + Generator
│   ├── knowledge-graph/   # Graph Engine
│   ├── search/            # Search Engine (vector + semantic)
│   ├── agent/             # AI Agent Interface + MCP
│   └── api/               # REST API layer (Hono)
├── workers/               # Cloudflare Workers entry points
├── pages/                 # Cloudflare Pages frontend (optional)
├── docs/                  # Platform documentation
└── specs/                 # PRD, ADR, architecture specs
```

## Key Technologies

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| API Framework | Hono |
| Database | Cloudflare D1 (SQLite) |
| Object Storage | Cloudflare R2 |
| Vector DB | Vectorize (or external pgvector) |
| Queue | Cloudflare Queues |
| AI | Workers AI / external providers via abstraction |
| MCP | @modelcontextprotocol/sdk |

## Naming Conventions

- Files: `kebab-case.ts`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- API routes: `/api/v1/kebab-case`
- Database tables: `snake_case`
- Environment vars: `UPPER_SNAKE_CASE`

## Documentation Files (this folder)

| File | Purpose |
|------|---------|
| VISION.md | Why this project exists, philosophy |
| PRD.md | What we're building, features |
| ARCHITECTURE.md | System design, data flows |
| DECISIONS.md | Architecture Decision Records |
| ROADMAP.md | Development phases |
| API_GUIDELINES.md | API design standards |
| CODING_STANDARDS.md | Code conventions |
| DATA_MODEL.md | Database schema, entities |
| CONTRIBUTING.md | How to contribute |
| AI_CONTEXT.md | This file — guide for AI agents |
| AGENTS.md | Rules for AI agent behavior at runtime |

## When Working on This Project

1. **Baca VISION.md dulu** — pahami filosofi sebelum menulis kode
2. **Cek DECISIONS.md** — jangan langgar ADR yang sudah ada
3. **Ikuti CODING_STANDARDS.md** — konsistensi di seluruh codebase
4. **Update docs** — setiap fitur baru update API_GUIDELINES.md
5. **Tambah ADR** — keputusan arsitektur baru dicatat
