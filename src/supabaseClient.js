import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('[Supabase] Missing env vars. Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
	throw new Error('Supabase configuration missing. Create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY then restart dev server.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
