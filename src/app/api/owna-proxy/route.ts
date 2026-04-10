import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // API key from environment
    const API_KEY = process.env.OWNA_API_KEY
    if (!API_KEY) return NextResponse.json({ error: 'OWNA API key not configured' }, { status: 500 })

    const { method, url, body } = await request.json()

    if (!url || !url.startsWith('https://api.owna.com.au/')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Whitelist methods
    const allowedMethods = ['GET', 'POST']
    const reqMethod = (method || 'GET').toUpperCase()
    if (!allowedMethods.includes(reqMethod)) {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const fetchOptions: RequestInit = {
      method: reqMethod,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }

    if (body && reqMethod === 'POST') {
      fetchOptions.body = JSON.stringify(body)
    }

    const res = await fetch(url, fetchOptions)
    const text = await res.text()

    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
