import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/* null = demo mode: no backend yet, the user picks a role on the login screen and sees demo data only. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null
