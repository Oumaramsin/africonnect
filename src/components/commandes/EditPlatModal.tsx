"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  MapPin,
  Calendar,
  Plus,
  Minus,
  Trash2,
  X,
  ChefHat,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { authFetch } from "@/lib/auth";

type OrderItem = {
  dish_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: any;
};

function getDishImage(dish: any): string | null {
  if (!dish) return null;
  if (Array.isArray(dish.image_urls) && dish.image_urls.length > 0) {
    return dish.image_urls[0];
  }
  if (
    typeof dish.image_urls === "string" &&
    dish.image_urls.trim().startsWith("[")
  ) {
    try {
      const parsed = JSON.parse(dish.image_urls);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (_) {}
  }
  if (dish.image_url) return dish.image_url;
  if (dish.image) return dish.image;
  return null;
}

export default function EditPlatModal({
  isOpen,
  onClose,
  onSuccess,
  order,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Valeurs initiales pour détecter les modifications
  const [initialData, setInitialData] = useState<{
    deliveryType: "delivery" | "pickup";
    deliveryAddress: string;
    deliveryDate: string;
    notes: string;
    orderItems: { dish_id: string; quantity: number }[];
  } | null>(null);

  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [availableDishes, setAvailableDishes] = useState<any[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      const initDeliveryType = (order.delivery_type as "delivery" | "pickup") || "delivery";
      const initDeliveryAddress = order.delivery_address || "";
      const initDeliveryDate = order.delivery_date ? order.delivery_date.split("T")[0] : "";
      const initNotes = order.notes || "";

      setDeliveryType(initDeliveryType);
      setDeliveryAddress(initDeliveryAddress);
      setDeliveryDate(initDeliveryDate);
      setNotes(initNotes);
      setError(null);
      setShowConfirmModal(false);

      const items: OrderItem[] = (order.order_items || []).map((item: any) => {
        const dish = item.dish || item.dishes;
        return {
          dish_id: item.dish_id || dish?.id || item.id,
          name: dish?.name || "Plat",
          price: Number(item.unit_price || dish?.price || 0),
          quantity: item.quantity || 1,
          image_url: getDishImage(dish),
        };
      });
      setOrderItems(items);

      setInitialData({
        deliveryType: initDeliveryType,
        deliveryAddress: initDeliveryAddress,
        deliveryDate: initDeliveryDate,
        notes: initNotes,
        orderItems: items.map((i) => ({ dish_id: i.dish_id, quantity: i.quantity })),
      });

      // Charger les plats disponibles du traiteur pour permettre d'en ajouter
      const traiteurId = order.traiteur_id || order.traiteur?.id;
      if (traiteurId) {
        authFetch(`${process.env.NEXT_PUBLIC_API_URL}/traiteur/${traiteurId}`)
          .then((res) => res.json())
          .then((data) => {
            const dishes =
              data.data?.traiteur?.dishes ||
              data.data?.dishes ||
              data.traiteur?.dishes ||
              [];
            setAvailableDishes(dishes.filter((d: any) => d.is_available));
          })
          .catch(() => {});
      }
    }
  }, [order, isOpen]);

  // Détection si l'utilisateur a modifié quelque chose
  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    if (deliveryType !== initialData.deliveryType) return true;
    if (deliveryType === "delivery" && deliveryAddress.trim() !== initialData.deliveryAddress.trim()) {
      return true;
    }
    if (deliveryDate !== initialData.deliveryDate) return true;
    if (notes.trim() !== initialData.notes.trim()) return true;

    if (orderItems.length !== initialData.orderItems.length) return true;
    for (const item of orderItems) {
      const orig = initialData.orderItems.find((o) => o.dish_id === item.dish_id);
      if (!orig || orig.quantity !== item.quantity) return true;
    }
    return false;
  }, [initialData, deliveryType, deliveryAddress, deliveryDate, notes, orderItems]);

  if (!isOpen || !order) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  const updateQuantity = (dishId: string, delta: number) => {
    setOrderItems((prev) => {
      return prev
        .map((item) => {
          if (item.dish_id === dishId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[];
    });
  };

  const removeDish = (dishId: string) => {
    setOrderItems((prev) => prev.filter((i) => i.dish_id !== dishId));
  };

  const addDishToOrder = (dish: any) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.dish_id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dish_id === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          dish_id: dish.id,
          name: dish.name,
          price: Number(dish.price || 0),
          quantity: 1,
          image_url: getDishImage(dish),
        },
      ];
    });
  };

  const totalAmount = orderItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) return;

    if (orderItems.length === 0) {
      setError("Votre commande doit contenir au moins un plat.");
      return;
    }

    if (deliveryType === "delivery" && !deliveryAddress.trim()) {
      setError("Veuillez renseigner une adresse de livraison valide.");
      return;
    }

    if (!deliveryDate) {
      setError("Veuillez choisir une date de livraison ou retrait.");
      return;
    }

    if (deliveryDate < todayStr) {
      setError("La date ne peut pas être dans le passé.");
      return;
    }

    setError(null);
    setShowConfirmModal(true);
  };

  const performSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        delivery_type: deliveryType,
        delivery_address: deliveryType === "delivery" ? deliveryAddress : undefined,
        delivery_date: deliveryDate,
        notes,
        items: orderItems.map((i) => ({
          dish_id: i.dish_id,
          quantity: i.quantity,
        })),
      };

      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/order/${order.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors de la modification");
      }

      setShowConfirmModal(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Impossible d'enregistrer les modifications");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const traiteurName =
    order.traiteur?.name || order.traiteurs?.name || "Traiteur";

  return (
    <>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-lg my-8 bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
          {/* En-tête */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F5E9] text-[#1D6B45] flex items-center justify-center">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Modifier la commande de plats
                </h3>
                <p className="text-xs text-gray-500">Chez {traiteurName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Corps scrollable */}
          <form onSubmit={handlePreSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Section Plats */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Plats commandés ({orderItems.reduce((s, i) => s + i.quantity, 0)})
                </label>
              </div>

              {/* Bouton d'ajout de plats très visible & moderne */}
              <button
                type="button"
                onClick={() => setShowAddMenu(!showAddMenu)}
                className={`w-full mb-3 py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs border ${
                  showAddMenu
                    ? "bg-[#1D6B45] text-white border-[#1D6B45]"
                    : "bg-[#E8F5E9] hover:bg-[#d8eedb] text-[#1D6B45] border-[#1D6B45]/30"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform ${
                    showAddMenu ? "bg-white/20 text-white" : "bg-[#1D6B45] text-white"
                  }`}
                >
                  <Plus size={13} />
                </div>
                <span>
                  {showAddMenu
                    ? "Masquer la carte du traiteur"
                    : "+ Ajouter d'autres plats du traiteur"}
                </span>
                {showAddMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* Menu d'ajout des plats disponibles avec photos et steppers individuels */}
              {showAddMenu && (
                <div className="p-3 mb-4 bg-gray-50/90 border border-gray-200 rounded-2xl space-y-2.5 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-gray-200/60">
                    <p className="text-xs font-bold text-gray-700">
                      Plats disponibles chez {traiteurName}
                    </p>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {availableDishes.length} plat(s)
                    </span>
                  </div>

                  {availableDishes.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 text-center">
                      Aucun autre plat disponible pour ce traiteur.
                    </p>
                  ) : (
                    availableDishes.map((dish) => {
                      const alreadyIn = orderItems.find((i) => i.dish_id === dish.id);
                      const img = getDishImage(dish);
                      return (
                        <div
                          key={dish.id}
                          className="flex items-center justify-between p-2.5 bg-white rounded-2xl border border-gray-100 shadow-xs hover:border-[#1D6B45]/30 transition-all gap-3"
                        >
                          {/* Image du plat */}
                          {img ? (
                            <Image
                              src={img}
                              alt={dish.name}
                              width={56}
                              height={56}
                              className="w-14 h-14 rounded-xl object-cover border border-gray-100 shrink-0"
                              unoptimized
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                              <ChefHat size={24} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-gray-900 truncate">
                              {dish.name}
                            </p>
                            {dish.description && (
                              <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                {dish.description}
                              </p>
                            )}
                            <p className="text-xs font-black text-[#1D6B45] mt-1">
                              {Number(dish.price).toFixed(2)} €
                            </p>
                          </div>

                          {/* Contrôle d'ajout : Stepper si déjà ajouté, sinon Bouton simple */}
                          {alreadyIn && alreadyIn.quantity > 0 ? (
                            <div className="flex items-center gap-1.5 bg-[#E8F5E9] p-1 rounded-xl border border-[#1D6B45]/20 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateQuantity(dish.id, -1)}
                                className="w-7 h-7 rounded-lg bg-white text-[#1D6B45] shadow-xs flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all font-bold"
                                title="Diminuer"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="min-w-[20px] text-center font-black text-xs text-[#1D6B45]">
                                {alreadyIn.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(dish.id, 1)}
                                className="w-7 h-7 rounded-lg bg-[#1D6B45] text-white shadow-xs flex items-center justify-center hover:bg-[#0F4A30] active:scale-90 transition-all font-bold"
                                title="Augmenter"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addDishToOrder(dish)}
                              className="px-3.5 py-2 bg-[#1D6B45] hover:bg-[#0F4A30] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 active:scale-95"
                            >
                              <Plus size={13} />
                              <span>Ajouter</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Liste des plats dans la commande */}
              <div className="space-y-2.5">
                {orderItems.map((item) => (
                  <div
                    key={item.dish_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={52}
                          height={52}
                          className="w-13 h-13 rounded-xl object-cover border border-gray-200 shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <ChefHat size={22} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs sm:text-sm text-gray-800 truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs font-extrabold text-[#1D6B45]">
                          {Number(item.price).toFixed(2)} € / unité
                        </p>
                      </div>
                    </div>

                    {/* Boutons Compteur */}
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.dish_id, -1)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center font-extrabold text-sm text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.dish_id, 1)}
                        className="w-7 h-7 rounded-full bg-[#1D6B45] text-white font-bold flex items-center justify-center hover:bg-[#0F4A30] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDish(item.dish_id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors ml-1"
                        title="Supprimer ce plat"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3 px-1">
                <span className="font-bold text-sm text-gray-700">Total ajusté</span>
                <span className="font-black text-lg text-[#1D6B45]">
                  {totalAmount.toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Mode de livraison */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Mode de réception
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryType("delivery")}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                    deliveryType === "delivery"
                      ? "bg-[#1D6B45] text-white border-[#1D6B45] shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Livraison à domicile
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("pickup")}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                    deliveryType === "pickup"
                      ? "bg-[#1D6B45] text-white border-[#1D6B45] shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  À emporter / Retrait
                </button>
              </div>
            </div>

            {/* Adresse si livraison avec autocomplétion API gouvernementale */}
            {deliveryType === "delivery" && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Adresse de livraison *
                </label>
                <AddressAutocomplete
                  value={deliveryAddress}
                  onChange={(val) => setDeliveryAddress(val)}
                  onSelectAddress={(item) => setDeliveryAddress(item.label)}
                  placeholder="Ex: 12 rue des Lilas, Paris 75010..."
                  required
                />
              </div>
            )}

            {/* Date uniquement */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Date de réception *
              </label>
              <input
                type="date"
                min={todayStr}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Notes & Consignes particulières
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions pour la préparation ou la livraison..."
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !hasChanges || orderItems.length === 0}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  !hasChanges || orderItems.length === 0 || loading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                    : "bg-[#1D6B45] hover:bg-[#0F4A30] text-white active:scale-[0.98]"
                }`}
              >
                {loading
                  ? "Enregistrement..."
                  : !hasChanges
                  ? "Aucune modification"
                  : `Enregistrer (${totalAmount.toFixed(2)} €)`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Pop-up (Modale) de confirmation avant enregistrement */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl text-center">
            <div className="w-14 h-14 bg-emerald-50 text-[#1D6B45] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShoppingCart size={28} />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">
              Confirmer les modifications
            </h3>
            <p className="text-gray-600 mb-6 text-xs sm:text-sm leading-relaxed">
              Voulez-vous enregistrer cette commande mise à jour pour un montant de{" "}
              <span className="font-bold text-[#1D6B45]">{totalAmount.toFixed(2)} €</span> ({orderItems.reduce((s, i) => s + i.quantity, 0)} plats) le{" "}
              <span className="font-bold text-gray-900">
                {new Date(deliveryDate).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })}
              </span>{" "}
              ?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-colors"
              >
                Continuer d&apos;éditer
              </button>
              <button
                type="button"
                onClick={performSave}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#1D6B45] text-white font-bold text-xs sm:text-sm hover:bg-[#0F4A30] transition-colors shadow-md flex items-center justify-center"
              >
                {loading ? "Enregistrement..." : "Oui, confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
