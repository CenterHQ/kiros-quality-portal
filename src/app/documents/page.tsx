'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QA_COLORS, type Profile, type Document } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'

const QA_LABELS: Record<number, string> = {
  0: 'General',
  1: 'QA1 - Educational Program & Practice',
  2: 'QA2 - Children\'s Health & Safety',
  3: 'QA3 - Physical Environment',
  4: 'QA4 - Staffing Arrangements',
  5: 'QA5 - Relationships with Children',
  6: 'QA6 - Collaborative Partnerships',
  7: 'QA7 - Governance & Leadership',
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const currentUser = useProfile()
  const [filterQA, setFilterQA] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: docsRes } = await supabase.from('documents').select('*, profiles(full_name)').order('created_at', { ascending: false })
    if (docsRes) setDocuments(docsRes)
    setLoading(false)
  }

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager'

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()
      const filePath = `${currentUser.id}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      await supabase.from('documents').insert({
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type || fileExt,
        category: 'general',
        uploaded_by: currentUser.id,
        qa_area: filterQA || null,
      })

      await supabase.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'uploaded_document',
        entity_type: 'document',
        details: `Uploaded ${file.name}`,
      })
    }
    setUploading(false)
    loadData()
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    await supabase.from('activity_log').insert({
      user_id: currentUser.id,
      action: 'deleted_document',
      entity_type: 'document',
      entity_id: doc.id,
      details: `Deleted ${doc.name}`,
    })
    loadData()
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files)
    }
  }, [filterQA])

  const filtered = documents.filter(doc => {
    if (filterQA !== null && doc.qa_area !== filterQA) return false
    return true
  })

  const fileTypeIcon = (type?: string) => {
    if (!type) return '📄'
    if (type.includes('pdf')) return '📕'
    if (type.includes('image')) return '🖼️'
    if (type.includes('word') || type.includes('doc')) return '📘'
    if (type.includes('sheet') || type.includes('xls') || type.includes('csv')) return '📊'
    return '📄'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#470DA8]" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 text-sm mt-1">Upload and manage documents for quality assessment</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-[#470DA8] text-white text-sm rounded-lg hover:bg-[#350A7E] transition font-medium disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          dragActive
            ? 'border-[#470DA8] bg-purple-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <div className="text-gray-400">
          <svg className="mx-auto h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-medium">
            {dragActive ? 'Drop files here' : 'Drag and drop files here, or click to browse'}
          </p>
          <p className="text-xs mt-1 text-gray-400">PDF, Word, Excel, images, and more</p>
        </div>
      </div>

      {/* QA Filter */}
      <div className="flex gap-1 mb-6 flex-wrap">
        <button
          onClick={() => setFilterQA(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            filterQA === null ? 'bg-[#470DA8] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {[0, 1, 2, 3, 4, 5, 6, 7].map(n => (
          <button
            key={n}
            onClick={() => setFilterQA(filterQA === n ? null : n)}
            className="px-3 py-1 rounded-full text-xs font-medium transition"
            style={
              filterQA === n
                ? { backgroundColor: n === 0 ? '#6b7280' : QA_COLORS[n], color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#666' }
            }
          >
            {n === 0 ? 'General' : `QA${n}`}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filtered.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                <span className="text-2xl flex-shrink-0">{fileTypeIcon(doc.file_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
                    <span className="text-xs text-gray-400">{doc.file_type || '--'}</span>
                    {doc.profiles && (
                      <span className="text-xs text-gray-400">
                        by {(doc.profiles as unknown as Profile).full_name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {doc.qa_area != null && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: doc.qa_area === 0 ? '#6b7280' : QA_COLORS[doc.qa_area] || '#999' }}
                  >
                    {doc.qa_area === 0 ? 'General' : `QA${doc.qa_area}`}
                  </span>
                )}
                {isAdminOrManager && (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="text-xs text-red-400 hover:text-red-600 transition flex-shrink-0"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No documents found</p>
            <p className="text-sm mt-1">Upload documents using the drop zone above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
