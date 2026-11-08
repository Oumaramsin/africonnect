import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
  Keyboard,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getApiErrorMessage, getErrorMessage } from "../../utils/api";
import { goBackOr } from "../../utils/navigation";
import AppKeyboardScrollView from "../../components/AppKeyboardScrollView";
import NegociationThread from "../../components/NegociationThread";
import { OPEN_DEVIS_EVENT } from "../../utils/appEvents";
import { formatEuros, getNegociation } from "../../utils/negociation";
import type { TraiteurProposal, TraiteurRequest } from "../../utils/types/traiteur";

/*
 * Acceptation d'une offre de traiteur : accepter, c'est signer le devis proposé (prix, acompte,
 * contenu). Le devis créé est alors signé par les deux parties (le traiteur a signé en envoyant son
 * offre) et la prestation confirmée. Écran plein : le clavier ne fait pas perdre la saisie.
 * Seuls les identifiants passent par la navigation : l'offre affichée est relue auprès de l'API.
 */

type Loaded = { request: TraiteurRequest; proposal: TraiteurProposal };

// Écran ouvert directement (lien, notification) : retour vers « Mes annonces »
const BACK_HREF = { pathname: "/commandes", params: { tab: "traiteur", sub: "mes_demandes" } } as const;

const SIGNATURE_MAX_LENGTH = 120;

