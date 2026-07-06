export interface ParseResult {
  text: string
  metadata: {
    title?: string
    author?: string
    language?: string
    pageCount?: number
    wordCount: number
    charCount: number
  }
  sections: Section[]
}

export interface Section {
  heading: string
  level: number
  content: string
}

export interface ParserOptions {
  maxLength?: number
  extractMetadata?: boolean
  language?: string
}
