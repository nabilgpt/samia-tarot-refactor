import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
}

export const signUpWithPassword = async (
  email: string,
  password: string,
  metadata?: { first_name?: string; last_name?: string }
): Promise<AuthUser> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Sign up failed')
  }

  return {
    id: data.user.id,
    email: data.user.email!,
    role: 'client',
    firstName: metadata?.first_name,
    lastName: metadata?.last_name
  }
}

export const signInWithPassword = async (email: string, password: string): Promise<AuthUser> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Sign in failed')
  }

  const role = await fetchUserRoleFromAPI(data.session.access_token)

  return {
    id: data.user.id,
    email: data.user.email!,
    role,
    firstName: data.user.user_metadata?.first_name,
    lastName: data.user.user_metadata?.last_name
  }
}

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export const refreshSession = async (): Promise<void> => {
  const { error } = await supabase.auth.refreshSession()
  if (error && error.message !== 'Auth session missing!') {
    throw new Error(error.message)
  }
}

export const getUser = async (): Promise<AuthUser | null> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: { session } } = await supabase.auth.getSession()
  const role = session?.access_token
    ? await fetchUserRoleFromAPI(session.access_token)
    : 'client'

  return {
    id: user.id,
    email: user.email!,
    role,
    firstName: user.user_metadata?.first_name,
    lastName: user.user_metadata?.last_name
  }
}

const fetchUserRoleFromAPI = async (accessToken: string): Promise<string> => {
  try {
    const response = await fetch('/api/profile/me', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (response.ok) {
      const profile = await response.json()
      return profile.role_code || profile.role || 'client'
    }
  } catch (err) {
    console.warn('Failed to fetch role from API', err)
  }

  return 'client'
}

export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const role = await fetchUserRoleFromAPI(session.access_token)

      callback({
        id: session.user.id,
        email: session.user.email!,
        role,
        firstName: session.user.user_metadata?.first_name,
        lastName: session.user.user_metadata?.last_name
      })
    } else {
      callback(null)
    }
  })
}

// Backwards compatibility exports
export const login = signInWithPassword
export const logout = signOut
export const getCurrentUser = getUser