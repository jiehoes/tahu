import { generateId } from '@tahu/core'

export interface WikiVersion {
  id: string
  wikiId: string
  versionNum: number
  content: string
  changeSummary: string | null
  createdBy: string | null
  createdAt: string
}

/**
 * Create a new version of a wiki article.
 */
export function createVersion(
  wikiId: string,
  versionNum: number,
  content: string,
  changeSummary?: string,
  createdBy?: string,
): WikiVersion {
  return {
    id: generateId(),
    wikiId,
    versionNum,
    content,
    changeSummary: changeSummary || null,
    createdBy: createdBy || null,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Generate a simple diff summary between old and new content.
 */
export function generateChangeSummary(oldContent: string, newContent: string): string {
  const oldLen = oldContent.length
  const newLen = newContent.length
  const diff = newLen - oldLen

  const oldLines = oldContent.split('\n').length
  const newLines = newContent.split('\n').length

  const parts: string[] = []
  if (diff > 0) parts.push(`+${diff} karakter`)
  else if (diff < 0) parts.push(`${diff} karakter`)
  
  const lineDiff = newLines - oldLines
  if (lineDiff > 0) parts.push(`+${lineDiff} baris`)
  else if (lineDiff < 0) parts.push(`${lineDiff} baris`)

  return parts.length > 0 ? parts.join(', ') : 'Tidak ada perubahan signifikan'
}

/**
 * Rollback content to a specific version.
 */
export function rollback(versions: WikiVersion[], targetVersionNum: number): string {
  const target = versions.find((v) => v.versionNum === targetVersionNum)
  if (!target) {
    throw new Error(`Version ${targetVersionNum} not found`)
  }
  return target.content
}
