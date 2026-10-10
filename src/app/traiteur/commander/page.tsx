"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type CartItem } from "@/lib/types/traiteur";
import Link from "next/link";
import {
  PartyPopper,
  Car,
  Calendar,
  Clock,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  ChefHat,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Utensils,
  Store,
  ChevronRight,
  Info,
  Lock,
  Flame,
  Check,
} from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import Image from "next/image";
import { getValidToken, removeToken, authFetch } from "@/lib/auth";
import { verifyAddressExists } from "@/lib/addressValidation";

const schema = z
  .object({
    delivery_type: z.enum(["delivery", "pickup"]),
    delivery_address: z.string().optional(),
    delivery_date: z.string().min(1, "Date requise"),
    delivery_time: z.string().min(1, "Heure requise"),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        data.delivery_type === "delivery" &&
        (!data.delivery_address || !data.delivery_address.trim())
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Adresse de livraison requise",
      path: ["delivery_address"],
    },
  );

type FormData = z.infer<typeof schema>;

const NOTE_SUGGESTIONS = [
  "Sonner à l'interphone",
  "Appeler à l'arrivée",
  "Sauce et piments à part",
  "Bien chaud si possible",
  "Sensibilité aux arachides",
  "Code porte ou étage",
];

const POPULAR_TIME_SLOTS = [
  "12:00",
  "12:30",
  "13:00",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
];

