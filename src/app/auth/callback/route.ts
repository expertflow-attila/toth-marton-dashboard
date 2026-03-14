import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Save profile data to user_profiles table
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const metadata = user.user_metadata
        await supabase.from('user_profiles').upsert({
          id: user.id,
          email: user.email,
          first_name: metadata?.first_name || metadata?.given_name || metadata?.name?.split(' ').slice(1).join(' ') || '',
          last_name: metadata?.last_name || metadata?.family_name || metadata?.name?.split(' ')[0] || '',
          avatar_url: metadata?.avatar_url || metadata?.picture || null,
          provider: user.app_metadata?.provider || 'email',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }
  return NextResponse.redirect(`${origin}/?error=auth`)
}
