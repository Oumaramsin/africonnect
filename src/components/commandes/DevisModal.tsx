"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  Users,
  MapPin,
  X,
  Loader2,
  Printer,
  PenTool,
  RotateCcw,
  Sparkles,
  AlertCircle,
  DollarSign,
  Lock,
  XCircle,
  CreditCard,
  Check,
  Percent,
  Info,
} from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export type CommandeTraiteurDevis = {
  id: string;
  client_id?: string | null;
  traiteur_id?: string | null;
  date_evenement: string;
  nb_personnes: number;
  adresse: string;
  type_evenement?: string | null;
  notes?: string | null;
  statut?: string | null;
  created_at?: string | null;
  message_traiteur?: string | null;
  prix_devis?: number | string | null;
  conditions_devis?: string | null;
  client_signed_at?: string | null;
  client_signature?: string | null;
  traiteur_signed_at?: string | null;
  traiteur_signature?: string | null;
  devis_status?: string | null;
  traiteur?: {
    id?: string;
    name: string;
    user_id?: string;
    whatsapp?: string | null;
    bio?: string | null;
    image_url?: string | null;
  } | null;
  client?: {
    id?: string;
    full_name?: string | null;
    phone?: string | null;
    city?: string | null;
    email?: string | null;
  } | null;
};

export type DevisConditionsMeta = {
  texte?: string;
  acompte_type: "aucun" | "obligatoire" | "optionnel";
  acompte_montant: number;
  acompte_pourcentage: number;
  acompte_paye?: boolean;
  acompte_paye_at?: string | null;
  acompte_transaction_ref?: string | null;
  acompte_choix_jour_j?: boolean;
};

export function parseDevisConditions(raw?: string | null): DevisConditionsMeta {
  const defaultMeta: DevisConditionsMeta = {
    texte:
      "Paiement garanti sous séquestre Dabari. Solde libéré après confirmation de la prestation.",
    acompte_type: "optionnel",
    acompte_montant: 0,
    acompte_pourcentage: 30,
    acompte_paye: false,
    acompte_paye_at: null,
    acompte_transaction_ref: null,
    acompte_choix_jour_j: false,
  };

  if (!raw) return defaultMeta;

  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      return {
        texte:
          parsed.texte ||
          parsed.conditions ||
          "Paiement garanti sous séquestre Dabari. Solde libéré après confirmation de la prestation.",
        acompte_type:
          parsed.acompte_type === "aucun" ||
          parsed.acompte_type === "obligatoire" ||
          parsed.acompte_type === "optionnel"
            ? parsed.acompte_type
            : "optionnel",
        acompte_montant:
          typeof parsed.acompte_montant === "number" ? parsed.acompte_montant : 0,
        acompte_pourcentage:
          typeof parsed.acompte_pourcentage === "number"
            ? parsed.acompte_pourcentage
            : 30,
        acompte_paye: Boolean(parsed.acompte_paye),
        acompte_paye_at: parsed.acompte_paye_at || null,
        acompte_transaction_ref: parsed.acompte_transaction_ref || null,
        acompte_choix_jour_j: Boolean(parsed.acompte_choix_jour_j),
      };
    }
  } catch {
    // Plain string fallback
  }

  return {
    ...defaultMeta,
    texte: raw,
  };
}

interface DevisModalProps {
  commande: CommandeTraiteurDevis;
  currentUserId?: string | null;
  isTraiteurView?: boolean;
  onClose: () => void;
  onUpdate: (updatedCommande: CommandeTraiteurDevis) => void;
}

