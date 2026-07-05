# Data Model — Tahu

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Documents   │───┬──▶│ WikiArticles │───┬──▶│   Versions   │
│              │   │   │              │   │   │              │
│ id           │   │   │ id           │   │   │ id           │
│ title        │   │   │ title        │   │   │ wiki_id      │
│ category     │   │   │ content      │   │   │ version_num  │
│ status       │   │   │ category     │   │   │ content      │
│ file_size    │   │   │ status       │   │   │ change_summary│
│ mime_type    │   │   │ created_at   │   │   │ created_by   │
│ storage_key  │   │   │ updated_at   │   │   │ created_at   │
│ metadata     │   │   └──────────────┘   │   └──────────────┘
│ created_at   │   │                      │
└──────────────┘   │   ┌──────────────┐   │   ┌──────────────┐
                   │   │  Candidates  │   │   │   Entities   │
┌──────────────┐   │   │              │   │   │              │
│   Sources    │   │   │ id           │   │   │ id           │
│              │   │   │ wiki_id      │   │   │ name         │
│ document_id  │───┘   │ content      │   │   │ type         │
│ wiki_id      │───────│ source       │   │   │ description  │
│ relevance    │       │ confidence   │   │   │ metadata     │
└──────────────┘       │ status       │   │   │ created_at   │
                       │ reviewer_id  │   │   └──────────────┘
┌──────────────┐       │ created_at   │   │
│    Tags      │       └──────────────┘   │   ┌──────────────┐
│              │                          │   │  Relations   │
│ id           │       ┌──────────────┐   │   │              │
│ name         │       │  Embeddings  │   │   │ id           │
└──────────────┘       │              │   │   │ from_entity  │──┘
         │             │ wiki_id      │───┘   │ to_entity    │──┘
         │             │ chunk_index  │       │ relation_type│
         ▼             │ chunk_text   │       │ weight        │
