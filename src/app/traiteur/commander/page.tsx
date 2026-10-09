"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type CartItem } from "@/lib/types/traiteur";
import Link from "next/link";
import { PartyPopper, Car, Home, Calendar, Clock, AlertCircle } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
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
      if (data.delivery_type === "delivery" && (!data.delivery_address || !data.delivery_address.trim())) {
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
    },
  });

  const deliveryType = watch("delivery_type");
  const deliveryDate = watch("delivery_date") || defaultDeliveryDate;
  const deliveryTime = watch("delivery_time") || defaultDeliveryTime;
  const deliveryAddress = watch("delivery_address");

  const isFormValid = Boolean(
    deliveryDate &&
      deliveryTime &&
      (deliveryType === "pickup" ||
        (deliveryType === "delivery" && deliveryAddress?.trim())),
  );

  const handlePreSubmit = async (data: FormData) => {
    // Sécurisation Safari/Mac : s'assurer que date et heure sont bien peuplées
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
            "L'adresse de livraison indiquée n'a pas été trouvée. Veuillez sélectionner une adresse existante dans les suggestions."
        );
        return;
      }
      if (check.normalizedAddress && check.normalizedAddress !== data.delivery_address.trim()) {
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await authFetch(
        `${apiUrl}/traiteur/order`,
        {
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
        },
      );

      const dataR = await response.json();
      if (!response.ok) {
        setError(dataR.error || dataR.message || "Erreur lors de la validation de la commande");
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
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-[#1D6B45] text-sm font-semibold">Chargement...</div>
      </div>
    );
  }

  // Page de confirmation après commande
  if (success) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-[#E8F5E9] text-[#1D6B45] rounded-full flex items-center justify-center mx-auto mb-4">
            <PartyPopper size={36} />
          </div>
          <h2 className="text-2xl font-bold text-[#1D6B45] mb-2">
            Commande transmise !
          </h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Le traiteur a bien reçu votre commande de plats. Vous pouvez suivre son statut directement depuis votre espace commandes.
          </p>
          <Link
            href="/commandes"
            className="w-full inline-block bg-[#1D6B45] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#155234] transition-colors shadow-sm"
          >
            Voir mes commandes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-32">
      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <button
          onClick={() => router.back()}
          className="text-white/70 text-sm mb-4 inline-block hover:text-white transition-colors"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold text-white">Ma commande</h1>
        <p className="text-white/80 text-sm mt-1">
          {cart[0]?.traiteur_name || "Traiteur Dabari"}
        </p>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Récapitulatif panier */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs">
          <h2 className="font-bold text-gray-900 mb-4 text-base">
            Récapitulatif · {totalItems} article{totalItems > 1 ? "s" : ""}
          </h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.dish.id}
                className="flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-[#E8F5E9] text-[#1D6B45] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                  <span className="text-gray-700 text-sm font-medium">
                    {item.dish.name}
                  </span>
                </div>
                <span className="text-gray-900 font-bold text-sm">
                  {(item.dish.price * item.quantity).toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
            <span className="font-bold text-gray-800">Total TTC</span>
            <span className="font-black text-[#1D6B45] text-xl">
              {total.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Formulaire livraison */}
        <form onSubmit={handleSubmit(handlePreSubmit)} className="space-y-4">
          {/* Mode de livraison */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-bold text-gray-900 mb-4 text-sm">
              Mode de réception
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  deliveryType === "delivery"
                    ? "border-[#1D6B45] bg-[#E8F5E9]/60 shadow-xs ring-1 ring-[#1D6B45]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  {...register("delivery_type")}
                  type="radio"
                  value="delivery"
                  className="hidden"
                />
                <Car
                  size={24}
                  className={
                    deliveryType === "delivery"
                      ? "text-[#1D6B45]"
                      : "text-gray-400"
                  }
                />
                <span className="text-sm font-bold text-gray-800">
                  Livraison
                </span>
              </label>

              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  deliveryType === "pickup"
                    ? "border-[#1D6B45] bg-[#E8F5E9]/60 shadow-xs ring-1 ring-[#1D6B45]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  {...register("delivery_type")}
                  type="radio"
                  value="pickup"
                  className="hidden"
                />
                <Home
                  size={24}
                  className={
                    deliveryType === "pickup"
                      ? "text-[#1D6B45]"
                      : "text-gray-400"
                  }
                />
                <span className="text-sm font-bold text-gray-800">
                  À emporter (Retrait)
                </span>
              </label>
            </div>
          </div>

          {/* Adresse si livraison */}
          {deliveryType === "delivery" && (
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs">
              <h2 className="font-bold text-gray-900 mb-2 text-sm">
                Adresse de livraison *
              </h2>
              <AddressAutocomplete
                value={watch("delivery_address") || ""}
                onChange={(val) =>
                  setValue("delivery_address", val, { shouldValidate: true })
                }
                onSelectAddress={(item) =>
                  setValue("delivery_address", item.label, {
                    shouldValidate: true,
                  })
                }
                placeholder="12 rue de la Paix, 75001 Paris..."
                required
              />
              {errors.delivery_address && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle size={13} /> {errors.delivery_address.message}
                </p>
              )}
            </div>
          )}

          {/* Date et heure - Sécurisé avec controlled value pour compatibilité Safari/Mac */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-bold text-gray-900 mb-3 text-sm">
              Date et heure souhaitées *
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-[#1D6B45]" /> Date de réception
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  required
                />
                {errors.delivery_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.delivery_date.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-[#1D6B45]" /> Heure estimée
                </label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) =>
                    setValue("delivery_time", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  required
                />
                {errors.delivery_time && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.delivery_time.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-bold text-gray-900 mb-1.5 text-sm">
              Notes pour le traiteur
              <span className="text-gray-400 font-normal text-xs ml-1">
                (optionnel)
              </span>
            </h2>
            <textarea
              {...register("notes")}
              placeholder="Allergies, instructions de livraison, étage, code porte..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none bg-white"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs flex items-center gap-2 font-medium">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bouton commander */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#155235] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              "Envoi de la commande..."
            ) : (
              <>
                <span>Valider la commande</span>
                <span className="font-black text-white/90">({total.toFixed(2)} €)</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Pop-up de confirmation */}
      {showConfirmModal && pendingData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl text-center">
            <div className="w-14 h-14 bg-[#E8F5E9] text-[#1D6B45] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <PartyPopper size={28} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Confirmer votre commande
            </h3>
            <p className="text-gray-500 mb-4 text-xs leading-relaxed">
              Vous commandez auprès de <strong>{cart[0]?.traiteur_name}</strong> pour un montant total de :
            </p>

            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-5 text-sm font-black text-[#1D6B45]">
              {total.toFixed(2)} € TTC
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onSubmit(pendingData)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#1D6B45] text-white font-bold text-xs hover:bg-[#155235] transition-all shadow-sm flex items-center justify-center"
              >
                {loading ? "En cours..." : "Oui, commander"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