export default function CommanderPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  // Date de livraison par défaut : demain à 12:30
  const defaultDeliveryDate = useMemo(() => {
    return new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  }, []);

  const defaultDeliveryTime = "12:30";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      delivery_type: "delivery",
      delivery_date: defaultDeliveryDate,
      delivery_time: defaultDeliveryTime,
      notes: "",
    },
  });

  const deliveryType = watch("delivery_type");
  const deliveryDate = watch("delivery_date") || defaultDeliveryDate;
  const deliveryTime = watch("delivery_time") || defaultDeliveryTime;
  const deliveryAddress = watch("delivery_address");
  const notesValue = watch("notes") || "";

  const isFormValid = Boolean(
    deliveryDate &&
      deliveryTime &&
      (deliveryType === "pickup" ||
        (deliveryType === "delivery" && deliveryAddress?.trim())),
  );

  const updateQuantity = (dishId: string, delta: number) => {
    setCart((prevCart) => {
      const updated = prevCart
        .map((item) => {
          if (item.dish.id === dishId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);

      if (updated.length === 0) {
        localStorage.removeItem("dabari_cart");
        router.push("/traiteur");
      } else {
        localStorage.setItem("dabari_cart", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const addNoteSuggestion = (text: string) => {
    if (!notesValue.includes(text)) {
      const newNotes = notesValue.trim()
        ? `${notesValue.trim()}, ${text}`
        : text;
      setValue("notes", newNotes);
    }
  };

  const handlePreSubmit = async (data: FormData) => {
    // Sécurisation Safari/Mobile : s'assurer que date et heure sont bien peuplées
    const safeData: FormData = {
      ...data,
      delivery_date: data.delivery_date?.trim() || defaultDeliveryDate,
      delivery_time: data.delivery_time?.trim() || defaultDeliveryTime,
    };

    if (data.delivery_type === "delivery" && data.delivery_address?.trim()) {
      const check = await verifyAddressExists(data.delivery_address.trim());
      if (!check.isValid) {
        setError(
          check.error ||
            "L'adresse de livraison indiquée n'a pas été trouvée. Veuillez sélectionner une adresse existante dans les suggestions.",
        );
        return;
      }
      if (
        check.normalizedAddress &&
        check.normalizedAddress !== data.delivery_address.trim()
      ) {
        setValue("delivery_address", check.normalizedAddress);
        safeData.delivery_address = check.normalizedAddress;
      }
    }

    setPendingData(safeData);
    setShowConfirmModal(true);
  };

  useEffect(() => {
    const token = getValidToken();
    if (token) {
      setIsLoggedIn(true);
    } else {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem("dabari_cart");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        } else {
          router.push("/traiteur");
        }
      } catch {
        router.push("/traiteur");
      }
    } else {
      router.push("/traiteur");
    }
  }, [router]);

  const total = cart.reduce((sum, i) => sum + i.dish.price * i.quantity, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const traiteurName = cart[0]?.traiteur_name || "Traiteur Dabari";

  const onSubmit = async (data: FormData) => {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);

    const safeDate = data.delivery_date?.trim() || defaultDeliveryDate;
    const safeTime = data.delivery_time?.trim() || defaultDeliveryTime;

    try {
      const token = getValidToken();
      if (!token) {
        removeToken();
        router.push("/login");
        return;
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await authFetch(`${apiUrl}/traiteur/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traiteur_id: cart[0].traiteur_id,
          delivery_address:
            data.delivery_type === "delivery"
              ? data.delivery_address?.trim() || "Livraison"
              : "Retrait sur place",
          delivery_date: `${safeDate}T${safeTime}:00`,
          delivery_type: data.delivery_type,
          notes: data.notes?.trim() || undefined,
          items: cart.map((item) => ({
            dish_id: item.dish.id,
            quantity: item.quantity,
            unit_price: item.dish.price,
          })),
        }),
      });

      const dataR = await response.json();
      if (!response.ok) {
        setError(
          dataR.error ||
            dataR.message ||
            "Erreur lors de la validation de la commande",
        );
        setLoading(false);
        return;
      }

      localStorage.removeItem("dabari_cart");
      setShowConfirmModal(false);
      setSuccess(true);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("Erreur commande:", err);
      setError(err?.message || "Une erreur est survenue lors de la commande.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-[#1D6B45] font-semibold text-sm bg-white px-6 py-4 rounded-2xl shadow-xs border border-emerald-100">
          <div className="w-5 h-5 border-2 border-[#1D6B45] border-t-transparent rounded-full animate-spin" />
          <span>Vérification de votre compte...</span>
        </div>
      </div>
    );
  }

  // Page de confirmation après commande avec style premium
  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg w-full bg-white p-8 sm:p-10 rounded-[36px] shadow-sm border border-slate-100 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-[#E8F5E9] text-[#1D6B45] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xs">
            <CheckCircle2 size={42} />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1D6B45] mb-3">
            Commande n° DAB-{Date.now().toString().slice(-6)}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Commande validée avec succès !
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mb-8 leading-relaxed">
            Votre commande a été transmise directement en cuisine chez{" "}
            <strong className="text-slate-900 font-semibold">
              {traiteurName}
            </strong>
            . L'artisan confirme la mise en préparation sous peu.
          </p>

          <div className="bg-[#FAF7F2] rounded-2xl p-4 sm:p-5 border border-amber-100/80 mb-8 text-left space-y-2.5 text-xs sm:text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Date & heure :</span>
              <span className="font-semibold text-slate-900">
                {new Date(deliveryDate).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })}{" "}
                à {deliveryTime}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Mode :</span>
              <span className="font-semibold text-slate-900">
                {deliveryType === "delivery"
                  ? "Livraison à domicile"
                  : "À emporter (Retrait sur place)"}
              </span>
            </div>
            {deliveryType === "delivery" && deliveryAddress && (
              <div className="flex items-start justify-between gap-3 pt-1">
                <span className="text-slate-500 shrink-0">Adresse :</span>
                <span className="font-semibold text-slate-900 text-right truncate">
                  {deliveryAddress}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
              <span className="text-slate-600 font-bold">Total réglé TTC :</span>
              <span className="font-black text-[#1D6B45] text-base sm:text-lg">
                {total.toFixed(2)} €
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/commandes"
              className="flex-1 bg-[#1D6B45] text-white py-3.5 px-6 rounded-2xl font-bold text-sm hover:bg-[#155234] transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} />
              Suivre ma commande
            </Link>
            <Link
              href="/traiteur"
              className="py-3.5 px-6 rounded-2xl font-semibold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
            >
              Retour à la carte
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28">
      {/* Top Banner Hero Desktop & Mobile */}
      <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-white/70 mb-3 sm:mb-4 flex-wrap">
            <Link
              href="/traiteur"
              className="hover:text-white transition-colors"
            >
              Traiteurs
            </Link>
            <ChevronRight size={12} className="text-white/40" />
            <span className="text-white/90 truncate max-w-[150px] sm:max-w-none">
              {traiteurName}
            </span>
            <ChevronRight size={12} className="text-white/40" />
            <span className="text-amber-300 font-semibold">
              Validation de commande
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-xs flex items-center justify-center text-white transition-all border border-white/10 shrink-0"
                aria-label="Retour"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Tunnel de commande sécurisé
                </h1>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5 flex items-center gap-1.5">
                  <ChefHat size={14} className="text-[#D4870A]" />
                  <span>
                    Préparation artisanale chez{" "}
                    <strong className="text-white font-semibold">
                      {traiteurName}
                    </strong>
                  </span>
                </p>
              </div>
            </div>

            {/* Badges de confiance Desktop */}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-white">
                <ShieldCheck size={15} className="text-emerald-300" />
                <span>Paiement séquestre garanti</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-white">
                <Sparkles size={15} className="text-amber-300" />
                <span>Cuisiné le jour même</span>
              </div>
            </div>
          </div>

          {/* Stepper horizontal visuel */}
          <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-3 gap-2 sm:gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2 text-white">
              <span className="w-6 h-6 rounded-full bg-white text-[#1D6B45] flex items-center justify-center text-xs font-bold shrink-0">
                1
              </span>
              <span className="truncate">Mode & Adresse</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <span className="w-6 h-6 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <span className="truncate">Date & Créneau</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center text-xs font-bold shrink-0">
                3
              </span>
              <span className="truncate">Confirmation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Container Desktop & Tablet */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Colonne Gauche : Formulaire de livraison & coordonnées (7 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            <form
              id="checkout-form"
              onSubmit={handleSubmit(handlePreSubmit)}
              className="space-y-5"
            >
              {/* Étape 1 : Mode de réception */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Mode de réception
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sélectionnez la formule de retrait ou de livraison souhaitée.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3">
                  <label
                    className={`relative flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      deliveryType === "delivery"
                        ? "border-[#1D6B45] bg-[#E8F5E9]/50 shadow-xs ring-1 ring-[#1D6B45]"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      {...register("delivery_type")}
                      type="radio"
                      value="delivery"
                      className="hidden"
                    />
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        deliveryType === "delivery"
                          ? "bg-[#1D6B45] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Car size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">
                          Livraison à domicile
                        </span>
                        {deliveryType === "delivery" && (
                          <CheckCircle2 size={16} className="text-[#1D6B45]" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Le traiteur livre vos plats chauds en boîte isotherme à
                        l'adresse indiquée.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`relative flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      deliveryType === "pickup"
                        ? "border-[#1D6B45] bg-[#E8F5E9]/50 shadow-xs ring-1 ring-[#1D6B45]"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      {...register("delivery_type")}
                      type="radio"
                      value="pickup"
                      className="hidden"
                    />
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        deliveryType === "pickup"
                          ? "bg-[#1D6B45] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Store size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">
                          À emporter (Retrait)
                        </span>
                        {deliveryType === "pickup" && (
                          <CheckCircle2 size={16} className="text-[#1D6B45]" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Récupérez directement vos plats frais à l'atelier de
                        cuisine du traiteur.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Étape 2 : Adresse si livraison ou Point de retrait */}
              {deliveryType === "delivery" ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Adresse de livraison *
                      </h2>
                      <p className="text-xs text-slate-500">
                        Vérifiée instantanément auprès de la Base Adresse
                        Nationale (BAN).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <AddressAutocomplete
                      value={watch("delivery_address") || ""}
                      onChange={(val) =>
                        setValue("delivery_address", val, {
                          shouldValidate: true,
                        })
                      }
                      onSelectAddress={(item) =>
                        setValue("delivery_address", item.label, {
                          shouldValidate: true,
                        })
                      }
                      placeholder="Ex: 14 Rue de la République, 75011 Paris..."
                      required
                    />
                    {errors.delivery_address && (
                      <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1.5 font-medium">
                        <AlertCircle size={14} className="shrink-0" />
                        {errors.delivery_address.message}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                      <ShieldCheck size={13} className="text-[#1D6B45] shrink-0" />
                      <span>
                        Certification officielle Base Adresse Nationale (BAN /
                        Etalab)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/50 rounded-3xl border border-emerald-200/70 p-5 sm:p-7">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Point de retrait atelier
                      </h2>
                      <p className="text-xs text-emerald-800">
                        Retrait direct chez {traiteurName}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                    L'adresse précise de l'atelier de cuisine de{" "}
                    <strong>{traiteurName}</strong> vous sera affichée dès
                    validation et transmise par SMS/Email avec les consignes
                    d'accès directes.
                  </p>
                </div>
              )}

              {/* Étape 3 : Date et heure souhaitées */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Créneau de préparation & réception *
                    </h2>
                    <p className="text-xs text-slate-500">
                      Permet au chef de planifier le mijotage et la cuisson minute.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar size={14} className="text-[#1D6B45]" /> Date
                      souhaitée
                    </label>
                    <input
                      type="date"
                      min={defaultDeliveryDate}
                      value={deliveryDate}
                      onChange={(e) =>
                        setValue("delivery_date", e.target.value, {
                          shouldValidate: true,
                        })
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                      required
                    />
                    {errors.delivery_date && (
                      <p className="text-red-600 text-xs mt-1.5 font-medium flex items-center gap-1">
                        <AlertCircle size={13} /> {errors.delivery_date.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock size={14} className="text-[#1D6B45]" /> Heure estimée
                    </label>
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) =>
                        setValue("delivery_time", e.target.value, {
                          shouldValidate: true,
                        })
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                      required
                    />
                    {errors.delivery_time && (
                      <p className="text-red-600 text-xs mt-1.5 font-medium flex items-center gap-1">
                        <AlertCircle size={13} /> {errors.delivery_time.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Créneaux suggérés en un clic */}
                <div className="pt-3 border-t border-slate-100 mt-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Créneaux fréquents :
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setValue("delivery_time", slot, {
                            shouldValidate: true,
                          })
                        }
                        className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                          deliveryTime === slot
                            ? "bg-[#1D6B45] text-white border-[#1D6B45]"
                            : "bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Étape 4 : Instructions & Notes */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Consignes particulières & Allergies
                      </h2>
                      <span className="text-xs text-slate-400 font-normal">
                        (optionnel)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Précisez tout détail utile au chef ou au livreur.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <textarea
                    {...register("notes")}
                    placeholder="Ex: Allergie aux arachides, sonner à l'interphone Martin 2e étage, piment doux à part..."
                    rows={3}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none bg-white text-slate-800 leading-relaxed font-medium"
                  />

                  {/* Suggestion tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-slate-400 font-medium mr-1">
                      Suggestions rapides :
                    </span>
                    {NOTE_SUGGESTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addNoteSuggestion(tag)}
                        className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-[#1D6B45] text-slate-600 px-3 py-1 rounded-full border border-slate-200 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Erreur générale API */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm flex items-center gap-3 font-medium">
                  <AlertCircle size={18} className="shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          </div>

          {/* Colonne Droite : Récapitulatif Panier Sticky Desktop (5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    Votre commande
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {totalItems} plat{totalItems > 1 ? "s" : ""} sélectionné
                    {totalItems > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#1D6B45] flex items-center justify-center">
                  <ShoppingBag size={20} />
                </div>
              </div>

              {/* Liste scrollable des plats avec Next.js Image */}
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 my-3">
                {cart.map((item) => (
                  <div
                    key={item.dish.id}
                    className="py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.dish.image_url ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                          <Image
                            src={item.dish.image_url}
                            alt={item.dish.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <Utensils size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {item.dish.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {Number(item.dish.price).toFixed(2)} € / portion
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Contrôleur de quantité interactif */}
                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.dish.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-600 hover:text-red-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                          title="Diminuer"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 size={12} />
                          ) : (
                            <Minus size={12} />
                          )}
                        </button>
                        <span className="text-xs font-bold text-slate-800 w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.dish.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-600 hover:text-[#1D6B45] flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                          title="Augmenter"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-slate-900 w-16 text-right">
                        {(item.dish.price * item.quantity).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Décomposition financière */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total plats</span>
                  <span className="font-semibold text-slate-900">
                    {total.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Frais de livraison</span>
                  <span className="font-semibold text-[#1D6B45]">
                    {deliveryType === "delivery"
                      ? "Inclus / Selon zone"
                      : "Gratuit (Retrait atelier)"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Frais de service Dabari</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                    Offerts
                  </span>
                </div>
                <div className="border-t border-slate-200/80 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-base font-extrabold text-slate-900 block">
                      Total TTC
                    </span>
                    <span className="text-[11px] text-slate-400">
                      TVA comprise
                    </span>
                  </div>
                  <span className="text-2xl font-black text-[#1D6B45]">
                    {total.toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Bouton de confirmation principal Desktop */}
              <div className="mt-6">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading || !isFormValid}
                  className="w-full bg-[#1D6B45] text-white py-4 px-6 rounded-2xl font-bold text-base hover:bg-[#155235] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transmission en cours...</span>
                    </div>
                  ) : (
                    <>
                      <span>Confirmer la commande</span>
                      <span className="font-black text-white/90">
                        ({total.toFixed(2)} €)
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Reassurance list */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <ShieldCheck size={16} className="text-[#1D6B45] shrink-0" />
                  <span>Validation directe auprès de l'artisan traiteur</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <Lock size={16} className="text-[#1D6B45] shrink-0" />
                  <span>Paiement séquestre débloqué après réception</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <Clock size={16} className="text-[#1D6B45] shrink-0" />
                  <span>Confirmation rapide par notification SMS/Email</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Sticky Bar Mobile */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 z-40 lg:hidden shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Total ({totalItems} plat{totalItems > 1 ? "s" : ""})
            </span>
            <span className="text-xl font-black text-[#1D6B45]">
              {total.toFixed(2)} €
            </span>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={loading || !isFormValid}
            className="flex-1 max-w-[220px] bg-[#1D6B45] text-white py-3.5 px-4 rounded-2xl font-bold text-sm hover:bg-[#155235] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Valider ({total.toFixed(2)} €)</span>
            )}
          </button>
        </div>
      </div>

      {/* Pop-up modal de confirmation avant soumission */}
      {showConfirmModal && pendingData && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full mx-auto shadow-2xl text-center">
            <div className="w-16 h-16 bg-[#E8F5E9] text-[#1D6B45] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
              Confirmer votre commande
            </h3>
            <p className="text-slate-500 mb-5 text-xs sm:text-sm leading-relaxed">
              Vous êtes sur le point de commander auprès de{" "}
              <strong className="text-slate-800">{traiteurName}</strong> :
            </p>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-slate-200/80 mb-6 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mode :</span>
                <span className="font-bold text-slate-800">
                  {pendingData.delivery_type === "delivery"
                    ? "Livraison à domicile"
                    : "À emporter (Retrait atelier)"}
                </span>
              </div>
              {pendingData.delivery_type === "delivery" && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Adresse :</span>
                  <span className="font-semibold text-slate-800 text-right truncate">
                    {pendingData.delivery_address}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Créneau :</span>
                <span className="font-semibold text-slate-800">
                  {new Date(pendingData.delivery_date).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "numeric",
                      month: "short",
                    },
                  )}{" "}
                  à {pendingData.delivery_time}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2 font-black text-sm">
                <span className="text-slate-700">Total TTC :</span>
                <span className="text-[#1D6B45]">{total.toFixed(2)} €</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onSubmit(pendingData)}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl bg-[#1D6B45] text-white font-bold text-xs sm:text-sm hover:bg-[#155235] transition-all shadow-md flex items-center justify-center cursor-pointer"
              >
                {loading ? "Validation..." : "Oui, commander"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
