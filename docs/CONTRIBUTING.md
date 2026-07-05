# Contributing — Tahu

## Prerequisites

- **Node.js** 20.x+
- **pnpm** 9.x+ (`npm install -g pnpm`)
- **Cloudflare account** (free tier ok)
- **Wrangler CLI** (`pnpm add -g wrangler`)

---

## Setup Lokal

```bash
# 1. Clone repo
git clone https://github.com/diffa/tahu.git
cd tahu

# 2. Install dependencies
pnpm install

# 3. Copy env template
cp .env.example .env
# Edit .env — isi Cloudflare account ID, D1 database ID, dll

# 4. Create local D1 database
pnpm wrangler d1 create tahu-dev
pnpm wrangler d1 execute tahu-dev --file=./migrations/0001_init.sql

# 5. Run dev server
pnpm dev
# API tersedia di http://localhost:8787
```

---

## Development Workflow

### Branches
```
main          — produksi (protected)
  └── develop — integrasi (default branch)
       └── feat/nama-fitur
       └── fix/nama-bug
       └── docs/nama-dokumen
```

### Workflow Harian

```bash
# 1. Sync dari develop
git checkout develop
git pull origin develop

# 2. Buat branch fitur
git checkout -b feat/wiki-versioning

# 3. Kerjakan + commit
git add .
git commit -m "feat(wiki): add version history endpoint"

# 4. Push dan buka PR
git push origin feat/wiki-versioning
gh pr create --base develop --title "feat: wiki versioning"
```

---

## Pull Request Process

### Sebelum PR
- [ ] Tests pass: `pnpm test`
- [ ] Lint pass: `pnpm lint`
- [ ] Type check: `pnpm typecheck`
- [ ] Build: `pnpm build`
- [ ] Update docs jika ada API baru

### PR Description Template
```markdown
## What
Deskripsi singkat perubahan.

## Why
Alasan perubahan ini diperlukan.

## Changes
- Item perubahan 1
- Item perubahan 2

## Testing
- [ ] Unit test added
- [ ] Integration test added
- [ ] Manual test done

## Screenshots (if UI changes)
...
```

### Review Process
1. Minimal **1 approve** untuk merge
2. Reviewer cek: kode, tests, docs, security
3. CI harus pass (lint, typecheck, test, build)
4. Squash merge ke `develop`

---

## Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @tahu/wiki test

# Watch mode
pnpm test -- --watch

# With coverage
pnpm test -- --coverage
```

---

## Project Conventions

Lihat file-file ini sebelum mulai coding:

| What | File |
|------|------|
| Project vision | VISION.md |
| Product requirements | PRD.md |
| Architecture | ARCHITECTURE.md |
| Decisions (ADR) | DECISIONS.md |
| API design | API_GUIDELINES.md |
| Code style | CODING_STANDARDS.md |
| Data model | DATA_MODEL.md |
| AI agent rules | AGENTS.md |
| Development phases | ROADMAP.md |

---

## Communication

- **Discussions**: GitHub Discussions untuk ide besar
- **Issues**: GitHub Issues untuk bug & feature request
- **PR Reviews**: komentar inline di GitHub PR

---

## Adding New Packages

```bash
# Create workspace package
mkdir -p packages/new-module/src
cd packages/new-module

# Init package.json
pnpm init
# Edit name: "@tahu/new-module"

# Add deps
pnpm add zod hono
pnpm add -D vitest @types/node typescript
```

---

## Environment Variables

```env
# .env.example
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
D1_DATABASE_ID=
R2_BUCKET_NAME=
VECTORIZE_INDEX_ID=

# LLM Providers (opsional, setidaknya satu)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# App
JWT_SECRET=dev-secret-change-in-production
API_KEY=
LOG_LEVEL=debug
```
