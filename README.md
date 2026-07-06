# Tahu — Knowledge Operating System

> **Write once, understand forever.**

Tahu adalah platform **Knowledge Operating System** yang mengubah dokumen menjadi Living Knowledge Base. Bukan chatbot. Bukan RAG demo.

Platform ini adalah fondasi pengetahuan organisasi — satu sumber knowledge yang bisa dipakai oleh berbagai aplikasi: chatbot, GIS, ERP, CRM, mobile apps, dan AI agents.

---

## Filosofi

```
One Knowledge. Many Applications.
AI is a Consumer. Knowledge is the Product.
```

| Prinsip | Artinya |
|---------|---------|
| **Documents are Data** | Dokumen adalah sumber, bukan tujuan akhir |
| **Markdown is Canonical** | Format utama — human-readable, AI-friendly, Git-friendly |
| **API First** | Semua fitur tersedia melalui API. UI hanyalah consumer |
| **AI Agnostic** | Ganti provider AI tanpa ubah arsitektur |
| **AI Assists, Humans Govern** | AI bantu bikin, manusia yang putuskan |

---

## Arsitektur

```
Browser / Mobile / Agent
        │
        ▼
  api.tahu.diffa.net  (Cloudflare Workers + Pages)
        │
   ┌────┼────┬────────┐
   ▼    ▼    ▼        ▼
 REST  MCP  Graph  Webhook
        │
        ▼
  Knowledge Service
   ┌────┬─────┬──────┐
   ▼    ▼     ▼      ▼
Docs  Wiki  Graph  Search
        │
        ▼
  Storage (R2 + D1 + Vectorize)
```

---

## Modul (`@tahu/*`)

| Package | Deskripsi |
|---------|-----------|
| `@tahu/core` | Shared types, utilities, error classes |
| `@tahu/parser` | Document parsing — TXT, HTML, Markdown |
| `@tahu/wiki` | Wiki generation, versioning, candidate pipeline |
| `@tahu/graph` | Entity extraction, relation mapping |
| `@tahu/agent` | AI agent interface, LLM abstraction, query |
| `@tahu/mcp` | MCP server — 5 tools for AI agents |
| `@tahu/api` | REST API layer (Hono) |

---

## Workers & Subdomain

| Worker | Endpoint | Fungsi |
|--------|----------|--------|
| `tahu-api` | `api.tahu.diffa.net` | REST API utama |
| `tahu-mcp` | `mcp.tahu.diffa.net` | MCP server untuk AI agent |
| `tahu-graph` | `graph.tahu.diffa.net` | Knowledge Graph queries |

---

## Knowledge Flow

```
Dokumen → Parser → Metadata → Wiki Generator
                                   │
                            Markdown Wiki
                            ┌──────┴──────┐
                      Knowledge Graph   Embedding
                            │               │
                      Graph Search    Vector Search
                            └──────┬──────┘
                             Hybrid Search
                                   │
                         Knowledge API (REST + MCP)
                                   │
                    ┌──────────────┼──────────────┐
                 Chatbot         GIS           Mobile
```

---

## Quick Start

```bash
git clone https://github.com/jiehoes/tahu.git
cd tahu
pnpm install
pnpm dev
```

API tersedia di `http://localhost:8787`.

---

## Target Integrasi

| Aplikasi | Integrasi |
|----------|-----------|
| Chatbot | REST / MCP |
| GIS (QGIS, GeoServer) | REST + MCP tools |
| ERP / CRM | REST API |
| Mobile Apps | REST API |
| AI Agents (Claude, Codex, OpenCode) | MCP Server |
| Portal Pemerintah | REST API |
| Dashboard | REST API |

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Runtime | Cloudflare Workers |
| API Framework | Hono |
| Database | Cloudflare D1 |
| Storage | Cloudflare R2 |
| Vector DB | Cloudflare Vectorize |
| Queue | Cloudflare Queues |
| Language | TypeScript 5.x |
| Package Manager | pnpm |
| Testing | Vitest |
| CI/CD | GitHub Actions |

---

## Dokumentasi

| File | Isi |
|------|-----|
| [VISION.md](./docs/VISION.md) | Visi, filosofi, prinsip inti |
| [PRD.md](./docs/PRD.md) | Product requirements, personas, NFR |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Desain sistem, flow data |
| [DECISIONS.md](./docs/DECISIONS.md) | Architecture Decision Records |
| [ROADMAP.md](./docs/ROADMAP.md) | Fase pengembangan + dependencies |
| [API_GUIDELINES.md](./docs/API_GUIDELINES.md) | Standar API design |
| [DATA_MODEL.md](./docs/DATA_MODEL.md) | Database schema, ER diagram |
| [CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) | Konvensi kode |
| [CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Setup lokal, workflow |
| [AI_CONTEXT.md](./docs/AI_CONTEXT.md) | Panduan untuk AI agent |
| [USAGE.md](./docs/USAGE.md) | Panduan pemakaian — curl, alur kerja, contoh |
| [AGENTS.md](./docs/AGENTS.md) | Aturan AI agent di runtime |

---

## Status

✅ **All 6 Phases Complete**

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation | ✅ Monorepo, API, Auth, Upload, Search, CI/CD |
| Phase 2 — Knowledge | ✅ Parser, Wiki Engine, Versioning, Candidates |
| Phase 3 — AI | ✅ LLM, Agent Query, MCP, Summarization |
| Phase 4 — Graph | ✅ Entities, Relations, Visualization |
| Phase 5 — Enterprise | ✅ RBAC, Audit, Multi-tenant, Analytics |
| Phase 6 — Knowledge OS | ✅ Workflow, Spatial, Export, Public Portal |

**Live**: https://api.tahu.diffa.net

---

## License

MIT
