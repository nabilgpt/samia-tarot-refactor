import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@supabase/supabase-js'

// Mock Supabase client for now
const createClient = (url: string, key: string) => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: null } }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error('Not implemented') }),
    signUp: () => Promise.resolve({ data: { user: null }, error: new Error('Not implemented') }),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: [], error: null }),
    update: () => Promise.resolve({ data: [], error: null }),
    delete: () => Promise.resolve({ data: [], error: null }),
  })
})

const supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key')

interface User {
  id: string
  email?: string
  user_metadata?: {
    first_name?: string
    last_name?: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, userData?: any) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { error: undefined }
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })

      if (error) throw error

      return { error: undefined }
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const signOut = async () => {
    await supabaseClient.auth.signOut()
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}