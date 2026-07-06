# Development Roadmap — Tahu

---

## Phase 1 — Foundation
**Duration**: 4-6 minggu  
**Depends on**: —  
**Goal**: Sistem dasar berjalan — upload dokumen, simpan, search.

### Deliverables
- [x] Project scaffolding (monorepo, packages)
- [ ] Authentication (JWT + API Key)
- [ ] Document upload (R2)
- [ ] Document metadata (D1)
- [ ] Markdown storage (R2)
- [ ] Basic search (D1 FTS)
- [ ] REST API (Hono)
- [ ] CI/CD (GitHub Actions)

### Entry Criteria
- Repository dibuat
- Tech stack final

### Exit Criteria
- Upload PDF → tersimpan di R2
- GET /documents/:id → return metadata
- Search → return results
- Auth → endpoint non-publik butuh token

---

## Phase 2 — Knowledge
**Duration**: 6-8 minggu  
**Depends on**: Phase 1  
**Goal**: Dokumen jadi Wiki article, support versioning.

### Deliverables
- [ ] Parser Engine (PDF, DOCX, TXT, HTML)
- [ ] Metadata extraction (AI-assisted)
- [ ] Wiki Generator (Markdown)
- [ ] Cross-linking antar artikel
- [ ] Versioning (history + rollback)
- [ ] Category & tag system
- [ ] Knowledge Candidate pipeline

### Entry Criteria
- Phase 1 complete
- Document upload stable

### Exit Criteria
- Upload PDF → auto-generate Wiki article
- Wiki article punya version history
- Artikel ter-link satu sama lain
- Candidate bisa diajukan, direview, dipublish

---

## Phase 3 — AI
**Duration**: 6-8 minggu  
**Depends on**: Phase 2  
**Goal**: AI integration — agent query, summarization, MCP.

### Deliverables
- [ ] LLM abstraction layer (multi-provider)
- [ ] Agent query API
- [ ] Summarization (single + multi-document)
- [ ] MCP server (Wiki Search, Graph Search, Document Search)
- [ ] Citation generation
- [ ] Confidence scoring
- [ ] AI-assisted tagging & categorization

### Entry Criteria
- Phase 2 complete
- Wiki articles available for AI consumption

### Exit Criteria
- POST /agent/query → AI menjawab dengan sources
- MCP server bisa dipakai Claude/Codex/OpenCode
- Summary bisa mencakup multiple dokumen
- Confidence score > 0.7 untuk jawaban faktual

---

## Phase 4 — Knowledge Graph
**Duration**: 8-10 minggu  
**Depends on**: Phase 2 (bisa paralel dengan Phase 3)  
**Goal**: Entity extraction, relation mapping, graph visualization.

### Deliverables
- [ ] Entity extraction (AI-assisted)
- [ ] Relation extraction
- [ ] Graph query API
- [ ] Entity disambiguation
- [ ] Graph visualization data API
- [ ] Entity search
- [ ] Graph-based recommendation

### Entry Criteria
- Phase 2 complete
- Wiki articles cukup untuk training entity extraction

### Exit Criteria
- Entity otomatis diekstrak dari Wiki
- Relation terdeteksi: funded_by, located_in, regulates, dll
- Graph API: cari entity + relasi sampai depth N
- Visualisasi graf bisa dirender dari API response

---

## Phase 5 — Enterprise
**Duration**: 8-12 minggu  
**Depends on**: Phase 3, Phase 4  
**Goal**: Multi-tenant, approval workflow, audit, analytics.

### Deliverables
- [ ] Multi-tenant isolation
- [ ] RBAC (role-based access control)
- [ ] Approval workflow (configurable)
- [ ] Audit log (semua perubahan knowledge)
- [ ] Analytics dashboard API
- [ ] Usage quotas per tenant
- [ ] SSO integration (OAuth/OIDC)

### Entry Criteria
- Core features stable
- Ada kebutuhan multi-tenant

### Exit Criteria
- Organisasi A tidak bisa akses data Organisasi B
- Setiap perubahan Wiki punya audit trail
- Approval chain bisa dikonfigurasi per organisasi
- Dashboard menampilkan metrics per tenant

---

## Phase 6 — Knowledge OS
**Duration**: 12-16 minggu (ongoing)  
**Depends on**: Phase 5  
**Goal**: Platform berkembang jadi Knowledge Operating System.

### Deliverables
- [ ] Workflow Engine (event-driven)
- [ ] Automation rules
- [ ] Spatial Knowledge Engine (GIS integration)
- [ ] Policy Knowledge Engine
- [ ] Recommendation Engine
- [ ] Multi-Agent Collaboration
- [ ] Knowledge Import/Export
- [ ] Public Knowledge Portal
- [ ] Research Knowledge Engine

### Entry Criteria
- Platform stabil di production
- Multi-tenant berjalan

### Exit Criteria
- Knowledge bisa di-drive oleh event (DocumentUploaded → WikiGenerated)
- Spatial query: "cari semua proyek dalam radius 50km"
- Policy: "regulasi mana yang berlaku untuk proyek ini?"
- Two agents bisa kolaborasi: satu research, satu write wiki

---

## Dependency Graph

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Knowledge) ──────────┐
    │                          │
    ├──────────────┐           │
    ▼              ▼           │
Phase 3 (AI)   Phase 4 (Graph) │
    │              │           │
    └──────┬───────┘           │
           ▼                   │
      Phase 5 (Enterprise) ◄───┘
           │
           ▼
      Phase 6 (Knowledge OS)
```

---

## Current Status: ✅ All 6 Phases Complete

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1 — Foundation | 4-6 minggu | ✅ |
| Phase 2 — Knowledge | 6-8 minggu | ✅ |
| Phase 3 — AI | 6-8 minggu | ✅ |
| Phase 4 — Graph | 8-10 minggu | ✅ |
| Phase 5 — Enterprise | 8-12 minggu | ✅ |
| Phase 6 — Knowledge OS | 12-16 minggu | ✅ |

**Live at**: https://api.tahu.diffa.net
