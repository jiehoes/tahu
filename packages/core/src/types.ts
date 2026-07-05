import { z } from 'zod'

// ─── Document ────────────────────────────────────────────

export const DocumentStatus = z.enum(['processing', 'completed', 'failed'])
export type DocumentStatus = z.infer<typeof DocumentStatus>

export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500),
  category: z.string().nullable().default(null),
  status: DocumentStatus.default('processing'),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
  storageKey: z.string(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Document = z.infer<typeof DocumentSchema>

export const CreateDocumentInput = DocumentSchema.pick({
  title: true,
  category: true,
  tags: true,
}).extend({
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
})
export type CreateDocumentInput = z.infer<typeof CreateDocumentInput>

// ─── Wiki Article ─────────────────────────────────────────

export const WikiStatus = z.enum(['draft', 'published', 'archived'])
export type WikiStatus = z.infer<typeof WikiStatus>

export const WikiArticleSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500),
  content: z.string(),
  contentKey: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  status: WikiStatus.default('draft'),
  currentVersion: z.number().int().positive().default(1),
  tags: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type WikiArticle = z.infer<typeof WikiArticleSchema>

// ─── API ──────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})
export type PaginationParams = z.infer<typeof PaginationSchema>

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    nextCursor: string | null
    hasMore: boolean
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ─── Search ───────────────────────────────────────────────

export const SearchType = z.enum(['fulltext', 'semantic', 'hybrid'])
export type SearchType = z.infer<typeof SearchType>

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  type: SearchType.default('fulltext'),
  filters: z
    .object({
      category: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(50).default(10),
})
export type SearchQuery = z.infer<typeof SearchQuerySchema>

// ─── Knowledge Candidate ──────────────────────────────────

export const CandidateStatus = z.enum(['pending_review', 'approved', 'rejected'])
export type CandidateStatus = z.infer<typeof CandidateStatus>

export const CandidateSource = z.enum(['chat', 'document', 'agent', 'manual'])
export type CandidateSource = z.infer<typeof CandidateSource>
