"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertCircle, X, Check, Calendar, MessageSquare } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface SignalGpDelayModalProps {
  isOpen: boolean;
  target: {
    id: string;
    currentArrivalDate?: string | null;
    departureDate?: string | null;
    routeLabel?: string;
    delayReason?: string | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SignalGpDelayModal({
  isOpen,
  target,
  onClose,
  onSuccess,
}: SignalGpDelayModalProps) {
  const [newArrivalDate, setNewArrivalDate] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [initialValues, setInitialValues] = useState<{ date: string; reason: string }>({
    date: "",
    reason: "",
  });

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (target) {
      let dStr = "";
      if (target.currentArrivalDate) {
        try {
          dStr = new Date(target.currentArrivalDate).toISOString().split("T")[0];
        } catch {
          dStr = "";
        }
      } else {
        // Demain par défaut
        dStr = new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
      }
      const rStr = target.delayReason || "";
      setNewArrivalDate(dStr);
      setDelayReason(rStr);
      setInitialValues({ date: dStr, reason: rStr });
      setError(null);
    }
  }, [target]);

  if (!isOpen || !target) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const minDate = target.departureDate
    ? new Date(target.departureDate).toISOString().split("T")[0]
    : todayStr;

  const hasChanges =
    newArrivalDate !== initialValues.date ||
    delayReason.trim() !== initialValues.reason.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArrivalDate) {
      setError("Veuillez renseigner la nouvelle date d'arrivée estimée.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/gp/${target.id}/delay`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            arrival_date: newArrivalDate,
            delay_reason: delayReason.trim(),
          }),
        }
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de l'enregistrement du retard");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delay-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center border border-amber-200 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h3 id="delay-modal-title" className="text-base font-bold text-gray-900 leading-tight">
                Signaler un retard d&apos;arrivée
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {target.routeLabel ? `Trajet : ${target.routeLabel}` : "Transport de colis GP"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertCircle size={14} className="text-[#D4870A]" />
              Information importante
            </p>
            <p className="text-amber-800 leading-relaxed">
              L&apos;expéditeur recevra automatiquement une notification pour l&apos;informer du décalage de la date d&apos;arrivée de son colis.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Nouvelle date d&apos;arrivée estimée *
            </label>
            <div className="relative">
              <input
                type="date"
                min={minDate}
                value={newArrivalDate}
                onChange={(e) => setNewArrivalDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Date à laquelle vous prévoyez d&apos;atterrir ou d&apos;être disponible à destination.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Motif ou précision pour l&apos;expéditeur
            </label>
            <textarea
              rows={3}
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder="Ex : Vol décalé de 24h par la compagnie aérienne, correspondance manquée..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                hasChanges && !loading
                  ? "bg-[#1D6B45] hover:bg-[#155335] text-white shadow-xs cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
              }`}
            >
              {loading ? (
                "Enregistrement..."
              ) : (
                <>
                  <Check size={15} />
                  <span>{hasChanges ? "Enregistrer & Notifier" : "Aucune modification"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
