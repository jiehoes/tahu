import type { ParseResult, Section } from '../types'

export function parseMarkdown(content: string, maxLength: number): ParseResult {
  const text = content.slice(0, maxLength)

  return {
    text,
    metadata: {
      title: extractTitle(text),
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
    },
    sections: extractMarkdownSections(text),
  }
}

function extractTitle(markdown: string): string | undefined {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : undefined
}

function extractMarkdownSections(markdown: string): Section[] {
  const sections: Section[] = []
  const lines = markdown.split('\n')
  let currentHeading = ''
  let currentLevel = 0
  let currentContent: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      if (currentContent.length > 0 || currentHeading) {
        sections.push({ heading: currentHeading || 'Untitled', level: currentLevel, content: currentContent.join('\n') })
      }
      currentLevel = headingMatch[1].length
      currentHeading = headingMatch[2]
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  if (currentContent.length > 0 || currentHeading) {
    sections.push({ heading: currentHeading || 'Untitled', level: currentLevel, content: currentContent.join('\n') })
  }

  return sections
}
