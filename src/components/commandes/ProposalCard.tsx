"use client";

import { useState } from "react";
import {
  ChefHat,
  Check,
  CheckCircle2,
  Phone,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
  Clock,
  Quote,
} from "lucide-react";
import { TraiteurProposal, formatWhatsAppUrl } from "@/lib/types/traiteur";

type Props = {
  proposal: TraiteurProposal;
  eventType: string;
  budget: number | string | null;
  requestOpen: boolean;
  isBestPrice: boolean;
  loading: boolean;
  formatDate: (d: string) => string;
  onAccept: () => void;
  onReject: () => void;
};

export default function ProposalCard({
  proposal,
  eventType,
  budget,
  requestOpen,
  isBestPrice,
  loading,
  formatDate,
  onAccept,
  onReject,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const traiteur = proposal.traiteur;
  const isPending = proposal.status === "pending";
  const isAccepted = proposal.status === "accepted";
  const isRejected = proposal.status === "rejected";

  const price = Number(proposal.proposed_price || 0);
  const parsedBudget =
    budget !== null && budget !== undefined
      ? typeof budget === "number"
        ? budget
        : parseFloat(String(budget).replace(/\s/g, "").replace(",", "."))
      : null;
  const budgetNum = parsedBudget !== null && !isNaN(parsedBudget) ? parsedBudget : null;
  const diff = budgetNum && budgetNum > 0 ? price - budgetNum : null;

  const whatsappNum = traiteur?.whatsapp || traiteur?.profile?.phone;
  const waUrl = formatWhatsAppUrl(
    whatsappNum,
    `Bonjour ${traiteur?.name || ""}, je fais suite à votre proposition sur Dabari pour mon événement (${eventType}) à ${price}€.`
  );

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isAccepted
          ? "border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200 shadow-sm"
          : isRejected
            ? "border-gray-200 bg-gray-50/60 opacity-70"
            : "border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-[#1D6B45]/40"
      }`}
    >
      {/* Bandeau statut / mise en avant */}
      {(isBestPrice && isPending) || isAccepted || isRejected ? (
        <div
          className={`px-4 py-1.5 text-[11px] font-bold flex items-center gap-1.5 ${
            isAccepted
              ? "bg-[#1D6B45] text-white"
              : isRejected
                ? "bg-gray-200 text-gray-600"
                : "bg-amber-50 text-amber-800 border-b border-amber-100"
          }`}
        >
          {isAccepted && (
            <>
              <CheckCircle2 size={13} /> Offre retenue
            </>
          )}
          {isRejected && (
            <>
              <X size={13} /> Offre déclinée
            </>
          )}
          {isPending && isBestPrice && (
            <>
              <Trophy size={13} className="text-amber-500" /> Meilleur prix reçu
            </>
          )}
        </div>
      ) : null}

      <div className="p-4 sm:p-5">
        {/* En-tête : traiteur + prix */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#1D6B45] shrink-0 overflow-hidden border border-emerald-200">
              {traiteur?.image_url && !imgError ? (
                <img
                  src={traiteur.image_url}
                  alt={traiteur.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <ChefHat size={22} />
              )}
            </div>
            <div className="min-w-0">
              <h5 className="font-bold text-gray-900 text-sm truncate">
                {traiteur?.name || "Traiteur Dabari"}
              </h5>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {traiteur?.rating != null && Number(traiteur.rating) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    {Number(traiteur.rating).toFixed(1)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock size={11} />
                  {formatDate(proposal.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              Devis proposé
            </p>
            <p className="text-xl font-black text-[#1D6B45] leading-tight">
              {price.toLocaleString("fr-FR")} €
            </p>
            {diff !== null && (
              <p
                className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold ${
                  diff <= 0 ? "text-emerald-600" : "text-orange-600"
                }`}
              >
                {diff <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                {diff <= 0
                  ? `${Math.abs(diff).toLocaleString("fr-FR")} € sous votre budget`
                  : `${diff.toLocaleString("fr-FR")} € au-dessus du budget`}
              </p>
            )}
          </div>
        </div>

        {/* Message du traiteur */}
        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 border-l-4 border-l-[#1D6B45]/50 p-3.5">
          <p className="text-[11px] text-gray-400 font-semibold mb-1 flex items-center gap-1">
            <Quote size={11} /> Message du traiteur
          </p>
          <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
            {proposal.message}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 transition-colors"
            >
              <Phone size={13} />
              WhatsApp
            </a>
          ) : (
            <span className="text-[11px] text-gray-400 italic">
              Contact indisponible
            </span>
          )}


          {isPending && requestOpen && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={loading}
                onClick={onReject}
                className="text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                Décliner
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onAccept}
                className="text-xs font-bold text-white bg-[#1D6B45] hover:bg-[#155234] px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Check size={14} />
                Accepter
              </button>
            </div>
          )}

          {isAccepted && (
            <p className="w-full text-[11px] text-emerald-700 font-medium bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-start gap-1.5">
              <CheckCircle2 size={14} className="shrink-0 mt-px" />
              Contactez le traiteur sur WhatsApp pour convenir des derniers détails.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
