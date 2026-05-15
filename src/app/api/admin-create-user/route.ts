import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, password, full_name, phone } = await req.json()

  // Crée l'utilisateur dans auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone }
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Crée le profil
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    full_name,
    email,
    phone: phone || null,
    whatsapp: phone || null,
    role: 'client'
  })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ success: true, id: authData.user.id })
}