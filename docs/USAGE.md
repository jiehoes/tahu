# Tahu — User Guide

> **Write once, understand forever.**

Panduan praktis menggunakan Tahu Knowledge OS. Untuk detail API lengkap, lihat [API_GUIDELINES.md](./API_GUIDELINES.md).

---

## Quick Start

### Authentication

Semua endpoint `/api/v1/*` memerlukan API Key:

```bash
# Set API Key
export TAHU_KEY="tahu-dev-key-2026"

# Semua request sertakan header:
curl -H "X-API-Key: $TAHU_KEY" https://api.tahu.diffa.net/api/v1/...
```

### Public Portal (tanpa auth)

```bash
# Lihat knowledge yang sudah dipublish
curl https://api.tahu.diffa.net/portal/wiki

# Cari knowledge publik
curl "https://api.tahu.diffa.net/portal/search?q=anggaran"

# Statistik publik
curl https://api.tahu.diffa.net/portal/stats
```

---

## Alur Kerja Dasar

### 1. Upload Dokumen

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -F "file=@laporan.pdf" \
  -F "title=Laporan Anggaran 2025" \
  -F "category=anggaran" \
  -F "tags=keuangan,tahunan" \
  https://api.tahu.diffa.net/api/v1/documents
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "mr8lwy1i7f8e80bffca1",
    "title": "Laporan Anggaran 2025",
    "category": "anggaran",
    "status": "processing",
    "tags": ["keuangan", "tahunan"],
    "createdAt": "2026-07-06T02:34:32Z"
  }
}
```

### 2. Generate Wiki Article

Ubah dokumen jadi artikel wiki terstruktur:

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"mr8lwy1i7f8e80bffca1","category":"anggaran"}' \
  https://api.tahu.diffa.net/api/v1/wiki/generate
```

### 3. Cari Knowledge

**Full-text search:**
```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"anggaran pembangunan","type":"fulltext"}' \
  https://api.tahu.diffa.net/api/v1/search
```

**Browse wiki articles:**
```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/wiki?category=anggaran&limit=10"
```

---

## Fitur AI

### Tanya Knowledge Base

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"Berapa total anggaran infrastruktur 2025?"}' \
  https://api.tahu.diffa.net/api/v1/agent/query
```

Response:
```json
{
  "success": true,
  "data": {
    "answer": "Total anggaran infrastruktur 2025 adalah Rp 500 miliar...",
    "sources": [
      { "wikiId": "abc123", "title": "Anggaran 2025", "relevance": 0.95 }
    ],
    "confidence": 0.88,
    "model": "deepseek-chat"
  }
}
```

### Ringkasan Multi-Dokumen

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"wikiIds":["abc123","def456","ghi789"]}' \
  https://api.tahu.diffa.net/api/v1/agent/summarize
```

### AI Auto-Tagging

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"Laporan pembangunan jalan dan jembatan di Sulawesi Selatan..."}' \
  https://api.tahu.diffa.net/api/v1/agent/tags
```

---

## Knowledge Graph

### Ekstrak Entity dari Wiki

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"wikiId":"abc123"}' \
  https://api.tahu.diffa.net/api/v1/graph/extract
```

Response:
```json
{
  "success": true,
  "data": {
    "entityCount": 12,
    "relationCount": 15,
    "entities": [
      { "name": "Kementerian PUPR", "type": "organization" },
      { "name": "Kabupaten Luwu", "type": "location" },
      { "name": "Rp 150 miliar", "type": "budget" }
    ]
  }
}
```

### Visualisasi Data

```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/graph/visualization?limit=50"
```

Response siap dirender dengan D3.js, Cytoscape, atau library graph visualization.

### Rekomendasi Entity Terkait

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"entityIds":["ent_001","ent_002"]}' \
  https://api.tahu.diffa.net/api/v1/graph/recommend
```

---

## Kolaborasi Knowledge

### Ajukan Perubahan (Knowledge Candidate)

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Updated\n\nKonten baru dengan data tambahan.",
    "source": "manual",
    "confidenceScore": 0.85
  }' \
  https://api.tahu.diffa.net/api/v1/wiki/abc123/candidates
```

### Review & Approve

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reviewerId":"admin","notes":"Data valid"}'
  https://api.tahu.diffa.net/api/v1/wiki/candidates/cand_001/approve
```

### Lihat Version History

```bash
# Daftar versi
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/wiki/abc123/versions"

