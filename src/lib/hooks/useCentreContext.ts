'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CentreContext, CentreContextType } from '@/lib/types'

interface UseCentreContextOptions {
  qaNumbers?: number[]
  elementCodes?: string[]
  contextTypes?: CentreContextType[]
  limit?: number
  enabled?: boolean
}

interface UseCentreContextResult {
  items: CentreContext[]
  loading: boolean
}

export function useCentreContext(options: UseCentreContextOptions = {}): UseCentreContextResult {
  const { qaNumbers, elementCodes, contextTypes, limit = 3, enabled = true } = options
  const [items, setItems] = useState<CentreContext[]>([])
  const [loading, setLoading] = useState(false)

  // Stable key to avoid re-fetching on every render
  const queryKey = useMemo(() => JSON.stringify({ qaNumbers, elementCodes, contextTypes, limit }), [qaNumbers, elementCodes, contextTypes, limit])

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()

    async function fetchContext() {
      setLoading(true)
      let query = supabase
        .from('centre_context')
        .select('*')
        .eq('is_active', true)

      if (qaNumbers?.length) {
        query = query.overlaps('related_qa', qaNumbers)
      }
      if (elementCodes?.length) {
        query = query.overlaps('related_element_codes', elementCodes)
      }
      if (contextTypes?.length) {
        query = query.in('context_type', contextTypes)
      }

      query = query.order('context_type').limit(limit)

      const { data } = await query
      setItems(data || [])
      setLoading(false)
    }

    fetchContext()
  }, [queryKey, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return { items, loading }
}
