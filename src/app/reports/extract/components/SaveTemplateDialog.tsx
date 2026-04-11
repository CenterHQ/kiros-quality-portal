'use client'

import { useState } from 'react'

interface Props {
  onSave: (name: string, description: string, isShared: boolean) => void
  onClose: () => void
}

export default function SaveTemplateDialog({ onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isShared, setIsShared] = useState(true)

  const handleSave = () => {
    if (!name.trim()) return
    onSave(name.trim(), description.trim(), isShared)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Save Report Template</h3>
          <p className="text-sm text-gray-500 mt-0.5">Save this configuration to reuse later</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Monthly QA Element Report"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what this report extracts..."
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={e => setIsShared(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Share with all users</span>
              <p className="text-xs text-gray-400">Others can load and use this template</p>
            </div>
          </label>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg border hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  )
}
