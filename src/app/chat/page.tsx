'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useProfile } from '@/lib/ProfileContext'
import { ROLE_LABELS } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  documents?: GeneratedDocument[]
  timestamp: Date
}

interface GeneratedDocument {
  title: string
  document_type: string
  content: string
  recipient?: string
  generated_at: string
}

interface Conversation {
  id: string
  title?: string
  created_at: string
  updated_at: string
}

export default function ChatPage() {
  const profile = useProfile()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [conversationId])

  const loadConversations = async () => {
    const res = await fetch('/api/chat/conversations')
    const data = await res.json()
    setConversations(data.conversations || [])
  }

  const loadConversation = async (convId: string) => {
    setConversationId(convId)
    const res = await fetch(`/api/chat/conversations?id=${convId}`)
    const data = await res.json()
    setMessages((data.messages || []).map((m: { id: string; role: string; content: string; created_at: string }) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      documents: extractDocuments(m.content),
      timestamp: new Date(m.created_at),
    })))
  }

  const deleteConversation = async (convId: string) => {
    await fetch('/api/chat/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: convId }),
    })
    if (conversationId === convId) {
      setConversationId(null)
      setMessages([])
    }
    loadConversations()
  }

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
  }

  // Extract document blocks from assistant messages
  const extractDocuments = (content: string): GeneratedDocument[] => {
    // Documents are embedded as JSON in the response when the tool is used
    // The AI references them in its response text
    return []
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    // Auto-resize textarea back
    if (inputRef.current) inputRef.current.style.height = 'auto'

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: userMessage }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `I encountered an error: ${data.error}`,
          timestamp: new Date(),
        }])
      } else {
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId)
          loadConversations()
        }

        // Check if response contains document references
        const docs = data.documents || []

        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          documents: docs,
          timestamp: new Date(),
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I couldn\'t connect to the server. Please try again.',
        timestamp: new Date(),
      }])
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadDocument = (doc: GeneratedDocument) => {
    const blob = new Blob([doc.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadAsHtml = (doc: GeneratedDocument) => {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${doc.title}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6; }
h1 { color: #470DA8; border-bottom: 2px solid #470DA8; padding-bottom: 8px; }
h2 { color: #333; margin-top: 24px; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background: #f5f5f5; font-weight: 600; }
ul, ol { padding-left: 24px; }
blockquote { border-left: 3px solid #470DA8; margin: 16px 0; padding: 8px 16px; background: #f9f7fc; }
.header { text-align: center; margin-bottom: 32px; }
.header img { max-width: 120px; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
@media print { body { margin: 20px; } }
</style></head><body>
<div class="header">
<h1>${doc.title}</h1>
<p style="color: #666;">Kiros Early Education &mdash; ${new Date(doc.generated_at).toLocaleDateString('en-AU', { dateStyle: 'long' })}</p>
${doc.recipient ? `<p style="color: #666;">Prepared for: ${doc.recipient}</p>` : ''}
</div>
${doc.content.replace(/^# .+\n?/m, '').replace(/^## /gm, '<h2>').replace(/<h2>(.+)/gm, '<h2>$1</h2>').replace(/^### /gm, '<h3>').replace(/<h3>(.+)/gm, '<h3>$1</h3>').replace(/\n\n/g, '</p><p>').replace(/^- /gm, '<li>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}
<div class="footer">
<p>Generated by Kiros AI Assistant &mdash; ${new Date(doc.generated_at).toLocaleString('en-AU')}</p>
<p>Kiros Early Education Centre, Bidwill NSW</p>
</div>
</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const roleLabel = ROLE_LABELS[profile.role] || 'Staff'

  const suggestedPrompts = [
    ...(profile.role === 'admin' ? [
      'Generate a board report summarising our current NQS progress',
      'Draft a parent newsletter about our recent improvements',
    ] : []),
    ...(['admin', 'ns', 'manager'].includes(profile.role) ? [
      'What items are overdue across the centre?',
      'Draft a staff meeting agenda for this month',
      'Create a compliance checklist for QA2',
    ] : []),
    ...(['el', 'educator'].includes(profile.role) ? [
      'How should I document a child-led inquiry about nature?',
      'What does our QIP say about intentional teaching?',
      'Draft a weekly reflection template for my room',
    ] : []),
    'What are our QIP goals for QA1?',
    'Explain our behaviour guidance approach',
  ]

  return (
    <div className="flex h-[calc(100vh-48px)] -m-6 bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden flex-shrink-0`}>
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#470DA8' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.map(conv => (
            <div key={conv.id} className="group relative">
              <button
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  conv.id === conversationId
                    ? 'bg-purple-50 text-purple-800 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="truncate pr-6">{conv.title || 'Untitled'}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(conv.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-all"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-8">No conversations yet</div>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">
          Powered by Anthropic Claude
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#470DA8' }}>K</div>
              <div>
                <div className="text-sm font-semibold text-gray-800">Kiros AI</div>
                <div className="text-[10px] text-gray-400">ECEC Operations Expert &middot; {roleLabel}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4" style={{ backgroundColor: '#470DA8' }}>K</div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Kiros AI Assistant</h2>
                <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
                  Your ECEC operations expert. Ask about policies, QIP goals, compliance, programming, or ask me to generate documents.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                  {suggestedPrompts.slice(0, 4).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1" style={{ backgroundColor: '#470DA8' }}>K</div>
                )}

                <div className={`max-w-[80%] group relative ${msg.role === 'user' ? 'order-first' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="rounded-2xl rounded-tr-md px-4 py-3 text-sm text-white" style={{ backgroundColor: '#470DA8' }}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Markdown rendered content */}
                      <div className="prose prose-sm max-w-none text-gray-800 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_table]:text-xs [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-1.5 [&_td]:px-3 [&_td]:py-1.5 [&_blockquote]:border-l-purple-400 [&_blockquote]:bg-purple-50/50 [&_code]:text-xs [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Document cards */}
                      {msg.documents && msg.documents.length > 0 && msg.documents.map((doc, di) => (
                        <div key={di} className="border border-purple-200 rounded-xl overflow-hidden bg-white">
                          <div className="px-4 py-3 bg-purple-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <div className="text-sm font-medium text-purple-800">{doc.title}</div>
                                <div className="text-[10px] text-purple-500">{doc.document_type} &middot; {new Date(doc.generated_at).toLocaleDateString('en-AU')}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setExpandedDoc(expandedDoc === `${msg.id}-${di}` ? null : `${msg.id}-${di}`)}
                                className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                              >
                                {expandedDoc === `${msg.id}-${di}` ? 'Collapse' : 'Preview'}
                              </button>
                              <button
                                onClick={() => downloadDocument(doc)}
                                className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                                title="Download as Markdown"
                              >
                                .md
                              </button>
                              <button
                                onClick={() => downloadAsHtml(doc)}
                                className="px-2.5 py-1 text-xs font-medium text-white rounded-lg transition-colors"
                                style={{ backgroundColor: '#470DA8' }}
                                title="Download as printable HTML"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                          {expandedDoc === `${msg.id}-${di}` && (
                            <div className="px-4 py-4 border-t border-purple-100 max-h-96 overflow-y-auto prose prose-sm max-w-none [&_h1]:text-base [&_h2]:text-sm [&_table]:text-xs [&_th]:bg-gray-50 [&_th]:px-2 [&_td]:px-2">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {doc.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy"
                        >
                          {copiedId === msg.id ? (
                            <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0 mt-1">
                    {profile.full_name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#470DA8' }}>K</div>
                <div className="flex items-center gap-2 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-gray-400">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all px-4 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about operations, policies, QIP... or ask me to generate a document"
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none placeholder:text-gray-400 py-1"
                rows={1}
                style={{ maxHeight: '200px' }}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl text-white disabled:opacity-30 transition-all hover:scale-105 flex-shrink-0"
                style={{ backgroundColor: '#470DA8' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="text-[10px] text-gray-400 text-center mt-2">
              Kiros AI is grounded in your centre&apos;s policies, QIP, and the NQS. It can create tasks, assign training, and generate documents.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
