import type { ParseResult, Section } from '../types'

export function parseText(content: string, maxLength: number): ParseResult {
  const text = content.slice(0, maxLength)
  const lines = text.split('\n').filter((l) => l.trim())

  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
    },
    sections: extractSections(lines),
  }
}

function extractSections(lines: string[]): Section[] {
  const sections: Section[] = []
  let currentHeading = ''
  let currentContent: string[] = []

  for (const line of lines) {
    // Detect headings: lines that are short, ALL CAPS, or numbered
    if (
      line.length < 80 &&
      (line === line.toUpperCase() ||
        /^\d+[\.\)]\s/.test(line) ||
        /^(BAB|BAGIAN|CHAPTER|SECTION)\s/i.test(line))
    ) {
      if (currentContent.length > 0) {
        sections.push({
          heading: currentHeading || 'Untitled',
          level: currentHeading ? 1 : 0,
          content: currentContent.join('\n'),
        })
      }
      currentHeading = line
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // Last section
  if (currentContent.length > 0) {
    sections.push({
      heading: currentHeading || 'Untitled',
      level: 1,
      content: currentContent.join('\n'),
    })
  }

  return sections
}
