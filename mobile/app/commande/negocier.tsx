import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import type { TraiteurProposal, TraiteurRequest } from "../../utils/types/traiteur";
import {
  NEGOCIATION_MAX_CONTRE_OFFRES,
  NEGOCIATION_MESSAGE_MAX_LENGTH,
  countCounterOffers,
  formatEuros,
  getNegociation,
  hasPendingCounterOffer,
  parseAmountInput,
} from "../../utils/negociation";

/*
 * Contre-proposition du client sur une offre de traiteur : un prix plus bas que le devis reçu, avec un
 * message facultatif. Le devis signé du traiteur reste valable (le client peut toujours le signer) ;
 * le traiteur répond en maintenant son prix ou en signant un nouveau devis.
 * Seuls les identifiants passent par la navigation : l'offre est relue auprès de l'API.
 */

type Loaded = { request: TraiteurRequest; proposal: TraiteurProposal };

// Écran ouvert directement (lien, notification) : retour vers « Mes annonces »
const BACK_HREF = { pathname: "/commandes", params: { tab: "traiteur", sub: "mes_demandes" } } as const;

export default function NegocierOffreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string; proposalId?: string }>();
  const requestId = typeof params.requestId === "string" ? params.requestId : "";
  const proposalId = typeof params.proposalId === "string" ? params.proposalId : "";

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Verrou synchrone contre le double envoi
  const sendingRef = useRef(false);

  const load = useCallback(async () => {
    if (!requestId || !proposalId) {
      setLoadError("Cette offre est introuvable. Revenez à vos annonces pour la rouvrir.");
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
        setLoadError("Cette offre est introuvable. Revenez à vos annonces pour la rouvrir.");
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

  const { request, proposal } = loaded;
  const entries = getNegociation(proposal.negociation);
  const currentPrice = Number(proposal.proposed_price);
  const traiteurName = proposal.traiteur?.name || "Le traiteur";
  const remaining = NEGOCIATION_MAX_CONTRE_OFFRES - countCounterOffers(entries);
  const offerOpen = request.status === "open" && proposal.status === "pending";

  // Raison pour laquelle aucune contre-proposition n'est possible (même règle que l'API)
  const blockedReason = !offerOpen
    ? "Cette offre n'est plus en attente : elle a été acceptée ou déclinée, ou l'annonce est close."
    : hasPendingCounterOffer(entries)
      ? "Votre contre-proposition attend la réponse du traiteur. Vous serez prévenu dès qu'il aura répondu ; vous pouvez aussi signer le devis actuel."
      : remaining <= 0
        ? `Vous avez déjà fait ${NEGOCIATION_MAX_CONTRE_OFFRES} contre-propositions : vous pouvez maintenant signer ce devis ou le décliner.`
        : null;

  const parsedPrice = parseAmountInput(price);
  const priceEntered = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const priceValid = priceEntered && parsedPrice < currentPrice;
  const isFormValid = !blockedReason && priceValid && message.length <= NEGOCIATION_MESSAGE_MAX_LENGTH;
  const missingHint = !priceEntered
    ? "Indiquez le prix que vous proposez."
    : !priceValid
      ? `Votre prix doit être inférieur au devis actuel (${formatEuros(currentPrice)}).`
      : null;

  const trimmedMessage = message.trim();
  const details: DetailRowItem[] = [
    { icon: "pricetag-outline", label: "Devis actuel", value: formatEuros(currentPrice) },
    { icon: "cash-outline", label: "Votre proposition", value: priceValid ? formatEuros(parsedPrice) : "—", isHighlight: true },
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
    if (!isFormValid || sendingRef.current) return;
    Keyboard.dismiss();
    setError(null);
    setConfirming(true);
  };

  const handleSend = async () => {
    if (!isFormValid || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch(`/traiteur/proposals/${encodeURIComponent(proposal.id)}/contre-offre`, {
        method: "POST",
        body: JSON.stringify({
          prix: parsedPrice,
          message: trimmedMessage || null,
          // Refusée si le traiteur a changé son devis entre-temps
          prix_devis_attendu: currentPrice,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfirming(false);
        setError(getApiErrorMessage(data, "Impossible d'envoyer votre contre-proposition. Réessayez."));
        // L'offre a changé d'état (réponse du traiteur, offre close) : elle est relue
        if (res.status === 409) void load();
        return;
      }
      setSent(true);
      setConfirming(false);
    } catch (e) {
      setConfirming(false);
      setError(getErrorMessage(e, "Impossible d'envoyer votre contre-proposition. Réessayez."));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
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
            <Text style={styles.backBtnText}>Mes annonces</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Proposer un autre prix</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {request.title || `Événement ${request.event_type || ""}`.trim()}
          </Text>
        </View>

        <AppKeyboardScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Le devis reçu et la négociation en cours */}
          <View style={styles.card}>
            <Text style={styles.traiteurName}>{traiteurName}</Text>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>DEVIS ACTUEL (TTC)</Text>
              <Text style={styles.priceValue}>{formatEuros(currentPrice)}</Text>
            </View>
            <NegociationThread entries={entries} viewer="client" traiteurName={proposal.traiteur?.name} />
          </View>

          {blockedReason ? (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#1D4ED8" />
              <Text style={styles.infoText}>{blockedReason}</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Votre contre-proposition</Text>
              <Text style={styles.label}>
                Votre prix (€ TTC) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={`Moins de ${formatEuros(currentPrice)}`}
                placeholderTextColor="#94A3B8"
                value={price}
                onChangeText={setPrice}
                maxLength={12}
                editable={!sending}
              />

              <Text style={[styles.label, styles.labelSpaced]}>Message au traiteur (facultatif)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                multiline
                placeholder="Ex : Mon budget est de 1 500 €. Est-il possible d'adapter le menu ?"
                placeholderTextColor="#94A3B8"
                value={message}
                onChangeText={setMessage}
                maxLength={NEGOCIATION_MESSAGE_MAX_LENGTH}
                editable={!sending}
              />
              <Text style={styles.counter}>
                {message.length}/{NEGOCIATION_MESSAGE_MAX_LENGTH}
              </Text>
              <Text style={styles.hint}>
                Le traiteur pourra maintenir son prix ou vous envoyer un nouveau devis signé. Son devis
                actuel reste valable : vous pouvez toujours le signer.{" "}
                {remaining > 1
                  ? `Il vous reste ${remaining} contre-propositions.`
                  : "C'est votre dernière contre-proposition sur cette offre."}
              </Text>
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

          {!blockedReason && (
            <>
              <TouchableOpacity
                style={[styles.submitBtn, (!isFormValid || sending) && styles.submitBtnDisabled]}
                onPress={openConfirm}
                disabled={!isFormValid || sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Envoyer ma contre-proposition</Text>
                  </>
                )}
              </TouchableOpacity>
              {missingHint && <Text style={styles.missingHint}>{missingHint}</Text>}
            </>
          )}
        </AppKeyboardScrollView>

        {/* Confirmation avant l'envoi, puis succès dans la même pop-up */}
        <OrderEditModal
          visible={confirming || sent}
          type={sent ? "success" : "confirm"}
          service="devis"
          title={sent ? "Contre-proposition envoyée !" : "Envoyer cette contre-proposition ?"}
          subtitle={
            sent
              ? `${traiteurName} est prévenu. Vous serez notifié de sa réponse.`
              : "Le traiteur pourra maintenir son prix ou vous envoyer un nouveau devis signé."
          }
          detailsTitle="VOTRE PROPOSITION"
          details={details}
          noticeText={
            sent
              ? "En attendant, le devis actuel reste valable : vous pouvez toujours le signer."
              : "Ce n'est pas un engagement : vous signerez le devis final seulement s'il vous convient."
          }
          confirmLabel={sent ? "Fermer" : "Oui, envoyer"}
          cancelLabel="Modifier"
          isLoading={sending}
          onConfirm={sent ? closeAfterSuccess : handleSend}
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
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A", marginBottom: 4 },
  traiteurName: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  priceBox: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  priceLabel: { fontSize: 11, fontWeight: "800", color: "#15803D", letterSpacing: 0.6 },
  priceValue: { fontSize: 24, fontWeight: "900", color: "#166534", marginTop: 2 },
  label: { fontSize: 12, fontWeight: "800", color: "#334155" },
  labelSpaced: { marginTop: 10 },
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
  multiline: { minHeight: 96, maxHeight: 180, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", fontSize: 11, color: "#94A3B8" },
  hint: { fontSize: 11.5, color: "#64748B", lineHeight: 16 },
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
    paddingVertical: 14,
    borderRadius: 16,
  },
  submitBtnDisabled: { backgroundColor: "#CBD5E1" },
  submitBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  missingHint: { textAlign: "center", fontSize: 12, color: "#64748B", fontWeight: "600" },
});
