"use client";

import { useState } from "react";
import { AlertCircle, ArrowDownUp, Loader2, X } from "lucide-react";
import { TraiteurProposal } from "@/lib/types/traiteur";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import NegociationThread from "./NegociationThread";
import {
  NEGOCIATION_MAX_CONTRE_OFFRES,
  NEGOCIATION_MESSAGE_MAX_LENGTH,
  countCounterOffers,
  formatEuros,
  getNegociation,
  hasPendingCounterOffer,
  parseAmountInput,
} from "@/lib/negociation";

/*
 * Contre-proposition du client sur une offre de traiteur : un prix plus bas que le devis reçu, avec un
 * message facultatif. Le devis signé du traiteur reste valable (le client peut toujours le signer) ;
 * le traiteur répond en maintenant son prix ou en signant un nouveau devis.
 */

type Props = {
  proposal: TraiteurProposal | null;
  eventType: string;
  loading: boolean;
  error: string | null;
  onConfirm: (prix: number, message: string) => void;
  onClose: () => void;
};

export default function CounterOfferModal({ proposal, eventType, loading, error, onConfirm, onClose }: Props) {
  // Saisie remise à zéro pour chaque offre : le parent remonte la fenêtre (clé = identifiant de l'offre)
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  useEscapeKey(onClose, Boolean(proposal) && !loading);

  if (!proposal) return null;

  const entries = getNegociation(proposal.negociation);
  const currentPrice = Number(proposal.proposed_price || 0);
  const remaining = NEGOCIATION_MAX_CONTRE_OFFRES - countCounterOffers(entries);
  // Offre relue après un conflit : même règle que l'API, la fenêtre l'explique au lieu d'échouer
  const blockedReason =
    proposal.status !== "pending"
      ? "Cette offre n'est plus en attente : elle a été acceptée ou déclinée."
      : hasPendingCounterOffer(entries)
        ? "Votre contre-proposition attend la réponse du traiteur. Vous pouvez aussi signer le devis actuel."
        : remaining <= 0
          ? `Vous avez déjà fait ${NEGOCIATION_MAX_CONTRE_OFFRES} contre-propositions : vous pouvez maintenant signer ce devis ou le décliner.`
          : null;
  const parsedPrice = parseAmountInput(price);
  const priceEntered = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const priceValid = priceEntered && parsedPrice < currentPrice;
  const canSubmit = !blockedReason && priceValid && message.length <= NEGOCIATION_MESSAGE_MAX_LENGTH && !loading;
  const missingHint = !priceEntered
    ? "Indiquez le prix que vous proposez."
    : !priceValid
      ? `Votre prix doit être inférieur au devis actuel (${formatEuros(currentPrice)}).`
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-offer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 id="counter-offer-title" className="font-extrabold text-slate-900 text-lg">
              Proposer un autre prix
            </h2>
            <p className="text-xs text-slate-500">
              {proposal.traiteur?.name || "Traiteur"} · {eventType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Fermer"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-xl disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
          <p className="text-[11px] font-bold tracking-wide text-emerald-700 uppercase">Devis actuel (TTC)</p>
          <p className="text-2xl font-black text-[#1D6B45] mt-1">{formatEuros(currentPrice)}</p>
        </div>

        <NegociationThread entries={entries} viewer="client" traiteurName={proposal.traiteur?.name} />

        {blockedReason && (
          <div role="status" className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs font-semibold text-blue-900">
            {blockedReason}
          </div>
        )}

        <form
          hidden={Boolean(blockedReason)}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onConfirm(parsedPrice, message.trim());
          }}
        >
          <div>
            <label htmlFor="counter-price" className="block text-xs font-bold text-slate-700 mb-1.5">
              Votre prix (€ TTC) *
            </label>
            <input
              id="counter-price"
              type="text"
              autoFocus
              inputMode="decimal"
              autoComplete="off"
              maxLength={12}
              placeholder={`Moins de ${formatEuros(currentPrice)}`}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm"
            />
          </div>
          <div>
            <label htmlFor="counter-message" className="block text-xs font-bold text-slate-700 mb-1.5">
              Message au traiteur (facultatif)
            </label>
            <textarea
              id="counter-message"
              rows={3}
              maxLength={NEGOCIATION_MESSAGE_MAX_LENGTH}
              placeholder="Ex : Mon budget est de 1 500 €. Est-il possible d'adapter le menu ?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm leading-relaxed"
            />
            <p className="text-right text-[11px] text-slate-400">
              {message.length}/{NEGOCIATION_MESSAGE_MAX_LENGTH}
            </p>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Le traiteur pourra maintenir son prix ou vous envoyer un nouveau devis signé. Son devis actuel reste
            valable : vous pouvez toujours le signer.{" "}
            {remaining > 1
              ? `Il vous reste ${remaining} contre-propositions.`
              : "C'est votre dernière contre-proposition sur cette offre."}
          </p>

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col items-end gap-1.5 pt-1">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-700 text-white hover:bg-violet-800 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownUp size={14} />}
                {loading ? "Envoi..." : "Envoyer ma contre-proposition"}
              </button>
            </div>
            {missingHint && <p className="text-[11px] text-slate-500">{missingHint}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
