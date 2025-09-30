/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_TYPE: "client" | "reader" | "monitor" | "admin" | "superadmin"
  readonly VITE_ALLOWED_TYPES: string
  readonly VITE_AUTH_BYPASS?: string
  readonly VITE_DEV_ROLE?: "client" | "reader" | "monitor" | "admin" | "superadmin"
  readonly DEV: boolean
  readonly MODE: string
  readonly BASE_URL: string
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}