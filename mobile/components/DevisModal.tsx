import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { CommandeTraiteur } from "../utils/types/traiteur";
import { apiFetch } from "../utils/api";

interface DevisModalProps {
  visible: boolean;
  commande: CommandeTraiteur | null;
  currentUserId?: string | null;
  isTraiteurView?: boolean;
  onClose: () => void;
  onUpdate: (updatedCommande: CommandeTraiteur) => void;
}

/**
 * Génère le code HTML complet et officiel pour l'impression A4 du devis traiteur
 */
function generateDevisHtml(
  commande: CommandeTraiteur,
  meta: {
    acompte_type: "aucun" | "obligatoire" | "optionnel";
    acompte_pourcentage: number;
    acompte_montant: number;
    texte?: string;
  },
  displayAcompte: number,
  displaySolde: number
): string {
  const devisRef = `DEV-${commande.id.slice(0, 8).toUpperCase()}`;
  const totalPrix = Number(commande.prix_devis || 0);
  const dateEmission = commande.created_at
    ? new Date(commande.created_at).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");
  const expDate = (() => {
    const base = commande.created_at ? new Date(commande.created_at) : new Date();
    const d = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("fr-FR");
  })();
  const dateEvent = commande.date_evenement
    ? new Date(commande.date_evenement).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date à convenir";
  const prixParPersonne =
    commande.nb_personnes > 0 && totalPrix > 0
      ? (totalPrix / commande.nb_personnes).toFixed(2)
      : "-";

  const traiteurNom =
    commande.traiteur?.name || commande.traiteurs?.name || "Traiteur Dabari";
  const traiteurPhone =
    commande.traiteur?.whatsapp || "Non renseigné";
  const clientNom =
    commande.client?.full_name || commande.profiles?.full_name || "Client Partenaire";
  const clientPhone =
    commande.client?.phone || commande.profiles?.phone || "Non renseigné";
  const clientVille =
    (commande.client as any)?.city || (commande.profiles as any)?.city || commande.adresse || "France";

  const isFullySigned = Boolean(commande.client_signed_at && commande.traiteur_signed_at);
  const isRefused = commande.devis_status === "refuse";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Devis ${devisRef} - Dabari</title>
  <style>
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      padding: 10px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-col {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 40px;
      height: 40px;
      background-color: #1d6b45;
      color: #ffffff;
      font-size: 22px;
      font-weight: 900;
      border-radius: 10px;
      text-align: center;
      line-height: 40px;
    }
    .brand-text h1 {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-text span {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1d6b45;
      letter-spacing: 1px;
    }
    .ref-col {
      text-align: right;
    }
    .doc-type {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
    }
    .doc-ref {
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
      color: #1d6b45;
      margin: 2px 0;
    }
    .doc-meta {
      font-size: 10px;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      margin-top: 4px;
      background: ${isFullySigned ? "#dcfce7" : isRefused ? "#fee2e2" : "#fef3c7"};
      color: ${isFullySigned ? "#166534" : isRefused ? "#991b1b" : "#92400e"};
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .party-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .party-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .party-name {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .party-detail {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
    }
    .event-card {
      border: 1px solid #e2e8f0;
      background: #ffffff;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }
    .event-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e2e8f0;
      margin-bottom: 8px;
    }
    .event-field-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .event-field-val {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 1px;
    }
    .event-desc {
      font-size: 10px;
      color: #334155;
      line-height: 1.45;
    }
    table.quote-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    table.quote-table th {
      background: #0f172a;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: left;
    }
    table.quote-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 10px;
    }
    table.quote-table tr.total-row td {
      background: #f8fafc;
      font-weight: 800;
      border-top: 2px solid #0f172a;
    }
    .financial-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .fin-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .fin-box.accent {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .fin-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
    }
    .fin-val {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin: 2px 0;
    }
    .fin-box.accent .fin-val {
      color: #166534;
    }
    .fin-sub {
      font-size: 9px;
      color: #64748b;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .sig-box {
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 12px;
      min-height: 85px;
      background: #ffffff;
    }
    .sig-box.signed {
      border-color: #86efac;
      background: #f0fdf4;
    }
    .sig-header {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .sig-signataire {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 14px;
      font-weight: 700;
      color: #1d6b45;
      margin-top: 6px;
    }
    .sig-date {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    .sig-empty {
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
      margin-top: 14px;
    }
    .legal-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 8.5px;
      color: #64748b;
      line-height: 1.4;
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 8px;
    }
    .legal-footer strong {
      color: #1e293b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-col">
      <div class="brand-logo">D</div>
      <div class="brand-text">
        <h1>Dabari</h1>
        <span>Garantie Séquestre & Restauration</span>
      </div>
    </div>
    <div class="ref-col">
      <div class="doc-type">Devis Officiel de Restauration</div>
      <div class="doc-ref">${devisRef}</div>
      <div class="doc-meta">Émis le : ${dateEmission} • Validité : 30 jours (jusqu'au ${expDate})</div>
      <div class="status-badge">
        ${
          isFullySigned
            ? "100% Signé & Validé"
            : isRefused
            ? "Proposition Déclinée"
            : commande.prix_devis
            ? "Chiffré • En attente de signature"
            : "En attente de chiffrage"
        }
      </div>
    </div>
  </div>

  <div class="parties-grid">
    <div class="party-card">
      <div class="party-label">Émetteur / Prestataire Traiteur</div>
      <div class="party-name">${traiteurNom}</div>
      <div class="party-detail">WhatsApp / Contact : ${traiteurPhone}</div>
      <div class="party-detail" style="color: #166534; font-weight: 700;">Artisan Traiteur Agréé Dabari</div>
    </div>
    <div class="party-card">
      <div class="party-label">Client / Donneur d'Ordre</div>
      <div class="party-name">${clientNom}</div>
      <div class="party-detail">Téléphone : ${clientPhone}</div>
      <div class="party-detail">Ville / Zone : ${clientVille}</div>
    </div>
  </div>

  <div class="event-card">
    <div class="event-grid">
      <div>
        <div class="event-field-label">Type d'Événement</div>
        <div class="event-field-val">${commande.type_evenement || "Restauration privée"}</div>
      </div>
      <div>
        <div class="event-field-label">Date Prévue</div>
        <div class="event-field-val">${dateEvent}</div>
      </div>
      <div>
        <div class="event-field-label">Nombre de Convives</div>
        <div class="event-field-val">${commande.nb_personnes} personnes</div>
      </div>
    </div>
    <div class="event-desc">
      <strong>Lieu d'intervention :</strong> ${commande.adresse || "À convenir"}<br>
      ${commande.notes ? `<strong>Menu & Choix convenus :</strong> ${commande.notes}` : ""}
    </div>
  </div>

  <table class="quote-table">
    <thead>
      <tr>
        <th>Désignation de la prestation</th>
        <th style="text-align: center; width: 80px;">Convives</th>
        <th style="text-align: right; width: 100px;">Prix / Convive</th>
        <th style="text-align: right; width: 110px;">Total TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>Restauration traiteur & Événementiel</strong><br>
          <span style="color: #64748b; font-size: 9px;">Élaboration culinaire, service et livraison pour ${commande.nb_personnes} convives.</span>
        </td>
        <td style="text-align: center; font-weight: 700;">${commande.nb_personnes} pers.</td>
        <td style="text-align: right; font-weight: 600;">${prixParPersonne !== "-" ? prixParPersonne + " €" : "À chiffrer"}</td>
        <td style="text-align: right; font-weight: 800;">${totalPrix > 0 ? totalPrix.toFixed(2) + " €" : "En attente"}</td>
      </tr>
      <tr>
        <td colspan="3" style="color: #64748b; font-size: 9.5px;">
          Protection sous séquestre Dabari SAS & Assurance transactionnelle
        </td>
        <td style="text-align: right; color: #166534; font-weight: 700;">Inclus</td>
      </tr>
    </tbody>
  </table>

  <div class="financial-grid">
    <div class="fin-box">
      <div class="fin-label">Montant Total TTC</div>
      <div class="fin-val">${totalPrix.toFixed(2)} €</div>
      <div class="fin-sub">${prixParPersonne !== "-" ? `Soit ${prixParPersonne} € / invité` : "Prestation globale"}</div>
    </div>
    <div class="fin-box accent">
      <div class="fin-label">Acompte de Réservation</div>
      <div class="fin-val">${displayAcompte.toFixed(2)} €</div>
      <div class="fin-sub">
        ${
          (meta as any).acompte_paye
            ? `<strong style="color: #166534;">✓ Réglé sous séquestre Dabari (${(meta as any).acompte_transaction_ref || "DAB-SEC"})</strong>`
            : meta.acompte_type === "aucun"
            ? "Aucun acompte demandé (Règlement jour J)"
            : `Acompte (${meta.acompte_pourcentage || 30}%) sous séquestre`
        }
      </div>
    </div>
    <div class="fin-box">
      <div class="fin-label">Solde Restant Dû</div>
      <div class="fin-val">${displaySolde.toFixed(2)} €</div>
      <div class="fin-sub">Payable le jour de l'événement</div>
    </div>
  </div>

  <div class="signatures-grid">
    <div class="sig-box ${commande.traiteur_signed_at ? "signed" : ""}">
      <div class="sig-header">
        <span>Le Prestataire Traiteur (Bon pour offre)</span>
        <span style="font-weight: 800; color: ${commande.traiteur_signed_at ? "#166534" : "#94a3b8"};">
          ${commande.traiteur_signed_at ? "✓ Signé électroniquement" : "En attente"}
        </span>
      </div>
      <div><strong>${traiteurNom}</strong></div>
      ${
        commande.traiteur_signed_at
          ? `<div class="sig-signataire">${commande.traiteur_signature?.split(" | ")[0] || "Signature Traiteur"}</div>
             <div class="sig-date">Signé le ${new Date(commande.traiteur_signed_at).toLocaleDateString("fr-FR")} à ${new Date(commande.traiteur_signed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
             <div style="font-size: 8px; color: #64748b; font-family: monospace; margin-top: 2px;">Réf. sécurité : TRT-${commande.id.slice(0, 8).toUpperCase()}</div>`
          : `<div class="sig-empty">En attente de signature traiteur</div>`
      }
    </div>

    <div class="sig-box ${commande.client_signed_at ? "signed" : ""}">
      <div class="sig-header">
        <span>Le Client Donneur d'ordre (Bon pour accord)</span>
        <span style="font-weight: 800; color: ${commande.client_signed_at ? "#166534" : "#94a3b8"};">
          ${commande.client_signed_at ? "✓ Signé électroniquement" : "En attente"}
        </span>
      </div>
      <div><strong>${clientNom}</strong></div>
      ${
        commande.client_signed_at
          ? `<div class="sig-signataire">${commande.client_signature?.split(" | ")[0] || "Signature Client"}</div>
             <div class="sig-date">Signé le ${new Date(commande.client_signed_at).toLocaleDateString("fr-FR")} à ${new Date(commande.client_signed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
             <div style="font-size: 8px; color: #64748b; font-family: monospace; margin-top: 2px;">Réf. sécurité : CLT-${commande.id.slice(0, 8).toUpperCase()}</div>`
          : `<div class="sig-empty">En attente de signature client</div>`
      }
    </div>
  </div>

  <div class="legal-footer">
    <p><strong>Mentions Légales & Cadre Réglementaire (Droit Français) :</strong></p>
    <p>• <strong>Validité :</strong> Valable 30 jours à compter de son émission. Passé ce délai, confirmation requise par le traiteur.</p>
    <p>• <strong>Exclusion de rétractation (Art. L. 221-28 12° C. conso) :</strong> Les prestations de restauration pour date déterminée ne bénéficient pas du droit de rétractation de 14 jours.</p>
    <p>• <strong>Séquestre Dabari SAS :</strong> L'acompte est sécurisé sur compte de cantonnement et libéré après confirmation de la prestation.</p>
    <p>• <strong>Valeur probante :</strong> Signature électronique conforme aux articles 1366 et 1367 du Code civil et règlement eIDAS.</p>
  </div>
</body>
</html>
  `.trim();
}

export default function DevisModal({
  visible,
  commande: initialCommande,
  currentUserId,
  isTraiteurView = false,
  onClose,
  onUpdate,
}: DevisModalProps) {
  if (!initialCommande) return null;

  const router = useRouter();
  const [commande, setCommande] = useState<CommandeTraiteur>(initialCommande);
  const [submitting, setSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parse existing conditions metadata
  const parsedMeta = useMemo(() => {
    const raw = commande.conditions_devis;
    if (!raw) {
      return {
        acompte_type: "obligatoire" as const,
        acompte_pourcentage: 30,
        acompte_montant: 0,
        texte: "",
        acompte_paye: false,
        acompte_paye_at: null as string | null,
        acompte_transaction_ref: null as string | null,
        acompte_choix_jour_j: false,
      };
    }
    if (raw.startsWith("{") && raw.endsWith("}")) {
      try {
        const json = JSON.parse(raw);
        return {
          acompte_type: (json.acompte_type || "obligatoire") as "aucun" | "obligatoire" | "optionnel",
          acompte_pourcentage: typeof json.acompte_pourcentage === "number" ? json.acompte_pourcentage : 30,
          acompte_montant: Number(json.acompte_montant || 0),
          texte: String(json.texte || ""),
          acompte_paye: Boolean(json.acompte_paye),
          acompte_paye_at: (json.acompte_paye_at as string) || null,
          acompte_transaction_ref: (json.acompte_transaction_ref as string) || null,
          acompte_choix_jour_j: Boolean(json.acompte_choix_jour_j),
        };
      } catch {
        // Fallback
      }
    }
    return {
      acompte_type: "obligatoire" as const,
      acompte_pourcentage: 30,
      acompte_montant: 0,
      texte: raw,
      acompte_paye: false,
      acompte_paye_at: null as string | null,
      acompte_transaction_ref: null as string | null,
      acompte_choix_jour_j: false,
    };
  }, [commande.conditions_devis]);

  // Pricing form states for traiteur
  const [prixInput, setPrixInput] = useState(
    commande.prix_devis ? String(commande.prix_devis) : ""
  );
  const [acompteType, setAcompteType] = useState<"aucun" | "obligatoire" | "optionnel">(
    parsedMeta.acompte_type
  );
  // Pourcentage configurable entre 0% et 80%
  const [acomptePourcentStr, setAcomptePourcentStr] = useState<string>(
    String(parsedMeta.acompte_pourcentage !== undefined ? parsedMeta.acompte_pourcentage : 30)
  );
  const [conditionsTextInput, setConditionsTextInput] = useState(
    parsedMeta.texte ||
      "Paiement garanti sous séquestre Dabari. Solde libéré après confirmation de l'événement."
  );
  const [isEditingPrice, setIsEditingPrice] = useState(
    !commande.prix_devis && isTraiteurView
  );
  const [autoSignTraiteur, setAutoSignTraiteur] = useState(true);
  const [traiteurSignerName, setTraiteurSignerName] = useState(
    commande.traiteur?.name || ""
  );

  // Client signature, refusal & acompte modal states
  const [signerName, setSignerName] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [refusalMotif, setRefusalMotif] = useState("");
  const [showAcompteModal, setShowAcompteModal] = useState(false);
  const [acompteModeSimule, setAcompteModeSimule] = useState<"cb" | "virement" | "especes">("cb");
  const [payingAcompte, setPayingAcompte] = useState(false);

  const isClient = Boolean(currentUserId && commande.client_id === currentUserId);
  const isTraiteur = Boolean(
    isTraiteurView || (currentUserId && commande.traiteur?.user_id === currentUserId)
  );

  const totalPrix = Number(commande.prix_devis || 0);
  const isPriceSet = Boolean(totalPrix > 0);
  const isClientSigned = Boolean(commande.client_signed_at);
  const isTraiteurSigned = Boolean(commande.traiteur_signed_at);
  const isFullySigned = isClientSigned && isTraiteurSigned;
  const isRefused = commande.devis_status === "refuse";

  const prixParPersonne =
    commande.nb_personnes > 0 && totalPrix > 0
      ? (totalPrix / commande.nb_personnes).toFixed(2)
      : null;

  const liveParsedPrix = parseFloat(prixInput.replace(",", "."));
  const livePrixTotal = !isNaN(liveParsedPrix) && liveParsedPrix > 0 ? liveParsedPrix : 0;
  const livePrixParPersonne =
    commande.nb_personnes > 0 && livePrixTotal > 0
      ? (livePrixTotal / commande.nb_personnes).toFixed(2)
      : null;

  // Validation acompte en temps réel (0 - 80%)
  const parsedPourcent = parseFloat(acomptePourcentStr.replace(",", "."));
  const isPourcentNegative = !isNaN(parsedPourcent) && parsedPourcent < 0;
  const isPourcentTooHigh = !isNaN(parsedPourcent) && parsedPourcent > 80;
  const isPourcentValid =
    !isNaN(parsedPourcent) && parsedPourcent >= 0 && parsedPourcent <= 80;
  const effectivePourcent = acompteType === "aucun" ? 0 : isPourcentValid ? parsedPourcent : 0;

  const liveCalculatedAcompte = useMemo(() => {
    if (acompteType === "aucun" || livePrixTotal <= 0 || !isPourcentValid) return 0;
    return Math.round(livePrixTotal * (effectivePourcent / 100) * 100) / 100;
  }, [acompteType, livePrixTotal, isPourcentValid, effectivePourcent]);

  const liveSoldeRestant = Math.max(0, livePrixTotal - liveCalculatedAcompte);

  const displayAcompteMontant = useMemo(() => {
    if (parsedMeta.acompte_type === "aucun" || totalPrix <= 0) return 0;
    if (parsedMeta.acompte_montant > 0) return parsedMeta.acompte_montant;
    const pct = parsedMeta.acompte_pourcentage || 30;
    return Math.round(totalPrix * (pct / 100) * 100) / 100;
  }, [parsedMeta, totalPrix]);

  const displaySoldeRestant = Math.max(0, totalPrix - displayAcompteMontant);

  // Impression native du devis (A4)
  const handlePrintDevis = async () => {
    try {
      setIsPrinting(true);
      const html = generateDevisHtml(
        commande,
        parsedMeta,
        displayAcompteMontant,
        displaySoldeRestant
      );
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert(
        "Impression du devis",
        "Impossible de lancer l'impression : " + (err.message || "Erreur inconnue")
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // Export / Partage PDF avec copie sécurisée dans le cache autorisé d'Expo
  const handleSharePdf = async () => {
    try {
      setIsPrinting(true);
      const html = generateDevisHtml(
        commande,
        parsedMeta,
        displayAcompteMontant,
        displaySoldeRestant
      );
      const { uri, base64 } = await Print.printToFileAsync({
        html,
        base64: true,
      });

      const cleanFileName = `Devis_${commande.id.slice(0, 8).toUpperCase()}.pdf`;
      let fileToShare = uri;

      if (FileSystem && FileSystem.cacheDirectory) {
        try {
          const targetUri = `${FileSystem.cacheDirectory}${cleanFileName}`;
          if (base64) {
            await FileSystem.writeAsStringAsync(targetUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            fileToShare = targetUri;
          } else {
            await FileSystem.copyAsync({
              from: uri,
              to: targetUri,
            });
            fileToShare = targetUri;
          }
        } catch (copyErr) {
          console.warn("Échec de copie vers cacheDirectory, repli sur URI direct :", copyErr);
          fileToShare = uri;
        }
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileToShare, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: cleanFileName,
        });
      } else {
        await Print.printAsync({ html });
      }
    } catch (err: any) {
      Alert.alert(
        "Export PDF",
        "Impossible de générer le fichier PDF : " + (err.message || "Erreur inconnue")
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // Submit quote pricing (Traiteur) avec validation stricte 0% à 80%
  const handleSubmitPricing = async () => {
    setError(null);
    const numPrix = parseFloat(prixInput.replace(",", "."));
    if (isNaN(numPrix) || numPrix <= 0) {
      setError("Veuillez saisir un tarif global valide (en euros).");
      return;
    }

    if (acompteType !== "aucun") {
      if (isNaN(parsedPourcent) || parsedPourcent < 0 || parsedPourcent > 80) {
        setError("L'acompte doit obligatoirement être compris entre 0% et 80%.");
        return;
      }
    }

    const finalPourcent = acompteType === "aucun" ? 0 : parsedPourcent;
    const calculatedAcompte =
      acompteType === "aucun"
        ? 0
        : Math.round(numPrix * (finalPourcent / 100) * 100) / 100;

    const payloadMetadata = {
      acompte_type: acompteType,
      acompte_pourcentage: finalPourcent,
      acompte_montant: calculatedAcompte,
      texte: conditionsTextInput.trim(),
    };

    setSubmitting(true);
    try {
      const res = await apiFetch(`commande/traiteur/${commande.id}/devis/setup`, {
        method: "POST",
        body: JSON.stringify({
          prix_devis: numPrix,
          conditions_devis: JSON.stringify(payloadMetadata),
          auto_sign: autoSignTraiteur,
          traiteur_signature:
            autoSignTraiteur && traiteurSignerName.trim()
              ? traiteurSignerName.trim()
              : (commande.traiteur?.name || "Traiteur Dabari"),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors de l'enregistrement du devis.");
      }

      setCommande(data.data.commande);
      onUpdate(data.data.commande);
      DeviceEventEmitter.emit("dabari_notifications_updated");
      DeviceEventEmitter.emit("dabari_orders_updated");
      setIsEditingPrice(false);
      setSuccessMessage("Devis chiffré et transmis avec succès au client.");
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  // Sign quote electronically
  const handleSign = async () => {
    setError(null);
    if (!signerName.trim()) {
      setError("Veuillez saisir votre prénom et nom pour apposer votre signature.");
      return;
    }
    if (!agreedTerms) {
      setError("Veuillez cocher la case d'acceptation du devis et des conditions.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`commande/traiteur/${commande.id}/devis/sign`, {
        method: "POST",
        body: JSON.stringify({
          signature: signerName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors de la signature.");
      }

      setCommande(data.data.commande);
      onUpdate(data.data.commande);
      DeviceEventEmitter.emit("dabari_notifications_updated");
      DeviceEventEmitter.emit("dabari_orders_updated");
      setSignerName("");
      setAgreedTerms(false);
      setSuccessMessage("Devis signé avec succès !");
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  // Refuse quote
  const handleRefuse = async () => {
    setError(null);
    if (!refusalMotif.trim()) {
      setError("Veuillez préciser le motif de refus.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`commande/traiteur/${commande.id}/devis/refuse`, {
        method: "POST",
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
      DeviceEventEmitter.emit("dabari_notifications_updated");
      DeviceEventEmitter.emit("dabari_orders_updated");
      setShowRefusalModal(false);
      setSuccessMessage("Le devis a été décliné.");
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  // Deposit escrow management (simulation / validation / réinitialisation)
  const handleAcompteAction = async (
    action: "verser" | "refuser_acompte" | "annuler_reglement"
  ) => {
    setError(null);
    setPayingAcompte(true);
    try {
      const modeSuffix =
        acompteModeSimule === "cb"
          ? "CB"
          : acompteModeSimule === "virement"
          ? "VIR"
          : "ESP";
      const fakeRef =
        action === "verser"
          ? `DAB-${modeSuffix}-${Date.now().toString(36).toUpperCase()}`
          : undefined;

      // Compatibilité totale avec l'API déployée sur Railway (qui attend 'verser' ou 'refuser_acompte')
      const apiAction = action === "annuler_reglement" ? "refuser_acompte" : action;

      const res = await apiFetch(`commande/traiteur/${commande.id}/devis/acompte`, {
        method: "POST",
        body: JSON.stringify({
          action: apiAction,
          transaction_ref: fakeRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors du traitement de l'acompte.");
      }

      setCommande(data.data.commande);
      onUpdate(data.data.commande);
      DeviceEventEmitter.emit("dabari_notifications_updated");
      DeviceEventEmitter.emit("dabari_orders_updated");
      setShowAcompteModal(false);

      if (action === "verser") {
        Alert.alert(
          "Acompte Séquestré",
          `Acompte de ${displayAcompteMontant.toFixed(2)} € consigné sous séquestre sécurisé Dabari SAS. La date de votre événement est confirmée avec le traiteur !`
        );
      } else if (action === "refuser_acompte") {
        Alert.alert(
          "Règlement jour J",
          "Choix de règlement intégral le jour de la prestation enregistré."
        );
      } else {
        Alert.alert(
          "Statut réinitialisé",
          "Le statut de l'acompte a été réinitialisé en attente."
        );
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du versement.");
    } finally {
      setPayingAcompte(false);
    }
  };

  const devisRef = `DEV-${commande.id.slice(0, 8).toUpperCase()}`;
  const dateFormatted = commande.date_evenement
    ? new Date(commande.date_evenement).toLocaleDateString("fr-FR")
    : "Date à convenir";

  const isDepositPaid = Boolean(parsedMeta.acompte_paye);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Top Bar avec boutons Imprimer / PDF */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="document-text" size={18} color="#1D6B45" />
              </View>
              <View>
                <Text style={styles.headerRef}>{devisRef}</Text>
                <Text style={styles.headerTitle}>Devis Officiel Événement</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {isPriceSet && (
                <>
                  <TouchableOpacity
                    onPress={handlePrintDevis}
                    style={styles.headerActionBtn}
                    activeOpacity={0.8}
                    disabled={isPrinting}
                    accessibilityLabel="Imprimer le devis"
                  >
                    {isPrinting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSharePdf}
                    style={styles.headerActionBtn}
                    activeOpacity={0.8}
                    disabled={isPrinting}
                    accessibilityLabel="Exporter en PDF"
                  >
                    <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            {/* Alerts */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {Boolean(successMessage) && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Badges de Statut */}
            <View style={styles.badgeRow}>
              {isFullySigned ? (
                <View style={[styles.statusBadge, styles.badgeSuccess]}>
                  <Ionicons name="shield-checkmark" size={13} color="#166534" />
                  <Text style={styles.badgeSuccessText}>Devis 100% Signé & Validé</Text>
                </View>
              ) : isRefused ? (
                <View style={[styles.statusBadge, styles.badgeDanger]}>
                  <Ionicons name="close-circle" size={13} color="#991B1B" />
                  <Text style={styles.badgeDangerText}>Proposition Déclinée</Text>
                </View>
              ) : isPriceSet ? (
                <View style={[styles.statusBadge, styles.badgePrimary]}>
                  <Ionicons name="pricetag" size={13} color="#1E40AF" />
                  <Text style={styles.badgePrimaryText}>Chiffrage Proposé</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.badgeWarning]}>
                  <Ionicons name="time" size={13} color="#854D0E" />
                  <Text style={styles.badgeWarningText}>En attente de chiffrage</Text>
                </View>
              )}

              <View style={styles.sequestrePill}>
                <Ionicons name="lock-closed" size={11} color="#1D6B45" />
                <Text style={styles.sequestrePillText}>Séquestre Dabari</Text>
              </View>
            </View>

            {/* Fiche Récapitulative de la Prestation */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Détails de la Prestation</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Traiteur :</Text>
                <Text style={styles.infoValue}>
                  {commande.traiteur?.name || commande.traiteurs?.name || "Traiteur Dabari"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Client :</Text>
                <Text style={styles.infoValue}>
                  {commande.client?.full_name || commande.profiles?.full_name || "Client"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date d'événement :</Text>
                <Text style={styles.infoValue}>{dateFormatted}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre de convives :</Text>
                <Text style={styles.infoValue}>{commande.nb_personnes} personnes</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lieu / Adresse :</Text>
                <Text style={styles.infoValue}>{commande.adresse || "Non spécifié"}</Text>
              </View>

              {Boolean(commande.notes) && (
                <View style={[styles.infoRow, { alignItems: "flex-start" }]}>
                  <Text style={styles.infoLabel}>Souhaits / Menu :</Text>
                  <Text style={[styles.infoValue, { flex: 1 }]}>{commande.notes}</Text>
                </View>
              )}
            </View>

            {/* Tarification & Acompte Séquestre */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderWithAction}>
                <Text style={styles.sectionHeading}>Tarification Officielle</Text>
                {isTraiteur && isPriceSet && !isFullySigned && !isEditingPrice && (
                  <TouchableOpacity
                    onPress={() => setIsEditingPrice(true)}
                    style={styles.editPriceBtn}
                  >
                    <Ionicons name="create-outline" size={13} color="#1D6B45" />
                    <Text style={styles.editPriceBtnText}>Ajuster le tarif</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isPriceSet && !isEditingPrice ? (
                <View>
                  <View style={styles.priceHighlightBox}>
                    <Text style={styles.priceLabel}>Montant Total TTC</Text>
                    <Text style={styles.priceBig}>{totalPrix.toFixed(2)} €</Text>
                    {Boolean(prixParPersonne) && (
                      <Text style={styles.pricePerPerson}>
                        Soit environ {prixParPersonne} € / convive
                      </Text>
                    )}
                  </View>

                  {displayAcompteMontant > 0 ? (
                    <View style={styles.acompteGrid}>
                      <TouchableOpacity
                        style={[
                          styles.acompteCol,
                          styles.acompteColInteractive,
                          isDepositPaid && styles.acompteColPaid,
                        ]}
                        onPress={() => setShowAcompteModal(true)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.acompteHeaderRow}>
                          <Text style={styles.acompteColLabel}>
                            Acompte Séquestre ({parsedMeta.acompte_pourcentage || 30}%)
                          </Text>
                          <Ionicons
                            name={isDepositPaid ? "checkmark-circle" : "chevron-forward"}
                            size={14}
                            color={isDepositPaid ? "#15803D" : "#64748B"}
                          />
                        </View>
                        <Text
                          style={[
                            styles.acompteColValue,
                            isDepositPaid && styles.textSuccess,
                          ]}
                        >
                          {displayAcompteMontant.toFixed(2)} €
                        </Text>
                        <Text
                          style={[
                            styles.acompteStatutText,
                            isDepositPaid ? styles.textSuccess : styles.textWarning,
                          ]}
                        >
                          {isDepositPaid
                            ? "✓ Réglé & sous séquestre"
                            : "Toucher pour régler l'acompte"}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.acompteCol}>
                        <Text style={styles.acompteColLabel}>Solde restant</Text>
                        <Text style={styles.acompteColValue}>
                          {displaySoldeRestant.toFixed(2)} €
                        </Text>
                        <Text style={styles.acompteStatutText}>
                          Payable le jour J
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noAcompteBox}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#15803D" />
                      <Text style={styles.noAcompteText}>
                        Aucun acompte demandé. Règlement intégral le jour de la prestation.
                      </Text>
                    </View>
                  )}

                  {/* Boutons d'impression & export PDF du devis */}
                  <View style={styles.printActionRow}>
                    <TouchableOpacity
                      style={styles.printBtnPrimary}
                      onPress={handlePrintDevis}
                      disabled={isPrinting}
                      activeOpacity={0.85}
                    >
                      {isPrinting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="print" size={16} color="#FFFFFF" />
                          <Text style={styles.printBtnPrimaryText}>Imprimer le devis (A4)</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareBtnSecondary}
                      onPress={handleSharePdf}
                      disabled={isPrinting}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="document-text-outline" size={16} color="#1D6B45" />
                      <Text style={styles.shareBtnSecondaryText}>Exporter PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isTraiteur && (isEditingPrice || !isPriceSet) ? (
                /* Formulaire de chiffrage Traiteur avec configuration d'acompte (0% à 80%) */
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Tarif total de la prestation (€ TTC) * :</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="Ex: 1450"
                    placeholderTextColor="#94A3B8"
                    value={prixInput}
                    onChangeText={setPrixInput}
                  />

                  {Boolean(livePrixParPersonne) && (
                    <Text style={styles.helperText}>
                      Estimation : {livePrixParPersonne} € / personne pour {commande.nb_personnes} convives
                    </Text>
                  )}

                  {/* Sélection de la modalité d'acompte */}
                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                    Modalité de l'acompte de réservation :
                  </Text>
                  <View style={styles.optionRow}>
                    <TouchableOpacity
                      style={[
                        styles.optionPill,
                        acompteType === "obligatoire" && styles.optionPillActive,
                      ]}
                      onPress={() => {
                        setAcompteType("obligatoire");
                        if (!acomptePourcentStr || acomptePourcentStr === "0") {
                          setAcomptePourcentStr("30");
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          acompteType === "obligatoire" && styles.optionPillTextActive,
                        ]}
                      >
                        Obligatoire
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.optionPill,
                        acompteType === "optionnel" && styles.optionPillActive,
                      ]}
                      onPress={() => {
                        setAcompteType("optionnel");
                        if (!acomptePourcentStr || acomptePourcentStr === "0") {
                          setAcomptePourcentStr("30");
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          acompteType === "optionnel" && styles.optionPillTextActive,
                        ]}
                      >
                        Au choix client
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.optionPill,
                        acompteType === "aucun" && styles.optionPillActive,
                      ]}
                      onPress={() => {
                        setAcompteType("aucun");
                        setAcomptePourcentStr("0");
                      }}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          acompteType === "aucun" && styles.optionPillTextActive,
                        ]}
                      >
                        Aucun (0%)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Paramétrage du pourcentage libre (0 à 80%) si acompte activé */}
                  {acompteType !== "aucun" && (
                    <View style={styles.pourcentConfigBox}>
                      <Text style={styles.subInputLabel}>
                        Pourcentage d'acompte souhaité (0% à 80%) :
                      </Text>

                      {/* Raccourcis pourcentages courants */}
                      <View style={styles.presetChipsRow}>
                        {[10, 20, 30, 50].map((preset) => {
                          const isSelected = parsedPourcent === preset;
                          return (
                            <TouchableOpacity
                              key={preset}
                              style={[
                                styles.presetChip,
                                isSelected && styles.presetChipSelected,
                              ]}
                              onPress={() => setAcomptePourcentStr(String(preset))}
                            >
                              <Text
                                style={[
                                  styles.presetChipText,
                                  isSelected && styles.presetChipTextSelected,
                                ]}
                              >
                                {preset}%
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Champ de saisie personnalisée libre avec validation 0-80% */}
                      <View style={styles.customInputRow}>
                        <Text style={styles.customInputPrompt}>Taux personnalisé :</Text>
                        <View
                          style={[
                            styles.pourcentInputWrap,
                            (isPourcentNegative || isPourcentTooHigh) &&
                              styles.pourcentInputWrapError,
                          ]}
                        >
                          <TextInput
                            style={styles.pourcentTextInput}
                            keyboardType="numeric"
                            value={acomptePourcentStr}
                            onChangeText={(val) => {
                              const cleaned = val.replace(/[^0-9.]/g, "");
                              setAcomptePourcentStr(cleaned);
                            }}
                            placeholder="30"
                            placeholderTextColor="#94A3B8"
                            maxLength={5}
                          />
                          <View style={styles.pourcentSuffix}>
                            <Text style={styles.pourcentSuffixText}>%</Text>
                          </View>
                        </View>
                      </View>

                      {/* Alertes de validation en ligne */}
                      {(isPourcentNegative || isPourcentTooHigh) && (
                        <View style={styles.inlineWarningBox}>
                          <Ionicons name="alert-circle" size={15} color="#DC2626" />
                          <Text style={styles.inlineWarningText}>
                            {isPourcentTooHigh
                              ? "L'acompte ne peut pas dépasser 80% (sécurité Dabari)."
                              : "L'acompte ne peut pas être négatif (min. 0%)."}
                          </Text>
                        </View>
                      )}

                      {/* Calcul en direct de l'acompte et du solde (toujours stable pour éviter les sauts d'affichage) */}
                      {livePrixTotal > 0 && (
                        <View
                          style={[
                            styles.liveCalculCard,
                            !isPourcentValid && styles.liveCalculCardDisabled,
                          ]}
                        >
                          <View style={styles.liveCalculCol}>
                            <Text style={styles.liveCalculLabel}>
                              Acompte ({isPourcentValid ? `${effectivePourcent}%` : "Non valide"})
                            </Text>
                            <Text
                              style={[
                                styles.liveCalculValAcompte,
                                !isPourcentValid && styles.liveCalculValDisabled,
                              ]}
                            >
                              {isPourcentValid ? `${liveCalculatedAcompte.toFixed(2)} €` : "— €"}
                            </Text>
                            <Text style={styles.liveCalculSub}>
                              {isPourcentValid ? "Séquestre sécurisé" : "Max. 80% autorisé"}
                            </Text>
                          </View>
                          <View style={styles.liveCalculDivider} />
                          <View style={styles.liveCalculCol}>
                            <Text style={styles.liveCalculLabel}>Solde restant</Text>
                            <Text
                              style={[
                                styles.liveCalculValSolde,
                                !isPourcentValid && styles.liveCalculValDisabled,
                              ]}
                            >
                              {isPourcentValid ? `${liveSoldeRestant.toFixed(2)} €` : "— €"}
                            </Text>
                            <Text style={styles.liveCalculSub}>Payable le jour J</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Conditions spécifiques :</Text>
                  <TextInput
                    style={[styles.textInput, { height: 70, textAlignVertical: "top" }]}
                    multiline
                    value={conditionsTextInput}
                    onChangeText={setConditionsTextInput}
                    placeholder="Ex: Service inclus, vaisselle fournie..."
                    placeholderTextColor="#94A3B8"
                  />

                  {!isTraiteurSigned && (
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setAutoSignTraiteur(!autoSignTraiteur)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={autoSignTraiteur ? "checkbox" : "square-outline"}
                        size={20}
                        color={autoSignTraiteur ? "#1D6B45" : "#64748B"}
                      />
                      <Text style={styles.checkboxLabel}>
                        Apposer directement ma signature traiteur
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.actionRow}>
                    {isEditingPrice && isPriceSet && (
                      <TouchableOpacity
                        style={styles.cancelFormBtn}
                        onPress={() => setIsEditingPrice(false)}
                      >
                        <Text style={styles.cancelFormBtnText}>Annuler</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        { flex: 1 },
                        (isPourcentNegative || isPourcentTooHigh) && styles.primaryBtnDisabled,
                      ]}
                      onPress={handleSubmitPricing}
                      disabled={submitting || isPourcentNegative || isPourcentTooHigh}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          Transmettre la proposition au client
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.waitingQuoteBox}>
                  <Ionicons name="hourglass-outline" size={24} color="#D97706" />
                  <Text style={styles.waitingQuoteText}>
                    Le traiteur étudie actuellement votre demande. Le montant et les conditions apparaîtront ici dès validation.
                  </Text>
                </View>
              )}
            </View>

            {/* Signatures Électroniques */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Signatures Électroniques</Text>

              <View style={styles.signatureRow}>
                {/* Traiteur */}
                <View style={styles.sigCard}>
                  <Text style={styles.sigTitle}>Traiteur</Text>
                  {commande.traiteur_signed_at ? (
                    <View style={styles.signedContent}>
                      <Ionicons name="checkmark-done-circle" size={20} color="#15803D" />
                      <Text style={styles.sigName}>
                        {commande.traiteur_signature || commande.traiteur?.name || "Signé"}
                      </Text>
                      <Text style={styles.sigDate}>
                        Le {new Date(commande.traiteur_signed_at).toLocaleDateString("fr-FR")}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.pendingSig}>
                      <Ionicons name="time-outline" size={18} color="#D97706" />
                      <Text style={styles.pendingSigText}>En attente de signature</Text>
                    </View>
                  )}
                </View>

                {/* Client */}
                <View style={styles.sigCard}>
                  <Text style={styles.sigTitle}>Client</Text>
                  {commande.client_signed_at ? (
                    <View style={styles.signedContent}>
                      <Ionicons name="checkmark-done-circle" size={20} color="#15803D" />
                      <Text style={styles.sigName}>
                        {commande.client_signature || commande.client?.full_name || "Signé"}
                      </Text>
                      <Text style={styles.sigDate}>
                        Le {new Date(commande.client_signed_at).toLocaleDateString("fr-FR")}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.pendingSig}>
                      <Ionicons name="time-outline" size={18} color="#D97706" />
                      <Text style={styles.pendingSigText}>En attente de signature</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Formulaire de signature si requis */}
              {isPriceSet &&
                !isRefused &&
                ((isClient && !isClientSigned) || (isTraiteur && !isTraiteurSigned)) && (
                  <View style={styles.signatureFormBox}>
                    <Text style={styles.sigFormTitle}>
                      Apposer votre signature ({isClient ? "Client" : "Traiteur"})
                    </Text>

                    <Text style={styles.inputLabel}>Votre prénom et nom complet :</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ex: Aminata Diallo"
                      placeholderTextColor="#94A3B8"
                      value={signerName}
                      onChangeText={setSignerName}
                    />

                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setAgreedTerms(!agreedTerms)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={agreedTerms ? "checkbox" : "square-outline"}
                        size={20}
                        color={agreedTerms ? "#1D6B45" : "#64748B"}
                      />
                      <Text style={styles.checkboxLabel}>
                        J'ai lu et j'accepte le montant et les conditions de ce devis.
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryBtn, { marginTop: 10 }]}
                      onPress={handleSign}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          Signer électroniquement le devis
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
            </View>

            {/* Actions Client : Acompte & Refus */}
            {isClient && isPriceSet && !isRefused && (
              <View style={styles.clientActionsContainer}>
                {displayAcompteMontant > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.depositBtn,
                      isDepositPaid && styles.depositBtnPaid,
                    ]}
                    onPress={() => setShowAcompteModal(true)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.btnRow}>
                      <Ionicons
                        name={isDepositPaid ? "shield-checkmark" : "lock-closed"}
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.depositBtnText}>
                        {isDepositPaid
                          ? `Acompte de ${displayAcompteMontant.toFixed(2)} € consigné sous séquestre`
                          : `Régler l'acompte de ${displayAcompteMontant.toFixed(2)} € (Séquestre Dabari)`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {!isFullySigned && (
                  <TouchableOpacity
                    style={styles.refuseQuoteBtn}
                    onPress={() => setShowRefusalModal(true)}
                  >
                    <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
                    <Text style={styles.refuseQuoteBtnText}>Décliner cette proposition</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Lien vers les CGU officielles */}
            <TouchableOpacity
              style={styles.cguLinkBtn}
              onPress={() => {
                onClose();
                router.push("/cgu" as any);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={14} color="#1D6B45" />
              <Text style={styles.cguLinkBtnText}>
                Consulter les Conditions Générales d&apos;Utilisation (CGU)
              </Text>
            </TouchableOpacity>

            {/* Contact WhatsApp Direct */}
            <TouchableOpacity
              style={styles.waBtn}
              activeOpacity={0.85}
              onPress={() => {
                const phone = isClient
                  ? commande.traiteur?.whatsapp
                  : commande.client?.phone;
                if (!phone) {
                  Alert.alert("WhatsApp", "Numéro de téléphone non renseigné.");
                  return;
                }
                const cleanPhone = phone.replace(/\D/g, "");
                Linking.openURL(
                  `https://wa.me/${cleanPhone}?text=Bonjour, je fais suite au devis ${devisRef} sur Dabari.`
                );
              }}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              <Text style={styles.waBtnText}>Échanger directement sur WhatsApp</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

          {/* Modal Refus */}
          {showRefusalModal && (
            <View style={styles.refusalModalOverlay}>
              <View style={styles.refusalModalCard}>
                <Text style={styles.refusalTitle}>Motif de refus du devis</Text>
                <Text style={styles.refusalSubtitle}>
                  Veuillez préciser la raison (tarif, indisponibilité de date, menu, etc.) :
                </Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                  multiline
                  placeholder="Expliquez la raison..."
                  placeholderTextColor="#94A3B8"
                  value={refusalMotif}
                  onChangeText={setRefusalMotif}
                />
                <View style={styles.refusalActionRow}>
                  <TouchableOpacity
                    style={styles.cancelFormBtn}
                    onPress={() => setShowRefusalModal(false)}
                  >
                    <Text style={styles.cancelFormBtnText}>Retour</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmRefusalBtn}
                    onPress={handleRefuse}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.confirmRefusalBtnText}>Confirmer le refus</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Modal Règlement Acompte Séquestré */}
          {showAcompteModal && (
            <View style={styles.refusalModalOverlay}>
              <View style={styles.acompteModalCard}>
                <View style={styles.acompteModalHeader}>
                  <View
                    style={[
                      styles.acompteShieldCircle,
                      isDepositPaid && styles.acompteShieldCirclePaid,
                    ]}
                  >
                    <Ionicons
                      name={isDepositPaid ? "shield-checkmark" : "shield-half"}
                      size={22}
                      color={isDepositPaid ? "#166534" : "#1D6B45"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.acompteModalTitle}>
                      {isDepositPaid ? "Acompte Réglé & Séquestré" : "Règlement de l'Acompte"}
                    </Text>
                    <Text style={styles.acompteModalSub}>
                      Garantie transactionnelle Dabari SAS
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowAcompteModal(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.acompteAmountHero}>
                  <Text style={styles.acompteAmountLabel}>Montant de l'acompte</Text>
                  <Text style={styles.acompteAmountVal}>
                    {displayAcompteMontant.toFixed(2)} €
                  </Text>
                  <Text style={styles.acompteAmountSub}>
                    Total TTC : {totalPrix.toFixed(2)} € • Solde le jour J : {displaySoldeRestant.toFixed(2)} €
                  </Text>
                </View>

                {isDepositPaid ? (
                  <View style={styles.acompteDetailsBox}>
                    <View style={styles.paidBadgeBanner}>
                      <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                      <Text style={styles.paidBadgeText}>
                        Acompte consigné sous séquestre sécurisé
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Référence :</Text>
                      <Text style={styles.detailRowVal}>
                        {parsedMeta.acompte_transaction_ref || devisRef}
                      </Text>
                    </View>

                    {Boolean(parsedMeta.acompte_paye_at) && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowLabel}>Date :</Text>
                        <Text style={styles.detailRowVal}>
                          {new Date(parsedMeta.acompte_paye_at!).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.escrowNotice}>
                      Vos fonds sont sécurisés sous séquestre Dabari SAS. Le traiteur est notifié et votre réservation est garantie. Le solde sera libéré après exécution du service.
                    </Text>

                    <View style={styles.acompteModalActionsRow}>
                      <TouchableOpacity
                        style={styles.closeAcompteBtn}
                        onPress={() => setShowAcompteModal(false)}
                      >
                        <Text style={styles.closeAcompteBtnText}>Fermer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.resetBtnDiscreet}
                        onPress={() => handleAcompteAction("annuler_reglement")}
                        disabled={payingAcompte}
                      >
                        <Text style={styles.resetBtnDiscreetText}>
                          Remettre en attente (Test / Démo)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.acompteFormBox}>
                    <Text style={styles.simulateMethodLabel}>
                      Mode de versement (Simulation) :
                    </Text>
                    <View style={styles.simulateMethodsRow}>
                      <TouchableOpacity
                        style={[
                          styles.simulateMethodPill,
                          acompteModeSimule === "cb" && styles.simulateMethodPillActive,
                        ]}
                        onPress={() => setAcompteModeSimule("cb")}
                      >
                        <Ionicons
                          name="card-outline"
                          size={14}
                          color={acompteModeSimule === "cb" ? "#1D6B45" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.simulateMethodPillText,
                            acompteModeSimule === "cb" && styles.simulateMethodPillTextActive,
                          ]}
                        >
                          Carte Bancaire
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.simulateMethodPill,
                          acompteModeSimule === "virement" && styles.simulateMethodPillActive,
                        ]}
                        onPress={() => setAcompteModeSimule("virement")}
                      >
                        <Ionicons
                          name="swap-horizontal-outline"
                          size={14}
                          color={acompteModeSimule === "virement" ? "#1D6B45" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.simulateMethodPillText,
                            acompteModeSimule === "virement" && styles.simulateMethodPillTextActive,
                          ]}
                        >
                          Virement
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.simulateMethodPill,
                          acompteModeSimule === "especes" && styles.simulateMethodPillActive,
                        ]}
                        onPress={() => setAcompteModeSimule("especes")}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={14}
                          color={acompteModeSimule === "especes" ? "#1D6B45" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.simulateMethodPillText,
                            acompteModeSimule === "especes" && styles.simulateMethodPillTextActive,
                          ]}
                        >
                          Espèces
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.escrowNotice}>
                      Séquestre Dabari SAS : l'acompte valide la réservation du traiteur tout en protégeant vos fonds jusqu'au jour de l'événement.
                    </Text>

                    <TouchableOpacity
                      style={styles.confirmAcomptePayBtn}
                      onPress={() => handleAcompteAction("verser")}
                      disabled={payingAcompte}
                      activeOpacity={0.85}
                    >
                      {payingAcompte ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="shield-checkmark" size={17} color="#FFFFFF" />
                          <Text style={styles.confirmAcomptePayBtnText}>
                            Valider l'acompte ({displayAcompteMontant.toFixed(2)} €)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {parsedMeta.acompte_type === "optionnel" && (
                      <TouchableOpacity
                        style={styles.payDayOfEventBtn}
                        onPress={() => handleAcompteAction("refuser_acompte")}
                        disabled={payingAcompte}
                      >
                        <Text style={styles.payDayOfEventBtnText}>
                          Choisir de régler la totalité le jour J (Sans acompte)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    flex: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(29, 107, 69, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRef: {
    fontSize: 11,
    fontWeight: "700",
    color: "#34D399",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeSuccess: { backgroundColor: "#DCFCE7" },
  badgeSuccessText: { color: "#166534", fontSize: 11, fontWeight: "700" },
  badgeDanger: { backgroundColor: "#FEE2E2" },
  badgeDangerText: { color: "#991B1B", fontSize: 11, fontWeight: "700" },
  badgePrimary: { backgroundColor: "#DBEAFE" },
  badgePrimaryText: { color: "#1E40AF", fontSize: 11, fontWeight: "700" },
  badgeWarning: { backgroundColor: "#FEF9C3" },
  badgeWarningText: { color: "#854D0E", fontSize: 11, fontWeight: "700" },
  sequestrePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
  },
  sequestrePillText: {
    color: "#065F46",
    fontSize: 10,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderWithAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  editPriceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
  },
  editPriceBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "700",
  },
  priceHighlightBox: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginVertical: 4,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
    textTransform: "uppercase",
  },
  priceBig: {
    fontSize: 26,
    fontWeight: "900",
    color: "#166534",
    marginVertical: 2,
  },
  pricePerPerson: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "600",
  },
  acompteGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  acompteCol: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  acompteColLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  acompteColValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 2,
  },
  acompteStatutText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  noAcompteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  noAcompteText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  printActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  printBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1D6B45",
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  printBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  shareBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  shareBtnSecondaryText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
  },
  textSuccess: { color: "#166534" },
  textWarning: { color: "#B45309" },
  formContainer: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  subInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  helperText: {
    fontSize: 11,
    color: "#1D6B45",
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    gap: 6,
  },
  optionPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  optionPillActive: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  optionPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  optionPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pourcentConfigBox: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  presetChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  presetChipSelected: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  presetChipTextSelected: {
    color: "#166534",
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  customInputPrompt: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  pourcentInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: 125,
    height: 44,
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderWidth: 1.5,
    borderRadius: 10,
    overflow: "hidden",
  },
  pourcentInputWrapError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  pourcentTextInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    color: "#0F172A",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  pourcentSuffix: {
    height: 44,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderColor: "#E2E8F0",
  },
  pourcentSuffixText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
  },
  inlineWarningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  inlineWarningText: {
    fontSize: 11,
    color: "#B91C1C",
    fontWeight: "700",
    flex: 1,
  },
  liveCalculCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderColor: "#BBF7D0",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  liveCalculCardDisabled: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F1F5F9",
  },
  liveCalculCol: {
    flex: 1,
    alignItems: "center",
  },
  liveCalculDivider: {
    width: 1,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 8,
  },
  liveCalculLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  liveCalculValAcompte: {
    fontSize: 16,
    fontWeight: "900",
    color: "#166534",
    marginVertical: 2,
  },
  liveCalculValSolde: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginVertical: 2,
  },
  liveCalculValDisabled: {
    color: "#94A3B8",
  },
  liveCalculSub: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "600",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 6,
  },
  checkboxLabel: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  cancelFormBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelFormBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  primaryBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  waitingQuoteBox: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  waitingQuoteText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 10,
  },
  sigCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sigTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  signedContent: {
    gap: 2,
  },
  sigName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  sigDate: {
    fontSize: 10,
    color: "#64748B",
  },
  pendingSig: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pendingSigText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
  },
  signatureFormBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  sigFormTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  clientActionsContainer: {
    gap: 8,
  },
  depositBtn: {
    backgroundColor: "#166534",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  depositBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  refuseQuoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  refuseQuoteBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  cguLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  cguLinkBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
  },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: 12,
    paddingVertical: 12,
  },
  waBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  refusalModalOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    padding: 20,
  },
  refusalModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  refusalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
  },
  refusalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  refusalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  confirmRefusalBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmRefusalBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  acompteColInteractive: {
    borderColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
  },
  acompteColPaid: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  acompteHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  depositBtnPaid: {
    backgroundColor: "#0F766E",
  },
  acompteModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 14,
    maxHeight: "90%",
  },
  acompteModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  acompteShieldCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  acompteShieldCirclePaid: {
    backgroundColor: "#BBF7D0",
  },
  acompteModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  acompteModalSub: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  acompteAmountHero: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  acompteAmountLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  acompteAmountVal: {
    fontSize: 26,
    fontWeight: "900",
    color: "#166534",
  },
  acompteAmountSub: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  acompteDetailsBox: {
    gap: 10,
  },
  paidBadgeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  detailRowLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  detailRowVal: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "800",
  },
  escrowNotice: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 10,
  },
  acompteModalActionsRow: {
    gap: 8,
    marginTop: 6,
  },
  closeAcompteBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeAcompteBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  resetBtnDiscreet: {
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnDiscreetText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  acompteFormBox: {
    gap: 12,
  },
  simulateMethodLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  simulateMethodsRow: {
    flexDirection: "row",
    gap: 8,
  },
  simulateMethodPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  simulateMethodPillActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#166534",
  },
  simulateMethodPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  simulateMethodPillTextActive: {
    color: "#166534",
  },
  confirmAcomptePayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#166534",
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmAcomptePayBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  payDayOfEventBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  payDayOfEventBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
});
