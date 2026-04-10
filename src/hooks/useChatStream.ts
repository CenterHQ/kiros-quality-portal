import { useState, useCallback, useRef } from 'react'
import type { SSEEvent } from '@/lib/chat/sse-protocol'

interface StreamMessage {
  text: string
  isStreaming: boolean
  documents: unknown[]
  pendingActions: unknown[]
  messageId: string | null
}

interface UseChatStreamReturn {
  streamingMessage: StreamMessage | null
  activeTools: string[]
  error: string | null
  model: string | null
  sendMessage: (params: {
    conversationId: string | null
    message: string
    attachments?: unknown[]
  }) => Promise<{ conversationId: string | null }>
  abort: () => void
}

export function useChatStream(): UseChatStreamReturn {
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
    attachments?: unknown[]
  }): Promise<{ conversationId: string | null }> => {
    // Reset state
    setError(null)
    setActiveTools([])
    setModel(null)
    textBufferRef.current = ''
    setStreamingMessage({
      text: '',
      isStreaming: true,
      documents: [],
      pendingActions: [],
      messageId: null,
    })

    // Setup abort controller
    abortControllerRef.current = new AbortController()

    let resolvedConvId: string | null = params.conversationId

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: params.conversationId,
          message: params.message,
          attachments: params.attachments,
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

        // Parse SSE events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        let eventType = ''
        for (const line of lines) {
          if (line === '') {
            // Empty line marks end of SSE event — reset state
            eventType = ''
          } else if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)

              if (eventType === 'conversation') {
                // Conversation ID event
                if (data.conversationId) {
                  resolvedConvId = data.conversationId
                }
              } else if (eventType === 'delta' || eventType === 'status' || eventType === 'done' || eventType === 'error') {
                const sseEvent = data as SSEEvent

                switch (sseEvent.type) {
                  case 'text_delta':
                    textBufferRef.current += sseEvent.text
                    setStreamingMessage(prev => prev ? {
                      ...prev,
                      text: textBufferRef.current,
                    } : null)
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
                    setStreamingMessage(prev => prev ? {
                      ...prev,
                      isStreaming: false,
                      messageId: sseEvent.messageId,
                      documents: sseEvent.documents,
                      pendingActions: sseEvent.pending_actions,
                    } : null)
                    setActiveTools([])
                    break

                  case 'error':
                    setError(sseEvent.message)
                    setStreamingMessage(prev => prev ? { ...prev, isStreaming: false } : null)
                    break
                }
              }
            } catch {
              // Invalid JSON line, skip
            }
            eventType = '' // Reset after processing data
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — finalize current state
        setStreamingMessage(prev => prev ? { ...prev, isStreaming: false } : null)
      } else {
        const errMsg = err instanceof Error ? err.message : 'Connection error'
        setError(errMsg)
        setStreamingMessage(null)
      }
    }

    return { conversationId: resolvedConvId }
  }, [])

  return { streamingMessage, activeTools, error, model, sendMessage, abort }
}
