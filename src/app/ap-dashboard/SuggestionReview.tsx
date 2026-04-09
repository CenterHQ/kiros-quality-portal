'use client'

import { useState } from 'react'
import type { AiSuggestion } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

interface SuggestionReviewProps {
  suggestions: AiSuggestion[]
}

export default function SuggestionReview({ suggestions: initialSuggestions }: SuggestionReviewProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [processing, setProcessing] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const handleAction = async (suggestionId: string, status: 'approved' | 'rejected') => {
    setProcessing(suggestionId)
    try {
      const res = await fetch('/api/chat/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, status, review_note: reviewNote || undefined }),
      })
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
        setReviewNote('')
      }
    } catch (err) {
      console.error('Failed to update suggestion:', err)
    }
    setProcessing(null)
  }

  if (suggestions.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-4">No pending suggestions</div>
  }

  return (
    <div className="space-y-3">
      {suggestions.map(suggestion => {
        const suggestedByName = (suggestion.profiles as unknown as Record<string, string> | undefined)?.full_name || 'AI'
        const suggestedByRole = (suggestion.profiles as unknown as Record<string, string> | undefined)?.role || ''

        return (
          <div key={suggestion.id} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">{suggestion.title}</span>
                  {suggestion.action_type && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                      {suggestion.action_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{suggestion.content}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                  <span>From: {suggestedByName} ({ROLE_LABELS[suggestedByRole] || suggestedByRole})</span>
                  <span>{new Date(suggestion.created_at).toLocaleDateString('en-AU')}</span>
                  {suggestion.related_qa && suggestion.related_qa.length > 0 && (
                    <span>QA: {suggestion.related_qa.join(', ')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAction(suggestion.id, 'approved')}
                  disabled={processing === suggestion.id}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(suggestion.id, 'rejected')}
                  disabled={processing === suggestion.id}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
