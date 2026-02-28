import { createBrowserClient } from '@supabase/ssr'

// 1. Esta función la usa tu nuevo LOGIN y los componentes modernos
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

// 2. Esta constante la usan tus páginas viejas (analitica, finanzas, etc.)
//    Al exportar esto, evitamos tener que cambiar código en todos los otros archivos.
export const supabase = createClient()