import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface EffectiveUser {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
}

export const useEffectiveRole = () => {
  const [user, setUser] = useState<EffectiveUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadEffectiveRole()
  }, [])

  const loadEffectiveRole = async () => {
    try {
      const response = await fetch('/api/profile/me', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, must-revalidate, private',
          'Pragma': 'no-cache'
        }
      })

      if (response.ok) {
        const profile = await response.json()
        setUser({
          id: profile.id || 'mock-user-id',
          email: profile.email,
          role: profile.role_code || profile.role || 'client',
          firstName: profile.firstName,
          lastName: profile.lastName
        })
        setLoading(false)
        return
      }
    } catch (err) {
      console.warn('Mock API not available, checking Supabase auth', err)
    }

    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      setUser(null)
      setLoading(false)
      return
    }

    const role = supabaseUser.app_metadata?.role || supabaseUser.user_metadata?.role || 'client'

    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      role,
      firstName: supabaseUser.user_metadata?.first_name,
      lastName: supabaseUser.user_metadata?.last_name
    })
    setLoading(false)
  }

  const refresh = async () => {
    setLoading(true)
    await supabase.auth.refreshSession()
    await loadEffectiveRole()
  }

  return { user, loading, error, refresh }
}