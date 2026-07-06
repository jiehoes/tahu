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
| `@tahu/documents` | Upload, parsing, metadata extraction |
| `@tahu/wiki` | Wiki generation, versioning, candidate pipeline |
| `@tahu/graph` | Entity extraction, relation mapping |
| `@tahu/search` | Full-text, semantic, hybrid search |
| `@tahu/agent` | AI agent interface, MCP server, LLM abstraction |
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
| [VISION.md](./VISION.md) | Visi, filosofi, prinsip inti |
| [PRD.md](./PRD.md) | Product requirements, personas, NFR |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Desain sistem, flow data |
| [DECISIONS.md](./DECISIONS.md) | Architecture Decision Records |
| [ROADMAP.md](./ROADMAP.md) | Fase pengembangan + dependencies |
| [API_GUIDELINES.md](./API_GUIDELINES.md) | Standar API design |
| [DATA_MODEL.md](./DATA_MODEL.md) | Database schema, ER diagram |
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | Konvensi kode |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Setup lokal, workflow |
| [AI_CONTEXT.md](./AI_CONTEXT.md) | Panduan untuk AI agent |
| [AGENTS.md](./AGENTS.md) | Aturan AI agent di runtime |

---

## Status

🟡 **Phase 1 — Foundation** (in planning)

Lihat [ROADMAP.md](./ROADMAP.md) untuk detail.

---

## License

MIT
