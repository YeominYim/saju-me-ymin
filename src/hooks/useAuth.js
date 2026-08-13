import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { supabase } from '@/lib/supabaseClient'

function readAuthRedirectError() {
  if (typeof window === 'undefined') return ''

  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const error = search.get('error') || hash.get('error')
  const description = (
    search.get('error_description') ||
    hash.get('error_description') ||
    ''
  ).replace(/\+/g, ' ')

  if (!error) return ''

  window.history.replaceState({}, document.title, window.location.pathname)

  if (error === 'access_denied') return '구글 로그인이 취소되었습니다.'
  return description || '구글 로그인에 실패했습니다. 다시 시도해 주세요.'
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const redirectError = readAuthRedirectError()
    if (redirectError) setAuthError(redirectError)

    if (!supabase) {
      setReady(true)
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setUser(data.session?.user ?? null)
        setReady(true)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled) {
        setUser(session?.user ?? null)
        setReady(true)
      }
      if (event === 'SIGNED_IN') {
        trackEvent('login', { method: 'google' })
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { user, ready, authError }
}

export async function signInWithGoogle(redirectTo) {
  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.')
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/`,
      scopes: 'openid email profile',
      queryParams: {
        hl: 'ko',
        prompt: 'select_account',
      },
    },
  })

  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function displayUserName(user) {
  if (!user) return ''
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    '로그인됨'
  )
}
