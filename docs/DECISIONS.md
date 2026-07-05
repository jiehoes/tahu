# Architecture Decisions — Tahu

---

## ADR-001: Platform adalah Knowledge Engine, bukan Chatbot

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Banyak platform knowledge management dibangun sebagai wrapper RAG di atas chatbot.
Ini membuat knowledge terikat pada UI percakapan dan tidak bisa dipakai oleh aplikasi lain.

### Decision
Platform dibangun sebagai Knowledge Engine headless. Chat hanyalah salah satu consumer.

### Consequences
- ✅ Knowledge dapat diakses oleh berbagai aplikasi (GIS, ERP, Mobile, Agent)
- ✅ Business logic terpisah dari UI
- ✅ Satu sumber knowledge untuk semua consumer
- ❌ Membutuhkan API layer yang matang sejak awal
- ❌ Tidak bisa langsung "chat-ready" tanpa integrasi tambahan

---

## ADR-002: Markdown sebagai Format Utama Knowledge

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Format knowledge harus bertahan lama, bisa dibaca manusia dan AI, serta portable.
JSON, HTML, atau format proprietary tidak memenuhi semua kriteria ini.

### Decision
Markdown (`.md`) dengan frontmatter YAML menjadi canonical format untuk semua Wiki article.

### Consequences
- ✅ Human-readable tanpa tool khusus
- ✅ AI-friendly — semua LLM memahami Markdown
- ✅ Git-friendly — diff, merge, versioning native
- ✅ Portable — bisa dibuka di editor teks apapun
- ✅ Long-term preservation
- ❌ Tidak cocok untuk data terstruktur (pakai database terpisah)
- ❌ Tidak ada built-in schema validation

---

## ADR-003: Dokumen Asli Immutable

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Mengubah dokumen asli berisiko: kehilangan konteks, sulit audit, dan knowledge yang
dihasilkan bisa berbeda-beda tergantung kapan dokumen diubah.

### Decision
Dokumen asli tidak pernah dimodifikasi. Knowledge dibuat sebagai layer baru di atas dokumen.

### Consequences
- ✅ Audit trail jelas — dokumen asli selalu bisa dirujuk
- ✅ Knowledge bisa diregenerasi jika algoritma berubah
- ✅ Multiple knowledge views dari dokumen yang sama
- ❌ Storage lebih besar (dokumen asli + knowledge)
- ❌ Perlu mekanisme versi dokumen jika dokumen sumber diperbarui

---

## ADR-004: Chat Tidak Langsung Mengubah Wiki

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Membiarkan percakapan langsung mengubah knowledge base berbahaya: informasi salah,
halusinasi AI, atau opini bisa masuk sebagai knowledge tanpa validasi.

### Decision
Chat hanya menghasilkan Knowledge Candidate. Candidate harus melewati pipeline:
Confidence Score → Review (opsional) → Publish.

### Consequences
- ✅ Kualitas knowledge terjaga
- ✅ Mencegah halusinasi AI masuk ke knowledge base
- ✅ Ada jejak siapa yang menyetujui perubahan
- ❌ Proses lebih lambat dibanding update langsung
- ❌ Membutuhkan review mechanism

---

## ADR-005: Semua Modul Headless

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Monolithic app dengan UI terikat membuat integrasi sulit dan scaling tidak fleksibel.

### Decision
Semua modul (Document Manager, Wiki Engine, Search, Graph, Agent) bersifat headless.
UI adalah proyek terpisah yang mengonsumsi API.

### Consequences
- ✅ Setiap modul bisa dikembangkan independen
- ✅ UI bisa diganti tanpa mengubah backend
- ✅ Mendukung multiple frontend (web, mobile, desktop)
- ❌ Koordinasi antar modul perlu kontrak API yang jelas
- ❌ Development awal lebih lambat karena harus bikin API dulu

---

## ADR-006: API First Architecture

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Tanpa API first, developer cenderung membuat fitur di UI dulu, lalu "nanti" diekspos
sebagai API. Ini menghasilkan API yang tidak konsisten dan bolong-bolong.

### Decision
Semua fitur harus tersedia melalui REST API terlebih dahulu. UI memanggil API yang sama.

### Consequences
- ✅ Konsistensi API — semua fitur punya endpoint
- ✅ Testing lebih mudah (API bisa di-test tanpa UI)
- ✅ Third-party integration dari hari pertama
- ❌ Overhead development awal
- ❌ Perlu API design review sebelum implementasi

---

## ADR-007: LLM Bersifat Pluggable

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Vendor lock-in ke satu provider AI berisiko: harga naik, model deprecated, fitur berubah.

### Decision
LLM provider bersifat pluggable. Abstraction layer memungkinkan switch provider tanpa
mengubah kode.

### Consequences
- ✅ Bisa pakai OpenAI, Anthropic, Gemini, DeepSeek, Ollama, atau local model
- ✅ Bisa fallback ke provider lain jika satu down
- ✅ Cost optimization — pilih provider termurah per task
- ❌ Abstraction layer menambah kompleksitas
- ❌ Tidak semua provider punya fitur yang sama (mis. function calling)

---

## ADR-008: Storage Dipisahkan per Tipe Data

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Menyimpan semua data (dokumen, metadata, wiki, embedding, graph) dalam satu database
membuat scaling sulit dan query tidak optimal.

### Decision
Setiap tipe data memiliki storage sendiri:
- Original files → Object Storage (R2)
- Metadata → Relational DB (D1)
- Markdown Wiki → Object Storage (R2) + metadata di D1
- Embedding → Vector DB (Vectorize)
- Graph → Graph DB atau D1 dengan adjacency list

### Consequences
- ✅ Setiap storage dioptimalkan untuk tipe datanya
- ✅ Scaling independen per tipe data
- ✅ Bisa ganti storage per tipe tanpa mempengaruhi yang lain
- ❌ Kompleksitas operasional lebih tinggi
- ❌ Query lintas storage perlu koordinasi

---

## ADR-009: Cloudflare sebagai Edge Layer

**Status**: Accepted  
**Date**: 2026-07-04

### Context
Aplikasi knowledge management membutuhkan latency rendah dan skalabilitas global.

### Decision
Cloudflare Workers + Pages sebagai edge layer. Processing berat dapat dipindahkan
ke service eksternal tanpa mengubah API.

### Consequences
- ✅ Latency rendah (edge computing)
- ✅ Auto-scaling
- ✅ Integrated ecosystem (Workers, D1, R2, Queues, AI)
- ✅ Zero maintenance infrastructure
- ❌ Workers runtime limitations (CPU time, memory)
- ❌ Processing berat perlu external service
