import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
}

export const login = async (email: string, password: string): Promise<AuthUser> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Login failed')
  }

  // Get role from user metadata
  const role = data.user.user_metadata?.role || 'client'

  return {
    id: data.user.id,
    email: data.user.email!,
    role,
    firstName: data.user.user_metadata?.first_name,
    lastName: data.user.user_metadata?.last_name
  }
}

export const logout = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const role = user.user_metadata?.role || 'client'

  return {
    id: user.id,
    email: user.email!,
    role,
    firstName: user.user_metadata?.first_name,
    lastName: user.user_metadata?.last_name
  }
}

export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const role = session.user.user_metadata?.role || 'client'
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