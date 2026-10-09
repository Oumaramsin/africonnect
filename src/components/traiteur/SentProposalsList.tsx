"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  MapPin,
  Phone,
  Users,
  XCircle,
  Banknote,
  Quote,
  Send,
} from "lucide-react";
import { authFetch, getValidToken } from "@/lib/auth";
import { TraiteurProposal, formatWhatsAppUrl } from "@/lib/types/traiteur";

type Props = {
  /** Appelé avec les IDs des annonces auxquelles le traiteur a déjà répondu */
  onLoaded?: (requestIds: string[]) => void;
};

const formatDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

export default function SentProposalsList({ onLoaded }: Props) {
  const [proposals, setProposals] = useState<TraiteurProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getValidToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/proposals/me`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Impossible de charger vos propositions");
      }
      const list: TraiteurProposal[] = json.data?.proposals || [];
      setProposals(list);
      onLoaded?.(list.map((p) => p.request_id));
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-400">Chargement...</div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4">
        {error}
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
        <div className="w-14 h-14 bg-[#E8F5E9] text-[#1D6B45] rounded-full flex items-center justify-center mx-auto mb-3">
          <Inbox size={26} />
        </div>
        <h3 className="text-sm font-bold text-gray-900">
          Aucune proposition envoyée
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Parcourez les demandes d&apos;événements et envoyez vos devis aux clients
          potentiels. Vous retrouverez ici le suivi de chaque proposition.
        </p>
        <Link
          href="/traiteur"
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-white bg-[#1D6B45] hover:bg-[#165637] px-4 py-2 rounded-xl transition-colors"
        >
          <Send size={13} /> Voir les demandes
        </Link>
      </div>
    );
  }

  const pendingCount = proposals.filter((p) => p.status === "pending").length;
  const acceptedCount = proposals.filter((p) => p.status === "accepted").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-xs">
          <p className="text-lg font-black text-gray-900">{proposals.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            Envoyées
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-xs">
          <p className="text-lg font-black text-amber-600">{pendingCount}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            En attente
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-xs">
          <p className="text-lg font-black text-[#1D6B45]">{acceptedCount}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            Acceptées
          </p>
        </div>
      </div>

      {proposals.map((p) => {
        const req = p.request;
        const client = req?.client;
        const isPending = p.status === "pending";
        const isAccepted = p.status === "accepted";
        const isRejected = p.status === "rejected";
        const closedWithoutYou =
          isPending && req && req.status !== "open";
        const initials = (client?.full_name || "C")
          .split(" ")
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        const waUrl = formatWhatsAppUrl(
          client?.phone,
          `Bonjour ${client?.full_name || ""}, suite à l'acceptation de mon devis sur Dabari pour votre événement (${req?.event_type}).`
        );

        return (
          <div
            key={p.id}
            className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${
              isAccepted
                ? "border-emerald-300 ring-1 ring-emerald-200"
                : isRejected || closedWithoutYou
                  ? "border-gray-200 opacity-75"
                  : "border-gray-100"
            }`}
          >
            <div
              className={`px-4 py-2 text-[11px] font-bold flex items-center gap-1.5 ${
                isAccepted
                  ? "bg-[#1D6B45] text-white"
                  : isRejected
                    ? "bg-gray-200 text-gray-600"
                    : closedWithoutYou
                      ? "bg-gray-100 text-gray-500"
                      : "bg-amber-50 text-amber-800"
              }`}
            >
              {isAccepted && (
                <>
                  <CheckCircle2 size={13} /> Votre proposition a été acceptée
                </>
              )}
              {isRejected && (
                <>
                  <XCircle size={13} /> Proposition déclinée par le client
                </>
              )}
              {isPending && !closedWithoutYou && (
                <>
                  <Clock size={13} /> En attente de réponse du client
                </>
              )}
              {closedWithoutYou && (
                <>
                  <XCircle size={13} /> Annonce clôturée
                </>
              )}
            </div>

            <div className="p-4 sm:p-5">
              {/* Client + événement */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[#1D6B45] text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                  {client?.avatar_url ? (
                    <img
                      src={client.avatar_url}
                      alt={client.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {client?.full_name || "Client"}
                  </p>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    {req?.event_type || "Événement"}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Votre devis
                  </p>
                  <p className="text-lg font-black text-[#1D6B45] leading-tight">
                    {Number(p.proposed_price || 0).toLocaleString("fr-FR")} €
                  </p>
                </div>
              </div>

              {/* Détails */}
              <div className="mt-3 bg-gray-50 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-baseline gap-2">
                  <Calendar size={13} className="text-[#1D6B45] shrink-0 translate-y-0.5" />
                  <span className="text-gray-500 font-medium shrink-0">Date :</span>
                  <span className="text-gray-900 font-semibold">
                    {formatDate(req?.event_date)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <Users size={13} className="text-[#1D6B45] shrink-0 translate-y-0.5" />
                  <span className="text-gray-500 font-medium shrink-0">Invités :</span>
                  <span className="text-gray-900 font-semibold">
                    {req?.guest_count ? `${req.guest_count} pers.` : "Non précisé"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <MapPin size={13} className="text-[#1D6B45] shrink-0 translate-y-0.5" />
                  <span className="text-gray-500 font-medium shrink-0">Lieu :</span>
                  <span className="text-gray-900 font-semibold">{req?.location || "—"}</span>
                </div>
                {req?.budget != null && Number(req.budget) > 0 && (
                  <div className="flex items-baseline gap-2">
                    <Banknote size={13} className="text-[#1D6B45] shrink-0 translate-y-0.5" />
                    <span className="text-gray-500 font-medium shrink-0">Budget client :</span>
                    <span className="text-[#1D6B45] font-bold">
                      {Number(req.budget).toLocaleString("fr-FR")} €
                    </span>
                  </div>
                )}
              </div>

              {/* Mon message */}
              <div className="mt-3 rounded-xl bg-white border border-gray-100 border-l-4 border-l-[#1D6B45]/50 p-3">
                <p className="text-[11px] text-gray-400 font-semibold mb-1 flex items-center gap-1">
                  <Quote size={11} /> Votre message · envoyé le {formatDate(p.created_at)}
                </p>
                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed line-clamp-4">
                  {p.message}
                </p>
              </div>

              {isAccepted && waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-[#1D6B45] hover:bg-[#155234] px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Phone size={14} /> Contacter {client?.full_name?.split(" ")[0] || "le client"} sur WhatsApp
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

