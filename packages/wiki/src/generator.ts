import type { ParseResult } from '@tahu/parser'
import { generateId } from '@tahu/core'

export interface WikiArticle {
  id: string
  title: string
  content: string
  category: string | null
  sources: string[]
  tags: string[]
  version: number
  createdAt: string
}

/**
 * Generate a structured Markdown wiki article from parsed document content.
 */
export function generateWikiArticle(
  parseResult: ParseResult,
  options: {
    documentId: string
    category?: string
    tags?: string[]
    title?: string
  },
): WikiArticle {
  const title = options.title || parseResult.metadata.title || 'Untitled Document'
  const now = new Date().toISOString()

  // Build wiki content from parsed sections
  let content = `# ${title}\n\n`
  content += `> Sumber: dokumen asli\n`
  content += `> Dibuat: ${now}\n`
  content += `> Kategori: ${options.category || 'uncategorized'}\n\n`

  content += `---\n\n`

  // Table of contents
  if (parseResult.sections.length > 1) {
    content += `## Daftar Isi\n\n`
    for (const section of parseResult.sections) {
      if (section.heading && section.heading !== 'Untitled') {
        const anchor = section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        content += `- [${section.heading}](#${anchor})\n`
      }
    }
    content += '\n---\n\n'
  }

  // Sections
  for (const section of parseResult.sections) {
    if (section.heading) {
      content += `## ${section.heading}\n\n`
    }
    if (section.content.trim()) {
      content += `${section.content.trim()}\n\n`
    }
  }

  // Metadata footer
  content += `---\n\n`
  content += `**Metadata**\n`
  content += `- Jumlah kata: ${parseResult.metadata.wordCount}\n`
  content += `- Jumlah karakter: ${parseResult.metadata.charCount}\n`
  if (parseResult.metadata.language) {
    content += `- Bahasa: ${parseResult.metadata.language === 'id' ? 'Indonesia' : 'English'}\n`
  }

  return {
    id: generateId(),
    title,
    content,
    category: options.category || null,
    sources: [options.documentId],
    tags: options.tags || [],
    version: 1,
    createdAt: now,
  }
}
