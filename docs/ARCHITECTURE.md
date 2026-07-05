# System Architecture — Tahu

                Browser

                    │

                    ▼

           Cloudflare Pages

                    │

                    ▼

          Cloudflare Workers

                    │

        ┌───────────┼───────────┐

        ▼           ▼           ▼

     REST API    MCP API    Webhook

                    │

                    ▼

          Knowledge Service

     ┌──────────┬────────────┬──────────┐

     ▼          ▼            ▼

Documents   Wiki Engine   Search Engine

     ▼          ▼            ▼

 Metadata  Knowledge Graph Vector Index

                    │

                    ▼

              Storage Layer

      ┌────────┬────────┬─────────┐

      ▼        ▼        ▼

      R2       D1    External DB


# Knowledge Flow

User Upload

↓

Document Manager

↓

Parser

↓

Metadata Extraction

↓

Knowledge Extraction

↓

Wiki Generator

↓

Markdown

↓

Knowledge Graph

↓

Embedding

↓

Search Index

↓

Knowledge API

↓

Applications

# Chat Flow

User

↓

Chat Module

↓

Knowledge API

↓

Search Wiki

↓

Jika cukup

↓

LLM

↓

Jawaban

Jika tidak cukup

↓

Cari Dokumen Asli

↓

LLM

↓

Jawaban

# Knowledge Update Flow

Dokumen Baru

↓

Parser

↓

Draft Knowledge

↓

Confidence Score

↓

Review (optional)

↓

Update Wiki

↓

Update Graph

↓

Update Embedding

↓

Publish

