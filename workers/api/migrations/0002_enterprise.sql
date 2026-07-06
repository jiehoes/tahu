-- Migration: 0002_enterprise.sql
-- Phase 5 — Enterprise features

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  actor       TEXT NOT NULL,
  details     TEXT DEFAULT '{}',
  tenant_id   TEXT NOT NULL DEFAULT 'default',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- Add tenant_id column to existing tables
ALTER TABLE documents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE wiki_articles ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE entities ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wiki_tenant ON wiki_articles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entities_tenant ON entities(tenant_id);
