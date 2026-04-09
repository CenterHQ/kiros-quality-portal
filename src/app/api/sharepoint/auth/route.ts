import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/microsoft-graph'

export async function GET() {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kiros-quality-portal.vercel.app'}/api/sharepoint/callback`
    const authUrl = await getAuthUrl(redirectUri)
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('SharePoint auth error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
