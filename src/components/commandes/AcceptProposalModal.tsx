"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2, PenLine, Wallet, X } from "lucide-react";
import { TraiteurProposal } from "@/lib/types/traiteur";
import { useEscapeKey } from "@/hooks/useEscapeKey";

/*
 * Acceptation d'une offre de traiteur : accepter, c'est signer le devis proposé (prix, acompte,
 * contenu). Le devis créé est alors signé par les deux parties (le traiteur a signé en envoyant son
 * offre) et la prestation confirmée.
 */

type Props = {
  proposal: TraiteurProposal | null;
  eventType: string;
  loading: boolean;
  error: string | null;
  onConfirm: (signature: string) => void;
  onClose: () => void;
};

const SIGNATURE_MAX_LENGTH = 120;

const formatEuros = (value: number): string =>
  `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`;

/** Conditions d'acompte de l'offre (absentes sur les anciennes offres : valeurs par défaut). */
export function describeProposalAcompte(proposal: TraiteurProposal): string {
  if (!proposal.conditions_devis) return "Conditions d'acompte précisées au devis";
  let type = "optionnel";
  let pourcentage = 30;
  try {
    const meta = JSON.parse(proposal.conditions_devis);
    if (typeof meta.acompte_type === "string") type = meta.acompte_type;
    if (typeof meta.acompte_pourcentage === "number") pourcentage = meta.acompte_pourcentage;
  } catch {
    return "Conditions d'acompte précisées au devis";
  }
  if (type === "aucun") return "Sans acompte : tout se règle le jour de l'événement";
  const montant = Math.round(Number(proposal.proposed_price) * pourcentage) / 100;
  return `Acompte ${type === "obligatoire" ? "obligatoire" : "facultatif"} de ${pourcentage} % (${formatEuros(montant)})`;
}

const formatSignedAt = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return ` le ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};

export default function AcceptProposalModal({ proposal, eventType, loading, error, onConfirm, onClose }: Props) {
  // Saisie remise à zéro pour chaque offre : le parent remonte la fenêtre (clé = identifiant de l'offre)
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  useEscapeKey(onClose, Boolean(proposal) && !loading);

  if (!proposal) return null;

  const price = Number(proposal.proposed_price || 0);
  const traiteurSigned = Boolean(proposal.traiteur_signature && proposal.traiteur_signed_at);
  const signatureValid = signature.trim().length >= 2 && signature.trim().length <= SIGNATURE_MAX_LENGTH;
  // Offre relue après un conflit : acceptée ou déclinée entre-temps, elle ne se signe plus
  const offerPending = proposal.status === "pending";
  const canSubmit = offerPending && signatureValid && agreed && !loading;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accept-proposal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 id="accept-proposal-title" className="font-extrabold text-slate-900 text-lg">
              Signer le devis
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
          <p className="text-[11px] font-bold tracking-wide text-emerald-700 uppercase">Montant total TTC</p>
          <p className="text-3xl font-black text-[#1D6B45] mt-1">{formatEuros(price)}</p>
        </div>

        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <Wallet size={16} className="text-[#1D6B45] shrink-0 mt-0.5" />
            <span>{describeProposalAcompte(proposal)}</span>
          </li>
          <li className="flex items-start gap-2">
            {traiteurSigned ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
            )}
            <span className={traiteurSigned ? "text-emerald-800 font-semibold" : "text-amber-700 font-semibold"}>
              {traiteurSigned
                ? `Signé par ${proposal.traiteur_signature}${formatSignedAt(proposal.traiteur_signed_at)}`
                : "Offre non signée par le traiteur : il signera le devis après votre acceptation."}
            </span>
          </li>
        </ul>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
          <p className="text-[11px] font-semibold text-slate-400 mb-1">Contenu de l&apos;offre</p>
          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{proposal.message}</p>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          L&apos;acompte et le solde se règlent directement au traiteur : Dabari ne perçoit aucun fonds.
        </p>

        <div className="space-y-3">
          <label htmlFor="accept-signature" className="block text-xs font-bold text-slate-700">
            Votre signature : prénom et nom *
          </label>
          <input
            id="accept-signature"
            type="text"
            autoFocus
            autoComplete="name"
            maxLength={SIGNATURE_MAX_LENGTH}
            placeholder="Ex : Aminata Diallo"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm"
          />
          <label className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 accent-[#1D6B45]"
            />
            <span>
              J&apos;ai lu ce devis et j&apos;en accepte le prix et les conditions. Ma signature vaut accord et
              confirme la prestation ; les autres offres reçues ne seront pas retenues.
            </span>
          </label>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm(signature.trim())}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1D6B45] text-white hover:bg-[#154d31] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
            {loading ? "Signature en cours..." : "Signer et accepter le devis"}
          </button>
        </div>
      </div>
    </div>
  );
}
