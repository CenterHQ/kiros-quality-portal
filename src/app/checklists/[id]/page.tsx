'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistInstance, ChecklistItemDefinition, ChecklistItemResponse, Profile } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'
import { useToast } from '@/components/ui/toast'
import Breadcrumbs from '@/components/Breadcrumbs'

export default function ChecklistCompletionPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [instance, setInstance] = useState<ChecklistInstance | null>(null)
  const user = useProfile()
  const { toast } = useToast()
  const [responses, setResponses] = useState<Record<string, ChecklistItemResponse>>({})
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: inst } = await supabase.from('checklist_instances').select('*, checklist_templates(*, checklist_categories(*))').eq('id', id).single()
      if (inst) {
        setInstance(inst as any)
        setResponses(inst.responses || {})
        setNotes(inst.notes || '')
      }
    }
    load()
  }, [id])

  if (!instance) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-muted-foreground">Loading...</div>
  }

  const items: ChecklistItemDefinition[] = instance.items_snapshot?.length > 0 ? instance.items_snapshot : (instance.checklist_templates as any)?.items || []
  const isReadOnly = instance.status === 'completed' || instance.status === 'skipped'

  const isItemVisible = (item: ChecklistItemDefinition): boolean => {
    if (!item.conditional_on) return true
    const condResponse = responses[item.conditional_on]
    if (!condResponse) return false
    return condResponse.value === item.conditional_value
  }

  const visibleItems = items.filter(i => isItemVisible(i))
  const applicableItems = visibleItems.filter(i => i.type !== 'heading')
  const answeredItems = applicableItems.filter(i => {
    const r = responses[i.id]
    return r && r.value !== undefined && r.value !== null && r.value !== ''
  })
  const failedItems = applicableItems.filter(i => {
    const r = responses[i.id]
    return i.type === 'yes_no' && r?.value === false
  })

  const updateResponse = (itemId: string, value: unknown) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        value,
        timestamp: new Date().toISOString(),
      }
    }))
  }

  const updateResponseNotes = (itemId: string, itemNotes: string) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes: itemNotes,
      }
    }))
  }

  const saveProgress = async () => {
    setSaving(true)
    const { error } = await supabase.from('checklist_instances').update({
      responses,
      notes,
      status: 'in_progress',
      completed_items: answeredItems.length,
      failed_items: failedItems.length,
    }).eq('id', instance.id)
    if (error) toast({ type: 'error', message: 'Failed to save progress' })
    setSaving(false)
  }

  const submitChecklist = async () => {
    // Check required fields
    const missingRequired = applicableItems.filter(i => {
      if (!i.required) return false
      const r = responses[i.id]
      return !r || r.value === undefined || r.value === null || r.value === ''
    })
    if (missingRequired.length > 0) {
      toast({ type: 'warning', message: `Please complete all required fields. Missing: ${missingRequired.map(i => i.title).join(', ')}` })
      return
    }

    setSubmitting(true)

    // Update instance
    const { error: submitError } = await supabase.from('checklist_instances').update({
      responses,
      notes,
      status: 'completed',
      completed_by: user?.id,
      completed_at: new Date().toISOString(),
      completed_items: answeredItems.length,
      failed_items: failedItems.length,
      total_items: applicableItems.length,
      items_snapshot: items,
    }).eq('id', instance.id)
    if (submitError) {
      toast({ type: 'error', message: 'Failed to submit checklist' })
      setSubmitting(false)
      return
    }

    // Auto-create smart tickets for failed items
    for (const item of failedItems) {
      const { error: ticketError } = await supabase.from('smart_tickets').insert({
        checklist_instance_id: instance.id,
        checklist_item_id: item.id,
        title: `Failed: ${item.title}`,
        description: `This item failed during "${instance.name}" on ${new Date().toLocaleDateString()}. ${responses[item.id]?.notes || ''}`,
        priority: 'medium',
        status: 'open',
        created_by: user?.id,
      })
      if (ticketError) console.error('Failed to create smart ticket:', ticketError)
    }

    if (user) {
      const { error: logError } = await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'completed_checklist',
        entity_type: 'checklist_instance',
        entity_id: instance.id,
        details: `Completed checklist: ${instance.name} (${answeredItems.length}/${applicableItems.length} items, ${failedItems.length} failed)`,
      })
      if (logError) console.error('Failed to log activity:', logError)
    }

    setSubmitting(false)
    router.push('/checklists')
  }

  const progress = applicableItems.length > 0 ? Math.round((answeredItems.length / applicableItems.length) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Checklists', href: '/checklists' },
        { label: instance.name },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/checklists" className="text-sm text-muted-foreground hover:text-foreground mb-1 inline-block">&larr; Back to Checklists</Link>
          <h1 className="text-2xl font-bold">{instance.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>Due: {new Date(instance.due_date).toLocaleDateString()}</span>
            {instance.status === 'completed' && <span className="text-green-600">Completed {new Date(instance.completed_at!).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {!isReadOnly && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progress</span>
            <span className="text-sm text-muted-foreground">{answeredItems.length}/{applicableItems.length} items ({progress}%)</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          {failedItems.length > 0 && (
            <p className="text-xs text-red-500 mt-2">{failedItems.length} item(s) marked as failed — smart tickets will be created on submission</p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="space-y-4">
        {visibleItems.map((item, index) => {
          if (item.type === 'heading') {
            return (
              <div key={item.id} className={`${index > 0 ? 'mt-6' : ''}`}>
                <h2 className="font-semibold text-foreground text-lg border-b border-border pb-2">{item.title}</h2>
              </div>
            )
          }

          const response = responses[item.id]
          const value = response?.value
          const isFailed = item.type === 'yes_no' && value === false
          const isAnswered = value !== undefined && value !== null && value !== ''

          return (
            <div key={item.id} className={`bg-card rounded-xl shadow-sm border p-4 ${isFailed ? 'border-red-200 bg-red-50/30' : isAnswered ? 'border-green-200' : 'border-border'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                      {item.required && <span className="text-red-400 ml-0.5">*</span>}
                    </p>
                  </div>

                  <div className="mt-3">
                    {item.type === 'yes_no' && (
                      <div className="flex gap-2">
                        <button onClick={() => !isReadOnly && updateResponse(item.id, true)} disabled={isReadOnly} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${value === true ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground hover:bg-green-50'}`}>
                          Yes
                        </button>
                        <button onClick={() => !isReadOnly && updateResponse(item.id, false)} disabled={isReadOnly} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${value === false ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:bg-red-50'}`}>
                          No
                        </button>
                      </div>
                    )}

                    {item.type === 'text' && (
                      <textarea value={String(value || '')} onChange={e => updateResponse(item.id, e.target.value)} disabled={isReadOnly} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted" placeholder="Enter text..." />
                    )}

                    {item.type === 'number' && (
                      <input type="number" value={value !== undefined && value !== null ? String(value) : ''} onChange={e => updateResponse(item.id, e.target.value ? Number(e.target.value) : '')} disabled={isReadOnly} className="w-full max-w-xs px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted" placeholder="Enter number..." />
                    )}

                    {item.type === 'dropdown' && (
                      <select value={String(value || '')} onChange={e => updateResponse(item.id, e.target.value)} disabled={isReadOnly} className="w-full max-w-sm px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted">
                        <option value="">Select...</option>
                        {(item.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {item.type === 'date' && (
                      <input type="date" value={String(value || '')} onChange={e => updateResponse(item.id, e.target.value)} disabled={isReadOnly} className="w-full max-w-xs px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted" />
                    )}

                    {item.type === 'time' && (
                      <input type="time" value={String(value || '')} onChange={e => updateResponse(item.id, e.target.value)} disabled={isReadOnly} className="w-full max-w-xs px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted" />
                    )}

                    {item.type === 'photo' && (
                      <div>
                        {response?.photo_url ? (
                          <div className="relative">
                            <img src={response.photo_url} alt="Evidence" className="max-w-xs rounded-lg border border-border" />
                            {!isReadOnly && (
                              <button onClick={() => setResponses(prev => ({ ...prev, [item.id]: { ...prev[item.id], photo_url: undefined, value: '' } }))} aria-label="Remove photo" className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">x</button>
                            )}
                          </div>
                        ) : (
                          <PhotoUpload itemId={item.id} disabled={isReadOnly} onUpload={(url) => {
                            setResponses(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], value: 'uploaded', photo_url: url, timestamp: new Date().toISOString() }
                            }))
                          }} />
                        )}
                      </div>
                    )}

                    {item.type === 'signature' && (
                      <SignaturePad itemId={item.id} disabled={isReadOnly} value={response?.signature_data} onChange={(data) => {
                        setResponses(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], value: 'signed', signature_data: data, timestamp: new Date().toISOString() }
                        }))
                      }} />
                    )}
                  </div>

                  {/* Notes for failed items */}
                  {isFailed && !isReadOnly && (
                    <div className="mt-3">
                      <label className="block text-xs text-red-600 font-medium mb-1">Please add notes about this failed item:</label>
                      <textarea value={response?.notes || ''} onChange={e => updateResponseNotes(item.id, e.target.value)} rows={2} className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent" placeholder="Describe the issue and any immediate action taken..." />
                    </div>
                  )}
                  {isReadOnly && response?.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">Notes: {response.notes}</p>
                  )}
                </div>
                <div className="shrink-0 pt-1">
                  {isAnswered && !isFailed && <span className="text-green-500 text-lg">&#10003;</span>}
                  {isFailed && <span className="text-red-500 text-lg">&#10007;</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overall notes */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4 mt-6">
        <label className="block text-sm font-medium text-foreground mb-2">Overall Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isReadOnly} rows={3} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted" placeholder="Any additional observations or notes..." />
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center justify-between mt-6 mb-12 bg-card rounded-xl shadow-sm border border-border p-4">
          <button onClick={saveProgress} disabled={saving} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{answeredItems.length}/{applicableItems.length} completed</span>
            <button onClick={submitChecklist} disabled={submitting} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Checklist'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PhotoUpload({ itemId, disabled, onUpload }: { itemId: string; disabled: boolean; onUpload: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `checklists/${itemId}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      onUpload(publicUrl)
    }
    setUploading(false)
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
      <button onClick={() => fileRef.current?.click()} disabled={disabled || uploading} className="px-4 py-2 border border-dashed border-border text-muted-foreground rounded-lg text-sm hover:border-primary hover:text-primary transition disabled:opacity-50">
        {uploading ? 'Uploading...' : '📷 Take Photo / Upload'}
      </button>
    </div>
  )
}

function SignaturePad({ itemId, disabled, value, onChange }: { itemId: string; disabled: boolean; value?: string; onChange: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signed, setSigned] = useState(!!value)

  useEffect(() => {
    if (value && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0)
        img.src = value
      }
    }
  }, [value])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      const pos = getPos(e)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#000'
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  const endDraw = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    setSigned(true)
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL())
    }
  }

  const clearSig = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      setSigned(false)
    }
  }

  return (
    <div>
      <div className="border border-border rounded-lg overflow-hidden inline-block bg-card">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-muted-foreground">Draw your signature above</p>
        {signed && !disabled && (
          <button onClick={clearSig} className="text-xs text-red-500 hover:underline">Clear</button>
        )}
      </div>
    </div>
  )
}
