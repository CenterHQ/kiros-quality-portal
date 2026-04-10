'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Tag {
  id: number
  name: string
  color: string
  category: string
  created_at: string
}

const CATEGORIES = ['qa', 'priority', 'training', 'status', 'custom']

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [newTag, setNewTag] = useState({ name: '', color: '#470DA8', category: 'custom' })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('category').order('name')
    if (data) setTags(data)
    setLoading(false)
  }

  useEffect(() => { loadTags() }, [])

  const addTag = async () => {
    if (!newTag.name.trim()) return
    await supabase.from('tags').insert(newTag)
    setNewTag({ name: '', color: '#470DA8', category: 'custom' })
    loadTags()
  }

  const updateColor = async (id: number, color: string) => {
    await supabase.from('tags').update({ color }).eq('id', id)
    setTags(prev => prev.map(t => t.id === id ? { ...t, color } : t))
  }

  const deleteTag = async (id: number, name: string) => {
    if (!confirm(`Delete tag "${name}"? This will remove it from all items.`)) return
    await supabase.from('entity_tags').delete().eq('tag_id', id)
    await supabase.from('tags').delete().eq('id', id)
    loadTags()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = tags.filter(t => t.category === cat)
    return acc
  }, {} as Record<string, Tag[]>)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Tag Configuration</h1>
      <p className="text-muted-foreground text-sm mb-6">Manage tags used across elements, tasks, and actions</p>

      {/* Add Tag */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-5 mb-6">
        <h3 className="font-semibold text-sm text-foreground mb-3">Add New Tag</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">Name</label>
            <input type="text" value={newTag.name} onChange={e => setNewTag({...newTag, name: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Needs Follow-up" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Color</label>
            <input type="color" value={newTag.color} onChange={e => setNewTag({...newTag, color: e.target.value})}
              className="w-10 h-10 rounded border border-border cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Category</label>
            <select value={newTag.category} onChange={e => setNewTag({...newTag, category: e.target.value})}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <button onClick={addTag} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">Add</button>
        </div>
      </div>

      {/* Tags by Category */}
      {CATEGORIES.map(cat => {
        const catTags = grouped[cat]
        if (!catTags || catTags.length === 0) return null
        return (
          <div key={cat} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-border bg-muted">
              <h3 className="font-semibold text-sm text-foreground">{cat.charAt(0).toUpperCase() + cat.slice(1)} Tags</h3>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {catTags.map(tag => (
                <div key={tag.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card">
                  <input type="color" value={tag.color} onChange={e => updateColor(tag.id, e.target.value)}
                    className="w-4 h-4 rounded-full border-0 cursor-pointer" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm font-medium" style={{ color: tag.color }}>{tag.name}</span>
                  <button onClick={() => deleteTag(tag.id, tag.name)} className="text-muted-foreground hover:text-red-500 text-xs ml-1">&times;</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
