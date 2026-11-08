"use client";

import { useRef, useState } from "react";
import { AlertCircle, ArrowDownUp, Loader2, Lock, PenLine, X } from "lucide-react";
import { TraiteurProposal } from "@/lib/types/traiteur";
import { apiErrorMessage, authFetch, sendErrorMessage } from "@/lib/auth";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import NegociationThread from "@/components/commandes/NegociationThread";
import {
  NEGOCIATION_MESSAGE_MAX_LENGTH,
  formatEuros,
  getNegociation,
  hasPendingCounterOffer,
} from "@/lib/negociation";

/*
 * Réponse du traiteur à une contre-proposition du client : maintenir son devis (message facultatif,
 * par exemple « mon prix est ferme ») ou signer un nouveau devis qui remplacera le précédent.
 */

type Props = {
  proposal: TraiteurProposal | null;
  eventLabel: string;
  /** Ouvre le formulaire de nouveau devis (prérempli avec l'offre en cours) */
  onRevise: (proposal: TraiteurProposal) => void;
  /** Prix maintenu : les listes sont rechargées */
  onAnswered: () => void;
  onClose: () => void;
};

export default function CounterResponseModal({ proposal, eventLabel, onRevise, onAnswered, onClose }: Props) {
  // Saisie remise à zéro pour chaque offre : le parent remonte la fenêtre (clé = identifiant de l'offre)
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  // Situation changée entre-temps (réponse du client, offre close) : actions bloquées, listes relues
  const [stale, setStale] = useState(false);
  // Verrou synchrone contre le double envoi
  const sendingRef = useRef(false);
  useEscapeKey(onClose, Boolean(proposal) && !sending);

  if (!proposal) return null;

  const entries = getNegociation(proposal.negociation);
  const counter = hasPendingCounterOffer(entries) ? entries[entries.length - 1] : null;
  const currentPrice = Number(proposal.proposed_price || 0);
  const canAnswer = Boolean(counter) && proposal.status === "pending" && !answered && !stale;

  const handleKeepPrice = async () => {
    if (!canAnswer || sendingRef.current || message.length > NEGOCIATION_MESSAGE_MAX_LENGTH) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const res = await authFetch(`/api/traiteur/proposals/${proposal.id}/prix-maintenu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(data, "Impossible d'envoyer votre réponse. Réessayez."));
        if (res.status === 409) {
          setStale(true);
          onAnswered();
        }
        return;
      }
      setAnswered(true);
      onAnswered();
    } catch (e: unknown) {
      setError(sendErrorMessage(e, "Impossible d'envoyer votre réponse. Réessayez."));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-response-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 id="counter-response-title" className="font-extrabold text-slate-900 text-lg">
              Contre-proposition du client
            </h2>
            <p className="text-xs text-slate-500">{eventLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Fermer"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-xl disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-[10px] font-bold tracking-wide text-emerald-700 uppercase">Votre devis</p>
            <p className="text-xl font-black text-[#1D6B45] mt-0.5">{formatEuros(currentPrice)}</p>
          </div>
          <div className="rounded-2xl bg-violet-50 border border-violet-200 p-3">
            <p className="text-[10px] font-bold tracking-wide text-violet-700 uppercase">Prix du client</p>
            <p className="text-xl font-black text-violet-800 mt-0.5">{counter ? formatEuros(counter.prix) : "—"}</p>
          </div>
        </div>

        <NegociationThread entries={entries} viewer="traiteur" />

        {answered ? (
          <div role="status" className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 font-semibold">
            Réponse envoyée : votre devis de {formatEuros(currentPrice)} est maintenu. Le client est prévenu et peut
            le signer ou le décliner.
          </div>
        ) : !canAnswer ? (
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 font-semibold">
            {stale
              ? "La situation a changé entre-temps : fermez cette fenêtre pour voir l'offre à jour."
              : "Aucune contre-proposition n'attend votre réponse : le client peut signer votre devis actuel."}
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">Maintenir mon prix</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Votre devis signé reste valable tel quel. Expliquez au client pourquoi, s&apos;il le faut.
              </p>
              <label htmlFor="keep-price-message" className="block text-xs font-bold text-slate-700">
                Message au client (facultatif)
              </label>
              <textarea
                id="keep-price-message"
                rows={3}
                autoFocus
                maxLength={NEGOCIATION_MESSAGE_MAX_LENGTH}
                placeholder="Ex : Mon prix est ferme : il comprend le service, la vaisselle et le transport."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  {message.length}/{NEGOCIATION_MESSAGE_MAX_LENGTH}
                </span>
                <button
                  type="button"
                  onClick={handleKeepPrice}
                  disabled={sending}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1D6B45] text-white hover:bg-[#154d31] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  {sending ? "Envoi..." : `Maintenir mon prix de ${formatEuros(currentPrice)}`}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <ArrowDownUp size={14} className="text-violet-700" /> Faire un nouveau devis
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ajustez votre tarif, votre acompte ou le contenu de l&apos;offre : vous signerez un nouveau devis qui
                remplacera le précédent. Le client pourra le signer ou le décliner.
              </p>
              <button
                type="button"
                onClick={() => onRevise(proposal)}
                disabled={sending}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-[#1D6B45] text-[#1D6B45] hover:bg-emerald-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <PenLine size={14} /> Faire un nouveau devis
              </button>
            </section>
          </>
        )}

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
