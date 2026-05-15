import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import AdminAfriConnectClient from './AdminAfriConnectClient'

export default async function AdminPage() {
  const supabase = await createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: traiteurs } = await supabase
    .from('traiteurs')
    .select('*, profiles(full_name, phone, whatsapp)')
    .order('created_at', { ascending: false })

  const { data: gpListings } = await supabase
    .from('gp_listings')
    .select('*, profiles(full_name, phone, whatsapp)')
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone, whatsapp, email, role')
    .order('full_name')

  return (
    <AdminAfriConnectClient
      traiteurs={traiteurs ?? []}
      gpListings={gpListings ?? []}
      profiles={profiles ?? []}
    />
  )
}