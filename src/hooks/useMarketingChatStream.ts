import { useState, useCallback, useRef } from 'react'
import type { SSEEvent } from '@/lib/chat/sse-protocol'

interface StreamMessage {
  text: string
  isStreaming: boolean
  messageId: string | null
}

interface UseMarketingChatStreamReturn {
  streamingMessage: StreamMessage | null
  activeTools: string[]
  error: string | null
  model: string | null
  sendMessage: (params: {
    conversationId: string | null
    message: string
  }) => Promise<{ conversationId: string | null }>
  abort: () => void
}

export function useMarketingChatStream(): UseMarketingChatStreamReturn {
  const [streamingMessage, setStreamingMessage] = useState<StreamMessage | null>(null)
  const [activeTools, setActiveTools] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const textBufferRef = useRef('')

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const sendMessage = useCallback(async (params: {
    conversationId: string | null
    message: string
  }): Promise<{ conversationId: string | null }> => {
    setError(null)
    setActiveTools([])
    setModel(null)
    textBufferRef.current = ''
    setStreamingMessage({ text: '', isStreaming: true, messageId: null })

    abortControllerRef.current = new AbortController()
    let resolvedConvId: string | null = params.conversationId

    try {
      const res = await fetch('/api/marketing/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: params.conversationId,
          message: params.message,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Request failed')
        setError(errText)
        setStreamingMessage(null)
        return { conversationId: resolvedConvId }
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let eventType = ''
        for (const line of lines) {
          if (line === '') {
            eventType = ''
          } else if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (eventType === 'conversation') {
                if (data.conversationId) resolvedConvId = data.conversationId
              } else if (['delta', 'status', 'done', 'error'].includes(eventType)) {
                const sseEvent = data as SSEEvent

                switch (sseEvent.type) {
                  case 'text_delta':
                    textBufferRef.current += sseEvent.text
                    setStreamingMessage(prev => prev ? { ...prev, text: textBufferRef.current } : null)
                    break
                  case 'tool_start':
                    setActiveTools(prev => [...prev, sseEvent.tool])
                    break
                  case 'tool_end':
                    setActiveTools(prev => prev.filter(t => t !== sseEvent.tool))
                    break
                  case 'model':
                    setModel(sseEvent.model)
                    break
                  case 'done':
                    setStreamingMessage(prev => prev ? { ...prev, isStreaming: false, messageId: sseEvent.messageId } : null)
                    setActiveTools([])
                    break
                  case 'error':
                    setError(sseEvent.message)
                    setStreamingMessage(prev => prev ? { ...prev, isStreaming: false } : null)
                    break
                }
              }
            } catch { /* skip invalid JSON */ }
            eventType = ''
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStreamingMessage(prev => prev ? { ...prev, isStreaming: false } : null)
      } else {
        setError(err instanceof Error ? err.message : 'Connection error')
        setStreamingMessage(null)
      }
    }

    return { conversationId: resolvedConvId }
  }, [])

  return { streamingMessage, activeTools, error, model, sendMessage, abort }
}
