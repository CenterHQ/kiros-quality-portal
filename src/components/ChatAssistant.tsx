'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useProfile } from '@/lib/ProfileContext'
import { ROLE_LABELS } from '@/lib/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title?: string
  updated_at: string
}

export default function ChatAssistant() {
  const profile = useProfile()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showConversations, setShowConversations] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const loadConversations = async () => {
    const res = await fetch('/api/chat/conversations')
    const data = await res.json()
    setConversations(data.conversations || [])
  }

  const loadConversation = async (convId: string) => {
    setConversationId(convId)
    setShowConversations(false)
    // Messages will be loaded from the API response context
    setMessages([])
  }

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setShowConversations(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }])
    setLoading(true)
    setToolStatus(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I encountered an error: ${data.error}`,
          timestamp: new Date(),
        }])
      } else {
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId)
        }
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I couldn\'t connect to the server. Please try again.',
        timestamp: new Date(),
      }])
    }

    setLoading(false)
    setToolStatus(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const roleLabel = ROLE_LABELS[profile.role] || 'Staff'

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) loadConversations() }}
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

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden max-sm:w-[calc(100vw-24px)] max-sm:h-[calc(100vh-120px)] max-sm:right-3 max-sm:bottom-20">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#470DA8' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">K</div>
              <div>
                <div className="text-white text-sm font-semibold">Kiros AI</div>
                <div className="text-white/70 text-[10px]">{roleLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowConversations(!showConversations); loadConversations() }}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Conversations"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
              <button
                onClick={startNewConversation}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="New conversation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Conversation list overlay */}
          {showConversations && (
            <div className="absolute inset-0 top-[52px] bg-white z-10 overflow-y-auto">
              <div className="p-3 space-y-1">
                <button
                  onClick={startNewConversation}
                  className="w-full text-left px-3 py-2 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
                >
                  + New conversation
                </button>
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors ${
                      conv.id === conversationId ? 'bg-gray-100 font-medium' : 'text-gray-600'
                    }`}
                  >
                    <div className="truncate">{conv.title || 'Untitled'}</div>
                    <div className="text-[10px] text-gray-400">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">No conversations yet</div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mb-3" style={{ backgroundColor: '#470DA8' }}>K</div>
                <div className="text-sm font-medium text-gray-700 mb-1">Kiros AI Assistant</div>
                <div className="text-xs text-gray-400 mb-4">Your childcare operations expert, grounded in your centre&apos;s policies, QIP, and the NQS.</div>
                <div className="space-y-2 w-full">
                  {profile.role === 'admin' && (
                    <button onClick={() => { setInput('Give me a summary of our current QA progress'); }} className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                      &ldquo;Give me a summary of our QA progress&rdquo;
                    </button>
                  )}
                  {['admin', 'ns', 'manager'].includes(profile.role) && (
                    <button onClick={() => { setInput('What items are overdue across the centre?'); }} className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                      &ldquo;What items are overdue across the centre?&rdquo;
                    </button>
                  )}
                  <button onClick={() => { setInput('What are our QIP goals for QA1?'); }} className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                    &ldquo;What are our QIP goals for QA1?&rdquo;
                  </button>
                  {profile.role === 'educator' && (
                    <button onClick={() => { setInput('How should I handle a child who is having difficulty with transitions?'); }} className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                      &ldquo;How should I handle transitions?&rdquo;
                    </button>
                  )}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    {toolStatus && (
                      <span className="text-[10px] text-gray-400">{toolStatus}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about operations, policies, QIP..."
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent max-h-24"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: '#470DA8' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
