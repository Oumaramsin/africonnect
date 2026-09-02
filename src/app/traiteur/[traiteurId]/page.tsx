"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { type Traiteur, type Dish, type CartItem } from "@/lib/types/traiteur";
import Link from "next/link";
import { Star, MapPin, ChefHat, Lock } from "lucide-react";
import CommandeForm from "./CommandeForm";
import { getValidToken } from "@/lib/auth";

// Helper DishCard component to manage image navigation locally
function DishCard({
  dish,
  qty,
  isLoggedIn,
  onAdd,
  onRemove,
}: {
  dish: Dish;
  qty: number;
  isLoggedIn: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const images =
    dish.image_urls && dish.image_urls.length > 0
      ? dish.image_urls
      : dish.image_url
        ? [dish.image_url]
        : [];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col hover:shadow-xl hover:border-gray-200/60 transition-all duration-300 group h-full">
      {/* Image container */}
      <div className="relative h-56 sm:h-64 w-full bg-gray-50 flex-shrink-0 overflow-hidden">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImgIndex]}
              alt={dish.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {images.length > 1 && (
              <>
                {/* Navigation arrows */}
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:opacity-100 z-10 font-bold"
                >
                  ←
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:opacity-100 z-10 font-bold"
                >
                  →
                </button>
                {/* Dots indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setCurrentImgIndex(idx);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentImgIndex
                          ? "bg-white scale-125"
                          : "bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#FFF3E0] to-[#FFE0B2] flex items-center justify-center text-[#D4870A]">
            <ChefHat
              size={48}
              className="opacity-80 group-hover:scale-110 transition-transform duration-350"
            />
          </div>
        )}

        {dish.cuisine_type && (
          <span className="absolute top-3 right-3 text-[10px] font-bold bg-white/95 backdrop-blur-sm text-[#1D6B45] px-2.5 py-1 rounded-full shadow-sm tracking-wider uppercase z-10">
            {dish.cuisine_type}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-lg group-hover:text-[#1D6B45] transition-colors duration-200 line-clamp-1">
            {dish.name}
          </h3>
          <p className="text-gray-500 text-sm mt-2 line-clamp-3 leading-relaxed min-h-[3.75rem]">
            {dish.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <span className="text-[#1D6B45] font-black text-xl">
            {Number(dish.price).toFixed(2)} €
          </span>

          {isLoggedIn ? (
            qty === 0 ? (
              <button
                onClick={onAdd}
                className="bg-[#1D6B45] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#0F4A30] active:scale-95 transition-all shadow-sm"
              >
                + Ajouter
              </button>
            ) : (
              <div className="flex items-center gap-2.5 bg-gray-50 p-1 rounded-full border border-gray-100">
                <button
                  onClick={onRemove}
                  className="w-8 h-8 rounded-full border border-[#1D6B45]/20 text-[#1D6B45] bg-white font-bold flex items-center justify-center hover:bg-[#E8F5E9] active:scale-90 transition-all"
                >
                  −
                </button>
                <span className="font-semibold text-gray-800 text-base w-4 text-center">
                  {qty}
                </span>
                <button
                  onClick={onAdd}
                  className="w-8 h-8 rounded-full bg-[#1D6B45] text-white font-bold flex items-center justify-center hover:bg-[#0F4A30] active:scale-90 transition-all shadow-sm"
                >
                  +
                </button>
              </div>
            )
          ) : (
            <Link
              href="/login"
              className="bg-gray-100 text-[#1D6B45] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1D6B45]/10 transition-colors flex items-center gap-2"
            >
              <Lock size={14} /> Se connecter
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TraiteurDetailPage() {
  const { traiteurId: id } = useParams();
  const router = useRouter();
  const [traiteur, setTraiteur] = useState<Traiteur | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const token = getValidToken();
    setIsLoggedIn(Boolean(token));
  }, []);

  useEffect(() => {
    async function fetchTraiteurs() {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/traiteur/${id}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        const data = await response.json();
        setTraiteur(data.data.traiteur);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur est survenue", error);
      }
    }
    fetchTraiteurs();
  }, [id]);

  const addToCart = (dish: Dish) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish.id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dish.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          dish,
          quantity: 1,
          traiteur_id: traiteur!.id,
          traiteur_name: traiteur!.name,
        },
      ];
    });
  };

  const removeFromCart = (dishId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish.id === dishId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.dish.id === dishId ? { ...i, quantity: i.quantity - 1 } : i,
        );
      }
      return prev.filter((i) => i.dish.id !== dishId);
    });
  };

  const getQty = (dishId: string) =>
    cart.find((i) => i.dish.id === dishId)?.quantity || 0;
  const total = cart.reduce((sum, i) => sum + i.dish.price * i.quantity, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  const goToCheckout = () => {
    localStorage.setItem("dabari_cart", JSON.stringify(cart));
    router.push("/traiteur/commander");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-[#1D6B45] text-lg">Chargement...</div>
      </div>
    );

  if (!traiteur)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-gray-500">Traiteur introuvable</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-32">
      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/traiteur"
            className="text-white/70 text-sm mb-4 inline-block hover:text-white transition-colors"
          >
            ← Retour
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {traiteur.image_url && (
                <img
                  src={traiteur.image_url}
                  alt={traiteur.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/20 shrink-0"
                />
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {traiteur.name}
                </h1>
                <p className="text-white/70 text-sm mt-2 max-w-md">
                  {traiteur.bio}
                </p>
              </div>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2 text-center backdrop-blur-xs flex-shrink-0">
              {traiteur.review_count && traiteur.review_count > 0 ? (
                <>
                  <div className="flex justify-center text-yellow-300 mb-1">
                    <Star size={20} fill="currentColor" />
                  </div>
                  <div className="text-white font-bold text-lg">
                    {traiteur.rating}
                  </div>
                  <div className="text-white/60 text-xs">
                    {traiteur.review_count} avis
                  </div>
                </>
              ) : (
                <div className="text-white/80 text-sm font-medium py-2 px-1">
                  Pas d'avis
                </div>
              )}
            </div>
          </div>

          {/* Zones de livraison */}
          <div className="flex gap-2 mt-5 flex-wrap">
            {traiteur.delivery_zones?.map((zone) => (
              <span
                key={zone}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 rounded-full flex items-center transition-colors"
              >
                <MapPin size={12} className="mr-1" /> {zone}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Formulaire de commande */}
      <div className="px-4 max-w-2xl mx-auto mt-6">
        <CommandeForm
          traiteurId={traiteur.id}
          traiteurName={traiteur.name}
          whatsapp={traiteur.whatsapp}
        />
      </div>

      {/* Menu */}
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <h2 className="font-bold text-gray-800 text-xl mb-6">
          Menu · {traiteur.dishes?.filter((d) => d.is_available).length || 0}{" "}
          plats
        </h2>

        <div className="space-y-6">
          {traiteur.dishes
            ?.filter((d) => d.is_available)
            .map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                qty={getQty(dish.id)}
                isLoggedIn={isLoggedIn}
                onAdd={() => addToCart(dish)}
                onRemove={() => removeFromCart(dish.id)}
              />
            ))}
        </div>
      </div>

      {/* Panier flottant */}
      {totalItems > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-40 max-w-md mx-auto">
          <button
            onClick={goToCheckout}
            className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl flex items-center justify-between px-6 shadow-xl hover:bg-[#0F4A30] active:scale-98 transition-all"
          >
            <span className="bg-white/20 text-white text-sm font-bold px-2 py-1 rounded-lg">
              {totalItems}
            </span>
            <span className="font-semibold">Voir mon panier</span>
            <span className="font-bold">{total.toFixed(2)} €</span>
          </button>
        </div>
      )}
    </div>
  );
}