export default function DevisModal({
  commande: initialCommande,
  currentUserId,
  isTraiteurView,
  onClose,
  onUpdate,
}: DevisModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.body.classList.add("modal-devis-open");
    return () => {
      document.body.classList.remove("modal-devis-open");
    };
  }, []);

  const [commande, setCommande] = useState<CommandeTraiteurDevis>(initialCommande);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parse existing conditions metadata
  const parsedMeta = useMemo(
    () => parseDevisConditions(commande.conditions_devis),
    [commande.conditions_devis]
  );

  // Traiteur pricing form state
  const [prixInput, setPrixInput] = useState<string>(
    commande.prix_devis ? String(commande.prix_devis) : ""
  );
  const [acompteType, setAcompteType] = useState<"aucun" | "obligatoire" | "optionnel">(
    parsedMeta.acompte_type
  );
  const [acomptePourcentInput, setAcomptePourcentInput] = useState<number>(
    parsedMeta.acompte_pourcentage || 30
  );
  const [conditionsTextInput, setConditionsTextInput] = useState<string>(
    parsedMeta.texte ||
      "Paiement garanti sous séquestre Dabari. Solde libéré après confirmation de la prestation."
  );
  const [isEditingPrice, setIsEditingPrice] = useState(!commande.prix_devis && isTraiteurView);
  const [autoSignTraiteur, setAutoSignTraiteur] = useState(true);
  const [traiteurSignerName, setTraiteurSignerName] = useState(
    commande.traiteur?.name || ""
  );

  // Client deposit & refusal states
  const [showAcomptePayModal, setShowAcomptePayModal] = useState(false);
  const [payingAcompte, setPayingAcompte] = useState(false);
  const [showRefusalForm, setShowRefusalForm] = useState(false);
  const [refusalMotif, setRefusalMotif] = useState("");

  useEscapeKey(onClose, !submitting && !payingAcompte);

  // Signature canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);

  const isClient = Boolean(currentUserId && commande.client_id === currentUserId);
  const isTraiteur = Boolean(
    isTraiteurView || (currentUserId && commande.traiteur?.user_id === currentUserId)
  );

  const isPriceSet = Boolean(commande.prix_devis && Number(commande.prix_devis) > 0);
  const isClientSigned = Boolean(commande.client_signed_at);
  const isTraiteurSigned = Boolean(commande.traiteur_signed_at);
  const isFullySigned = isClientSigned && isTraiteurSigned;
  const isRefused = commande.devis_status === "refuse";

  const totalPrix = Number(commande.prix_devis || 0);
  const prixParPersonne =
    commande.nb_personnes > 0 && totalPrix > 0
      ? (totalPrix / commande.nb_personnes).toFixed(2)
      : null;

  // Real-time calculations during traiteur pricing
  const liveParsedPrix = parseFloat(prixInput.replace(",", "."));
  const livePrixTotal = !isNaN(liveParsedPrix) && liveParsedPrix > 0 ? liveParsedPrix : 0;
  const livePrixParPersonne =
    commande.nb_personnes > 0 && livePrixTotal > 0
      ? (livePrixTotal / commande.nb_personnes).toFixed(2)
      : null;

  const liveCalculatedAcompte = useMemo(() => {
    if (acompteType === "aucun" || livePrixTotal <= 0) return 0;
    return Math.round((livePrixTotal * (acomptePourcentInput / 100)) * 100) / 100;
  }, [acompteType, livePrixTotal, acomptePourcentInput]);

  const liveSoldeRestant = Math.max(0, livePrixTotal - liveCalculatedAcompte);

  // Actual display values from saved quote
  const displayAcompteMontant = useMemo(() => {
    if (parsedMeta.acompte_type === "aucun" || totalPrix <= 0) return 0;
    if (parsedMeta.acompte_montant > 0) return parsedMeta.acompte_montant;
    const pct = parsedMeta.acompte_pourcentage || 30;
    return Math.round((totalPrix * (pct / 100)) * 100) / 100;
  }, [parsedMeta, totalPrix]);

  const displaySoldeRestant = Math.max(0, totalPrix - displayAcompteMontant);

  // Setup canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1D6B45";
  }, [isPriceSet, isFullySigned, isClientSigned, isTraiteurSigned]);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Traiteur saves pricing and acompte policy
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const parsed = parseFloat(prixInput.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      setError("Veuillez renseigner un montant de devis supérieur à 0 €.");
      return;
    }

    const calculatedAcompte =
      acompteType === "aucun"
        ? 0
        : Math.round((parsed * (acomptePourcentInput / 100)) * 100) / 100;

    const metadata: DevisConditionsMeta = {
      texte: conditionsTextInput.trim(),
      acompte_type: acompteType,
      acompte_montant: calculatedAcompte,
      acompte_pourcentage: acomptePourcentInput,
      acompte_paye: parsedMeta.acompte_paye,
      acompte_paye_at: parsedMeta.acompte_paye_at,
      acompte_transaction_ref: parsedMeta.acompte_transaction_ref,
      acompte_choix_jour_j: parsedMeta.acompte_choix_jour_j,
    };

    setSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await authFetch(`${apiUrl}/commande/traiteur/${commande.id}/devis/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prix_devis: parsed,
          conditions_devis: JSON.stringify(metadata),
          auto_sign: autoSignTraiteur,
          traiteur_signature:
            traiteurSignerName.trim() || commande.traiteur?.name || "Signature Traiteur",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors du chiffrage du devis.");
      }

      setCommande(data.data.commande);
      onUpdate(data.data.commande);
      setIsEditingPrice(false);
      setSuccessMessage("Votre devis et politique d'acompte ont été transmis au client.");
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  // Client pays deposit under Dabari escrow
  const handleAcompteAction = async (action: "verser" | "refuser_acompte") => {
    setError(null);
    setPayingAcompte(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const transactionRef = `DAB-SEC-${Date.now().toString(36).toUpperCase()}`;

      const res = await authFetch(`${apiUrl}/commande/traiteur/${commande.id}/devis/acompte`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          transaction_ref: transactionRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors du traitement de l'acompte.");
      }

      setCommande(data.data.commande);
      onUpdate(data.data.commande);
      setShowAcomptePayModal(false);
      setSuccessMessage(
        action === "verser"
          ? "Acompte consigné sous séquestre Dabari avec succès. Votre réservation est garantie !"
          : "Choix de règlement complet le jour J enregistré."
      );
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setPayingAcompte(false);
    }
  };

  // Client declines the quote
  const handleRefuseQuote = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await authFetch(`${apiUrl}/commande/traiteur/${commande.id}/devis/refuse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motif: refusalMotif.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors du refus du devis.");
      }

      setCommande(data.data.commande);
      onUpdate(data.data.commande);
      setShowRefusalForm(false);
      setSuccessMessage("La proposition a été déclinée. Le traiteur a été informé.");
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  // Sign quote electronically
  const handleSign = async () => {
    setError(null);
    if (!signerName.trim() && !hasDrawn) {
      setError("Veuillez saisir votre nom ou apposer votre signature manuscrite.");
      return;
    }
    if (!agreedTerms) {
      setError("Veuillez cocher la case d'acceptation du devis et des conditions.");
      return;
    }

    let signaturePayload = signerName.trim();
    if (canvasRef.current && hasDrawn) {
      try {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        signaturePayload = `${signerName.trim() || "Signature manuscrite"} | ${dataUrl}`;
      } catch {
        // Fallback
      }
    }

    setSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await authFetch(`${apiUrl}/commande/traiteur/${commande.id}/devis/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: signaturePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors de la signature.");
      }

      setCommande(data.data.commande);
      onUpdate(data.data.commande);
      clearCanvas();
      setSignerName("");
      setAgreedTerms(false);
      setSuccessMessage("Devis signé avec succès.");
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add("modal-devis-open");
    window.print();
  };

  const devisRefNumber = `DEV-${commande.id.slice(0, 8).toUpperCase()}`;
  const dateEmission = commande.created_at
    ? new Date(commande.created_at).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");

  // Calculate 30 days validity date
  const dateValidite = useMemo(() => {
    const base = commande.created_at ? new Date(commande.created_at) : new Date();
    const exp = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    return exp.toLocaleDateString("fr-FR");
  }, [commande.created_at]);

  const modalContent = (
    <div id="devis-portal-root">
      {/* ── MODAL OVERLAY (SCREEN VIEW) ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="devis-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      >
        <div
          id="devis-print-root"
          className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none"
        >
          {/* ── TOP ACTION BAR (ECRAN UNIQUEMENT) ── */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                <FileText size={18} />
              </div>
              <div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
                  {devisRefNumber}
                </span>
                <h2 id="devis-modal-title" className="text-xs sm:text-sm font-extrabold text-white">
                  Devis Officiel de Restauration Événementielle
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                title="Imprimer ou enregistrer en PDF (1 page format A4)"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Imprimer / PDF (1 Page A4)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le devis"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── CORPS DU DEVIS (FEUILLE OFFICIELLE FORMATÉE) ── */}
          <div
            id="devis-printable-sheet"
            className="p-5 sm:p-8 overflow-y-auto space-y-5 print:p-0 print:space-y-3 print:overflow-visible text-slate-800"
          >
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 print:hidden">
                <AlertCircle size={17} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2.5 print:hidden">
                <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. EN-TÊTE OFFICIEL DEVIS */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b-2 border-slate-100 print:pb-2.5 print:border-slate-200 print-avoid-break">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#1D6B45] text-white flex items-center justify-center font-black text-base shadow-xs">
                    D
                  </div>
                  <div>
                    <span className="font-black text-xl text-slate-900 tracking-tight">Dabari</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1D6B45] ml-2 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      Garantie Séquestre
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-snug print-text-compact">
                  Contrat de prestation traiteur & séquestre garanti par Dabari SAS.
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                  {isFullySigned ? (
                    <span className="text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={13} /> Devis 100% Signé & Validé
                    </span>
                  ) : isRefused ? (
                    <span className="text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <XCircle size={13} /> Devis Décliné par le Client
                    </span>
                  ) : isClientSigned ? (
                    <span className="text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={13} /> Signé par le client (Attente traiteur)
                    </span>
                  ) : isTraiteurSigned ? (
                    <span className="text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={13} /> Signé par le traiteur (Attente client)
                    </span>
                  ) : isPriceSet ? (
                    <span className="text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={13} /> Chiffré • En attente de signature
                    </span>
                  ) : (
                    <span className="text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Chiffrage en cours par le traiteur
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-slate-500 print-text-compact">
                  Réf. : <strong>{devisRefNumber}</strong>
                </p>
                <p className="text-xs text-slate-500 print-text-compact">
                  Émis le : {dateEmission} • Validité : 30 jours (jusqu&apos;au {dateValidite})
                </p>
              </div>
            </div>

            {/* 2. LES 3 PILIERS DE GARANTIE (ÉCRAN UNIQUEMENT) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 print:hidden">
              <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-emerald-950">Prix Ferme & Garanti</p>
                  <p className="text-[10px] text-emerald-700">Aucun surcoût masqué</p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Lock size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-blue-950">Séquestre Dabari</p>
                  <p className="text-[10px] text-blue-700">Fonds sécurisés jusqu&apos;au jour J</p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <PenTool size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-purple-950">Signature Certifiée</p>
                  <p className="text-[10px] text-purple-700">Valeur légale eIDAS & Code civil</p>
                </div>
              </div>
            </div>

            {/* 3. PARTIES PRENANTES (PRESTATAIRE VS CLIENT) */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50/90 rounded-2xl p-4 border border-slate-200 text-xs print:p-2.5 print:gap-2 print-avoid-break">
              {/* Prestataire Traiteur */}
              <div className="space-y-1">
                <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                  Émetteur / Chef Traiteur
                </span>
                <p className="font-black text-slate-900 text-sm print-title-compact">
                  {commande.traiteur?.name || "Traiteur Dabari"}
                </p>
                {commande.traiteur?.bio && (
                  <p className="text-slate-500 line-clamp-1 print-text-compact">
                    {commande.traiteur.bio}
                  </p>
                )}
                {commande.traiteur?.whatsapp && (
                  <p className="text-slate-600 print-text-compact">
                    Tél / WhatsApp : {commande.traiteur.whatsapp}
                  </p>
                )}
                <span className="inline-block text-[9px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  Artisan Traiteur Agréé
                </span>
              </div>

              {/* Client Donneur d'ordre */}
              <div className="space-y-1 border-l pl-3 border-slate-200">
                <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                  Client / Donneur d&apos;Ordre
                </span>
                <p className="font-black text-slate-900 text-sm print-title-compact">
                  {commande.client?.full_name || "Client Partenaire"}
                </p>
                {commande.client?.phone && (
                  <p className="text-slate-600 print-text-compact">
                    Téléphone : {commande.client.phone}
                  </p>
                )}
                {commande.client?.city && (
                  <p className="text-slate-600 print-text-compact">
                    Ville : {commande.client.city}
                  </p>
                )}
                <span className="inline-block text-[9px] font-bold text-blue-800 bg-blue-100/70 px-1.5 py-0.5 rounded">
                  Compte Client Vérifié
                </span>
              </div>
            </div>

            {/* 4. DÉTAILS DE L'ÉVÉNEMENT (CONDENSÉ & LISIBLE) */}
            <div className="space-y-2 print-avoid-break">
              <div className="grid grid-cols-3 gap-2.5 text-xs print:gap-1.5">
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                    <Sparkles size={12} className="text-[#D4870A]" /> Événement
                  </span>
                  <p className="font-black text-slate-900 mt-0.5 text-xs sm:text-sm">
                    {commande.type_evenement || "Événement privé"}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                    <Calendar size={12} className="text-[#1D6B45]" /> Date prévue
                  </span>
                  <p className="font-black text-slate-900 mt-0.5 text-xs sm:text-sm">
                    {new Date(commande.date_evenement).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                    <Users size={12} className="text-blue-600" /> Convives
                  </span>
                  <p className="font-black text-slate-900 mt-0.5 text-xs sm:text-sm">
                    {commande.nb_personnes} personnes
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1.5 print:p-2">
                <div className="flex items-start gap-1.5 text-slate-700">
                  <MapPin size={14} className="text-[#1D6B45] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">Lieu d&apos;intervention : </span>
                    <span>{commande.adresse}</span>
                  </div>
                </div>
                {commande.notes && (
                  <div className="pt-1.5 border-t border-slate-100 text-slate-600 whitespace-pre-line leading-relaxed print-text-compact">
                    <span className="font-bold text-slate-900">Menu & Choix convenus : </span>
                    {commande.notes}
                  </div>
                )}
              </div>
            </div>

            {/* 5. TABLEAU OFFICIEL DES PRESTATIONS (DEVIS COMMERCIAL) */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden print-avoid-break">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider print:bg-slate-800">
                    <th className="py-2.5 px-3.5">Désignation de la prestation</th>
                    <th className="py-2.5 px-3.5 text-center w-24">Quantité</th>
                    <th className="py-2.5 px-3.5 text-right w-28">Prix Unit. TTC</th>
                    <th className="py-2.5 px-3.5 text-right w-28">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="bg-white">
                    <td className="py-3 px-3.5 font-bold text-slate-900 print:py-1.5">
                      Restauration traiteur & Événementiel ({commande.type_evenement || "Privé"})
                      <span className="block font-normal text-[11px] text-slate-500 mt-0.5 print-text-compact">
                        Élaboration culinaire, service et livraison garantis pour {commande.nb_personnes} convives.
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold print:py-1.5">
                      {commande.nb_personnes} pers.
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold print:py-1.5">
                      {prixParPersonne ? `${prixParPersonne} €` : "À chiffrer"}
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-slate-900 print:py-1.5">
                      {isPriceSet ? `${totalPrix.toFixed(2)} €` : "En attente"}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-3.5 text-[11px] text-slate-600 print:py-1" colSpan={3}>
                      Protection sous séquestre Dabari & Assurance transactionnelle
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-700 text-[11px] print:py-1">
                      Inclus
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 6. FORMULAIRE DE CHIFFRAGE & ACOMPTE (POUR LE TRAITEUR) */}
            {isTraiteur && (!isPriceSet || isEditingPrice) && (
              <div className="p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-4 print:hidden animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
                      Chiffrage & Modalités d&apos;Acompte • Espace Chef
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      Fixez le prix de la prestation et la demande d&apos;acompte
                    </h4>
                    <p className="text-xs text-slate-600 leading-snug">
                      Définissez le montant global TTC ainsi que l&apos;acompte souhaité pour réserver votre date.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSavePrice} className="space-y-4 bg-white p-4 rounded-xl border border-amber-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Montant total TTC */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1">
                        Montant Total TTC du devis (€) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          value={prixInput}
                          onChange={(e) => setPrixInput(e.target.value)}
                          placeholder="Ex : 1250.00"
                          className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border-2 border-slate-300 text-slate-900 font-black text-base focus:outline-none focus:border-[#1D6B45]"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">
                          € TTC
                        </span>
                      </div>
                      {livePrixParPersonne && (
                        <p className="text-[11px] font-bold text-[#1D6B45] mt-1">
                          Soit {livePrixParPersonne} € par convive ({commande.nb_personnes} personnes)
                        </p>
                      )}
                    </div>

                    {/* Politique d'acompte */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1">
                        Modalité de l&apos;acompte de réservation
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 mb-2">
                        <button
                          type="button"
                          onClick={() => setAcompteType("aucun")}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                            acompteType === "aucun"
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          Aucun acompte
                        </button>
                        <button
                          type="button"
                          onClick={() => setAcompteType("obligatoire")}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                            acompteType === "obligatoire"
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          Obligatoire
                        </button>
                        <button
                          type="button"
                          onClick={() => setAcompteType("optionnel")}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                            acompteType === "optionnel"
                              ? "bg-blue-700 text-white border-blue-700"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          Au choix client
                        </button>
                      </div>

                      {acompteType !== "aucun" && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            {[20, 30, 50].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setAcomptePourcentInput(pct)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-black border transition-all ${
                                  acomptePourcentInput === pct
                                    ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                            <div className="flex items-center gap-1 ml-auto text-xs font-bold text-slate-700">
                              <span>Taux :</span>
                              <input
                                type="number"
                                min="5"
                                max="80"
                                value={acomptePourcentInput}
                                onChange={(e) => setAcomptePourcentInput(Number(e.target.value))}
                                className="w-14 px-1.5 py-0.5 rounded border border-slate-300 text-center font-bold text-xs"
                              />
                              <span>%</span>
                            </div>
                          </div>

                          {liveCalculatedAcompte > 0 && (
                            <p className="text-[11px] font-bold text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              Acompte demandé :{" "}
                              <span className="text-emerald-700 font-black">
                                {liveCalculatedAcompte.toFixed(2)} €
                              </span>{" "}
                              • Solde le jour J :{" "}
                              <span className="text-slate-900 font-black">
                                {liveSoldeRestant.toFixed(2)} €
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conditions & Notes */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Conditions particulières de prestation
                    </label>
                    <textarea
                      rows={2}
                      value={conditionsTextInput}
                      onChange={(e) => setConditionsTextInput(e.target.value)}
                      placeholder="Ex : Ingrédients frais, installation 2h avant le repas..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-[#1D6B45] resize-none"
                    />
                  </div>

                  {/* Auto-signature traiteur */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSignTraiteur}
                        onChange={(e) => setAutoSignTraiteur(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1D6B45] focus:ring-[#1D6B45]"
                      />
                      <span>Signer et certifier immédiatement ce devis lors de la transmission</span>
                    </label>

                    <div className="flex gap-2 w-full sm:w-auto">
                      {isEditingPrice && (
                        <button
                          type="button"
                          onClick={() => setIsEditingPrice(false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                          Annuler
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-xl bg-[#1D6B45] hover:bg-[#154d31] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        {submitting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        <span>Valider & Transmettre le chiffrage</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* 7. CADRE SYNTHÈSE FINANCIÈRE & ACOMPTE (POUR TOUT LE MONDE) */}
            {isPriceSet && (
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-3 print:p-2.5 print:space-y-1.5 print-avoid-break">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                  {/* Volet 1 : TOTAL TTC */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-0.5 print:p-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Montant Total TTC
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 print:text-lg">
                      {totalPrix.toFixed(2)} €
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium print-text-compact">
                      {prixParPersonne ? `Soit ${prixParPersonne} € / invité` : "Prestation globale"}
                    </p>
                  </div>

                  {/* Volet 2 : ACOMPTE */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-0.5 print:p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Acompte de Réservation
                      </span>
                      {parsedMeta.acompte_paye ? (
                        <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Consigné
                        </span>
                      ) : parsedMeta.acompte_type === "obligatoire" ? (
                        <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                          Requis
                        </span>
                      ) : parsedMeta.acompte_type === "optionnel" ? (
                        <span className="text-[9px] font-black uppercase text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                          Optionnel
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Aucun
                        </span>
                      )}
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-emerald-700 print:text-lg">
                      {displayAcompteMontant > 0 ? `${displayAcompteMontant.toFixed(2)} €` : "0.00 €"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium print-text-compact">
                      {parsedMeta.acompte_type === "aucun"
                        ? "Règlement intégral le jour J"
                        : parsedMeta.acompte_type === "obligatoire"
                        ? `Acompte requis (${parsedMeta.acompte_pourcentage}%) pour bloquer la date`
                        : `Acompte suggéré (${parsedMeta.acompte_pourcentage}%) au choix du client`}
                    </p>
                  </div>

                  {/* Volet 3 : SOLDE RESTANT */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-0.5 print:p-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Solde Restant Dû
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 print:text-lg">
                      {displaySoldeRestant.toFixed(2)} €
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium print-text-compact">
                      À régler le jour de l&apos;événement
                    </p>
                  </div>
                </div>

                {/* BANDEAU DE STATUT D'ACOMPTE & ACTIONS POUR LE CLIENT */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 print-text-compact">
                    {parsedMeta.acompte_paye ? (
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        Acompte consigné sous séquestre Dabari (Réf : {parsedMeta.acompte_transaction_ref || devisRefNumber}). Fonds sécurisés.
                      </span>
                    ) : parsedMeta.acompte_type === "aucun" ? (
                      <span>Aucun acompte demandé par le traiteur. Vous réglerez l&apos;intégralité lors de la prestation.</span>
                    ) : (
                      <span>
                        Paiement sécurisé Dabari : vos fonds sont séquestrés et versés au traiteur une fois la prestation accomplie.
                      </span>
                    )}
                  </div>

                  {/* Boutons d'action versement acompte (Client uniquement) */}
                  {isClient && !isRefused && displayAcompteMontant > 0 && !parsedMeta.acompte_paye && (
                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => setShowAcomptePayModal(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CreditCard size={14} />
                        <span>Verser l&apos;acompte ({displayAcompteMontant.toFixed(2)} €)</span>
                      </button>

                      {parsedMeta.acompte_type === "optionnel" && !parsedMeta.acompte_choix_jour_j && (
                        <button
                          type="button"
                          onClick={() => handleAcompteAction("refuser_acompte")}
                          disabled={payingAcompte}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60"
                        >
                          Régler le jour J
                        </button>
                      )}
                    </div>
                  )}

                  {/* Bouton ajustement prix pour le traiteur si non signé */}
                  {isTraiteur && !isFullySigned && !isRefused && !isEditingPrice && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrice(true)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white print:hidden"
                    >
                      Ajuster tarif ou acompte
                    </button>
                  )}
                </div>

                {parsedMeta.texte && (
                  <p className="text-[11px] text-slate-500 italic pt-1 print-text-compact">
                    Conditions : {parsedMeta.texte}
                  </p>
                )}
              </div>
            )}

            {/* 8. CARTOUCHES OFFICIELS DE DOUBLE SIGNATURE */}
            <div className="space-y-2.5 print-avoid-break">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                  Double Signature Électronique Certifiée (Valeur Probante eIDAS)
                </h3>
                <span className="text-[10px] text-slate-400 print-text-compact">
                  Art. 1366 et 1367 du Code civil
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* ── CARTOUCHE PRESTATAIRE ── */}
                <div
                  className={`p-3.5 rounded-2xl border-2 space-y-2 transition-all print:p-2 ${
                    isTraiteurSigned
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-700">
                      Le Prestataire (Bon pour offre)
                    </span>
                    {isTraiteurSigned ? (
                      <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> Signé
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        En attente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 print-text-compact">
                    Chef : <strong>{commande.traiteur?.name || "Traiteur"}</strong>
                  </p>

                  {isTraiteurSigned ? (
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-center space-y-0.5 print:p-1.5">
                      <p className="font-serif italic text-sm text-[#1D6B45] font-black">
                        {commande.traiteur_signature?.split(" | ")[0] || "Signature Traiteur"}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        Signé le{" "}
                        {new Date(commande.traiteur_signed_at!).toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[11px] text-slate-400 print:p-2">
                      En attente de la signature du traiteur
                    </div>
                  )}
                </div>

                {/* ── CARTOUCHE CLIENT ── */}
                <div
                  className={`p-3.5 rounded-2xl border-2 space-y-2 transition-all print:p-2 ${
                    isClientSigned
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-700">
                      Le Client (Bon pour accord)
                    </span>
                    {isClientSigned ? (
                      <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> Signé
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        En attente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 print-text-compact">
                    Client : <strong>{commande.client?.full_name || "Client Partenaire"}</strong>
                  </p>

                  {isClientSigned ? (
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-center space-y-0.5 print:p-1.5">
                      <p className="font-serif italic text-sm text-[#1D6B45] font-black">
                        {commande.client_signature?.split(" | ")[0] || "Signature Client"}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        Signé le{" "}
                        {new Date(commande.client_signed_at!).toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[11px] text-slate-400 print:p-2">
                      En attente de la signature du client
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 9. FORMULAIRE INTERACTIF DE SIGNATURE (ÉCRAN UNIQUEMENT) */}
            {isPriceSet &&
              !isFullySigned &&
              !isRefused &&
              ((isClient && !isClientSigned) || (isTraiteur && !isTraiteurSigned)) && (
                <div className="p-5 rounded-2xl bg-emerald-50/70 border-2 border-[#1D6B45]/40 space-y-3.5 print:hidden animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#1D6B45] text-white flex items-center justify-center font-bold">
                      <PenTool size={16} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">
                        Votre signature est requise : {isClient ? "Signature Client" : "Signature Traiteur"}
                      </h4>
                      <p className="text-xs text-slate-600">
                        Apposez votre nom ou signature pour valider ce devis de{" "}
                        <span className="font-bold text-slate-900">{totalPrix.toFixed(2)} €</span>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Nom et prénom du signataire *
                      </label>
                      <input
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder={
                          isClient
                            ? commande.client?.full_name || "Votre nom complet"
                            : commande.traiteur?.name || "Votre nom"
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1D6B45] bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Signature manuscrite (optionnelle)
                        </label>
                        {hasDrawn && (
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 font-semibold"
                          >
                            <RotateCcw size={12} /> Effacer
                          </button>
                        )}
                      </div>
                      <div className="bg-white rounded-xl border border-dashed border-slate-300 relative overflow-hidden h-24 touch-none">
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={96}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-full cursor-crosshair"
                        />
                        {!hasDrawn && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 pointer-events-none select-none">
                            Signez ici au doigt ou à la souris
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-[#1D6B45] focus:ring-[#1D6B45]"
                    />
                    <span>
                      Je reconnais avoir pris connaissance de l&apos;ensemble des conditions de ce devis ({totalPrix.toFixed(2)} €) et j&apos;accepte formellement son exécution via la plateforme Dabari.
                    </span>
                  </label>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={submitting || !agreedTerms || (!signerName.trim() && !hasDrawn)}
                      onClick={handleSign}
                      className="px-5 py-2.5 rounded-xl bg-[#1D6B45] hover:bg-[#154d31] disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Signature en cours...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={15} />
                          <span>Signer électroniquement ce devis</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Refus pour le client */}
                  {isClient && !isRefused && (
                    <div className="pt-2 border-t border-slate-200">
                      {showRefusalForm ? (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                          <p className="text-xs text-red-800 font-medium">
                            Indiquez un motif facultatif pour refuser cette offre tarifaire :
                          </p>
                          <input
                            type="text"
                            value={refusalMotif}
                            onChange={(e) => setRefusalMotif(e.target.value)}
                            placeholder="Ex : Budget trop élevé, date modifiée..."
                            className="w-full px-3 py-2 rounded-lg border border-red-200 bg-white text-xs text-slate-800 focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowRefusalForm(false)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200/50"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={handleRefuseQuote}
                              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs"
                            >
                              Confirmer le refus
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowRefusalForm(true)}
                          className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                        >
                          <XCircle size={13} />
                          <span>Je souhaite décliner / refuser cette offre tarifaire</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* 10. MENTIONS LÉGALES FRANÇAISES OBLIGATOIRES (CONDENSÉES POUR 1 PAGE A4) */}
            <div className="pt-3 border-t border-slate-200 text-[9.5px] text-slate-500 leading-snug space-y-1 bg-slate-50/70 p-3 rounded-xl print:p-1.5 print:space-y-0.5 print-avoid-break print-text-compact">
              <p className="font-black text-slate-700 uppercase tracking-wider text-[9px]">
                Cadre réglementaire & Mentions légales obligatoires (Droit Français)
              </p>
              <p>
                • <strong>Validité :</strong> Valable 30 jours à compter de son émission. Passé ce délai, confirmation requise par le traiteur.
              </p>
              <p>
                • <strong>Exclusion de rétractation (Art. L. 221-28 12° C. conso) :</strong> Les prestations de services de restauration fournies à une date déterminée ne bénéficient pas du droit de rétractation de 14 jours.
              </p>
              <p>
                • <strong>Pénalités B2B (Art. L. 441-10 C. com) :</strong> En cas de retard de paiement entre professionnels, pénalités au taux légal majoré de 10 points et indemnité forfaitaire légale de 40 € pour frais de recouvrement.
              </p>
              <p>
                • <strong>Force probante :</strong> Signature électronique certifiée conforme aux articles 1366 et 1367 du Code civil et au règlement européen eIDAS.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALE INTERACTIVE DE CONSIGNATION D'ACOMPTE CLIENT ── */}
      {showAcomptePayModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Consignation d&apos;Acompte
                  </h3>
                  <p className="text-xs text-slate-500">Protection sous séquestre Dabari</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAcomptePayModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Montant total de la prestation :</span>
                <span className="font-bold text-slate-900">{totalPrix.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Acompte à verser maintenant :</span>
                <span className="font-black text-emerald-700 text-sm">
                  {displayAcompteMontant.toFixed(2)} €
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>Solde restant le jour J :</span>
                <span className="font-bold text-slate-900">
                  {displaySoldeRestant.toFixed(2)} €
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-blue-700 shrink-0" />
                Garantie de Séquestre Dabari
              </p>
              <p className="text-[11px] text-blue-800 leading-snug">
                Votre acompte est mis sous séquestre sécurisé. Le chef n&apos;en perçoit le montant qu&apos;une fois la prestation culinaire réalisée le jour convenu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAcomptePayModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={payingAcompte}
                onClick={() => handleAcompteAction("verser")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
              >
                {payingAcompte ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sécurisation en cours...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirmer le versement ({displayAcompteMontant.toFixed(2)} €)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
