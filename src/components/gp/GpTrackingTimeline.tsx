"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  Package,
  Plane,
  MapPin,
  CheckCheck,
  Calendar,
  Scale,
  Phone,
  MessageCircle,
  AlertCircle,
  Truck,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatWhatsAppUrl } from "@/lib/types/gp";

export type GpTrackingStatus =
  | "pending"
  | "en_attente"
  | "accepted"
  | "acceptee"
  | "colis_recu"
  | "en_acheminement"
  | "arrive"
  | "livre"
  | "rejected"
  | "refusee"
  | "cancelled"
  | "annulee";

export interface GpTrackingStep {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const GP_TRACKING_STEPS: GpTrackingStep[] = [
  {
    key: "accepted",
    label: "Demande acceptée · Dépôt à venir",
    shortLabel: "Acceptée",
    description: "Le transporteur GP a validé la demande. Le colis doit être déposé au point convenu.",
    icon: CheckCircle2,
  },
  {
    key: "colis_recu",
    label: "Colis réceptionné & vérifié",
    shortLabel: "Réceptionné",
    description: "Le GP a pris possession du colis et l'a vérifié avant le voyage.",
    icon: Package,
  },
  {
    key: "en_acheminement",
    label: "En cours d'acheminement",
    shortLabel: "En vol / Transit",
    description: "Le colis est en transit aérien vers le pays de destination.",
    icon: Plane,
  },
  {
    key: "arrive",
    label: "Arrivé à destination",
    shortLabel: "Arrivé",
    description: "Le transporteur est arrivé. Le colis est prêt pour la remise ou le retrait.",
    icon: MapPin,
  },
  {
    key: "livre",
    label: "Colis livré & récupéré",
    shortLabel: "Livré",
    description: "Le colis a été remis en mains propres au destinataire final.",
    icon: CheckCheck,
  },
];

export function getGpStepIndex(status: string): number {
  switch (status) {
    case "pending":
    case "en_attente":
      return 0; // Avant la première étape acceptée
    case "accepted":
    case "acceptee":
      return 1;
    case "colis_recu":
      return 2;
    case "en_acheminement":
      return 3;
    case "arrive":
      return 4;
    case "livre":
      return 5;
    case "rejected":
    case "refusee":
    case "cancelled":
    case "annulee":
      return -1;
    default:
      return 1;
  }
}

export function getGpStatusLabel(status: string): string {
  switch (status) {
    case "pending":
    case "en_attente":
      return "En attente de validation";
    case "accepted":
    case "acceptee":
      return "Acceptée · En attente de dépôt";
    case "colis_recu":
      return "Colis réceptionné par le GP";
    case "en_acheminement":
      return "En cours d'acheminement";
    case "arrive":
      return "Arrivé à destination";
    case "livre":
      return "Livré & récupéré";
    case "rejected":
    case "refusee":
      return "Demande refusée";
    case "cancelled":
    case "annulee":
      return "Demande annulée";
    default:
      return status;
  }
}

export function getNextGpStatus(currentStatus: string): {
  nextStatus: string;
  nextLabel: string;
  buttonLabel: string;
} | null {
  switch (currentStatus) {
    case "accepted":
    case "acceptee":
      return {
        nextStatus: "colis_recu",
        nextLabel: "Colis réceptionné & vérifié",
        buttonLabel: "Marquer comme Colis réceptionné",
      };
    case "colis_recu":
      return {
        nextStatus: "en_acheminement",
        nextLabel: "En cours d'acheminement",
        buttonLabel: "Marquer En cours d'acheminement",
      };
    case "en_acheminement":
      return {
        nextStatus: "arrive",
        nextLabel: "Arrivé à destination",
        buttonLabel: "Marquer Arrivé à destination",
      };
    case "arrive":
      return {
        nextStatus: "livre",
        nextLabel: "Colis livré & remis au destinataire",
        buttonLabel: "Confirmer la livraison / remise",
      };
    default:
      return null;
  }
}

interface GpTrackingTimelineProps {
  status: string;
  departureCity?: string | null;
  departureCountry?: string | null;
  arrivalCity?: string | null;
  arrivalCountry?: string | null;
  departureDate?: string | null;
  arrivalDate?: string | null;
  pickupAddress?: string | null;
  pickupCity?: string | null;
  dropoffAddress?: string | null;
  dropoffCity?: string | null;
  weightKg?: number | string | null;
  contentDesc?: string | null;
  totalAmount?: number | string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  isDelayed?: boolean | null;
  delayReason?: string | null;
  isGpMode?: boolean;
  onUpdateStatus?: (newStatus: string) => void;
  onSignalDelay?: () => void;
  updatingStatus?: boolean;
}

export default function GpTrackingTimeline({
  status,
  departureCity,
  departureCountry,
  arrivalCity,
  arrivalCountry,
  departureDate,
  arrivalDate,
  pickupAddress,
  pickupCity,
  dropoffAddress,
  dropoffCity,
  weightKg,
  contentDesc,
  totalAmount,
  contactName,
  contactPhone,
  isDelayed = false,
  delayReason,
  isGpMode = false,
  onUpdateStatus,
  onSignalDelay,
  updatingStatus = false,
}: GpTrackingTimelineProps) {
  const currentStepIndex = getGpStepIndex(status);
  const isCancelledOrRefused = currentStepIndex === -1;
  const isPending = status === "pending" || status === "en_attente";
  const nextAction = isGpMode ? getNextGpStatus(status) : null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-6">
      {/* ── En-tête de Suivi ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D6B45] animate-pulse" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Suivi d&apos;acheminement GP
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-base font-bold text-gray-900 flex-wrap">
            <span>{departureCity || "Départ"}</span>
            <ArrowRight size={15} className="text-[#1D6B45]" />
            <span>{arrivalCity || "Arrivée"}</span>
            {(departureCountry || arrivalCountry) && (
              <span className="text-xs font-medium text-gray-500">
                ({departureCountry} → {arrivalCountry})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isCancelledOrRefused ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <AlertCircle size={14} />
              {getGpStatusLabel(status)}
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Clock size={14} className="text-amber-600" />
              En attente de validation
            </span>
          ) : status === "livre" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1D6B45] border border-[#1D6B45]/20">
              <CheckCheck size={14} />
              Livré & Terminé
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#1D6B45] border border-emerald-200">
              <Truck size={14} />
              {getGpStatusLabel(status)}
            </span>
          )}
        </div>
      </div>

      {/* ── Cas Retard Signalé ── */}
      {isDelayed && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-950 shadow-xs">
          <AlertCircle size={20} className="text-[#D4870A] shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-amber-950">
                Arrivée décalée · Retard signalé
              </span>
              <span className="text-xs bg-amber-200/80 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                Nouvelle arrivée : {formatDate(arrivalDate)}
              </span>
            </div>
            {delayReason && (
              <p className="text-amber-900/90 leading-relaxed text-xs">
                <strong>Motif :</strong> {delayReason}
              </p>
            )}
            <p className="text-[11px] text-amber-700">
              L&apos;expéditeur a été informé de cette modification.
            </p>
          </div>
        </div>
      )}

