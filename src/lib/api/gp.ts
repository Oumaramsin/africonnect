import { createClient } from '@/lib/supabase'

export type GpListing = {
  id: string
  gp_id: string
  departure_city: string
  departure_country: string
  arrival_city: string
  arrival_country: string
  departure_date: string
  available_kg: number
  price_per_kg: number
  flight_type: string
  description: string
  rating: number
  review_count: number
  is_active: boolean
  pickup_address: string | null
  pickup_city: string | null
  latitude: number | null
  longitude: number | null
  created_at: string

   profiles?: {
    full_name: string
    phone: string | null
    whatsapp: string | null
  } | null

}

export type GpRequest = {
  id: string
  listing_id: string
  sender_id: string
  weight_kg: number
  content_desc: string
  declared_value: number
  status: string
  total_amount: number
  notes: string
  created_at: string
}

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  reference_id: string
  is_read: boolean
  created_at: string
}

const COUNTRY_FLAG: Record<string, string> = {
  'France': '🇫🇷',
  'Sénégal': '🇸🇳',
  "Côte d'Ivoire": '🇨🇮',
  'Cameroun': '🇨🇲',
  'Congo': '🇨🇬',
  'Mali': '🇲🇱',
  'Guinée': '🇬🇳',
  'Burkina Faso': '🇧🇫',
}

export function getFlag(country: string) {
  return COUNTRY_FLAG[country] || '🌍'
}

// Récupère toutes les annonces GP
export async function getGpListings(filters?: {
  departure_country?: string
  arrival_country?: string
}) {
  const supabase = createClient()

  let query = supabase
    .from('gp_listings')
    .select('*, profiles(full_name, phone, whatsapp)')
    .eq('is_active', true)
    .gte('departure_date', new Date().toISOString().split('T')[0])
    .order('departure_date', { ascending: true })

  if (filters?.arrival_country && filters.arrival_country !== 'tout') {
    query = query.eq('arrival_country', filters.arrival_country)
  }

  const { data, error } = await query
  if (error) throw error
  return data as GpListing[]
}

// Récupère une annonce par id
export async function getGpListing(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('gp_listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as GpListing
}

// Crée une demande de colis
export async function createGpRequest(params: {
  listing_id: string
  gp_id: string
  weight_kg: number
  content_desc: string
  declared_value?: number
  notes?: string
  price_per_kg: number
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté')

  const total = params.weight_kg * params.price_per_kg

  const { data, error } = await supabase
    .from('gp_requests')
    .insert({
      listing_id: params.listing_id,
      sender_id: session.user.id,
      weight_kg: params.weight_kg,
      content_desc: params.content_desc,
      declared_value: params.declared_value,
      notes: params.notes,
      total_amount: total,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error

  // Envoie un message automatique au GP
  await supabase.from('messages').insert({
    sender_id: session.user.id,
    receiver_id: params.gp_id,
    reference_id: data.id,
    content: `Bonjour, je souhaite envoyer un colis de ${params.weight_kg}kg. Contenu : ${params.content_desc}.${params.notes ? ' Note : ' + params.notes : ''}`,
    is_read: false
  })

  return data
}

// Récupère les messages d'une conversation
export async function getMessages(otherUserId: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté')

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
    .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Message[]
}

// Envoie un message
export async function sendMessage(receiverId: string, content: string, referenceId?: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté')

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: session.user.id,
      receiver_id: receiverId,
      content,
      reference_id: referenceId,
      is_read: false
    })
    .select()
    .single()

  if (error) throw error
  return data
}
// Calcule la distance en km entre 2 coordonnées (formule Haversine)
export function getDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export function formatDistance(km: number): string {
  if (km < 1) return 'Moins d\'1 km'
  if (km < 10) return `${km} km`
  return `~${km} km`
}

// Récupère les demandes de colis du client connecté
export async function getMyGpRequests() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté')

  const { data, error } = await supabase
    .from('gp_requests')
    .select(`
      *,
      gp_listings(
        departure_city, departure_country,
        arrival_city, arrival_country,
        departure_date, price_per_kg
      )
    `)
    .eq('sender_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}