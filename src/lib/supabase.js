import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ciwddvprfhlqidfzklaq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpd2RkdnByZmhscWlkZnprbGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1Mzg0NjAsImV4cCI6MjA0ODExNDQ2MH0.gfJf1cKLczppqFsRFEjUNRr6a8z3YyYkYgPBxtO5QKE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const initializeSupabase = () => {
  console.log('Supabase initialized with URL:', supabaseUrl)
  return supabase
}

export default supabase