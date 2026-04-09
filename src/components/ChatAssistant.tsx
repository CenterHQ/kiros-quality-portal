'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/lib/ProfileContext'
import { ROLE_LABELS } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatAssistant() {
  const profile = useProfile()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus() }, [isOpen])

  // Don't show the floating widget on the full chat page
  if (pathname === '/chat') return null

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: userMessage, timestamp: new Date() }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: userMessage }),
      })
      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: `Error: ${data.error}`, timestamp: new Date() }])
      } else {
        if (!conversationId && data.conversationId) setConversationId(data.conversationId)
        setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: data.message, timestamp: new Date() }])
      }
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'Connection error. Please try again.', timestamp: new Date() }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const roleLabel = ROLE_LABELS[profile.role] || 'Staff'

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white z-50 hover:scale-105 transition-transform"
        style={{ backgroundColor: '#470DA8' }}
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
        <div className="fixed bottom-24 right-6 w-[420px] h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden max-sm:w-[calc(100vw-24px)] max-sm:h-[calc(100vh-120px)] max-sm:right-3 max-sm:bottom-20">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#470DA8' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">K</div>
              <div>
                <div className="text-white text-sm font-semibold">Kiros AI</div>
                <div className="text-white/60 text-[10px]">{roleLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href="/chat"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Open full chat"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </a>
              <button
                onClick={() => { setMessages([]); setConversationId(null) }}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
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
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mb-3" style={{ backgroundColor: '#470DA8' }}>K</div>
                <div className="text-sm font-medium text-gray-700 mb-1">Kiros AI</div>
                <div className="text-xs text-gray-400 mb-4">Ask about operations, policies, QIP, or generate documents.</div>
                <div className="space-y-1.5 w-full">
                  <button onClick={() => setInput('What are our QIP goals?')} className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                    What are our QIP goals?
                  </button>
                  <button onClick={() => setInput('What items are overdue?')} className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                    What items are overdue?
                  </button>
                  <a href="/chat" className="block text-center text-xs text-purple-600 hover:text-purple-800 font-medium mt-3">
                    Open full chat for documents & history &rarr;
                  </a>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-md'
                    : 'bg-gray-50 text-gray-800 rounded-bl-md'
                }`} style={msg.role === 'user' ? { backgroundColor: '#470DA8' } : undefined}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1 [&_li]:text-sm [&_h1]:text-sm [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-xs [&_table]:text-[11px] [&_code]:text-xs [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_blockquote]:text-xs [&_blockquote]:border-l-purple-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 rounded-2xl rounded-bl-md px-3 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-gray-400">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-gray-100">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-transparent max-h-20 bg-gray-50"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl text-white disabled:opacity-30 transition-opacity flex-shrink-0"
                style={{ backgroundColor: '#470DA8' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
