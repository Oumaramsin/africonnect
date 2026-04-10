import { createClient } from '@/lib/supabase'

export type Traiteur = {
  id: string
  name: string
  bio: string
  cuisine_type: string[]
  rating: number
  review_count: number
  delivery_zones: string[]
  image_url: string | null
  dishes: Dish[]
}

export type Dish = {
  id: string
  traiteur_id: string
  name: string
  description: string
  price: number
  image_url: string | null
  cuisine_type: string
  is_available: boolean
}

export type CartItem = {
  dish: Dish
  quantity: number
  traiteur_id: string
  traiteur_name: string
}

// Récupère tous les traiteurs avec leurs plats
export async function getTraiteurs(cuisine?: string) {
  const supabase = createClient()

  let query = supabase
    .from('traiteurs')
    .select(`*, dishes(*)`)
    .eq('is_active', true)
    .order('rating', { ascending: false })

  if (cuisine && cuisine !== 'tout') {
    query = query.contains('cuisine_type', [cuisine])
  }

  const { data, error } = await query
  if (error) throw error
  return data as Traiteur[]
}

// Récupère un traiteur par son id
export async function getTraiteur(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('traiteurs')
    .select(`*, dishes(*)`)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Traiteur
}

// Crée une commande
export async function createOrder(params: {
  traiteur_id: string
  items: CartItem[]
  delivery_address: string
  delivery_date: string
  delivery_type: string
  notes?: string
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) throw new Error('Non connecté')

  const total = params.items.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_id: session.user.id,
      traiteur_id: params.traiteur_id,
      delivery_address: params.delivery_address,
      delivery_date: params.delivery_date,
      delivery_type: params.delivery_type,
      notes: params.notes,
      total_amount: total,
      status: 'pending'
    })
    .select()
    .single()

  if (orderError) {
    console.error('Erreur création commande:', orderError)
    throw new Error(orderError.message)
  }

  const orderItems = params.items.map(item => ({
    order_id: order.id,
    dish_id: item.dish.id,
    quantity: item.quantity,
    unit_price: item.dish.price
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) {
    console.error('Erreur items commande:', itemsError)
    throw new Error(itemsError.message)
  }

  return order
}

// Récupère les commandes du client connecté
export async function getMyOrders() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté')

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      traiteurs(name, cuisine_type),
      order_items(quantity, unit_price, dishes(name))
    `)
    .eq('client_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Annule une commande
export async function cancelOrder(orderId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  if (error) throw error
}