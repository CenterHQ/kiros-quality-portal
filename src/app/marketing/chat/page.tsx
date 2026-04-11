'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMarketingChatStream } from '@/hooks/useMarketingChatStream'
import { PageHeader } from '@/components/ui/page-header'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'
import { Send, Bot, User, Loader2, Plus, MessageSquare, Wrench } from 'lucide-react'
import type { MarketingConversation, MarketingMessage } from '@/lib/marketing/types'

export default function MarketingChatPage() {
  const [conversations, setConversations] = useState<MarketingConversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MarketingMessage[]>([])
  const [input, setInput] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { streamingMessage, activeTools, error, sendMessage, abort } = useMarketingChatStream()

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId)
  }, [activeConvId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage?.text])

  async function loadConversations() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50)
    setConversations(data || [])
  }

  async function loadMessages(convId: string) {
    setLoadingMessages(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_messages')
      .select('*')
      .eq('conversation_id', convId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoadingMessages(false)
  }

  async function handleSend() {
    if (!input.trim() || streamingMessage?.isStreaming) return

    const messageText = input
    setInput('')

    // Optimistically add user message
    const optimisticMsg: MarketingMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId || '',
      role: 'user',
      content: messageText,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])

    const result = await sendMessage({
      conversationId: activeConvId,
      message: messageText,
    })

    if (result.conversationId && result.conversationId !== activeConvId) {
      setActiveConvId(result.conversationId)
      loadConversations()
    }
  }

  // When streaming completes, reload messages to get the persisted version
  useEffect(() => {
    if (streamingMessage && !streamingMessage.isStreaming && activeConvId) {
      loadMessages(activeConvId)
    }
  }, [streamingMessage?.isStreaming])

  function startNewConversation() {
    setActiveConvId(null)
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] animate-fade-in">
      {/* Conversation sidebar */}
      <div className="w-64 border-r border-border flex flex-col shrink-0 hidden md:flex">
        <div className="p-3 border-b border-border">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                activeConvId === conv.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <MessageSquare className="size-3.5 inline mr-1.5 opacity-60" />
              {conv.title || 'New conversation'}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary">
            <Bot className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Marketing AI</h2>
            <p className="text-xs text-muted-foreground">Your marketing assistant for social media, content, and campaigns</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streamingMessage && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Kiros Marketing AI</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                I can help you create social media posts, draft review responses, generate ad copy, analyse marketing performance, and manage your content calendar.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {[
                  'Write a Facebook post about our NAIDOC week celebrations',
                  'Draft a response to our latest Google review',
                  'Create Instagram content for our open day next month',
                  'Generate a weekly marketing performance summary',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="text-left px-3 py-2 rounded-lg border border-border text-xs hover:bg-accent transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="size-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-muted'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <MarkdownRenderer content={msg.content} />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="size-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-1">
                  <User className="size-3.5" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming message */}
          {streamingMessage && streamingMessage.isStreaming && (
            <div className="flex gap-3">
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-muted">
                {activeTools.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Wrench className="size-3 animate-spin" />
                    Using: {activeTools.join(', ')}
                  </div>
                )}
                {streamingMessage.text ? (
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={streamingMessage.text} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Marketing AI anything..."
              rows={1}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[42px] max-h-[120px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={e => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={streamingMessage?.isStreaming ? abort : handleSend}
              disabled={!input.trim() && !streamingMessage?.isStreaming}
              className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {streamingMessage?.isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
