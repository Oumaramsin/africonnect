import React, { useEffect, useMemo, useRef, useState } from "react";
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
import OrderEditModal, { DetailRowItem } from "../../components/OrderEditModal";
import { PROPOSALS_UPDATED_EVENT } from "../../utils/appEvents";
import { formatEuros, getNegociation, hasPendingCounterOffer, parseAmountInput } from "../../utils/negociation";
import type { NegociationEntry, TraiteurRequest } from "../../utils/types/traiteur";

/*
 * Proposition d'un traiteur sur une annonce : c'est un devis complet (prix, conditions d'acompte,
 * détail de l'offre) que le traiteur signe en l'envoyant. Le client l'accepte en le signant à son
 * tour : le devis est alors signé par les deux parties et la prestation confirmée.
 * Mode « nouveau devis » (revise=1) : réponse à une contre-proposition du client ; l'offre en cours
 * est relue auprès de l'API et le nouveau devis signé la remplace.
 * Écran plein (et non fenêtre flottante) : le clavier ne fait jamais perdre la saisie.
 */

/** Offre en cours et contre-proposition à laquelle répond le nouveau devis. */
type Revision = { currentPrice: number; counter: NegociationEntry };

type AcompteType = "aucun" | "optionnel" | "obligatoire";

// Écran ouvert directement (lien, notification) : retour vers les annonces
const BACK_HREF = { pathname: "/traiteur", params: { tab: "demandes" } } as const;

type ProposalRequestSummary = {
  id: string;
  title?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  guest_count?: number | null;
  location?: string | null;
  budget?: number | string | null;
  food_preferences?: string | null;
  description?: string | null;
};

// Mêmes bornes que l'API (POST /traiteur/requests/:id/proposals)
const MAX_PRICE = 1_000_000;
const MESSAGE_MAX_LENGTH = 3000;
const SIGNATURE_MAX_LENGTH = 120;
const ACOMPTE_MAX_POURCENTAGE = 80;

const ACOMPTE_OPTIONS: { value: AcompteType; label: string; hint: string }[] = [
  { value: "aucun", label: "Sans acompte", hint: "Tout est réglé le jour de l'événement." },
  { value: "optionnel", label: "Facultatif", hint: "Le client peut verser un acompte ou tout régler le jour J." },
  { value: "obligatoire", label: "Obligatoire", hint: "Le client verse l'acompte pour confirmer la réservation." },
];


const requestTitle = (req: ProposalRequestSummary): string =>
  req.title || `Événement ${req.event_type || ""}`.trim();

const formatEventDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

