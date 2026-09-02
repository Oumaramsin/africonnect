"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { authFetch } from "@/lib/auth";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: {
    type: "traiteur" | "order" | "gp";
    id: string;
    title: string;
  } | null;
};

export default function CancelConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  target,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !target) return null;

  const handleCancelOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/cancel/${target.type}/${target.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors de l'annulation");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Impossible d'annuler la commande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm p-6 bg-white rounded-3xl shadow-2xl text-center">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-14 h-14 mx-auto mb-4 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
          <AlertTriangle size={28} />
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Annuler la commande ?
        </h3>

        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Êtes-vous sûr(e) de vouloir annuler <span className="font-semibold text-gray-800">{target.title}</span> ? Cette action est irréversible.
        </p>

        {error && (
          <div className="p-3 mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={handleCancelOrder}
            disabled={loading}
            className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center"
          >
            {loading ? "Annulation..." : "Oui, annuler"}
          </button>
        </div>
      </div>
    </div>
  );
}
