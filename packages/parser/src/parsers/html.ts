import type { ParseResult, Section } from '../types'

export function parseHtml(content: string, maxLength: number): ParseResult {
  // Simple HTML to text — strip tags, decode entities
  const text = stripHtml(content)
    .slice(0, maxLength)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
      language: detectLanguage(text),
    },
    sections: extractHeadings(text),
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function extractHeadings(text: string): Section[] {
  const sections: Section[] = []
  const lines = text.split('\n')
  let currentHeading = ''
  let currentContent: string[] = []

  for (const line of lines) {
    if (/^(#{1,6})\s/.test(line)) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading || 'Untitled', level: 1, content: currentContent.join('\n') })
      }
      currentHeading = line.replace(/^#+\s*/, '')
      currentContent = []
    } else if (line.trim()) {
      currentContent.push(line)
    }
  }

  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading || 'Untitled', level: 1, content: currentContent.join('\n') })
  }

  return sections
}

function detectLanguage(text: string): string {
  // Simple detection based on common words
  const sample = text.slice(0, 1000).toLowerCase()
  const idWords = ['dan', 'yang', 'dengan', 'untuk', 'pada', 'adalah', 'ini', 'itu', 'dari', 'akan']
  const enWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'have']

  let idScore = 0
  let enScore = 0
  for (const w of idWords) {
    if (new RegExp(`\\b${w}\\b`).test(sample)) idScore++
  }
  for (const w of enWords) {
    if (new RegExp(`\\b${w}\\b`).test(sample)) enScore++
  }

  return idScore > enScore ? 'id' : 'en'
}