// Identifiant d'annonce attendu dans l'adresse de l'écran (rien d'autre n'est transmis à l'API)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProposerDevisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string; revise?: string }>();
  const isRevision = params.revise === "1";
  const requestId =
    typeof params.requestId === "string" && UUID_PATTERN.test(params.requestId) ? params.requestId : "";
  const [request, setRequest] = useState<ProposalRequestSummary | null>(null);
  const [isOwn, setIsOwn] = useState(false);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Relecture demandée après un conflit (réponse du client, offre déjà envoyée)
  const [reloadKey, setReloadKey] = useState(0);
  // Nouveau devis : le formulaire n'est prérempli qu'une fois (une relecture ne remplace pas la saisie)
  const prefilledRef = useRef(false);

  const [price, setPrice] = useState("");
  const [acompteType, setAcompteType] = useState<AcompteType>("optionnel");
  const [pourcent, setPourcent] = useState("30");
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [engaged, setEngaged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Verrou synchrone contre le double envoi (double appui avant le nouveau rendu)
  const sendingRef = useRef(false);

  // L'annonce et l'offre du traiteur sont toujours relues auprès de l'API : seul l'identifiant passe
  // par la navigation (un lien forgé ne peut pas faire signer un devis sur des termes inventés).
  useEffect(() => {
    let cancelled = false;
    const fail = (messageText: string) => {
      if (cancelled) return;
      setRequest(null);
      setRevision(null);
      setLoadError(messageText);
    };
    (async () => {
      if (!requestId) {
        fail("Cette annonce est introuvable.");
        setLoadingRequest(false);
        return;
      }
      setLoadingRequest(true);
      setLoadError(null);
      try {
        const [reqRes, meRes] = await Promise.all([
          apiFetch(`/traiteur/requests/${encodeURIComponent(requestId)}`),
          apiFetch("/traiteur/me"),
        ]);
        const data = await reqRes.json().catch(() => ({}));
        const me = await meRes.json().catch(() => ({}));
        if (cancelled) return;
        const found: TraiteurRequest | undefined = data?.data?.request;
        const myTraiteur = me?.traiteur;
        if (!reqRes.ok || !found) {
          fail(getApiErrorMessage(data, "Impossible de charger l'annonce."));
          return;
        }
        if (!meRes.ok || typeof myTraiteur?.id !== "string") {
          fail("Seul un traiteur peut proposer un devis.");
          return;
        }
        // Signature pré-remplie avec le nom du traiteur (modifiable)
        if (typeof myTraiteur.name === "string" && myTraiteur.name.trim()) {
          setSignature((current) => current || myTraiteur.name.trim());
        }
        if (found.status !== "open") {
          fail("Cette annonce n'est plus ouverte aux propositions.");
          return;
        }
        // Offre de ce traiteur (un administrateur reçoit toutes les offres de l'annonce)
        const own = found.proposals?.find((p) => p.traiteur_id === myTraiteur.id);
        const entries = getNegociation(own?.negociation);
        const counter = entries[entries.length - 1];
        if (isRevision) {
          if (!own || own.status !== "pending" || !hasPendingCounterOffer(entries) || !counter) {
            fail("Aucune contre-proposition n'attend votre réponse : votre devis actuel reste valable.");
            return;
          }
          setRevision({ currentPrice: Number(own.proposed_price), counter });
          if (!prefilledRef.current) {
            prefilledRef.current = true;
            // Le nouveau devis part de l'offre en cours : contenu et conditions d'acompte repris
            setMessage(own.message || "");
            try {
              const meta = own.conditions_devis ? JSON.parse(own.conditions_devis) : null;
              if (meta?.acompte_type === "aucun" || meta?.acompte_type === "optionnel" || meta?.acompte_type === "obligatoire") {
                setAcompteType(meta.acompte_type);
              }
              if (typeof meta?.acompte_pourcentage === "number" && meta.acompte_pourcentage > 0) {
                setPourcent(String(meta.acompte_pourcentage).replace(".", ","));
              }
            } catch {
              // Conditions illisibles : valeurs par défaut du formulaire
            }
          }
        } else if (own) {
          fail(
            own.status === "rejected"
              ? "Le client a décliné votre devis pour cette annonce."
              : "Vous avez déjà envoyé un devis pour cette annonce. Vous pourrez en proposer un nouveau si le client vous fait une contre-proposition.",
          );
          return;
        }
        // Sa propre annonce : seule la vue complète (propriétaire) contient l'identifiant du client
        setIsOwn(Boolean(found.client_id) && found.client_id === myTraiteur.user_id);
        setRequest({
          id: found.id,
          title: found.title,
          event_type: found.event_type,
          event_date: found.event_date,
          guest_count: found.guest_count,
          location: found.location,
          budget: found.budget,
          food_preferences: found.food_preferences,
          description: found.description,
        });
      } catch (err) {
        fail(getErrorMessage(err, "Impossible de charger l'annonce."));
      } finally {
        if (!cancelled) setLoadingRequest(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId, isRevision, reloadKey]);

  const parsedPrice = parseAmountInput(price);
  const parsedPourcent = parseAmountInput(pourcent);
  const priceValid = Number.isFinite(parsedPrice) && parsedPrice > 0 && parsedPrice <= MAX_PRICE;
  const pourcentValid =
    acompteType === "aucun" ||
    (Number.isFinite(parsedPourcent) && parsedPourcent >= 1 && parsedPourcent <= ACOMPTE_MAX_POURCENTAGE);
  const acompteMontant =
    acompteType !== "aucun" && priceValid && pourcentValid
      ? Math.round(parsedPrice * parsedPourcent) / 100
      : 0;
  const messageValid = message.trim().length > 0 && message.length <= MESSAGE_MAX_LENGTH;
  const signatureValid = signature.trim().length >= 2 && signature.trim().length <= SIGNATURE_MAX_LENGTH;
  const isFormValid = Boolean(request) && !isOwn && priceValid && pourcentValid && messageValid && signatureValid && engaged;

  // Ce qui manque encore, affiché sous le bouton grisé
  const missingHint = useMemo(() => {
    if (!priceValid) return "Indiquez votre tarif (en euros TTC).";
    if (!pourcentValid) return `Indiquez le pourcentage d'acompte (entre 1 et ${ACOMPTE_MAX_POURCENTAGE} %).`;
    if (!messageValid) return "Décrivez votre offre (menu, service, matériel).";
    if (!signatureValid) return "Signez le devis avec votre prénom et nom.";
    if (!engaged) return "Cochez la case d'engagement pour signer le devis.";
    return null;
  }, [priceValid, pourcentValid, messageValid, signatureValid, engaged]);

  const acompteLabel =
    acompteType === "aucun"
      ? "Sans acompte (tout le jour J)"
      : `${acompteType === "obligatoire" ? "Obligatoire" : "Facultatif"} : ${parsedPourcent} % soit ${formatEuros(acompteMontant)}`;

  const details: DetailRowItem[] = request
    ? [
        { icon: "calendar-outline", label: "Annonce", value: requestTitle(request) },
        ...(formatEventDate(request.event_date)
          ? [{ icon: "time-outline" as const, label: "Date de l'événement", value: formatEventDate(request.event_date) as string }]
          : []),
        { icon: "cash-outline", label: "Tarif TTC", value: priceValid ? formatEuros(parsedPrice) : "—", isHighlight: true },
        { icon: "wallet-outline", label: "Acompte", value: acompteLabel },
        { icon: "create-outline", label: "Signé par", value: signature.trim() },
      ]
    : [];

  const openConfirm = () => {
    if (!isFormValid || sendingRef.current) return;
    setError(null);
    Keyboard.dismiss();
    setConfirming(true);
  };

  const handleSend = async () => {
    if (!request || !isFormValid || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      // Corps identique à chaque relance : même clé d'idempotence après une coupure réseau
      const res = await apiFetch(`/traiteur/requests/${encodeURIComponent(request.id)}/proposals`, {
        method: "POST",
        body: JSON.stringify({
          proposed_price: parsedPrice,
          message: message.trim(),
          conditions_devis: JSON.stringify({
            acompte_type: acompteType,
            acompte_pourcentage: acompteType === "aucun" ? 0 : parsedPourcent,
          }),
          traiteur_signature: signature.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfirming(false);
        setError(getApiErrorMessage(data, "Erreur lors de l'envoi du devis."));
        // Situation changée entre-temps (réponse du client, devis déjà envoyé) : annonces et offre relues
        if (res.status === 409) {
          DeviceEventEmitter.emit(PROPOSALS_UPDATED_EVENT);
          setReloadKey((key) => key + 1);
        }
        return;
      }
      DeviceEventEmitter.emit(PROPOSALS_UPDATED_EVENT);
      // La même pop-up passe de la confirmation au succès
      setSent(true);
      setConfirming(false);
    } catch (e) {
      setConfirming(false);
      setError(getErrorMessage(e, "Impossible d'envoyer le devis."));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const closeAfterSuccess = () => {
    setSent(false);
    goBackOr(BACK_HREF);
  };

  if (loadingRequest || (!request && !loadError)) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.centered} edges={["top"]}>
          <StatusBar barStyle="light-content" />
          <ActivityIndicator size="large" color="#FFFFFF" />
        </SafeAreaView>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.centered} edges={["top"]}>
          <StatusBar barStyle="light-content" />
          <Ionicons name="alert-circle-outline" size={40} color="#FFFFFF" />
          <Text style={styles.centeredText}>{loadError}</Text>
          <TouchableOpacity style={styles.centeredBtn} onPress={() => goBackOr(BACK_HREF)} activeOpacity={0.85}>
            <Text style={styles.centeredBtnText}>{isRevision ? "Retour" : "Retour aux annonces"}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const eventDate = formatEventDate(request.event_date);
  const budget = request.budget !== null && request.budget !== undefined ? Number(request.budget) : NaN;

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => goBackOr(BACK_HREF)} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>{isRevision ? "Retour" : "Annonces"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isRevision ? "Nouveau devis" : "Proposer un devis"}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {requestTitle(request)}
          </Text>
        </View>

        <AppKeyboardScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Rappel de l'annonce */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>L&apos;annonce</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color="#1D6B45" />
              <Text style={styles.metaText}>{eventDate || "Date à définir"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={14} color="#1D6B45" />
              <Text style={styles.metaText}>{request.guest_count ? `${request.guest_count} invités` : "Nombre d'invités à préciser"}</Text>
            </View>
            {Boolean(request.location) && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color="#1D6B45" />
                <Text style={styles.metaText}>{request.location}</Text>
              </View>
            )}
            {Number.isFinite(budget) && budget > 0 && (
              <View style={styles.metaRow}>
                <Ionicons name="cash-outline" size={14} color="#D4870A" />
                <Text style={styles.metaText}>Budget indiqué : {formatEuros(budget)}</Text>
              </View>
            )}
            {Boolean(request.food_preferences) && (
              <Text style={styles.prefText}>Souhaits : {request.food_preferences}</Text>
            )}
          </View>

          {isOwn && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>
                C&apos;est votre propre annonce : vous ne pouvez pas y répondre.
              </Text>
            </View>
          )}

          {/* Nouveau devis : la contre-proposition du client à laquelle il répond */}
          {revision && (
            <View style={[styles.card, styles.counterCard]}>
              <Text style={styles.cardTitle}>Contre-proposition du client</Text>
              <Text style={styles.counterPrice}>
                {formatEuros(revision.counter.prix)}
                <Text style={styles.counterPriceSub}>  (votre devis : {formatEuros(revision.currentPrice)})</Text>
              </Text>
              {revision.counter.message ? (
                <Text style={styles.counterMessage}>« {revision.counter.message} »</Text>
              ) : null}
              <TouchableOpacity
                style={styles.counterChip}
                onPress={() => setPrice(String(revision.counter.prix).replace(".", ","))}
                activeOpacity={0.8}
                disabled={sending}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#6D28D9" />
                <Text style={styles.counterChipText}>
                  Reprendre le prix du client ({formatEuros(revision.counter.prix)})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Devis proposé */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Votre devis</Text>

            <Text style={styles.label}>
              Tarif TTC (€) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="Ex : 1800"
              placeholderTextColor="#94A3B8"
              value={price}
              onChangeText={setPrice}
              maxLength={12}
              editable={!sending}
            />

            <Text style={[styles.label, styles.labelSpaced]}>
              Acompte demandé <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pillsRow}>
              {ACOMPTE_OPTIONS.map((option) => {
                const active = acompteType === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setAcompteType(option.value)}
                    activeOpacity={0.8}
                    disabled={sending}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {ACOMPTE_OPTIONS.find((option) => option.value === acompteType)?.hint}
            </Text>

            {acompteType !== "aucun" && (
              <>
                <Text style={[styles.label, styles.labelSpaced]}>
                  Pourcentage d&apos;acompte (1 à {ACOMPTE_MAX_POURCENTAGE} %) <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.percentRow}>
                  <TextInput
                    style={[styles.input, styles.percentInput]}
                    keyboardType="decimal-pad"
                    placeholder="30"
                    placeholderTextColor="#94A3B8"
                    value={pourcent}
                    onChangeText={setPourcent}
                    maxLength={5}
                    editable={!sending}
                  />
                  <Text style={styles.percentSuffix}>%</Text>
                  {acompteMontant > 0 && (
                    <Text style={styles.percentAmount}>soit {formatEuros(acompteMontant)}</Text>
                  )}
                </View>
              </>
            )}

            <Text style={[styles.label, styles.labelSpaced]}>
              Détail de votre offre <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              placeholder="Entrées, plats, desserts, service, matériel inclus..."
              placeholderTextColor="#94A3B8"
              value={message}
              onChangeText={setMessage}
              maxLength={MESSAGE_MAX_LENGTH}
              editable={!sending}
            />
            <Text style={styles.paymentNote}>
              L&apos;acompte et le solde se règlent directement entre vous et le client : Dabari ne perçoit aucun fonds.
            </Text>
          </View>

          {/* Signature du traiteur */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Signature</Text>
            <Text style={styles.label}>
              Prénom et nom du signataire <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Fatou Diop"
              placeholderTextColor="#94A3B8"
              value={signature}
              onChangeText={setSignature}
              maxLength={SIGNATURE_MAX_LENGTH}
              autoCapitalize="words"
              editable={!sending}
            />
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setEngaged((value) => !value)}
              activeOpacity={0.8}
              disabled={sending}
            >
              <Ionicons
                name={engaged ? "checkbox" : "square-outline"}
                size={20}
                color={engaged ? "#1D6B45" : "#64748B"}
              />
              <Text style={styles.checkboxLabel}>
                Je signe ce devis et m&apos;engage sur son prix et ses conditions. Le client
                l&apos;acceptera en le signant à son tour, ce qui confirmera la prestation.
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
                <Ionicons name="create-outline" size={17} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  {isRevision ? "Signer et envoyer le nouveau devis" : "Signer et envoyer le devis"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {!isOwn && missingHint && <Text style={styles.missingHint}>{missingHint}</Text>}
        </AppKeyboardScrollView>

        {/* Confirmation avant l'envoi, puis succès dans la même pop-up */}
        <OrderEditModal
          visible={confirming || sent}
          type={sent ? "success" : "confirm"}
          service="devis"
          title={
            sent
              ? isRevision
                ? "Nouveau devis envoyé !"
                : "Devis envoyé !"
              : isRevision
                ? "Envoyer ce nouveau devis signé ?"
                : "Envoyer ce devis signé ?"
          }
          subtitle={
            sent
              ? "Le client est prévenu. S'il signe votre devis, la prestation sera confirmée."
              : "Vérifiez votre offre : une fois signée par le client, elle vaudra accord."
          }
          detailsTitle="VOTRE DEVIS"
          details={details}
          noticeText={
            sent
              ? "Le devis signé apparaîtra dans Mes commandes dès que le client l'aura accepté."
              : revision
                ? `Il remplace votre devis de ${formatEuros(revision.currentPrice)} : le client pourra le signer ou le décliner.`
                : "Une fois envoyé, votre devis ne pourra être remplacé que si le client vous fait une contre-proposition."
          }
          confirmLabel={sent ? "Fermer" : "Oui, envoyer le devis"}
          cancelLabel="Modifier mon devis"
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
  centeredBtn: { backgroundColor: "#FFFFFF", paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12 },
  centeredBtnText: { color: "#165034", fontWeight: "800", fontSize: 13 },
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
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 13, color: "#334155", fontWeight: "600", flex: 1 },
  prefText: { fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 17 },
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
  multiline: { minHeight: 110, maxHeight: 220, textAlignVertical: "top" },
  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  pillActive: { backgroundColor: "#DCFCE7", borderColor: "#1D6B45" },
  pillText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  pillTextActive: { color: "#166534", fontWeight: "900" },
  hint: { fontSize: 11.5, color: "#64748B", lineHeight: 16 },
  percentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  percentInput: { width: 90 },
  percentSuffix: { fontSize: 14, fontWeight: "800", color: "#334155" },
  percentAmount: { fontSize: 13, fontWeight: "800", color: "#1D6B45" },
  paymentNote: { fontSize: 11.5, color: "#64748B", marginTop: 8, lineHeight: 16 },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 10 },
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
  counterCard: { backgroundColor: "#FAF5FF", borderColor: "#DDD6FE" },
  counterPrice: { fontSize: 20, fontWeight: "900", color: "#5B21B6" },
  counterPriceSub: { fontSize: 12, fontWeight: "700", color: "#6D28D9" },
  counterMessage: { fontSize: 13, color: "#334155", fontStyle: "italic", lineHeight: 18 },
  counterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#C4B5FD",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  counterChipText: { fontSize: 12, fontWeight: "800", color: "#6D28D9" },
});
