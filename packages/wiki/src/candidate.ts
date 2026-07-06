import { generateId } from '@tahu/core'

export type CandidateSource = 'chat' | 'document' | 'agent' | 'manual'
export type CandidateStatus = 'pending_review' | 'approved' | 'rejected'

export interface KnowledgeCandidate {
  id: string
  wikiId: string | null
  title: string
  content: string
  source: CandidateSource
  confidenceScore: number
  status: CandidateStatus
  createdBy: string | null
  createdAt: string
  reviewNotes: string | null
  reviewedAt: string | null
}

/**
 * Create a new knowledge candidate proposal.
 */
export function createCandidate(params: {
  wikiId?: string
  title: string
  content: string
  source?: CandidateSource
  confidenceScore?: number
  createdBy?: string
}): KnowledgeCandidate {
  return {
    id: generateId(),
    wikiId: params.wikiId || null,
    title: params.title,
    content: params.content,
    source: params.source || 'manual',
    confidenceScore: params.confidenceScore ?? 0.5,
    status: 'pending_review',
    createdBy: params.createdBy || null,
    createdAt: new Date().toISOString(),
    reviewNotes: null,
    reviewedAt: null,
  }
}

/**
 * Approve a candidate — returns the content ready to be published.
 */
export function approveCandidate(
  candidate: KnowledgeCandidate,
  reviewerId: string,
  notes?: string,
): KnowledgeCandidate {
  return {
    ...candidate,
    status: 'approved',
    reviewNotes: notes || null,
    reviewedAt: new Date().toISOString(),
  }
}

/**
 * Reject a candidate with notes.
 */
export function rejectCandidate(
  candidate: KnowledgeCandidate,
  reviewerId: string,
  notes: string,
): KnowledgeCandidate {
  return {
    ...candidate,
    status: 'rejected',
    reviewNotes: notes,
    reviewedAt: new Date().toISOString(),
  }
}
