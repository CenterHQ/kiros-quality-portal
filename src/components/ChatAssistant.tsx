'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { ROLE_LABELS } from '@/lib/types'
import { useChatStream } from '@/hooks/useChatStream'
import { TOOL_LABELS } from '@/lib/chat/sse-protocol'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

// ---------------------------------------------------------------------------
// localStorage keys — persist widget state across page navigations
// ---------------------------------------------------------------------------
const LS_CONV_ID = 'kiros-widget-conversation-id'
const LS_LOADING = 'kiros-widget-loading'
const LS_MESSAGES = 'kiros-widget-messages'

interface GeneratedDocument {
  title: string
  document_type: string
  content: string
  recipient?: string
  generated_at: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  documents?: GeneratedDocument[]
  timestamp: Date
}

// Serializable version for localStorage
interface SerializedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  documents?: GeneratedDocument[]
  timestamp: string
}

function saveWidgetState(convId: string | null, loading: boolean, messages: Message[]) {
  try {
    if (convId) {
      localStorage.setItem(LS_CONV_ID, convId)
    } else {
      localStorage.removeItem(LS_CONV_ID)
    }
    localStorage.setItem(LS_LOADING, loading ? '1' : '0')
    // Only keep last 20 messages to avoid quota issues
    const serialized: SerializedMessage[] = messages.slice(-20).map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      documents: m.documents,
      timestamp: m.timestamp.toISOString(),
    }))
    localStorage.setItem(LS_MESSAGES, JSON.stringify(serialized))
  } catch { /* localStorage may be full or unavailable */ }
}

function loadWidgetState(): { convId: string | null; loading: boolean; messages: Message[] } {
  try {
    const convId = localStorage.getItem(LS_CONV_ID) || null
    const loading = localStorage.getItem(LS_LOADING) === '1'
    const raw = localStorage.getItem(LS_MESSAGES)
    const messages: Message[] = raw
      ? (JSON.parse(raw) as SerializedMessage[]).map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      : []
    return { convId, loading, messages }
  } catch {
    return { convId: null, loading: false, messages: [] }
  }
}

