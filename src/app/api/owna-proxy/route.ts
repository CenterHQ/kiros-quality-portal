import { NextRequest, NextResponse } from 'next/server'

const API_KEY = '63db089ff821163db089ff82114abf9e'

export async function POST(request: NextRequest) {
  try {
    const { method, url, body } = await request.json()

    if (!url || !url.startsWith('https://api.owna.com.au/')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body)
    }

    const res = await fetch(url, fetchOptions)
    const text = await res.text()

    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
