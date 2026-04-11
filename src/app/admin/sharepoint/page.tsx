'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectionStatus = 'connected' | 'disconnected' | 'error'

interface SharePointConnection {
  id: string
  tenant_id: string
  client_id: string
  site_id: string
  drive_id: string
  site_url: string
  status: ConnectionStatus
  connected_by: string
  last_synced_at: string | null
  token_expires_at: string | null
}

type DocumentType = 'qip' | 'philosophy' | 'policy' | 'handbook' | 'programming' | 'procedure' | 'other'

interface SharePointDocument {
  id: string
  sharepoint_item_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  extracted_text: string | null
  document_type: DocumentType
  is_monitored: boolean
  last_modified_at: string | null
  last_synced_at: string | null
  last_processed_at: string | null
}

interface CentreContextItem {
  id: string
  document_id: string
  context_type: string
  title: string
  content: string
  related_qa: number[]
  source_quote: string | null
  is_active: boolean
}

interface LmsModule {
  id: string
  title: string
  related_qa: number[]
}

interface LmsModuleCentreContent {
  id: string
  module_id: string
  content_type: string
  title: string
  content: string
  is_active: boolean
  generated_at: string
}

interface SPFile {
  id: string
  name: string
  size: number
  lastModifiedDateTime: string
  folder?: Record<string, unknown>
  file?: { mimeType: string }
}

interface BreadcrumbItem {
  id: string | null
  name: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'qip', label: 'QIP' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'policy', label: 'Policy' },
  { value: 'handbook', label: 'Handbook' },
  { value: 'programming', label: 'Programming' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other' },
]

const DOC_TYPE_COLORS: Record<DocumentType, string> = {
  qip: 'bg-red-100 text-red-700',
  philosophy: 'bg-purple-100 text-purple-700',
  policy: 'bg-blue-100 text-blue-700',
  handbook: 'bg-amber-100 text-amber-700',
  programming: 'bg-green-100 text-green-700',
  procedure: 'bg-cyan-100 text-cyan-700',
  other: 'bg-muted text-foreground',
}