export default function ChatAssistant() {
  const profile = useProfile()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [documentNotification, setDocumentNotification] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const { streamingMessage, activeTools, error: streamError, sendMessage: sendStreamMessage, abort: abortStream } = useChatStream()
  const [speechSupported, setSpeechSupported] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const initRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus() }, [isOpen])

  // ---------------------------------------------------------------------------
  // RESTORE state from localStorage on mount (survives page navigation)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const saved = loadWidgetState()
    if (saved.convId) {
      setConversationId(saved.convId)
      setMessages(saved.messages)
      if (saved.loading) {
        // Was loading when we navigated — show indicator and let realtime pick up the response
        setLoading(true)
        setHasNewMessage(false)
      }
    }
  }, [])

  // ---------------------------------------------------------------------------
  // PERSIST state to localStorage whenever it changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Only persist after initial load
    if (!initRef.current) return
    saveWidgetState(conversationId, loading, messages)
  }, [conversationId, loading, messages])

  // When streaming completes, add message
  useEffect(() => {
    if (streamingMessage && !streamingMessage.isStreaming) {
      if (streamingMessage.text) {
        const docs = (streamingMessage.documents || []) as GeneratedDocument[]
        setMessages(prev => {
          if (streamingMessage.messageId && prev.some(m => m.id === streamingMessage.messageId)) return prev
          return [...prev, {
            id: streamingMessage.messageId || `stream-${Date.now()}`,
            role: 'assistant' as const,
            content: streamingMessage.text,
            documents: docs,
            timestamp: new Date(),
          }]
        })
        if (!isOpen) {
          setHasNewMessage(true)
          if (docs.length > 0) {
            setDocumentNotification(`Document ready: ${docs[0].title}`)
          }
        }
      }
      setLoading(false)
    }
  }, [streamingMessage?.isStreaming, streamingMessage?.messageId, streamingMessage?.text, isOpen])

  // Show stream errors
  useEffect(() => {
    if (streamError) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${streamError}`,
        timestamp: new Date(),
      }])
      setLoading(false)
    }
  }, [streamError])

  // Check speech support on mount
  useEffect(() => {
    setSpeechSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  }, [])

  // ---------------------------------------------------------------------------
  // Realtime subscription: catch assistant messages in the background
  // This fires when:
  //   1. SSE stream dropped (user navigated away while AI was working)
  //   2. waitUntil background processing on the old /api/chat route
  //   3. Document generation completed asynchronously
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`widget-chat-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as { id: string; role: string; content: string; metadata?: Record<string, unknown>; created_at: string }
        if (msg.role === 'assistant') {
          const meta = msg.metadata as Record<string, unknown> | undefined
          const docs = meta && 'documents' in meta
            ? meta.documents as GeneratedDocument[]
            : undefined

          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, {
              id: msg.id,
              role: 'assistant',
              content: msg.content,
              documents: docs || [],
              timestamp: new Date(msg.created_at),
            }]
          })

          // Notify user
          if (!isOpen) {
            setHasNewMessage(true)
            setDocumentNotification(
              docs && docs.length > 0
                ? `Document ready: ${docs[0].title}`
                : null
            )
          }

          setLoading(false)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, isOpen])

  // ---------------------------------------------------------------------------
  // On mount with a loading conversationId: poll once to check if response
  // already arrived while we were unmounted (covers the gap between unmount
  // and realtime subscription reconnect)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!conversationId || !loading) return

    const checkForResponse = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('chat_messages')
          .select('id, role, content, metadata, created_at')
          .eq('conversation_id', conversationId)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)

        if (data && data.length > 0) {
          const latest = data[0]
          setMessages(prev => {
            // Check if this message is newer than the last user message
            const lastUserIdx = [...prev].reverse().findIndex(m => m.role === 'user')
            if (lastUserIdx === -1) return prev
            const lastUserMsg = prev[prev.length - 1 - lastUserIdx]
            const assistantTime = new Date(latest.created_at)
            if (assistantTime <= lastUserMsg.timestamp) return prev // response is older than last question

            if (prev.some(m => m.id === latest.id)) return prev

            const meta = latest.metadata as Record<string, unknown> | undefined
            const docs = meta && 'documents' in meta
              ? meta.documents as GeneratedDocument[]
              : undefined

            return [...prev, {
              id: latest.id,
              role: 'assistant' as const,
              content: latest.content,
              documents: docs || [],
              timestamp: new Date(latest.created_at),
            }]
          })

          setLoading(false)
          if (!isOpen) setHasNewMessage(true)
        }
      } catch { /* non-critical */ }
    }

    // Small delay to let realtime subscription connect first
    const timer = setTimeout(checkForResponse, 1000)
    return () => clearTimeout(timer)
  }, [conversationId, loading, isOpen])

  // Don't show the floating widget on the full chat page
  if (pathname === '/chat') return null

  const toggleVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-AU'

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(prev => {
        const base = prev.split('\u{1F399}\u{FE0F}')[0].trim()
        return base ? `${base} ${transcript}` : transcript
      })
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: userMessage, timestamp: new Date() }])
    setLoading(true)

    const result = await sendStreamMessage({
      conversationId,
      message: userMessage,
    })

    if (!conversationId && result.conversationId) setConversationId(result.conversationId)
  }

  const startNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setLoading(false)
    setHasNewMessage(false)
    setDocumentNotification(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const roleLabel = ROLE_LABELS[profile.role] || 'Staff'

  return (
    <>
      {/* Status indicator — visible when processing or new message, even with panel closed */}
      {!isOpen && (loading || hasNewMessage || documentNotification) && (
        <div className={`hidden md:block fixed bottom-[88px] right-6 z-50 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg whitespace-nowrap transition-all max-w-[280px] truncate ${
          documentNotification
            ? 'bg-blue-500 text-white animate-bounce'
            : hasNewMessage
              ? 'bg-green-500 text-white animate-bounce'
              : 'bg-card text-primary border border-primary/20'
        }`}>
          {documentNotification ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {documentNotification}
            </span>
          ) : hasNewMessage ? '\u2713 New response ready' : (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              Kiros AI is working...
            </span>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) { setHasNewMessage(false); setDocumentNotification(null) } }}
        className={`hidden md:flex fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg items-center justify-center text-primary-foreground z-50 hover:scale-105 transition-transform bg-primary ${(hasNewMessage || documentNotification) && !isOpen ? 'animate-pulse ring-4 ring-purple-300/50' : ''}`}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
        title="Kiros AI Assistant"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Mini chat panel */}
      {isOpen && (
        <div className="hidden md:flex fixed bottom-24 right-6 w-[420px] h-[550px] bg-card rounded-2xl shadow-2xl border border-border flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-border bg-primary text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">K</div>
              <div>
                <div className="text-white text-sm font-semibold">Kiros AI</div>
                <div className="text-white/60 text-xs">{roleLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                aria-label="Expand to full chat page"
                title="Open full chat"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </Link>
              <button
                onClick={startNewConversation}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                aria-label="Start new conversation"
                title="New conversation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold mb-3 bg-primary">K</div>
                <div className="text-sm font-medium text-foreground mb-1">Kiros AI</div>
                <div className="text-xs text-muted-foreground mb-4">Ask about operations, policies, QIP, or generate documents.</div>
                <div className="space-y-1.5 w-full">
                  <button onClick={() => setInput('What are our QIP goals?')} className="w-full text-left px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground hover:bg-accent transition-colors">
                    What are our QIP goals?
                  </button>
                  <button onClick={() => setInput('What items are overdue?')} className="w-full text-left px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground hover:bg-accent transition-colors">
                    What items are overdue?
                  </button>
                  <Link href="/chat" className="block text-center text-xs font-semibold mt-3 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-200">
                    Open full chat for documents &amp; history &rarr;
                  </Link>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' ? (
                    <>
                      <MarkdownRenderer content={msg.content} compact />
                      {msg.documents && msg.documents.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.documents.map((doc, i) => (
                            <Link
                              key={i}
                              href="/chat"
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="truncate font-medium">{doc.title}</span>
                              <span className="text-blue-400 ml-auto flex-shrink-0">Open &rarr;</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streamingMessage?.isStreaming && streamingMessage.text && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted text-foreground px-3 py-2 text-sm space-y-2">
                  <MarkdownRenderer content={streamingMessage.text} compact />
                  {activeTools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {activeTools.map(tool => (
                        <span key={tool} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-600">
                          <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                          {TOOL_LABELS[tool] || tool}
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={abortStream} className="text-xs text-muted-foreground hover:text-red-500">Stop</button>
                </div>
              </div>
            )}

            {/* Loading indicator — waiting for response (including background reconnect) */}
            {loading && (!streamingMessage?.text) && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Kiros AI is working...</span>
                  </div>
                  {activeTools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {activeTools.map(tool => (
                        <span key={tool} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-600">
                          <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                          {TOOL_LABELS[tool] || tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-border">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="flex-1 resize-none rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent max-h-20 bg-muted text-foreground"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl text-primary-foreground bg-primary disabled:opacity-30 transition-opacity flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              {speechSupported && (
                <button
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                  }`}
                  aria-label={isRecording ? 'Stop recording' : 'Voice input'}
                  disabled={loading}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
