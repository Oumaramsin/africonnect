import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { error } = await supabase.from('profiles').upsert({
    id: 'e2a259b5-9dfd-48b7-9828-3a6aabc9f956',
    full_name: 'Utilisateur',
    email: null,
    phone: null,
    whatsapp: null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}