const QA_COLORS: Record<number, string> = {
  1: '#e74c3c', 2: '#e67e22', 3: '#2ecc71', 4: '#3498db',
  5: '#9b59b6', 6: '#1abc9c', 7: '#34495e',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-primary">
        {step}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SharePointAdminPage() {
  const profile = useProfile()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Connection state
  const [connection, setConnection] = useState<SharePointConnection | null>(null)
  const [connectionLoading, setConnectionLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  // Flash messages
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // File browser state
  const [files, setFiles] = useState<SPFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Root' }])
  const [selectedDocTypes, setSelectedDocTypes] = useState<Record<string, DocumentType>>({})
  const [syncingFiles, setSyncingFiles] = useState<Set<string>>(new Set())
  const [syncedItemIds, setSyncedItemIds] = useState<Set<string>>(new Set())

  // Synced documents state
  const [documents, setDocuments] = useState<SharePointDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [processingDocs, setProcessingDocs] = useState<Set<string>>(new Set())
  const [resyncingDocs, setResyncingDocs] = useState<Set<string>>(new Set())

  // Centre context state
  const [contextItems, setContextItems] = useState<CentreContextItem[]>([])
  const [contextLoading, setContextLoading] = useState(false)
  const [togglingContext, setTogglingContext] = useState<Set<string>>(new Set())
  const [deletingContext, setDeletingContext] = useState<Set<string>>(new Set())

  // Module contextualisation state
  const [modules, setModules] = useState<LmsModule[]>([])
  const [moduleCentreContent, setModuleCentreContent] = useState<LmsModuleCentreContent[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [contextualisingAll, setContextualisingAll] = useState(false)
  const [contextualisingModules, setContextualisingModules] = useState<Set<string>>(new Set())
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Context counts per document
  const [contextCounts, setContextCounts] = useState<Record<string, number>>({})

  // ─── Role guard ─────────────────────────────────────────────────────────────

  const isAllowed = profile.role === 'admin'

  // ─── Flash from URL params ──────────────────────────────────────────────────

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'true') {
      setFlashMessage({ type: 'success', text: 'Successfully connected to SharePoint.' })
    } else if (error) {
      setFlashMessage({ type: 'error', text: `Connection failed: ${error}` })
    }
  }, [searchParams])

  // auto-dismiss flash
  useEffect(() => {
    if (flashMessage) {
      const t = setTimeout(() => setFlashMessage(null), 8000)
      return () => clearTimeout(t)
    }
  }, [flashMessage])

  // ─── Load connection ────────────────────────────────────────────────────────

  const loadConnection = useCallback(async () => {
    setConnectionLoading(true)
    const { data } = await supabase
      .from('sharepoint_connection')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setConnection(data as SharePointConnection | null)
    setConnectionLoading(false)
  }, [supabase])

  useEffect(() => { loadConnection() }, [loadConnection])

  // ─── Load files ─────────────────────────────────────────────────────────────

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id

  const loadFiles = useCallback(async () => {
    if (!connection || connection.status !== 'connected') return
    setFilesLoading(true)
    try {
      const url = currentFolderId
        ? `/api/sharepoint/files?folderId=${currentFolderId}`
        : '/api/sharepoint/files'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load files')
      const data = await res.json()
      setFiles(data.files || [])
    } catch {
      setFlashMessage({ type: 'error', text: 'Failed to load SharePoint files.' })
      setFiles([])
    }
    setFilesLoading(false)
  }, [connection, currentFolderId])

  useEffect(() => {
    if (connection?.status === 'connected') loadFiles()
  }, [connection, currentFolderId, loadFiles])

  // ─── Load synced documents ──────────────────────────────────────────────────

  const loadDocuments = useCallback(async () => {
    setDocumentsLoading(true)
    const { data } = await supabase
      .from('sharepoint_documents')
      .select('*')
      .eq('is_monitored', true)
      .order('last_synced_at', { ascending: false })
    if (data) {
      setDocuments(data as SharePointDocument[])
      setSyncedItemIds(new Set(data.map((d: SharePointDocument) => d.sharepoint_item_id)))
    }
    setDocumentsLoading(false)
  }, [supabase])

  // ─── Load context counts per document ───────────────────────────────────────

  const loadContextCounts = useCallback(async () => {
    const { data } = await supabase
      .from('centre_context')
      .select('document_id')
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((item: { document_id: string }) => {
        counts[item.document_id] = (counts[item.document_id] || 0) + 1
      })
      setContextCounts(counts)
    }
  }, [supabase])

  // ─── Load centre context ───────────────────────────────────────────────────

  const loadContextItems = useCallback(async () => {
    setContextLoading(true)
    const { data } = await supabase
      .from('centre_context')
      .select('*')
      .order('context_type')
      .order('title')
    if (data) setContextItems(data as CentreContextItem[])
    setContextLoading(false)
  }, [supabase])

  // ─── Load modules + centre content ─────────────────────────────────────────

  const loadModules = useCallback(async () => {
    setModulesLoading(true)
    const [modulesRes, contentRes] = await Promise.all([
      supabase.from('lms_modules').select('id, title, related_qa').order('title'),
      supabase.from('lms_module_centre_content').select('*').order('generated_at', { ascending: false }),
    ])
    if (modulesRes.data) setModules(modulesRes.data as LmsModule[])
    if (contentRes.data) setModuleCentreContent(contentRes.data as LmsModuleCentreContent[])
    setModulesLoading(false)
  }, [supabase])

  // ─── Initial data load (when connected) ────────────────────────────────────

  useEffect(() => {
    if (connection?.status === 'connected') {
      loadDocuments()
      loadContextCounts()
      loadContextItems()
      loadModules()
    }
  }, [connection, loadDocuments, loadContextCounts, loadContextItems, loadModules])

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    if (!connection) return
    setDisconnecting(true)
    const { error } = await supabase.from('sharepoint_connection').update({ status: 'disconnected' }).eq('id', connection.id)
    if (error) {
      setFlashMessage({ type: 'error', text: 'Failed to disconnect from SharePoint.' })
      setDisconnecting(false)
      return
    }
    setConnection({ ...connection, status: 'disconnected' })
    setDisconnecting(false)
    setFlashMessage({ type: 'success', text: 'Disconnected from SharePoint.' })
  }

  const navigateToFolder = (folderId: string, folderName: string) => {
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }])
  }

  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1))
  }

  const handleSync = async (itemId: string) => {
    const docType = selectedDocTypes[itemId]
    if (!docType) {
      setFlashMessage({ type: 'error', text: 'Please select a document type before syncing.' })
      return
    }
    setSyncingFiles(prev => new Set(prev).add(itemId))
    try {
      const res = await fetch('/api/sharepoint/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, documentType: docType }),
      })
      if (!res.ok) throw new Error('Sync failed')
      setSyncedItemIds(prev => new Set(prev).add(itemId))
      setFlashMessage({ type: 'success', text: 'File synced successfully.' })
      loadDocuments()
      loadContextCounts()
    } catch {
      setFlashMessage({ type: 'error', text: 'Failed to sync file.' })
    }
    setSyncingFiles(prev => { const s = new Set(prev); s.delete(itemId); return s })
  }

  const handleProcessDocument = async (docId: string) => {
    setProcessingDocs(prev => new Set(prev).add(docId))
    try {
      const res = await fetch('/api/sharepoint/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_context', documentId: docId }),
      })
      if (!res.ok) throw new Error('Processing failed')
      setFlashMessage({ type: 'success', text: 'Document processed with AI successfully.' })
      loadDocuments()
      loadContextCounts()
      loadContextItems()
    } catch {
      setFlashMessage({ type: 'error', text: 'Failed to process document.' })
    }
    setProcessingDocs(prev => { const s = new Set(prev); s.delete(docId); return s })
  }

  const handleResync = async (doc: SharePointDocument) => {
    setResyncingDocs(prev => new Set(prev).add(doc.id))
    try {
      const res = await fetch('/api/sharepoint/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: doc.sharepoint_item_id, documentType: doc.document_type }),
      })
      if (!res.ok) throw new Error('Re-sync failed')
      setFlashMessage({ type: 'success', text: `${doc.file_name} re-synced.` })
      loadDocuments()
    } catch {
      setFlashMessage({ type: 'error', text: 'Failed to re-sync document.' })
    }
    setResyncingDocs(prev => { const s = new Set(prev); s.delete(doc.id); return s })
  }

  const handleToggleContext = async (item: CentreContextItem) => {
    setTogglingContext(prev => new Set(prev).add(item.id))
    const { error } = await supabase.from('centre_context').update({ is_active: !item.is_active }).eq('id', item.id)
    if (error) {
      console.error('Failed to toggle context active state:', error)
    } else {
      setContextItems(prev => prev.map(c => c.id === item.id ? { ...c, is_active: !c.is_active } : c))
    }
    setTogglingContext(prev => { const s = new Set(prev); s.delete(item.id); return s })
  }

  const handleDeleteContext = async (id: string) => {
    if (!confirm('Delete this context item? This cannot be undone.')) return
    setDeletingContext(prev => new Set(prev).add(id))
    const { error } = await supabase.from('centre_context').delete().eq('id', id)
    if (error) {
      setFlashMessage({ type: 'error', text: 'Failed to delete context item.' })
    } else {
      setContextItems(prev => prev.filter(c => c.id !== id))
      loadContextCounts()
    }
    setDeletingContext(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const handleContextualiseAll = async () => {
    setContextualisingAll(true)
    try {
      const res = await fetch('/api/sharepoint/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'contextualise_all' }),
      })
      if (!res.ok) throw new Error('Failed')
      setFlashMessage({ type: 'success', text: 'All modules contextualised successfully.' })
      loadModules()
    } catch {
      setFlashMessage({ type: 'error', text: 'Failed to contextualise modules.' })
    }
    setContextualisingAll(false)
  }

  const handleContextualiseModule = async (moduleId: string) => {
    setContextualisingModules(prev => new Set(prev).add(moduleId))
    try {
      const res = await fetch('/api/sharepoint/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'contextualise_module', moduleId }),
      })
      if (!res.ok) throw new Error('Failed')
      setFlashMessage({ type: 'success', text: 'Module contextualised.' })
      loadModules()
    } catch {
      setFlashMessage({ type: 'error', text: 'Failed to contextualise module.' })
    }
    setContextualisingModules(prev => { const s = new Set(prev); s.delete(moduleId); return s })
  }

  const toggleExpandModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const s = new Set(prev)
      if (s.has(moduleId)) s.delete(moduleId)
      else s.add(moduleId)
      return s
    })
  }

  // ─── Derived data ──────────────────────────────────────────────────────────

  const contextByType = contextItems.reduce<Record<string, CentreContextItem[]>>((acc, item) => {
    const key = item.context_type
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const contentByModule = moduleCentreContent.reduce<Record<string, LmsModuleCentreContent[]>>((acc, item) => {
    if (!acc[item.module_id]) acc[item.module_id] = []
    acc[item.module_id].push(item)
    return acc
  }, {})

  // ─── Guard: role check ─────────────────────────────────────────────────────

  if (!isAllowed) {
    return (
      <div className="p-8">
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only admin and manager roles can access the SharePoint integration settings.</p>
        </div>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const isConnected = connection?.status === 'connected'

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">SharePoint Integration</h1>
        <p className="text-muted-foreground mt-1">
          Connect your SharePoint document library to sync centre documents and contextualise learning modules.
        </p>
      </div>

      {/* Flash message */}
      {flashMessage && (
        <div
          className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${
            flashMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{flashMessage.text}</span>
          <button onClick={() => setFlashMessage(null)} className="ml-4 font-bold text-lg leading-none">&times;</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: Connection Status
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-card rounded-xl shadow-sm border border-border p-6">
        <SectionHeader step={1} title="Connection Status" subtitle="Connect to your Microsoft 365 SharePoint site" />

        {connectionLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Spinner /> Checking connection...
          </div>
        ) : !connection || connection.status === 'disconnected' || connection.status === 'error' ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            {connection?.status === 'error' && (
              <p className="text-red-600 text-sm mb-3">
                The previous connection encountered an error. Please reconnect.
              </p>
            )}
            <p className="text-gray-600 mb-6">No SharePoint connection active.</p>
            <a
              href="/api/sharepoint/auth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors bg-primary hover:bg-primary/90"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.5 1L2 6v12l9.5 5L22 18V6L11.5 1zm0 2.18L20 7.74v9.52l-8.5 4.56L3 17.26V7.74l8.5-4.56z" />
              </svg>
              Connect to SharePoint
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Connected
              </span>
              {connection.token_expires_at && new Date(connection.token_expires_at) < new Date() && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  Token expired
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="min-w-0">
                <span className="text-muted-foreground block">Site URL</span>
                <a href={connection.site_url} target="_blank" rel="noopener noreferrer"
                  className="font-medium hover:underline break-all text-primary">
                  {connection.site_url}
                </a>
              </div>
              <div>
                <span className="text-muted-foreground block">Connected By</span>
                <span className="font-medium text-foreground">{connection.connected_by}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Last Synced</span>
                <span className="font-medium text-foreground">{formatDate(connection.last_synced_at)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {disconnecting ? <Spinner /> : null}
                Disconnect
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Only show remaining sections when connected */}
      {isConnected && (
        <>
          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 2: File Browser
              ═══════════════════════════════════════════════════════════════════ */}
          <section className="bg-card rounded-xl shadow-sm border border-border p-6">
            <SectionHeader step={2} title="File Browser" subtitle="Browse and select documents to sync from SharePoint" />

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
              {breadcrumbs.map((crumb, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  {idx > 0 && <span className="text-gray-300">/</span>}
                  <button
                    onClick={() => navigateToBreadcrumb(idx)}
                    className={`px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${
                      idx === breadcrumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>

            {filesLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                <Spinner /> Loading files...
              </div>
            ) : files.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No files found in this folder.</p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Size</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Modified</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Type</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {files.map(file => {
                      const isFolder = !!file.folder
                      const isSynced = syncedItemIds.has(file.id)
                      const isSyncing = syncingFiles.has(file.id)
                      return (
                        <tr key={file.id} className="hover:bg-muted transition-colors">
                          <td className="px-4 py-3">
                            {isFolder ? (
                              <button
                                onClick={() => navigateToFolder(file.id, file.name)}
                                className="flex items-center gap-2 font-medium hover:underline text-primary"
                              >
                                <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                                {file.name}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-muted-foreground flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-foreground">{file.name}</span>
                                {isSynced && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">
                                    Synced
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {isFolder ? '--' : formatBytes(file.size)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                            {formatDate(file.lastModifiedDateTime)}
                          </td>
                          <td className="px-4 py-3">
                            {!isFolder && !isSynced && (
                              <select
                                value={selectedDocTypes[file.id] || ''}
                                onChange={e => setSelectedDocTypes(prev => ({ ...prev, [file.id]: e.target.value as DocumentType }))}
                                className="text-sm border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                                
                              >
                                <option value="">Select type...</option>
                                {DOC_TYPE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isFolder && !isSynced && (
                              <button
                                onClick={() => handleSync(file.id)}
                                disabled={isSyncing || !selectedDocTypes[file.id]}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors disabled:opacity-40 bg-primary"
                              >
                                {isSyncing ? <Spinner className="h-3 w-3" /> : null}
                                Sync & Monitor
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 3: Synced Documents
              ═══════════════════════════════════════════════════════════════════ */}
          <section className="bg-card rounded-xl shadow-sm border border-border p-6">
            <SectionHeader step={3} title="Synced Documents" subtitle="Manage monitored documents and extract context with AI" />

            {documentsLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                <Spinner /> Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No synced documents yet. Browse and sync files from SharePoint above.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">File Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Type</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Size</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Last Synced</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden lg:table-cell">Processed</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden lg:table-cell">Contexts</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.map(doc => {
                      const isProcessing = processingDocs.has(doc.id)
                      const isResyncing = resyncingDocs.has(doc.id)
                      return (
                        <tr key={doc.id} className="hover:bg-muted transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium text-foreground truncate max-w-[200px]">{doc.file_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DOC_TYPE_COLORS[doc.document_type]}`}>
                              {doc.document_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatBytes(doc.file_size)}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(doc.last_synced_at)}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {doc.last_processed_at ? (
                              <span className="text-green-700 text-xs">{formatDate(doc.last_processed_at)}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Not processed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-foreground text-xs font-medium">{contextCounts[doc.id] || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleProcessDocument(doc.id)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors disabled:opacity-50 bg-kiros-purple-light"
                                title="Process with AI"
                              >
                                {isProcessing ? <Spinner className="h-3 w-3" /> : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                )}
                                AI Process
                              </button>
                              <button
                                onClick={() => handleResync(doc)}
                                disabled={isResyncing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                title="Re-sync from SharePoint"
                              >
                                {isResyncing ? <Spinner className="h-3 w-3" /> : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                                Re-sync
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 4: Centre Context
              ═══════════════════════════════════════════════════════════════════ */}
          <section className="bg-card rounded-xl shadow-sm border border-border p-6">
            <SectionHeader step={4} title="Centre Context" subtitle="Extracted context from your documents, used to personalise learning" />

            {/* Stats bar */}
            {contextItems.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="px-3 py-1.5 rounded-lg bg-muted border border-border text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-semibold text-foreground">{contextItems.length}</span>
                </div>
                {Object.entries(contextByType).map(([type, items]) => (
                  <div key={type} className="px-3 py-1.5 rounded-lg bg-muted border border-border text-sm">
                    <span className="text-muted-foreground capitalize">{type.replace(/_/g, ' ')}: </span>
                    <span className="font-semibold text-foreground">{items.length}</span>
                  </div>
                ))}
              </div>
            )}

            {contextLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                <Spinner /> Loading context...
              </div>
            ) : contextItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No context extracted yet. Process synced documents with AI to generate context.
              </p>
            ) : (
              <div className="space-y-6">
                {Object.entries(contextByType).map(([type, items]) => (
                  <div key={type}>
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 capitalize">
                      {type.replace(/_/g, ' ')}
                    </h3>
                    <div className="space-y-3">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            item.is_active ? 'border-border bg-card' : 'border-border bg-muted opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                                {item.related_qa?.map(qa => (
                                  <span
                                    key={qa}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: QA_COLORS[qa] || '#666' }}
                                  >
                                    QA{qa}
                                  </span>
                                ))}
                                {!item.is_active && (
                                  <span className="text-xs text-muted-foreground italic">Inactive</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                              {item.source_quote && (
                                <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">
                                  &ldquo;{item.source_quote}&rdquo;
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleToggleContext(item)}
                                disabled={togglingContext.has(item.id)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  item.is_active ? 'bg-primary' : 'bg-gray-300'
                                }`}
                                title={item.is_active ? 'Deactivate' : 'Activate'}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${
                                    item.is_active ? 'translate-x-4' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => handleDeleteContext(item.id)}
                                disabled={deletingContext.has(item.id)}
                                className="p-1 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingContext.has(item.id) ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 5: Module Contextualisation
              ═══════════════════════════════════════════════════════════════════ */}
          <section className="bg-card rounded-xl shadow-sm border border-border p-6">
            <SectionHeader step={5} title="Module Contextualisation" subtitle="Generate centre-specific content for learning modules using extracted context" />

            <div className="flex flex-wrap items-center gap-4 mb-6">
              <button
                onClick={handleContextualiseAll}
                disabled={contextualisingAll || contextItems.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 bg-primary"
              >
                {contextualisingAll ? <Spinner className="h-4 w-4" /> : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                Contextualise All Modules
              </button>
              {contextualisingAll && (
                <span className="text-sm text-muted-foreground">Processing all modules... this may take a minute.</span>
              )}
              {contextItems.length === 0 && (
                <span className="text-sm text-muted-foreground">Extract centre context first (Step 3-4).</span>
              )}
            </div>

            {modulesLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                <Spinner /> Loading modules...
              </div>
            ) : modules.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No learning modules found.</p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Module</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">QA</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Centre Content</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {modules.map(mod => {
                      const content = contentByModule[mod.id] || []
                      const hasContent = content.length > 0
                      const isContextualising = contextualisingModules.has(mod.id)
                      const isExpanded = expandedModules.has(mod.id)
                      return (
                        <Fragment key={mod.id}>
                          <tr className="hover:bg-muted transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-medium text-foreground">{mod.title}</span>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <div className="flex items-center gap-1 flex-wrap">
                                {mod.related_qa?.map(qa => (
                                  <span
                                    key={qa}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: QA_COLORS[qa] || '#666' }}
                                  >
                                    QA{qa}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {hasContent ? (
                                <button
                                  onClick={() => toggleExpandModule(mod.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-muted transition-colors text-primary"
                                >
                                  <svg
                                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="currentColor" viewBox="0 0 20 20"
                                  >
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                  {content.length} item{content.length !== 1 ? 's' : ''}
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleContextualiseModule(mod.id)}
                                disabled={isContextualising || contextItems.length === 0}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-40 border-kiros-purple-light text-kiros-purple-light"
                              >
                                {isContextualising ? <Spinner className="h-3 w-3" /> : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                )}
                                Contextualise
                              </button>
                            </td>
                          </tr>
                          {/* Expanded content preview */}
                          {isExpanded && hasContent && (
                            <tr>
                              <td colSpan={4} className="px-4 py-3 bg-muted">
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                  {content.map(c => (
                                    <div key={c.id} className="bg-card border border-border rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <h5 className="text-xs font-semibold text-foreground">{c.title}</h5>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground capitalize">{c.content_type.replace(/_/g, ' ')}</span>
                                          <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-4">{c.content}</p>
                                      <p className="text-xs text-muted-foreground mt-1">Generated: {formatDate(c.generated_at)}</p>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

