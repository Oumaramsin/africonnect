"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { type Traiteur, type Dish, type CartItem } from "@/lib/types/traiteur";
import Link from "next/link";
import {
  Star,
  MapPin,
  ChefHat,
  Lock,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
  Search,
  X,
  Clock,
} from "lucide-react";
import CommandeForm from "./CommandeForm";
import { getValidToken } from "@/lib/auth";
import Image from "next/image";
import CountryFlag from "@/components/ui/CountryFlag";
import CountryFilterModal from "@/components/ui/CountryFilterModal";

// Helper DishCard component with responsive carousel and micro-interactions
function DishCard({
  dish,
  qty,
  isLoggedIn,
  onAdd,
  onRemove,
  onOpenModal,
}: {
  dish: Dish;
  qty: number;
  isLoggedIn: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onOpenModal?: () => void;
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
    <div className="bg-white rounded-3xl border-2 border-slate-100 hover:border-[#1D6B45]/40 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-300 group h-full">
      {/* Container d'image */}
      <div
        onClick={onOpenModal}
        className="relative h-52 sm:h-56 w-full bg-slate-100 shrink-0 overflow-hidden cursor-pointer"
      >
        {images.length > 0 ? (
          <>
            <Image
              src={images[currentImgIndex]}
              alt={dish.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1 rounded-full backdrop-blur-xs z-10">
                  {images.map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentImgIndex ? "bg-white scale-125" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-[#1D6B45]">
            <ChefHat size={44} className="opacity-70 group-hover:scale-110 transition-transform" />
          </div>
        )}

        {dish.cuisine_type && (
          <span className="absolute top-3 right-3 text-[10px] font-extrabold bg-white/95 backdrop-blur-xs text-[#1D6B45] px-2.5 py-1 rounded-full shadow-xs uppercase tracking-wider z-10">
            {dish.cuisine_type}
          </span>
        )}
      </div>

      {/* Détails du plat */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h4 className="font-extrabold text-slate-900 text-base group-hover:text-[#1D6B45] transition-colors line-clamp-1">
            {dish.name}
          </h4>
          <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
            {dish.description || "Préparé selon la recette traditionnelle avec des ingrédients frais."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">Prix unitaire</span>
            <span className="text-[#1D6B45] font-black text-lg">
              {Number(dish.price).toFixed(2)} €
            </span>
          </div>

          {isLoggedIn ? (
            qty === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="bg-[#1D6B45] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#154d31] active:scale-95 transition-all shadow-xs"
              >
                + Ajouter
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200">
                <button
                  type="button"
                  onClick={onRemove}
                  className="w-7 h-7 rounded-lg bg-white text-[#1D6B45] font-bold flex items-center justify-center hover:bg-emerald-100 active:scale-90 transition-all border border-emerald-200 text-sm"
                >
                  −
                </button>
                <span className="font-extrabold text-[#1D6B45] text-sm w-4 text-center">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={onAdd}
                  className="w-7 h-7 rounded-lg bg-[#1D6B45] text-white font-bold flex items-center justify-center hover:bg-[#154d31] active:scale-90 transition-all shadow-2xs text-sm"
                >
                  +
                </button>
              </div>
            )
          ) : (
            <Link
              href="/login"
              className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Lock size={12} /> Se connecter
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
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDishModal, setSelectedDishModal] = useState<Dish | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const token = getValidToken();
    setIsLoggedIn(Boolean(token));
  }, []);

  useEffect(() => {
    async function fetchTraiteur() {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/traiteur/${id}`,
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        const data = await response.json();
        setTraiteur(data.data.traiteur);
      } catch (error) {
        console.error("Une erreur est survenue lors de la récupération du traiteur :", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTraiteur();
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

  const availableDishes = useMemo(() => {
    return traiteur?.dishes?.filter((d) => d.is_available) || [];
  }, [traiteur?.dishes]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    availableDishes.forEach((d) => {
      if (d.cuisine_type) cats.add(d.cuisine_type);
    });
    return Array.from(cats);
  }, [availableDishes]);

  const categoryFilterOptions = useMemo(() => {
    return [
      { value: "all", label: "Toutes les spécialités", count: availableDishes.length },
      ...categories.map((cat: string) => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: availableDishes.filter((d) => d.cuisine_type?.toLowerCase() === cat.toLowerCase()).length,
      })),
    ];
  }, [categories, availableDishes]);

  const filteredDishes = useMemo(() => {
    return availableDishes.filter((d) => {
      const matchCat =
        selectedCategory === "all" ||
        d.cuisine_type?.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !menuSearch.trim() ||
        d.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
        d.description?.toLowerCase().includes(menuSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [availableDishes, selectedCategory, menuSearch]);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const chefJsonLd = useMemo(() => {
    if (!traiteur) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FoodEstablishment",
      name: traiteur.name,
      description: traiteur.bio || "Traiteur et cuisine traditionnelle africaine sur Dabari.",
      image: traiteur.image_url ? [traiteur.image_url] : undefined,
      servesCuisine: traiteur.cuisine_type ? [traiteur.cuisine_type] : ["Africaine"],
      priceRange: "€€",
      ...(traiteur.rating && traiteur.review_count
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: traiteur.rating,
              reviewCount: traiteur.review_count,
            },
          }
        : {}),
      url: `https://dabari.app/traiteur/${traiteur.id}`,
    };
  }, [traiteur]);

  if (loading)
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-[#1D6B45] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 text-sm mt-4 font-semibold">Chargement du chef traiteur...</p>
      </div>
    );

  if (!traiteur)
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-slate-500 text-base">Traiteur introuvable ou indisponible.</p>
        <Link
          href="/traiteur"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D6B45] text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft size={14} /> Retour aux traiteurs
        </Link>
      </div>
    );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      {chefJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(chefJsonLd) }}
        />
      )}
      {/* ── BREADCRUMB NAVIGATION ── */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/traiteur" className="hover:text-[#1D6B45] transition-colors flex items-center gap-1">
          <ArrowLeft size={13} /> Tous les traiteurs
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-bold truncate">{traiteur.name}</span>
      </div>

      {/* ── 1. HERO CHEF TRAITEUR (FULL WIDTH CARD) ── */}
      <section className="relative overflow-hidden rounded-3xl md:rounded-[36px] bg-gradient-to-br from-[#0F4A30] via-[#1D6B45] to-[#155234] text-white shadow-xl shadow-[#1D6B45]/10 p-6 sm:p-10 md:p-12">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/15 border-2 border-white/30 backdrop-blur-md flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
              {traiteur.image_url ? (
                <Image
                  src={traiteur.image_url}
                  alt={traiteur.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <ChefHat size={40} className="text-white" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {traiteur.name}
                </h1>
                <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/25">
                  Chef Partenaire Vérifié
                </span>
              </div>

              <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
                {traiteur.bio || "Spécialiste de la cuisine traditionnelle africaine. Plats cuisinés avec amour et ingrédients du pays."}
              </p>

              {/* Zones de livraison */}
              {traiteur.delivery_zones && traiteur.delivery_zones.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                  <MapPin size={13} className="text-emerald-300 shrink-0" />
                  <span className="text-white/80 font-medium">Zones :</span>
                  {traiteur.delivery_zones.map((zone) => (
                    <span
                      key={zone}
                      className="bg-white/15 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-md"
                    >
                      {zone}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Note et Contact direct */}
          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0 self-stretch md:self-auto justify-between md:justify-center border-t md:border-t-0 border-white/15 pt-4 md:pt-0">
            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-center">
              {traiteur.review_count && traiteur.review_count > 0 ? (
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-amber-300 fill-amber-300" />
                  <span className="text-white font-extrabold text-base">{traiteur.rating}</span>
                  <span className="text-white/70 text-xs">({traiteur.review_count} avis)</span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-white/95 text-xs font-bold">
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Nouveau Chef</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {traiteur.whatsapp && (
                <a
                  href={`https://wa.me/${traiteur.whatsapp.replace(/\D/g, "")}?text=Bonjour%20Chef%20${encodeURIComponent(traiteur.name)}%2C%20je%20vous%20contacte%20via%20Dabari`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all hover:scale-102"
                >
                  <MessageCircle size={15} /> Contacter sur WhatsApp
                </a>
              )}

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl backdrop-blur-md border border-white/20 transition-all active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="text-emerald-300" />
                    <span>Lien copié !</span>
                  </>
                ) : (
                  <>
                    <Share2 size={14} />
                    <span>Partager</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. DESKTOP SPLIT EN 2 COLONNES (65% MENU / 35% DEVIS & PANIER STICKY) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── COLONNE GAUCHE (8 COLONNES SUR PC) : MENU & PLATS ── */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                La Carte du Chef
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {availableDishes.length} plat{availableDishes.length > 1 ? "s" : ""} disponible{availableDishes.length > 1 ? "s" : ""} à la commande
              </p>
            </div>
          </div>

          {/* Barre de filtres & recherche du menu */}
          {availableDishes.length > 0 && (
            <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Rechercher un plat (Tiep, Yassa, Aloco, Ndolé...)"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#1D6B45] text-xs sm:text-sm pl-9 pr-8 py-2 rounded-xl outline-none"
                  />
                  {menuSearch && (
                    <button
                      type="button"
                      onClick={() => setMenuSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {categories.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <CountryFilterModal
                      options={categoryFilterOptions}
                      selectedValue={selectedCategory}
                      onSelect={(val) => setSelectedCategory(val)}
                      title="Spécialités de la carte"
                      subtitle="Filtrez les plats du chef par origine ou type"
                      buttonLabel="Spécialité / Pays"
                    />
                    {selectedCategory !== "all" && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("all")}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-2 rounded-xl border border-rose-200 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <X size={13} /> Tout voir
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {availableDishes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <ChefHat size={36} className="text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Aucun plat disponible pour l'instant</p>
              <p className="text-xs text-slate-500">
                Ce chef propose principalement des prestations sur devis pour les événements.
              </p>
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-2">
              <p className="text-sm font-bold text-slate-700">Aucun plat ne correspond à vos filtres</p>
              <button
                type="button"
                onClick={() => {
                  setMenuSearch("");
                  setSelectedCategory("all");
                }}
                className="text-xs text-[#1D6B45] font-bold hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredDishes.map((dish: Dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  qty={getQty(dish.id)}
                  isLoggedIn={isLoggedIn}
                  onAdd={() => addToCart(dish)}
                  onRemove={() => removeFromCart(dish.id)}
                  onOpenModal={() => setSelectedDishModal(dish)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── COLONNE DROITE (4 COLONNES SUR PC) : PANIER STICKY & DEVIS ÉVÉNEMENT ── */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* Panier Desktop en direct */}
          {totalItems > 0 && (
            <div className="bg-white rounded-3xl p-6 border-2 border-[#1D6B45] shadow-lg space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#1D6B45] text-white flex items-center justify-center font-bold text-xs">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Votre Commande</h3>
                    <p className="text-[11px] text-slate-500">{totalItems} article{totalItems > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title="Vider le panier"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Liste des articles du panier */}
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.dish.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-900 truncate">{item.dish.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.quantity} × {Number(item.dish.price).toFixed(2)} €
                      </p>
                    </div>
                    <span className="font-extrabold text-[#1D6B45] shrink-0">
                      {(Number(item.dish.price) * item.quantity).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>

              {/* Total et CTA */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Total estimé</span>
                  <span className="text-xl font-black text-slate-900">{total.toFixed(2)} €</span>
                </div>

                <button
                  type="button"
                  onClick={goToCheckout}
                  className="w-full bg-[#1D6B45] hover:bg-[#154d31] text-white py-3 px-4 rounded-xl text-xs font-black shadow-md flex items-center justify-between transition-all hover:scale-102"
                >
                  <span>Valider et commander</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Formulaire de Demande de Devis d'Événement */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center font-bold">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Devis pour un événement
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mariages, baptêmes, buffets sur-mesure
                </p>
              </div>
            </div>

            <CommandeForm
              traiteurId={traiteur.id}
              traiteurName={traiteur.name}
              whatsapp={traiteur.whatsapp}
            />
          </div>

          {/* Badges de Confiance */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#1D6B45]" />
              <span className="font-bold text-slate-800">Engagement Qualité & Hygiène</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#D4870A]" />
              <span>Plats préparés à la commande le jour même</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ── PANIER FLOTTANT SUR MOBILE UNIQUEMENT (md:hidden) ── */}
      {totalItems > 0 && (
        <div className="md:hidden fixed bottom-20 left-0 right-0 px-4 z-40 max-w-md mx-auto">
          <button
            type="button"
            onClick={goToCheckout}
            className="w-full bg-[#1D6B45] text-white py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-2xl hover:bg-[#154d31] active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-black px-2 py-1 rounded-lg">
                {totalItems}
              </span>
              <span className="font-bold text-sm">Voir mon panier</span>
            </div>
            <span className="font-extrabold text-base">{total.toFixed(2)} €</span>
          </button>
        </div>
      )}

      {/* ── MODALE INTERACTIVE PHOTO & DÉTAILS DU PLAT ── */}
      {selectedDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="relative h-64 sm:h-72 w-full bg-slate-100 shrink-0">
              {selectedDishModal.image_urls && selectedDishModal.image_urls.length > 0 ? (
                <Image
                  src={selectedDishModal.image_urls[0]}
                  alt={selectedDishModal.name}
                  fill
                  sizes="500px"
                  className="object-cover"
                />
              ) : selectedDishModal.image_url ? (
                <Image
                  src={selectedDishModal.image_url}
                  alt={selectedDishModal.name}
                  fill
                  sizes="500px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#1D6B45]">
                  <ChefHat size={48} className="opacity-70" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedDishModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs z-10 transition-colors"
                aria-label="Fermer la vue détaillée"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xl">{selectedDishModal.name}</h3>
                  {selectedDishModal.cuisine_type && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-[#1D6B45] bg-emerald-50 px-2.5 py-0.5 rounded-full capitalize">
                      <CountryFlag country={selectedDishModal.cuisine_type} size={13} />
                      <span>Cuisine {selectedDishModal.cuisine_type}</span>
                    </span>
                  )}
                </div>
                <span className="text-2xl font-black text-[#1D6B45]">
                  {Number(selectedDishModal.price).toFixed(2)} €
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {selectedDishModal.description || "Plat traditionnel cuisiné avec des ingrédients frais selon les recettes authentiques de la diaspora."}
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  Ajouter à votre commande :
                </div>
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(selectedDishModal);
                      setSelectedDishModal(null);
                    }}
                    className="inline-flex items-center gap-2 bg-[#1D6B45] hover:bg-[#154d31] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <ShoppingBag size={15} />
                    <span>Ajouter ({Number(selectedDishModal.price).toFixed(2)} €)</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    <Lock size={13} /> Se connecter pour commander
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