┌──────────────┐       │ embedding    │       │ source_wiki  │
│ DocumentTags │       │ model        │       │ created_at   │
│ WikiTags     │       │ created_at   │       └──────────────┘
│              │       └──────────────┘
│ tag_id       │
│ resource_type│
│ resource_id  │
└──────────────┘
```

---

## Table Schemas

### documents
```sql
CREATE TABLE documents (
  id          TEXT PRIMARY KEY,              -- ULID
  title       TEXT NOT NULL,
  category    TEXT,                          -- laporan, regulasi, penelitian, dll
  status      TEXT NOT NULL DEFAULT 'processing',  -- processing, completed, failed
  file_size   INTEGER NOT NULL,              -- bytes
  mime_type   TEXT NOT NULL,                 -- application/pdf, text/plain, dll
  storage_key TEXT NOT NULL,                 -- R2 object key
  metadata    TEXT,                          -- JSON: {pages, language, author, ...}
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_created ON documents(created_at);
```

### wiki_articles
```sql
CREATE TABLE wiki_articles (
  id            TEXT PRIMARY KEY,            -- ULID
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,               -- Markdown (full text in R2 for large articles)
  content_key   TEXT,                        -- R2 key if content stored externally
  category      TEXT,
  status        TEXT NOT NULL DEFAULT 'published',  -- draft, published, archived
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_wiki_status ON wiki_articles(status);
CREATE INDEX idx_wiki_category ON wiki_articles(category);
CREATE INDEX idx_wiki_updated ON wiki_articles(updated_at);

-- Full-text search
CREATE VIRTUAL TABLE wiki_fts USING fts5(
  title,
  content,
  content=wiki_articles,
  content_rowid=rowid
);
```

### wiki_versions
```sql
CREATE TABLE wiki_versions (
  id              TEXT PRIMARY KEY,
  wiki_id         TEXT NOT NULL REFERENCES wiki_articles(id),
  version_num     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  change_summary  TEXT,
  created_by      TEXT,                      -- user ID (optional, could be 'system')
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(wiki_id, version_num)
);

CREATE INDEX idx_versions_wiki ON wiki_versions(wiki_id);
```

### knowledge_candidates
```sql
CREATE TABLE knowledge_candidates (
  id              TEXT PRIMARY KEY,
  wiki_id         TEXT REFERENCES wiki_articles(id),  -- NULL for new articles
  title           TEXT,
  content         TEXT NOT NULL,
  source          TEXT NOT NULL,              -- 'chat', 'document', 'agent', 'manual'
  confidence_score REAL,                     -- 0.0 - 1.0
  status          TEXT NOT NULL DEFAULT 'pending_review',  -- pending_review, approved, rejected
  reviewer_id     TEXT,
  review_notes    TEXT,
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at     TEXT
);

CREATE INDEX idx_candidates_status ON knowledge_candidates(status);
CREATE INDEX idx_candidates_wiki ON knowledge_candidates(wiki_id);
```

### sources (many-to-many: documents ↔ wiki_articles)
```sql
CREATE TABLE sources (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  wiki_id     TEXT NOT NULL REFERENCES wiki_articles(id),
  relevance   REAL DEFAULT 1.0,             -- 0.0 - 1.0
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(document_id, wiki_id)
);

CREATE INDEX idx_sources_doc ON sources(document_id);
CREATE INDEX idx_sources_wiki ON sources(wiki_id);
```

### tags
```sql
CREATE TABLE tags (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
```

### document_tags
```sql
CREATE TABLE document_tags (
  id            TEXT PRIMARY KEY,
  tag_id        TEXT NOT NULL REFERENCES tags(id),
  resource_type TEXT NOT NULL,              -- 'document' or 'wiki'
  resource_id   TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(tag_id, resource_type, resource_id)
);

CREATE INDEX idx_tags_resource ON document_tags(resource_type, resource_id);
CREATE INDEX idx_tags_tag ON document_tags(tag_id);
```

### entities (knowledge graph nodes)
```sql
CREATE TABLE entities (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,                -- person, organization, location, concept, event, etc.
  description TEXT,
  metadata    TEXT,                          -- JSON: {aliases, external_ids, ...}
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_entities_type ON entities(type);

-- Full-text search for entity names
CREATE VIRTUAL TABLE entities_fts USING fts5(
  name,
  description,
  content=entities,
  content_rowid=rowid
);
```

### relations (knowledge graph edges)
```sql
CREATE TABLE relations (
  id            TEXT PRIMARY KEY,
  from_entity   TEXT NOT NULL REFERENCES entities(id),
  to_entity     TEXT NOT NULL REFERENCES entities(id),
  relation_type TEXT NOT NULL,              -- funded_by, located_in, regulates, authored_by, etc.
  weight        REAL DEFAULT 1.0,
  source_wiki   TEXT REFERENCES wiki_articles(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_relations_from ON relations(from_entity);
CREATE INDEX idx_relations_to ON relations(to_entity);
CREATE INDEX idx_relations_type ON relations(relation_type);
```

### embeddings (vector store metadata)
```sql
CREATE TABLE embeddings (
  id          TEXT PRIMARY KEY,
  wiki_id     TEXT NOT NULL REFERENCES wiki_articles(id),
  chunk_index INTEGER NOT NULL,             -- urutan chunk dalam artikel
  chunk_text  TEXT NOT NULL,                -- teks yang di-embed (500-1000 chars)
  model       TEXT NOT NULL,                -- nama model embedding
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(wiki_id, chunk_index)
);

CREATE INDEX idx_embeddings_wiki ON embeddings(wiki_id);
```

### users (minimal — extend as needed)
```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'viewer',  -- admin, curator, viewer
  api_key     TEXT UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## R2 Storage Structure

```
bucket/
├── documents/
│   └── {document_id}/
│       └── original.{ext}         # Original file
│
├── wiki/
│   └── {wiki_id}/
│       ├── v{version_num}.md      # Versioned markdown
│       └── current.md             # Latest version (symlink/copy)
│
└── exports/
    └── {export_id}.zip            # Bulk exports
```

---

## Key Relationships

| From | To | Type | Through |
|------|-----|------|---------|
| Document | WikiArticle | N:M | `sources` table |
| WikiArticle | WikiArticle | N:M | `entities` + `relations` (via graph) |
| WikiArticle | WikiVersion | 1:N | `wiki_versions.wiki_id` |
| WikiArticle | Candidate | 1:N | `knowledge_candidates.wiki_id` |
| Document | Tag | N:M | `document_tags` |
| WikiArticle | Tag | N:M | `document_tags` |
| WikiArticle | Embedding | 1:N | `embeddings.wiki_id` |
| Entity | Entity | N:M | `relations` |

---

## Data Sizes (Estimates)

| Record Type | Avg Size | Max |
|-------------|----------|-----|
| Document metadata | 1 KB | — |
| Wiki article (Markdown) | 10 KB | 1 MB |
| Wiki version | 10 KB | 1 MB |
| Embedding chunk | 2 KB | — |
| Entity | 500 B | — |
| Relation | 200 B | — |