      {/* ── Cas En attente de validation initiale ── */}
      {isPending && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
          <Clock size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Demande de transport en cours d&apos;examen</p>
            <p className="text-amber-800/90 leading-relaxed text-xs">
              Le transporteur GP doit accepter la prise en charge de votre colis avant que le suivi d&apos;acheminement ne s&apos;active.
            </p>
          </div>
        </div>
      )}

      {/* ── Cas Annulé / Refusé ── */}
      {isCancelledOrRefused && (
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-900 text-xs sm:text-sm">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Cette réservation est {getGpStatusLabel(status).toLowerCase()}</p>
            <p className="text-red-700/90 leading-relaxed text-xs">
              L&apos;acheminement n&apos;a pas pu avoir lieu. Les kilos réservés ont été réattribués.
            </p>
          </div>
        </div>
      )}

      {/* ── Stepper Visuel de Suivi (quand accepté ou en cours) ── */}
      {!isCancelledOrRefused && !isPending && (
        <div className="py-2">
          {/* Stepper Horizontal (Desktop / Tablet) */}
          <div className="hidden sm:grid grid-cols-5 gap-2 relative">
            {GP_TRACKING_STEPS.map((step, idx) => {
              const stepNumber = idx + 1;
              const isCompleted = currentStepIndex > stepNumber;
              const isCurrent = currentStepIndex === stepNumber;
              const isFuture = currentStepIndex < stepNumber;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                  {/* Connecteur de ligne horizontale */}
                  {idx < GP_TRACKING_STEPS.length - 1 && (
                    <div
                      className={`absolute top-4 left-1/2 w-full h-1 -z-10 transition-colors ${
                        currentStepIndex > stepNumber ? "bg-[#1D6B45]" : "bg-gray-200"
                      }`}
                    />
                  )}

                  {/* Pastille de l'étape */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-[#1D6B45] text-white shadow-xs"
                        : isCurrent
                        ? "bg-[#1D6B45] text-white ring-4 ring-[#E8F5E9] shadow-md animate-pulse"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <StepIcon size={17} />
                    )}
                  </div>

                  <p
                    className={`mt-2 text-xs font-bold leading-tight ${
                      isCurrent
                        ? "text-[#1D6B45]"
                        : isCompleted
                        ? "text-gray-800"
                        : "text-gray-400"
                    }`}
                  >
                    {step.shortLabel}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 px-1">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Stepper Vertical (Mobile) */}
          <div className="sm:hidden space-y-4">
            {GP_TRACKING_STEPS.map((step, idx) => {
              const stepNumber = idx + 1;
              const isCompleted = currentStepIndex > stepNumber;
              const isCurrent = currentStepIndex === stepNumber;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex items-start gap-3 relative">
                  {idx < GP_TRACKING_STEPS.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 w-0.5 h-10 -ml-[1px] ${
                        currentStepIndex > stepNumber ? "bg-[#1D6B45]" : "bg-gray-200"
                      }`}
                    />
                  )}

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isCompleted
                        ? "bg-[#1D6B45] text-white shadow-xs"
                        : isCurrent
                        ? "bg-[#1D6B45] text-white ring-3 ring-[#E8F5E9]"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <StepIcon size={15} />
                    )}
                  </div>

                  <div className="flex-1 pb-2">
                    <p
                      className={`text-xs font-bold ${
                        isCurrent
                          ? "text-[#1D6B45]"
                          : isCompleted
                          ? "text-gray-800"
                          : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Détails du Trajet & Colis ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Dépôt */}
        <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <Calendar size={14} className="text-[#1D6B45]" />
            <span>Départ : {formatDate(departureDate)}</span>
          </div>
          <p className="text-xs text-gray-600">
            <strong className="text-gray-700">Point de dépôt :</strong>{" "}
            {pickupAddress || pickupCity || "À convenir avec le transporteur"}
          </p>
        </div>

        {/* Retrait */}
        <div className={`rounded-xl p-3 border space-y-1 ${isDelayed ? "bg-amber-50/70 border-amber-200" : "bg-gray-50/80 border-gray-100"}`}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 flex-wrap">
            <MapPin size={14} className="text-[#D4870A]" />
            <span>Arrivée prévue : {formatDate(arrivalDate)}</span>
            {isDelayed && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-300">
                Date décalée (Retard)
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600">
            <strong className="text-gray-700">Point de récupération :</strong>{" "}
            {dropoffAddress || dropoffCity || "À convenir à destination"}
          </p>
        </div>
      </div>

      {/* ── Infos colis & contact ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
        <div className="flex items-center gap-4 flex-wrap">
          {weightKg && (
            <span className="flex items-center gap-1">
              <Scale size={14} className="text-[#1D6B45]" />
              <strong>{weightKg} kg</strong>
            </span>
          )}
          {contentDesc && (
            <span className="flex items-center gap-1">
              <Package size={14} className="text-[#1D6B45]" />
              <span>{contentDesc}</span>
            </span>
          )}
          {totalAmount && (
            <span className="font-bold text-gray-900">
              {totalAmount} €
            </span>
          )}
        </div>

        {/* Bouton de contact direct si numéro présent */}
        {contactPhone && (() => {
          const waUrl = formatWhatsAppUrl(
            contactPhone,
            `Bonjour ${contactName ? contactName + " " : ""}, je vous contacte concernant l'acheminement GP de mon colis sur Dabari.`
          );
          return (
            <div className="flex items-center gap-2">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#1D6B45] hover:bg-emerald-100 font-bold text-xs transition-colors"
                >
                  <MessageCircle size={14} />
                  WhatsApp {contactName ? `(${contactName})` : ""}
                </a>
              )}
              <a
                href={`tel:${contactPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold text-xs transition-colors"
              >
                <Phone size={14} />
                Appeler
              </a>
            </div>
          );
        })()}
      </div>

      {/* ── Panneau de Contrôle GP (pour mettre à jour le statut ou signaler un retard) ── */}
      {isGpMode && !isCancelledOrRefused && !isPending && status !== "livre" && (
        <div className="pt-3 border-t border-gray-100 bg-emerald-50/40 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
              <ShieldCheck size={16} className="text-[#1D6B45]" />
              <span>Espace GP · Gestion de l&apos;acheminement</span>
            </div>
            {nextAction && (
              <span className="text-[11px] text-gray-500">
                Prochaine étape : <strong>{nextAction.nextLabel}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {nextAction && onUpdateStatus && (
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => onUpdateStatus(nextAction.nextStatus)}
                className="flex-1 py-2.5 px-4 bg-[#1D6B45] hover:bg-[#155335] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Truck size={14} />
                <span>{updatingStatus ? "Mise à jour..." : nextAction.buttonLabel}</span>
              </button>
            )}

            {onSignalDelay && (
              <button
                type="button"
                onClick={onSignalDelay}
                className="py-2.5 px-3.5 bg-white hover:bg-amber-50 text-[#D4870A] border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="Prévenir l'expéditeur d'un retard et mettre à jour la date d'arrivée"
              >
                <Clock size={14} />
                <span>{isDelayed ? "Ajuster la date d'arrivée" : "Signaler un retard"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
