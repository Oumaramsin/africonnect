import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
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
import OrderEditModal, { DetailRowItem } from "../../components/OrderEditModal";
import { PROPOSALS_UPDATED_EVENT } from "../../utils/appEvents";
import type { TraiteurProposal, TraiteurRequest } from "../../utils/types/traiteur";
import {
  NEGOCIATION_MESSAGE_MAX_LENGTH,
  formatEuros,
  getNegociation,
  hasPendingCounterOffer,
  lastCounterOffer,
} from "../../utils/negociation";

/*
 * Réponse du traiteur à une contre-proposition du client : maintenir son devis (message facultatif,
 * par exemple « mon prix est ferme ») ou signer un nouveau devis (écran « Proposer un devis » en mode
 * nouveau devis). Seul l'identifiant de l'annonce passe par la navigation : tout est relu auprès de l'API.
 */

type Loaded = { request: TraiteurRequest; proposal: TraiteurProposal | null };

// Écran ouvert directement (lien, notification) : retour vers les annonces
const BACK_HREF = { pathname: "/traiteur", params: { tab: "demandes" } } as const;

const formatEventDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

export default function NegociationTraiteurScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = typeof params.requestId === "string" ? params.requestId : "";

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Verrou synchrone contre le double envoi
  const sendingRef = useRef(false);

  const load = useCallback(async () => {
    if (!requestId) {
      setLoadError("Cette annonce est introuvable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res, meRes] = await Promise.all([
        apiFetch(`/traiteur/requests/${encodeURIComponent(requestId)}`),
        apiFetch("/traiteur/me"),
      ]);
      const data = await res.json().catch(() => ({}));
      const me = await meRes.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(getApiErrorMessage(data, "Impossible de charger cette annonce."));
        return;
      }
      const request: TraiteurRequest | undefined = data?.data?.request;
      if (!request) {
        setLoadError("Cette annonce est introuvable.");
        return;
      }
      // Offre de ce traiteur (un administrateur reçoit toutes les offres de l'annonce)
      const ownTraiteurId: unknown = me?.traiteur?.id;
      setLoaded({
        request,
        proposal:
          typeof ownTraiteurId === "string"
            ? (request.proposals?.find((p) => p.traiteur_id === ownTraiteurId) ?? null)
            : null,
      });
    } catch (e) {
      setLoadError(getErrorMessage(e, "Impossible de charger cette annonce."));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

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

  const { request, proposal } = loaded;
  const entries = getNegociation(proposal?.negociation);
  const counter = lastCounterOffer(entries);
  const currentPrice = Number(proposal?.proposed_price ?? 0);
  const eventDate = formatEventDate(request.event_date);

  // Situation de l'offre : seule une contre-proposition en attente appelle une réponse
  const stateText = !proposal
    ? "Vous n'avez pas envoyé de devis pour cette annonce."
    : proposal.status === "accepted"
      ? "Le client a signé votre devis : retrouvez-le dans vos commandes reçues."
      : proposal.status === "rejected"
        ? "Le client a décliné votre devis."
        : request.status !== "open"
          ? "Cette annonce est close : la négociation est terminée."
          : !hasPendingCounterOffer(entries)
            ? "Aucune contre-proposition n'attend votre réponse : le client peut signer votre devis actuel."
            : null;
  const canAnswer = !stateText && Boolean(proposal && counter);
  const trimmedMessage = message.trim();

  const details: DetailRowItem[] = [
    { icon: "pricetag-outline", label: "Votre devis maintenu", value: formatEuros(currentPrice), isHighlight: true },
    ...(counter ? [{ icon: "cash-outline" as const, label: "Prix proposé par le client", value: formatEuros(counter.prix) }] : []),
    ...(trimmedMessage
      ? [
          {
            icon: "chatbubble-ellipses-outline" as const,
            label: "Votre message",
            value: trimmedMessage.length > 140 ? `${trimmedMessage.slice(0, 139)}…` : trimmedMessage,
          },
        ]
      : []),
  ];

  const openConfirm = () => {
    if (!canAnswer || sendingRef.current) return;
    Keyboard.dismiss();
    setError(null);
    setConfirming(true);
  };

  const handleKeepPrice = async () => {
    if (!proposal || !canAnswer || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch(`/traiteur/proposals/${encodeURIComponent(proposal.id)}/prix-maintenu`, {
        method: "POST",
        body: JSON.stringify({ message: trimmedMessage || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfirming(false);
        setError(getApiErrorMessage(data, "Impossible d'envoyer votre réponse. Réessayez."));
        if (res.status === 409) void load();
        return;
      }
      DeviceEventEmitter.emit(PROPOSALS_UPDATED_EVENT);
      setSent(true);
      setConfirming(false);
    } catch (e) {
      setConfirming(false);
      setError(getErrorMessage(e, "Impossible d'envoyer votre réponse. Réessayez."));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  // Nouveau devis signé : l'écran de proposition relit l'offre et la contre-proposition
  const openNewDevis = () => {
    router.replace({
      pathname: "/traiteur/proposer" as any,
      params: { requestId: request.id, revise: "1" },
    });
  };

  const closeAfterSuccess = () => {
    setSent(false);
    goBackOr(BACK_HREF);
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => goBackOr(BACK_HREF)} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Annonces</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contre-proposition</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {request.title || `Événement ${request.event_type || ""}`.trim()}
            {eventDate ? ` · ${eventDate}` : ""}
          </Text>
        </View>

        <AppKeyboardScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* L'offre et la négociation */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Votre devis</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceCol}>
                <Text style={styles.priceLabel}>VOTRE PRIX</Text>
                <Text style={styles.priceValue}>{proposal ? formatEuros(currentPrice) : "—"}</Text>
              </View>
              {counter && (
                <View style={[styles.priceCol, styles.priceColCounter]}>
                  <Text style={[styles.priceLabel, styles.priceLabelCounter]}>PRIX DU CLIENT</Text>
                  <Text style={[styles.priceValue, styles.priceValueCounter]}>{formatEuros(counter.prix)}</Text>
                </View>
              )}
            </View>
            {request.client?.full_name ? (
              <Text style={styles.mutedText}>Client : {request.client.full_name}</Text>
            ) : null}
            <NegociationThread entries={entries} viewer="traiteur" />
          </View>

          {stateText ? (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#1D4ED8" />
              <Text style={styles.infoText}>{stateText}</Text>
            </View>
          ) : (
            <>
              {/* Option 1 : maintenir le prix */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Maintenir mon prix</Text>
                <Text style={styles.hint}>
                  Votre devis signé reste valable tel quel. Expliquez au client pourquoi, s&apos;il le faut.
                </Text>
                <Text style={[styles.label, styles.labelSpaced]}>Message au client (facultatif)</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  multiline
                  placeholder="Ex : Mon prix est ferme : il comprend le service, la vaisselle et le transport."
                  placeholderTextColor="#94A3B8"
                  value={message}
                  onChangeText={setMessage}
                  maxLength={NEGOCIATION_MESSAGE_MAX_LENGTH}
                  editable={!sending}
                />
                <Text style={styles.counter}>
                  {message.length}/{NEGOCIATION_MESSAGE_MAX_LENGTH}
                </Text>
                <TouchableOpacity
                  style={[styles.submitBtn, sending && styles.submitBtnDisabled]}
                  onPress={openConfirm}
                  disabled={sending}
                  activeOpacity={0.85}
                >
                  {sending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="lock-closed-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Maintenir mon prix de {formatEuros(currentPrice)}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Option 2 : nouveau devis signé */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Faire un nouveau devis</Text>
                <Text style={styles.hint}>
                  Ajustez votre tarif, votre acompte ou le contenu de l&apos;offre : vous signerez un nouveau
                  devis qui remplacera le précédent. Le client pourra le signer ou le décliner.
                </Text>
                <TouchableOpacity
                  style={[styles.secondaryBtn, sending && styles.secondaryBtnDisabled]}
                  onPress={openNewDevis}
                  disabled={sending}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={16} color="#1D6B45" />
                  <Text style={styles.secondaryBtnText}>Faire un nouveau devis</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </AppKeyboardScrollView>

        <OrderEditModal
          visible={confirming || sent}
          type={sent ? "success" : "confirm"}
          service="devis"
          title={sent ? "Réponse envoyée !" : "Maintenir votre prix ?"}
          subtitle={
            sent
              ? "Le client est prévenu : il peut signer votre devis ou le décliner."
              : "Votre devis signé reste valable tel quel. Le client sera prévenu de votre réponse."
          }
          detailsTitle="VOTRE RÉPONSE"
          details={details}
          noticeText={
            sent
              ? "Vous serez notifié dès que le client aura répondu."
              : "Le client pourra signer ce devis, le décliner ou, s'il le peut encore, proposer un autre prix."
          }
          confirmLabel={sent ? "Fermer" : "Oui, maintenir mon prix"}
          cancelLabel="Modifier"
          isLoading={sending}
          onConfirm={sent ? closeAfterSuccess : handleKeepPrice}
          onCancel={sent ? closeAfterSuccess : () => !sendingRef.current && setConfirming(false)}
        />
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
    gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A", marginBottom: 2 },
  priceRow: { flexDirection: "row", gap: 10 },
  priceCol: {
    flex: 1,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  priceColCounter: { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" },
  priceLabel: { fontSize: 10.5, fontWeight: "800", color: "#15803D", letterSpacing: 0.6 },
  priceLabelCounter: { color: "#6D28D9" },
  priceValue: { fontSize: 20, fontWeight: "900", color: "#166534", marginTop: 2 },
  priceValueCounter: { color: "#5B21B6" },
  mutedText: { fontSize: 12, color: "#64748B" },
  label: { fontSize: 12, fontWeight: "800", color: "#334155" },
  labelSpaced: { marginTop: 8 },
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
  multiline: { minHeight: 90, maxHeight: 170, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", fontSize: 11, color: "#94A3B8" },
  hint: { fontSize: 12, color: "#64748B", lineHeight: 17 },
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
  infoText: { flex: 1, fontSize: 13, color: "#1E3A8A", fontWeight: "600", lineHeight: 18 },
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
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 6,
  },
  submitBtnDisabled: { backgroundColor: "#CBD5E1" },
  submitBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderColor: "#1D6B45",
    borderWidth: 1.5,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  secondaryBtnDisabled: { opacity: 0.5 },
  secondaryBtnText: { color: "#1D6B45", fontSize: 14, fontWeight: "800" },
});
