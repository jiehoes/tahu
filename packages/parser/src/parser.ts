import type { ParseResult, ParserOptions } from './types'
import { parseText } from './parsers/text'
import { parseHtml } from './parsers/html'
import { parseMarkdown } from './parsers/markdown'
import { AppError } from '@tahu/core'

export async function parseDocument(
  content: string | ArrayBuffer,
  mimeType: string,
  fileName: string,
  options: ParserOptions = {},
): Promise<ParseResult> {
  const maxLen = options.maxLength || 500000

  try {
    const type = detectType(mimeType, fileName)
    let result: ParseResult

    switch (type) {
      case 'markdown':
        result = parseMarkdown(content as string, maxLen)
        break
      case 'html':
        result = parseHtml(content as string, maxLen)
        break
      case 'text':
      default:
        // For PDF/DOCX that arrive as text, or plain text files
        result = parseText(content as string, maxLen)
        break
    }

    return result
  } catch (err) {
    throw new AppError(
      'PARSE_ERROR',
      `Failed to parse ${fileName}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      422,
    )
  }
}

function detectType(mimeType: string, fileName: string): 'markdown' | 'html' | 'text' {
  if (mimeType === 'text/markdown' || fileName.endsWith('.md')) return 'markdown'
  if (mimeType === 'text/html' || fileName.endsWith('.html') || fileName.endsWith('.htm'))
    return 'html'
  return 'text'
}
