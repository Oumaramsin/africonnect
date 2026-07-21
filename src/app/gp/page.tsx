'use client'

import { useEffect, useState } from 'react'
import { getGpListings, getFlag, getDistance, formatDistance, type GpListing } from '@/lib/api/gp'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plane, MapPin, Lock, Star, Plus } from 'lucide-react'
import cookies from 'js-cookie'

const DESTINATIONS = [
  { label: 'Tout', value: 'tout' },
  { label: '🇸🇳 Sénégal', value: 'Sénégal' },
  { label: '🇨🇮 Côte d\'Ivoire', value: "Côte d'Ivoire" },
  { label: '🇨🇲 Cameroun', value: 'Cameroun' },
  { label: '🇨🇬 Congo', value: 'Congo' },
  { label: '🇲🇱 Mali', value: 'Mali' },
]

export default function GpPage() {
  const supabase = createClient();
  const [listings, setListings] = useState<GpListing[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [destination, setDestination] = useState('tout')
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [sortByDistance, setSortByDistance] = useState(false)

  // Géolocalisation
  useEffect(() => {
    if (!navigator.geolocation) return
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setLocationLoading(false)
      },
      () => setLocationLoading(false),
      { timeout: 5000 }
    )
  }, [])

  // Chargement des annonces
  useEffect(() => {
    let ignore = false

    async function fetchListings() {
      setLoading(true)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gp`,{
          headers:{
            "Content-Type": "application/json"
          }
        })
        const data = await response.json()
        if(!response.ok){
          console.error(data.message || 'Erreur de fetch des gp');
          return;
        }
        console.log(data)
        setListings(data.data.gp)
        setLoading(false);
    }catch(error){
      console.error(error)
    }
  }
    fetchListings()
    return () => { ignore = true }
  }, [destination])

  useEffect(() => {
    const load = async () => {
      const token = cookies.get('token')
      if(token){
        return setIsLoggedIn(true);
      }
    };
    load();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long'
    })
  }

  // Tri par distance si activé
  const sortedListings = [...listings].sort((a, b) => {
    if (!sortByDistance || !userLocation) return 0
    const distA = a.latitude && a.longitude
      ? getDistance(userLocation.lat, userLocation.lon, a.latitude, a.longitude)
      : 9999
    const distB = b.latitude && b.longitude
      ? getDistance(userLocation.lat, userLocation.lon, b.latitude, b.longitude)
      : 9999
    return distA - distB
  })

  return (
    <div className="min-h-screen bg-[#FAF7F2]">

      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link href="/dashboard" className="text-white/70 text-sm mb-4 inline-block">
          ← Accueil
        </Link>
        <h1 className="text-2xl font-bold text-white">GP Colis</h1>
        <p className="text-white/70 text-sm mt-1">Envoie un colis en toute sécurité</p>

        {/* Filtres destination */}
        <div className="relative mt-4 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-8">
            {DESTINATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setDestination(d.value)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  destination === d.value
                    ? 'bg-white text-[#1D6B45] font-medium'
                    : 'bg-white/20 text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#1D6B45] to-transparent pointer-events-none"></div>
        </div>
      </div>

      {/* Barre de tri + localisation */}
      <div className="px-4 pt-4 max-w-2xl mx-auto flex items-center justify-between gap-3">

        {/* Bouton tri par distance */}
        <button
          onClick={() => setSortByDistance(!sortByDistance)}
          disabled={!userLocation}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            sortByDistance
              ? 'bg-[#1D6B45] text-white border-[#1D6B45]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#1D6B45] hover:text-[#1D6B45]'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <MapPin size={16} />
          {locationLoading
            ? 'Localisation...'
            : userLocation
            ? sortByDistance ? 'Trié par distance' : 'Trier par distance'
            : 'Localisation indisponible'
          }
        </button>

        <span className="text-sm text-gray-600">
          {sortedListings.length} GP{sortedListings.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Bannière sécurité */}
      <div className="mx-4 mt-3 bg-[#FFF8E1] border border-[#D4870A]/20 rounded-2xl p-4 flex gap-3 max-w-2xl">
        <Lock size={20} className="text-[#D4870A]" />
        <div>
          <p className="text-sm font-medium text-[#D4870A]">Paiement sécurisé</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Ton argent est bloqué jusqu'à confirmation de livraison
          </p>
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <div className="flex justify-center mb-3"><Plane size={48} className="text-gray-300" /></div>
            <p>Aucun GP disponible pour cette destination</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedListings.map(listing => {
              const distance = userLocation && listing.latitude && listing.longitude
                ? getDistance(userLocation.lat, userLocation.lon, listing.latitude, listing.longitude)
                : null

              return (
                <Link key={listing.id} href={`/gp/${listing.id}`} className="block">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">

                    {/* Route */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        {getFlag(listing.departure_country)} {listing.departure_city}
                      </span>
                      <span className="text-[#1D6B45] font-bold">→</span>
                      <span className="font-semibold text-gray-800">
                        {getFlag(listing.arrival_country)} {listing.arrival_city}
                      </span>
                      <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${
                        listing.flight_type === 'direct'
                          ? 'bg-[#E8F5E9] text-[#1D6B45]'
                          : 'bg-[#FFF8E1] text-[#D4870A]'
                      }`}>
                        {listing.flight_type === 'direct' ? 'Direct' : 'Escale'}
                      </span>
                    </div>

                    {/* Nom du GP */}
                      {listing.profiles?.full_name && (
                        <div className="flex items-center gap-2 mt-1 mb-2">
                          <div className="w-6 h-6 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#1D6B45] text-xs font-bold">
                            {listing.profiles.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-600 font-medium">
                            {listing.profiles.full_name}
                          </span>
                        </div>
                      )}

                    {/* Localisation + date */}
                    <div className="flex items-center gap-3 mb-3">
                      {listing.pickup_city && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={12} /> {listing.pickup_city}
                        </span>
                      )}
                      {distance !== null && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          distance <= 5
                            ? 'bg-[#E8F5E9] text-[#1D6B45]'
                            : distance <= 15
                            ? 'bg-[#FFF8E1] text-[#D4870A]'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {formatDistance(distance)}
                        </span>
                      )}
                      <span className="text-xs text-gray-600 ml-auto flex items-center">
                        <Plane size={12} className="mr-1" /> {formatDate(listing.departure_date)}
                      </span>
                    </div>

                    {/* Détails */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Disponible</p>
                          <p className="font-semibold text-gray-800">{listing.available_kg} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Tarif</p>
                          <p className="font-semibold text-[#1D6B45]">{listing.price_per_kg} €/kg</p>
                        </div>
                        {listing.review_count > 0 && (
                          <div>
                            <p className="text-xs text-gray-600">Note</p>
                            <p className="font-semibold text-gray-800 flex items-center">
                              <Star size={12} className="mr-1 text-yellow-500" fill="currentColor" /> {listing.rating}
                            </p>
                          </div>
                        )}
                      </div>
                      <span className="text-[#1D6B45] text-sm font-medium">
                        Contacter →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Bouton publier annonce */}
      {isLoggedIn ? (
        <div className="fixed bottom-6 right-4 z-50">
          <Link href="/gp/nouvelle">
            <button className="bg-[#1D6B45] text-white px-5 py-3 rounded-2xl font-medium shadow-lg hover:bg-[#0F4A30] transition-colors flex items-center gap-2">
              <Plus size={20} />
              Je suis GP
            </button>
          </Link>
        </div>
      ) : (
        <div className="fixed bottom-6 right-4 z-50">
          <Link href="/login">
            <button className="bg-white border-2 border-dashed border-[#1D6B45]/40 text-[#1D6B45] px-5 py-3 rounded-2xl font-medium shadow-lg hover:bg-[#1D6B45]/5 transition-colors flex items-center gap-2">
              <Lock size={20} />
              Devenir GP
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}