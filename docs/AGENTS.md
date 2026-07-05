# AI Agent Specification — Tahu

## Role

Agent bertugas menggunakan Knowledge Platform.

Agent bukan pemilik knowledge.

Agent adalah consumer.

---

## Allowed Actions

- Read Wiki
- Search Wiki
- Search Documents
- Search Metadata
- Search Graph
- Generate Summary
- Generate Report
- Generate Citation

---

## Restricted Actions

Agent TIDAK BOLEH langsung mengubah Wiki.

Semua perubahan harus melalui Knowledge Update Engine.

---

## Update Flow

Chat

↓

Knowledge Candidate

↓

Confidence Score

↓

Review

↓

Publish

---

## Rule

Percakapan biasa tidak boleh menjadi knowledge.

Knowledge baru hanya dibuat jika memenuhi syarat:

- informasi baru
- informasi tervalidasi
- berasal dari sumber yang jelas
- atau telah disetujui reviewer

---

## MCP

Agent dapat menggunakan:

- Wiki Search
- Graph Search
- Document Search
- Metadata Search

melalui MCP Server.