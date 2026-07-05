-- Tahu D1 Database — Initial Schema
-- Migration: 0001_init

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT,
  status      TEXT NOT NULL DEFAULT 'processing',
  file_size   INTEGER NOT NULL,
  mime_type   TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  tags        TEXT DEFAULT '[]',
  metadata    TEXT DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title,
  category,
  tags,
  content=documents,
  content_rowid=rowid
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, category, tags)
  VALUES (new.rowid, new.title, new.category, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, category, tags)
  VALUES ('delete', old.rowid, old.title, old.category, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, category, tags)
  VALUES ('delete', old.rowid, old.title, old.category, old.tags);
  INSERT INTO documents_fts(rowid, title, category, tags)
  VALUES (new.rowid, new.title, new.category, new.tags);
END;

-- Wiki articles table
CREATE TABLE IF NOT EXISTS wiki_articles (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  content_key     TEXT,
  category        TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 1,
  tags            TEXT DEFAULT '[]',
  sources         TEXT DEFAULT '[]',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wiki_status ON wiki_articles(status);
CREATE INDEX IF NOT EXISTS idx_wiki_category ON wiki_articles(category);

-- Wiki versions
CREATE TABLE IF NOT EXISTS wiki_versions (
  id              TEXT PRIMARY KEY,
  wiki_id         TEXT NOT NULL REFERENCES wiki_articles(id),
  version_num     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  change_summary  TEXT,
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(wiki_id, version_num)
);

CREATE INDEX IF NOT EXISTS idx_versions_wiki ON wiki_versions(wiki_id);

-- Knowledge candidates
CREATE TABLE IF NOT EXISTS knowledge_candidates (
  id               TEXT PRIMARY KEY,
  wiki_id          TEXT REFERENCES wiki_articles(id),
  title            TEXT,
  content          TEXT NOT NULL,
  source           TEXT NOT NULL DEFAULT 'manual',
  confidence_score REAL,
  status           TEXT NOT NULL DEFAULT 'pending_review',
  reviewer_id      TEXT,
  review_notes     TEXT,
  created_by       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON knowledge_candidates(status);

-- Sources (document ↔ wiki many-to-many)
CREATE TABLE IF NOT EXISTS sources (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  wiki_id     TEXT NOT NULL REFERENCES wiki_articles(id),
  relevance   REAL DEFAULT 1.0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(document_id, wiki_id)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Users table (minimal)
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'viewer',
  api_key    TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