# Lihat versi spesifik
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/wiki/abc123/versions/3"
```

---

## Spatial Knowledge (GIS)

### Cari Entity Spasial

```bash
curl -X POST \
  -H "X-API-Key: $TAHU_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"Luwu","entityType":"location","limit":10}' \
  https://api.tahu.diffa.net/api/v1/spatial/search
```

### Lihat Relasi Spasial

```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/spatial/relations?entityId=ent_123"
```

---

## Export

### Export Wiki ke Markdown

```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/export/markdown?wikiId=abc123" \
  -o artikel.md
```

### Export Wiki ke JSON

```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/export/json?wikiId=abc123"
```

### Bulk Export per Kategori

```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/export/bulk?category=anggaran"
```

---

## Analytics

### Dashboard Overview

```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/analytics/overview"
```

### Dokumen per Kategori

```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/analytics/documents"
```

### Activity Timeline

```bash
curl -H "X-API-Key: $TAHU_KEY" \
  "https://api.tahu.diffa.net/api/v1/analytics/activity?days=30"
```

---

## MCP Integration

Tahu menyediakan 5 MCP tools untuk AI agents (Claude, Codex, OpenCode):

| Tool | Fungsi |
|------|--------|
| `tahu_search_wiki` | Cari artikel wiki |
| `tahu_get_wiki` | Baca full artikel |
| `tahu_search_documents` | Cari dokumen asli |
| `tahu_list_documents` | List dokumen |
| `tahu_agent_query` | Tanya AI + knowledge base |

### Konfigurasi di OpenCode

```json
{
  "mcp": {
    "tahu": {
      "type": "remote",
      "url": "https://api.tahu.diffa.net/api/v1/agent/mcp/call",
      "headers": {
        "X-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

### Konfigurasi Claude Code

```bash
claude mcp add tahu -- npx @tahu/mcp --api-key YOUR_API_KEY
```

---

## RBAC & Roles

| Role | Hak Akses |
|------|-----------|
| **admin** | Full access — semua endpoint, manage users |
| **curator** | CRUD dokumen, wiki, candidates, review |
| **viewer** | Read-only — search, list, baca artikel |

## All Endpoints Reference

### Public (no auth)
| Method | Endpoint |
|--------|----------|
| `GET` | `/health` |
| `GET` | `/portal/wiki` |
| `GET` | `/portal/wiki/:id` |
| `GET` | `/portal/search?q=` |
| `GET` | `/portal/stats` |

### Documents
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/v1/documents` |
| `GET` | `/api/v1/documents` |
| `GET` | `/api/v1/documents/:id` |
| `DELETE` | `/api/v1/documents/:id` |

### Wiki
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/v1/wiki/generate` |
| `GET` | `/api/v1/wiki` |
| `GET` | `/api/v1/wiki/:id` |
| `GET` | `/api/v1/wiki/:id/versions` |
| `GET` | `/api/v1/wiki/:id/versions/:n` |
| `POST` | `/api/v1/wiki/:id/candidates` |
| `GET` | `/api/v1/wiki/candidates` |
| `POST` | `/api/v1/wiki/candidates/:id/approve` |
| `POST` | `/api/v1/wiki/candidates/:id/reject` |

### AI Agent
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/v1/agent/query` |
| `POST` | `/api/v1/agent/summarize` |
| `POST` | `/api/v1/agent/tags` |
| `GET` | `/api/v1/agent/mcp/info` |
| `POST` | `/api/v1/agent/mcp/call` |

### Graph
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/v1/graph/extract` |
| `GET` | `/api/v1/graph/entities` |
| `GET` | `/api/v1/graph/entities/:id` |
| `GET` | `/api/v1/graph/visualization` |
| `POST` | `/api/v1/graph/recommend` |

### Spatial
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/v1/spatial/search` |
| `GET` | `/api/v1/spatial/entities` |
| `GET` | `/api/v1/spatial/relations` |

### Export
| Method | Endpoint |
|--------|----------|
| `GET` | `/api/v1/export/markdown?wikiId=` |
| `GET` | `/api/v1/export/json?wikiId=` |
| `GET` | `/api/v1/export/bulk?category=` |

### Analytics
| Method | Endpoint |
|--------|----------|
| `GET` | `/api/v1/analytics/overview` |
| `GET` | `/api/v1/analytics/documents` |
| `GET` | `/api/v1/analytics/activity?days=` |

### Search
| Method | Endpoint |
|--------|----------|
| `POST` | `/api/v1/search` |
