import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceKey)
export const SUPABASE_ENV_ERROR = 'Supabase 环境变量缺失'

function createMissingClient(label: string): SupabaseClient {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(`${SUPABASE_ENV_ERROR}: ${label}`)
      },
    },
  ) as SupabaseClient
}

// 浏览器端客户端（anon key，受 RLS 限制）
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMissingClient('supabase')

// 服务端客户端（service role key，绕过 RLS，仅用于 API Routes）
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createMissingClient('supabaseAdmin')
