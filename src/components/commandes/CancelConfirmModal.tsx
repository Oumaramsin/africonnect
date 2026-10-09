"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: {
    type: "traiteur" | "order" | "gp" | "traiteur_request";
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

  useEscapeKey(onClose, isOpen && !loading);

  if (!isOpen || !target) return null;

  const isRequest = target.type === "traiteur_request";

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (isRequest) {
        // Suppression définitive de l'annonce (et de ses propositions)
        res = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/traiteur/requests/${target.id}`,
          { method: "DELETE" }
        );
      } else {
        res = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/commande/cancel/${target.type}/${target.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            data.message ||
            (isRequest
              ? "Erreur lors de la suppression"
              : "Erreur lors de l'annulation")
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.message ||
          (isRequest ? "Impossible de supprimer l'annonce" : "Impossible d'annuler")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm p-6 bg-white rounded-3xl shadow-2xl text-center">
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-14 h-14 mx-auto mb-4 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
          <AlertTriangle size={28} />
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {isRequest ? "Supprimer l'annonce ?" : "Annuler la commande ?"}
        </h3>

        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {isRequest ? (
            <>
              Voulez-vous vraiment supprimer{" "}
              <span className="font-semibold text-gray-800">{target.title}</span> ?
              L&apos;annonce et toutes les propositions reçues seront définitivement
              supprimées. Cette action est irréversible.
            </>
          ) : (
            <>
              Êtes-vous sûr(e) de vouloir annuler{" "}
              <span className="font-semibold text-gray-800">{target.title}</span> ?
              Cette action est irréversible.
            </>
          )}
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
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center"
          >
            {loading
              ? isRequest
                ? "Suppression..."
                : "Annulation..."
              : isRequest
                ? "Oui, supprimer"
                : "Oui, annuler"}
          </button>
        </div>
      </div>
    </div>
  );
}
