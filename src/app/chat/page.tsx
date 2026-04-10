'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const [conversationLoading, setConversationLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [pendingActions, setPendingActions] = useState<Record<string, { action: any; status: 'pending' | 'confirmed' | 'cancelled'; result?: string }>>({})
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)
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

  // Realtime subscription: watch for new assistant messages in active conversation
  // This enables background processing — response arrives even if user navigated away
  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as { id: string; role: string; content: string; metadata?: Record<string, unknown>; created_at: string }
        if (msg.role === 'assistant') {
          const meta = msg.metadata as Record<string, unknown> | undefined

          // Extract documents from metadata
          const docs = meta && 'documents' in meta
            ? meta.documents as GeneratedDocument[]
            : undefined

          // Extract pending actions from metadata
          if (meta && 'pending_actions' in meta) {
            const actions = meta.pending_actions as Array<{ id: string; action_type: string; description: string; details: Record<string, unknown> }>
            const newActions: Record<string, { action: unknown; status: 'pending' }> = {}
            for (const action of actions) {
              newActions[action.id] = { action, status: 'pending' }
            }
            setPendingActions(prev => ({ ...prev, ...newActions }))
          }

          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, {
              id: msg.id,
              role: 'assistant',
              content: msg.content,
              documents: docs || [],
              timestamp: new Date(msg.created_at),
            }]
          })
          setLoading(false)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const loadConversations = async () => {
    const res = await fetch('/api/chat/conversations')
    const data = await res.json()
    setConversations(data.conversations || [])
  }

  const loadConversation = async (convId: string) => {
    setConversationId(convId)
    setConversationLoading(true)
    setSidebarOpen(false)
    try {
      const res = await fetch(`/api/chat/conversations?id=${convId}`)
      const data = await res.json()
      setMessages((data.messages || []).map((m: { id: string; role: string; content: string; documents?: GeneratedDocument[]; created_at: string }) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        documents: m.documents || [],
        timestamp: new Date(m.created_at),
      })))
    } catch {
      setMessages([])
    }
    setConversationLoading(false)
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
        setLoading(false)
      } else {
        // API returns immediately with conversationId + status: 'processing'
        // The actual AI response will arrive via Supabase realtime subscription
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId)
          loadConversations()
        }
        // Keep loading=true — realtime subscription will set it to false when response arrives
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I couldn\'t connect to the server. Please try again.',
        timestamp: new Date(),
      }])
      setLoading(false)
    }
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

  const handleConfirmAction = async (actionId: string, action: any, confirmed: boolean) => {
    setPendingActions(prev => ({ ...prev, [actionId]: { ...prev[actionId], status: confirmed ? 'confirmed' : 'cancelled' } }))
    try {
      const res = await fetch('/api/chat/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, confirmed, pendingAction: action }),
      })
      const data = await res.json()
      setPendingActions(prev => ({ ...prev, [actionId]: { ...prev[actionId], status: confirmed ? 'confirmed' : 'cancelled', result: data.message || data.error } }))
    } catch {
      setPendingActions(prev => ({ ...prev, [actionId]: { ...prev[actionId], result: 'Failed to process' } }))
    }
  }

  const handleExportDocument = async (doc: GeneratedDocument, format: string) => {
    setExportingFormat(`${doc.title}-${format}`)
    try {
      const res = await fetch('/api/documents/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          content: doc.content,
          format,
          recipient: doc.recipient,
          author: 'Kiros AI Assistant',
        }),
      })

      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'docx' ? 'docx' : format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : format === 'html' ? 'html' : 'md'
      a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
    setExportingFormat(null)
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
    <div className="flex h-full w-full overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - fixed on mobile, relative on desktop */}
      <div
        className={`
          flex-shrink-0 flex flex-col bg-white border-r border-gray-200 transition-all duration-200
          ${sidebarOpen
            ? 'w-70 max-sm:fixed max-sm:inset-y-0 max-sm:left-0 max-sm:z-50 max-sm:w-80 max-sm:shadow-xl'
            : 'w-0'
          }
          overflow-hidden
        `}
      >
        {/* Sidebar header */}
        <div className="flex-shrink-0 p-3 border-b border-gray-100 flex items-center gap-2">
          <button
            onClick={startNewConversation}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#470DA8' }}
            aria-label="Start new conversation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New conversation
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors sm:hidden"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sidebar conversation list - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
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
                <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <span>{new Date(conv.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                  <span className="inline-block w-0.5 h-0.5 rounded-full bg-gray-300" />
                  <span className="truncate">{conv.title ? conv.title.slice(0, 30) : 'No preview'}</span>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-all"
                title="Delete"
                aria-label={`Delete conversation: ${conv.title || 'Untitled'}`}
              >
                <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center text-gray-400 py-12 px-4">
              <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-xs font-medium text-gray-400">No conversations yet</p>
              <p className="text-[10px] text-gray-300 mt-1">Start a new chat to get going</p>
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">
          Powered by Anthropic Claude
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Chat header - fixed height, never shrinks */}
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#470DA8' }}>K</div>
              <div>
                <div className="text-sm font-semibold text-gray-800">Kiros AI</div>
                <div className="text-[10px] text-gray-400 hidden sm:block">ECEC Operations Expert &middot; {roleLabel}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages area - flex-1 + min-h-0 is the key pattern for scrollable flex children */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-full sm:max-w-3xl mx-auto px-4 py-6 space-y-6">
            {/* Conversation loading skeleton */}
            {conversationLoading && messages.length === 0 && (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-purple-200 flex-shrink-0" />}
                    <div className={`${i % 2 === 0 ? 'w-[60%]' : 'w-[70%]'} space-y-2`}>
                      <div className={`h-4 rounded ${i % 2 === 0 ? 'bg-purple-100' : 'bg-gray-200'}`} />
                      <div className={`h-4 rounded w-[80%] ${i % 2 === 0 ? 'bg-purple-100' : 'bg-gray-200'}`} />
                      {i % 2 !== 0 && <div className="h-4 rounded bg-gray-200 w-[50%]" />}
                    </div>
                    {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {messages.length === 0 && !conversationLoading && (
              <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-purple-50/40 via-transparent to-transparent rounded-3xl">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4" style={{ backgroundColor: '#470DA8' }}>K</div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Kiros AI Assistant</h2>
                <p className="text-sm text-gray-500 mb-6 text-center max-w-md px-4">
                  Your ECEC operations expert. Ask about policies, QIP goals, compliance, programming, or ask me to generate documents.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg px-4">
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

                <div className={`max-w-[90%] sm:max-w-[80%] group relative ${msg.role === 'user' ? 'order-first' : ''}`}>
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

                      {/* Pending Action Confirmation Cards */}
                      {Object.entries(pendingActions).filter(([, v]) => v.status === 'pending').map(([actionId, { action }]) => (
                        <div key={actionId} className="border-2 border-amber-200 rounded-xl overflow-hidden bg-amber-50">
                          <div className="px-4 py-3 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-amber-800">{action.description}</div>
                              <div className="text-xs text-amber-600 mt-1">
                                {action.action_type === 'create_task' && `Priority: ${action.details.priority || 'medium'} • ${action.details.assigned_to_name ? `Assigned to: ${action.details.assigned_to_name}` : 'Unassigned'} • ${action.details.due_date ? `Due: ${action.details.due_date}` : 'No due date'}`}
                                {action.action_type === 'assign_training' && `Module: ${action.details.module_title} • Staff: ${action.details.staff_name}`}
                                {action.action_type === 'update_item' && `${action.details.item_type}: ${JSON.stringify(action.details.updates)}`}
                                {action.action_type === 'create_checklist' && `Template: ${action.details.template_name}`}
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  onClick={() => handleConfirmAction(actionId, action, true)}
                                  className="px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleConfirmAction(actionId, action, false)}
                                  className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Confirmed/Cancelled action results */}
                      {Object.entries(pendingActions).filter(([, v]) => v.status !== 'pending').map(([actionId, { action, status, result }]) => (
                        <div key={actionId} className={`rounded-xl px-4 py-2 text-xs ${status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                          {status === 'confirmed' ? '✓' : '✗'} {action.description} — {result || (status === 'confirmed' ? 'Done' : 'Cancelled')}
                        </div>
                      ))}

                      {/* Document cards */}
                      {msg.documents && msg.documents.length > 0 && msg.documents.map((doc, di) => (
                        <div key={di} className="border border-purple-200 rounded-xl overflow-hidden bg-white">
                          <div className="px-4 py-3 bg-purple-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-purple-800 truncate">{doc.title}</div>
                                <div className="text-[10px] text-purple-500">{doc.document_type} &middot; {new Date(doc.generated_at).toLocaleDateString('en-AU')}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 flex-shrink-0">
                              <button onClick={() => setExpandedDoc(expandedDoc === `${msg.id}-${di}` ? null : `${msg.id}-${di}`)}
                                className="px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                                {expandedDoc === `${msg.id}-${di}` ? 'Collapse' : 'Preview'}
                              </button>
                              {(['pdf', 'docx', 'xlsx', 'html', 'md'] as const).map(fmt => (
                                <button key={fmt} onClick={() => handleExportDocument(doc, fmt)}
                                  className="px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors uppercase">
                                  {fmt}
                                </button>
                              ))}
                            </div>
                          </div>
                          {expandedDoc === `${msg.id}-${di}` && (
                            <div className="px-4 py-4 border-t border-purple-100 max-h-64 sm:max-h-96 overflow-y-auto prose prose-sm max-w-none [&_h1]:text-base [&_h2]:text-sm [&_table]:text-xs [&_th]:bg-gray-50 [&_th]:px-2 [&_td]:px-2">
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
                          aria-label="Copy message to clipboard"
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
                  <span className="text-xs text-gray-400">Kiros AI is working... you can navigate away and come back</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - never shrinks, always visible at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
          <div className="max-w-full sm:max-w-3xl mx-auto">
            <div className={`flex items-end gap-3 rounded-2xl border transition-all px-4 py-2 ${loading ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-gray-50 border-gray-200 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-200'}`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={loading ? 'Waiting for response...' : 'Ask about operations, policies, QIP... or ask me to generate a document'}
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none placeholder:text-gray-400 py-1 disabled:cursor-not-allowed"
                rows={1}
                style={{ maxHeight: '200px' }}
                disabled={loading}
                aria-label="Message input"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 flex-shrink-0"
                style={{ backgroundColor: '#470DA8' }}
                aria-label="Send message"
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
