import { createClient } from '@supabase/supabase-js'

// El "export" es la llave que permite que otros archivos lo usen
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)