const formatDate = (value?: string | null, withTime = false): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return withTime
    ? `${day} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : day;
};

/** Conditions d'acompte de l'offre (JSON) ; les anciennes offres n'en ont pas : valeurs par défaut. */
const parseConditions = (raw: string | null | undefined, price: number) => {
  let type: "aucun" | "optionnel" | "obligatoire" = "optionnel";
  let pourcentage = 30;
  if (raw) {
    try {
      const json = JSON.parse(raw);
      if (json.acompte_type === "aucun" || json.acompte_type === "optionnel" || json.acompte_type === "obligatoire") {
        type = json.acompte_type;
      }
      if (typeof json.acompte_pourcentage === "number") pourcentage = json.acompte_pourcentage;
    } catch {
      // Conditions illisibles : valeurs par défaut
    }
  }
  if (type === "aucun") pourcentage = 0;
  return { type, pourcentage, montant: Math.round(price * pourcentage) / 100 };
};

export default function AccepterOffreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string; proposalId?: string }>();
  const requestId = typeof params.requestId === "string" ? params.requestId : "";
  const proposalId = typeof params.proposalId === "string" ? params.proposalId : "";

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Verrou synchrone contre le double envoi
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    if (!requestId || !proposalId) {
      setLoadError("Cette offre est introuvable. Revenez à vos commandes pour la rouvrir.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch(`/traiteur/requests/${encodeURIComponent(requestId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(getApiErrorMessage(data, "Impossible de charger cette offre."));
        return;
      }
      const request: TraiteurRequest | undefined = data?.data?.request;
      const proposal = request?.proposals?.find((item) => item.id === proposalId);
      if (!request || !proposal) {
        setLoadError("Cette offre est introuvable. Revenez à vos commandes pour la rouvrir.");
        return;
      }
      setLoaded({ request, proposal });
    } catch (e) {
      setLoadError(getErrorMessage(e, "Impossible de charger cette offre."));
    } finally {
      setLoading(false);
    }
  }, [requestId, proposalId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !loaded) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.centered} edges={["top"]}>
          <StatusBar barStyle="light-content" />
          <ActivityIndicator size="large" color="#FFFFFF" />
        </SafeAreaView>
      </View>
    );
  }

  if (!loaded) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.centered} edges={["top"]}>
          <StatusBar barStyle="light-content" />
          <Ionicons name="alert-circle-outline" size={40} color="#FFFFFF" />
          <Text style={styles.centeredText}>{loadError}</Text>
          <View style={styles.centeredActions}>
            <TouchableOpacity style={styles.centeredBtn} onPress={() => void load()} activeOpacity={0.85}>
              <Text style={styles.centeredBtnText}>Réessayer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.centeredBtnGhost} onPress={() => goBackOr(BACK_HREF)} activeOpacity={0.85}>
              <Text style={styles.centeredBtnGhostText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const { proposal, request } = loaded;
  const price = Number(proposal.proposed_price);
  const conditions = parseConditions(proposal.conditions_devis, price);
  const traiteurName = proposal.traiteur?.name || "Le traiteur";
  const traiteurSigned = Boolean(proposal.traiteur_signature && proposal.traiteur_signed_at);
  const offerOpen = request.status === "open" && proposal.status === "pending";
  const signatureValid = signature.trim().length >= 2 && signature.trim().length <= SIGNATURE_MAX_LENGTH;
  const isFormValid = offerOpen && signatureValid && agreed;

  const acompteText =
    conditions.type === "aucun"
      ? "Sans acompte : tout se règle le jour de l'événement."
      : `${conditions.type === "obligatoire" ? "Acompte obligatoire" : "Acompte facultatif"} de ${conditions.pourcentage} %, soit ${formatEuros(conditions.montant)}.`;

  const handleAccept = async () => {
    if (!isFormValid || submittingRef.current) return;
    Keyboard.dismiss();
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    let navigating = false;
    try {
      const res = await apiFetch(`/traiteur/proposals/${encodeURIComponent(proposal.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "acceptee",
          client_signature: signature.trim(),
          // Le client s'engage sur le montant et la version du devis qu'il a lus : refusé si le
          // traiteur a envoyé un nouveau devis entre-temps (même au même prix)
          prix_devis_attendu: price,
          devis_signe_le: proposal.traiteur_signed_at ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(getApiErrorMessage(data, "Impossible d'accepter cette offre. Réessayez."));
        // Offre modifiée entre-temps (nouveau devis) : elle est relue et l'accord doit être redonné
        if (res.status === 409) {
          setAgreed(false);
          void load();
        }
        return;
      }
      const commandeId = typeof data?.data?.commande_id === "string" ? data.data.commande_id : null;
      navigating = true;
      if (router.canGoBack()) {
        router.back();
        // L'écran des commandes ouvre le devis signé (acompte, impression, PDF)
        if (commandeId) setTimeout(() => DeviceEventEmitter.emit(OPEN_DEVIS_EVENT, commandeId), 250);
      } else {
        // Écran ouvert directement : les commandes s'ouvrent sur le devis signé
        router.replace(
          commandeId ? { pathname: "/commandes", params: { tab: "traiteur", commande_id: commandeId } } : BACK_HREF,
        );
      }
    } catch (e) {
      setError(getErrorMessage(e, "Impossible d'accepter cette offre. Réessayez."));
    } finally {
      submittingRef.current = false;
      if (!navigating) setSubmitting(false);
    }
  };

  const eventDate = formatDate(request.event_date);

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => goBackOr(BACK_HREF)} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Mes annonces</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Signer le devis</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {request.title || `Événement ${request.event_type || ""}`.trim()}
          </Text>
        </View>

        <AppKeyboardScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Le devis proposé */}
          <View style={styles.card}>
            <View style={styles.traiteurRow}>
              {proposal.traiteur?.image_url ? (
                <Image source={{ uri: proposal.traiteur.image_url }} style={styles.traiteurImage} />
              ) : (
                <View style={[styles.traiteurImage, styles.traiteurImagePlaceholder]}>
                  <Ionicons name="restaurant" size={18} color="#1D6B45" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.traiteurName}>{traiteurName}</Text>
                <Text style={styles.mutedText}>Devis proposé pour votre événement</Text>
              </View>
            </View>

            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>MONTANT TOTAL TTC</Text>
              <Text style={styles.priceValue}>{formatEuros(price)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="wallet-outline" size={15} color="#1D6B45" />
              <Text style={styles.infoText}>{acompteText}</Text>
            </View>
            {eventDate && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={15} color="#1D6B45" />
                <Text style={styles.infoText}>{eventDate}</Text>
              </View>
            )}
            {Boolean(request.guest_count) && (
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={15} color="#1D6B45" />
                <Text style={styles.infoText}>{request.guest_count} invités</Text>
              </View>
            )}
            {Boolean(request.location) && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={15} color="#1D6B45" />
                <Text style={styles.infoText}>{request.location}</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Contenu de l&apos;offre</Text>
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{proposal.message}</Text>
            </View>

            <NegociationThread
              entries={getNegociation(proposal.negociation)}
              viewer="client"
              traiteurName={proposal.traiteur?.name}
            />

            <View style={[styles.signedBadge, !traiteurSigned && styles.unsignedBadge]}>
              <Ionicons
                name={traiteurSigned ? "checkmark-circle" : "time-outline"}
                size={16}
                color={traiteurSigned ? "#15803D" : "#B45309"}
              />
              <Text style={[styles.signedText, !traiteurSigned && styles.unsignedText]}>
                {traiteurSigned
                  ? `Signé par ${proposal.traiteur_signature} le ${formatDate(proposal.traiteur_signed_at, true)}`
                  : "Offre non signée par le traiteur : il signera le devis après votre acceptation."}
              </Text>
            </View>
            <Text style={styles.paymentNote}>
              L&apos;acompte et le solde se règlent directement au traiteur : Dabari ne perçoit aucun fonds.
            </Text>
          </View>

          {!offerOpen ? (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#1D4ED8" />
              <Text style={styles.infoBoxText}>
                Cette offre n&apos;est plus en attente : elle a été acceptée ou déclinée, ou l&apos;annonce est close.
              </Text>
            </View>
          ) : (
            /* Signature du client */
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Votre signature</Text>
              <Text style={styles.label}>
                Prénom et nom <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex : Aminata Diallo"
                placeholderTextColor="#94A3B8"
                value={signature}
                onChangeText={setSignature}
                maxLength={SIGNATURE_MAX_LENGTH}
                autoCapitalize="words"
                editable={!submitting}
              />
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreed((value) => !value)}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <Ionicons name={agreed ? "checkbox" : "square-outline"} size={20} color={agreed ? "#1D6B45" : "#64748B"} />
                <Text style={styles.checkboxLabel}>
                  J&apos;ai lu ce devis et j&apos;en accepte le prix et les conditions. Ma signature vaut accord et
                  confirme la prestation ; les autres offres reçues ne seront pas retenues.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {loadError && (
            <View style={styles.errorBox}>
              <Ionicons name="cloud-offline-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{loadError}</Text>
            </View>
          )}

          {offerOpen && (
            <>
              <TouchableOpacity
                style={[styles.submitBtn, (!isFormValid || submitting) && styles.submitBtnDisabled]}
                onPress={handleAccept}
                disabled={!isFormValid || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="create-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Signer et accepter le devis</Text>
                  </>
                )}
              </TouchableOpacity>
              {!isFormValid && (
                <Text style={styles.missingHint}>
                  {!signatureValid ? "Saisissez votre prénom et nom pour signer." : "Cochez la case pour confirmer votre accord."}
                </Text>
              )}
            </>
          )}
        </AppKeyboardScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topGreenWrapper: { flex: 1, backgroundColor: "#165034" },
  container: { flex: 1, backgroundColor: "#165034" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  centeredText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", textAlign: "center" },
  centeredActions: { flexDirection: "row", gap: 10 },
  centeredBtn: { backgroundColor: "#FFFFFF", paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12 },
  centeredBtnText: { color: "#165034", fontWeight: "800", fontSize: 13 },
  centeredBtnGhost: {
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  centeredBtnGhostText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16, gap: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingVertical: 4 },
  backBtnText: { color: "rgba(255, 255, 255, 0.85)", fontSize: 12, fontWeight: "600" },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", marginTop: 6 },
  headerSubtitle: { color: "rgba(255, 255, 255, 0.8)", fontSize: 13, fontWeight: "600" },
  body: { flex: 1, backgroundColor: "#F8FAFC", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bodyContent: { padding: 16, paddingBottom: 48, gap: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  traiteurRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  traiteurImage: { width: 44, height: 44, borderRadius: 12 },
  traiteurImagePlaceholder: { backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  traiteurName: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  mutedText: { fontSize: 12, color: "#64748B" },
  priceBox: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  priceLabel: { fontSize: 11, fontWeight: "800", color: "#15803D", letterSpacing: 0.6 },
  priceValue: { fontSize: 26, fontWeight: "900", color: "#166534", marginTop: 2 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { flex: 1, fontSize: 13, color: "#334155", fontWeight: "600", lineHeight: 18 },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: "#334155", marginTop: 6 },
  messageBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  messageText: { fontSize: 13, color: "#334155", lineHeight: 19 },
  signedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  unsignedBadge: { backgroundColor: "#FFFBEB" },
  signedText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#15803D", lineHeight: 17 },
  unsignedText: { color: "#B45309" },
  paymentNote: { fontSize: 11.5, color: "#64748B", lineHeight: 16 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  infoBoxText: { flex: 1, fontSize: 13, color: "#1E3A8A", fontWeight: "600", lineHeight: 18 },
  label: { fontSize: 12, fontWeight: "800", color: "#334155" },
  required: { color: "#EF4444" },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 6 },
  checkboxLabel: { flex: 1, fontSize: 12.5, color: "#334155", lineHeight: 18 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 12.5, color: "#B91C1C", fontWeight: "600", lineHeight: 17 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1D6B45",
    paddingVertical: 14,
    borderRadius: 16,
  },
  submitBtnDisabled: { backgroundColor: "#CBD5E1" },
  submitBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  missingHint: { textAlign: "center", fontSize: 12, color: "#64748B", fontWeight: "600" },
});
