# API Guidelines — Tahu

## Philosophy

- **API First**: semua fitur harus tersedia melalui API
- **Headless**: tidak boleh ada logika bisnis yang hanya tersedia di UI
- **JSON only**: request & response selalu JSON
- **Backward compatible**: breaking changes harus versi API baru

---

## Base URL

```
https://api.tahu.diffa.net/v1
```

---

## Authentication

Semua endpoint (kecuali health check) memerlukan authentication.

```
Authorization: Bearer <JWT_TOKEN>
X-API-Key: <API_KEY>
```

Supported methods:
- **JWT** — untuk user-facing apps
- **API Key** — untuk service-to-service / MCP
- **OAuth 2.0** — untuk third-party integrations

---

## Response Format

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 143,
    "total_pages": 8
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document with ID 'abc-123' not found",
    "details": {}
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete success) |
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — missing/invalid auth |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found |
| 409 | Conflict — duplicate resource |
| 422 | Unprocessable — validation error |
| 429 | Rate Limit exceeded |
| 500 | Internal Server Error |

---

## Pagination

Semua list endpoint menggunakan cursor-based pagination.

### Request

```
GET /api/v1/documents?limit=20&cursor=eyJsYXN0SWQiOiAiYWJjLTEyMyJ9
```

| Param | Type | Default | Max |
|-------|------|---------|-----|
| `limit` | integer | 20 | 100 |
| `cursor` | string | null | — |

### Response

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJsYXN0SWQiOiAieHl6LTQ1NiJ9",
    "has_more": true
  }
}
```

---

## Core APIs

### Documents

#### Upload Document
```
POST /api/v1/documents
Content-Type: multipart/form-data

file: <binary>
title?: string
tags?: string[]
category?: string
```

Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "doc_abc123",
    "title": "Laporan Tahunan 2025.pdf",
    "status": "processing",
    "created_at": "2026-07-04T10:00:00Z"
  }
}
```

#### List Documents
```
GET /api/v1/documents?status=completed&category=laporan&limit=20
```

Response:
```json
{
  "success": true,
  "data": [{
    "id": "doc_abc123",
    "title": "Laporan Tahunan 2025.pdf",
    "category": "laporan",
    "status": "completed",
    "file_size": 2048576,
    "mime_type": "application/pdf",
    "tags": ["tahunan", "2025"],
    "created_at": "2026-07-04T10:00:00Z"
  }],
  "pagination": { "next_cursor": "...", "has_more": false }
}
```

#### Get Document
```
GET /api/v1/documents/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "doc_abc123",
    "title": "Laporan Tahunan 2025.pdf",
    "status": "completed",
    "category": "laporan",
    "file_size": 2048576,
    "mime_type": "application/pdf",
    "tags": ["tahunan", "2025"],
    "metadata": {
      "pages": 45,
      "language": "id",
      "author": "Bappeda"
    },
    "wiki_articles": ["wiki_001", "wiki_002"],
    "created_at": "2026-07-04T10:00:00Z",
    "updated_at": "2026-07-04T10:05:00Z"
  }
}
```

---

### Wiki

#### List Wiki Articles
```
GET /api/v1/wiki?category=anggaran&limit=20
```

#### Get Wiki Article
```
GET /api/v1/wiki/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "wiki_001",
    "title": "Anggaran Pembangunan 2025",
    "content": "# Anggaran Pembangunan 2025\n\n...",
    "version": 3,
    "category": "anggaran",
    "sources": ["doc_abc123"],
    "related": ["wiki_015", "wiki_022"],
    "tags": ["anggaran", "pembangunan"],
    "created_at": "2026-07-04T10:10:00Z",
    "updated_at": "2026-07-04T15:30:00Z"
  }
}
```

#### Get Wiki Versions
```
GET /api/v1/wiki/:id/versions
```

#### Propose Wiki Update (Knowledge Candidate)
```
POST /api/v1/wiki/:id/candidates

{
  "content": "Updated markdown content...",
  "source": "chat",
  "reason": "Informasi baru dari rapat koordinasi"
}
```

Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "cand_xyz789",
    "status": "pending_review",
    "confidence_score": 0.72
  }
}
```

---

### Search

#### Full-Text + Semantic Search
```
POST /api/v1/search

{
  "query": "anggaran pembangunan jalan 2025",
  "type": "hybrid",
  "filters": {
    "category": "anggaran",
    "date_from": "2025-01-01"
  },
  "limit": 10
}
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | *required* | Search query |
| `type` | string | `hybrid` | `fulltext`, `semantic`, `hybrid` |
| `filters` | object | `{}` | Category, date range, tags |
| `limit` | integer | 10 | Max 50 |

Response:
```json
{
  "success": true,
  "data": [{
    "type": "wiki",
    "id": "wiki_001",
    "title": "Anggaran Pembangunan 2025",
    "snippet": "...total anggaran pembangunan jalan sebesar Rp 50 miliar...",
    "score": 0.94,
    "sources": ["doc_abc123"]
  }],
  "pagination": { "next_cursor": "...", "has_more": false }
}
```

---

### Knowledge Graph

#### Search Graph
```
POST /api/v1/graph/search

{
  "entity": "Jalan Trans Sulawesi",
  "relation": "funded_by",
  "depth": 2
}
```

#### Get Entity Relations
```
GET /api/v1/graph/entities/:entity_id/relations
```

---

### Agent Interface

#### Agent Query
```
POST /api/v1/agent/query

{
  "query": "Berapa total anggaran infrastruktur 2025?",
  "context": {
    "category": "anggaran",
    "max_tokens": 1000
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "answer": "Total anggaran infrastruktur tahun 2025 adalah...",
    "sources": [
      { "wiki_id": "wiki_001", "title": "Anggaran Pembangunan 2025", "relevance": 0.95 }
    ],
    "confidence": 0.88,
    "model": "gemini-2.5-flash"
  }
}
```

---

### Knowledge Update

#### Submit Update
```
POST /api/v1/knowledge/update

{
  "type": "new_article",
  "title": "Proyek Jalan 2026",
  "content": "# Proyek Jalan 2026\n\n...",
  "sources": ["doc_def456"],
  "tags": ["infrastruktur", "2026"]
}
```

---

## Rate Limiting

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1720080000
```

| Tier | Rate | Burst |
|------|------|-------|
| Free | 100 req/min | 20 |
| Pro | 1000 req/min | 100 |
| Enterprise | Custom | Custom |

---

## Versioning

```
/api/v1/...   — Current stable
/api/v2/...   — Next major (when breaking changes needed)
```

Breaking changes:
- Removing or renaming fields
- Changing field types
- Changing endpoint semantics

Non-breaking changes (ok in same version):
- Adding new fields
- Adding new endpoints
- Adding optional parameters
