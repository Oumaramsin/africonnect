import React, { useCallback, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../../utils/storage";
import { GpListing, formatWhatsAppUrl } from "../../../utils/types/gp";
import { apiFetch, getApiErrorMessage, getErrorMessage, isNetworkError } from "../../../utils/api";
import { COUNTRY_DIAL_CODES } from "../../../utils/constants/dialCodes";
import AppKeyboardScrollView from "../../../components/AppKeyboardScrollView";
import LoadErrorState from "../../../components/LoadErrorState";

export default function GpBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [listing, setListing] = useState<GpListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Chargement de l'annonce : une erreur (réseau ou serveur) propose « Réessayer », seul un 404
  // affiche « introuvable »
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorOffline, setLoadErrorOffline] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // Verrou contre la double soumission (un second appui peut précéder le rendu du bouton désactivé)
  const submittingRef = useRef(false);

  const [weight_kg, setWeight_kg] = useState("");
  const [content_desc, setContent_desc] = useState("");
  const [declared_value, setDeclared_value] = useState("");
  const [notes, setNotes] = useState("");
  const [recipient_name, setRecipient_name] = useState("");
  const [recipient_phone_code, setRecipient_phone_code] = useState("+225");
  const [recipient_phone_number, setRecipient_phone_number] = useState("");
  const [showDialCodeModal, setShowDialCodeModal] = useState(false);

  const selectedDial =
    COUNTRY_DIAL_CODES.find((c) => c.code === recipient_phone_code) ||
    COUNTRY_DIAL_CODES[0];

  // Au retour sur l'écran, l'annonce est actualisée sans écran de chargement : si cela échoue,
  // l'annonce déjà affichée reste visible avec un message discret.
  const loadListing = useCallback(async () => {
    try {
      if (!id) {
        setNotFound(true);
        return;
      }
      const token = await getSecureToken("token");
      setIsLoggedIn(Boolean(token));

      const response = await apiFetch(`/gp/${encodeURIComponent(String(id))}`);
      const data = await response.json();
      if (response.status === 404) {
        setNotFound(true);
        setListing(null);
        setLoadError(null);
        return;
      }
      const gp = response.ok ? data?.data?.gp : null;
      if (!gp) {
        setLoadError(getApiErrorMessage(data, "Erreur lors du chargement du GP"));
        setLoadErrorOffline(false);
        return;
      }
      setListing(gp);
      setNotFound(false);
      setLoadError(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Erreur de connexion au serveur"));
      setLoadErrorOffline(isNetworkError(err));
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadListing();
    }, [loadListing])
  );

  const retryLoad = () => {
    setRetrying(true);
    loadListing();
  };

  // Page ouverte directement (lien, rechargement sur le web) : pas d'historique, retour à la liste
  const goBackToList = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/gp");
  };

  const cleanWeightStr = weight_kg.trim().replace(",", ".");
  const cleanDeclaredStr = declared_value.trim().replace(",", ".");

  const weightNum = parseFloat(cleanWeightStr);
  const declaredValNum = parseFloat(cleanDeclaredStr);

  // Poids saisi avec une virgule (« 2,5 ») compris comme 2,5 kg et non 2 kg
  const total = listing && !isNaN(weightNum)
    ? weightNum * listing.price_per_kg
    : 0;

  const isValidNumberFormat = (str: string) => /^\d+([.,]\d+)?$/.test(str);

  const isWeightExceeded = Boolean(
    listing &&
      !isNaN(weightNum) &&
      weightNum > listing.available_kg
  );

  const isWeightInvalid =
    !weight_kg.trim() ||
    !isValidNumberFormat(weight_kg.trim()) ||
    isNaN(weightNum) ||
    weightNum <= 0 ||
    isWeightExceeded;

  const isDeclaredValInvalid =
    !declared_value.trim() ||
    !isValidNumberFormat(declared_value.trim()) ||
    isNaN(declaredValNum) ||
    declaredValNum <= 0;

  const isSubmitDisabled =
    submitting ||
    isWeightInvalid ||
    !content_desc.trim() ||
    !recipient_name.trim() ||
    !recipient_phone_number.trim() ||
    isDeclaredValInvalid;

  const handlePreSubmit = async () => {
    if (!weight_kg.trim() || !isValidNumberFormat(weight_kg.trim()) || isNaN(weightNum) || weightNum <= 0) {
      setError("Le poids doit être un nombre valide supérieur à 0 (ex: 2.5)");
      return;
    }

    if (listing && weightNum > listing.available_kg) {
      setError(
        `Capacité insuffisante : le poids saisi (${weightNum} kg) dépasse la capacité restante (${listing.available_kg} kg disponibles).`
      );
      return;
    }

    if (!content_desc.trim()) {
      setError("La description du contenu est requise");
      return;
    }

    if (!recipient_name.trim()) {
      setError("Le nom et prénom du destinataire à l'arrivée sont requis");
      return;
    }

    if (!recipient_phone_number.trim()) {
      setError("Le numéro de téléphone du destinataire à l'arrivée est requis");
      return;
    }

    const recipientDigits = recipient_phone_number.replace(/\D/g, "");
    if (recipientDigits.length < 6) {
      setError("Le numéro de téléphone du destinataire doit contenir au moins 6 chiffres (sans lettres)");
      return;
    }

    if (isDeclaredValInvalid) {
      setError(
        "La valeur déclarée est obligatoire et doit être un montant supérieur à 0 (ex: 50 €)",
      );
      return;
    }

    setShowConfirmModal(true);
    setError(null);
  };

  // La modale reste ouverte pendant l'envoi : en cas d'échec, le message s'y affiche et « Réessayer »
  // renvoie exactement la même demande (même clé d'idempotence, pas de doublon côté serveur).
  const confirmOrder = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const token = await getSecureToken("token");
      if (!token) {
        setShowConfirmModal(false);
        router.push("/login");
        return;
      }

      const safeDeclaredValue =
        declared_value.trim() !== "" && !isDeclaredValInvalid
          ? declaredValNum
          : 0;

      const fullRecipientPhone = `${recipient_phone_code} ${recipient_phone_number.trim()}`;

      const response = await apiFetch(`/gp/${encodeURIComponent(String(id))}/order`, {
        method: "POST",
        body: JSON.stringify({
          weight_kg: weightNum,
          content_desc: content_desc,
          declared_value: safeDeclaredValue,
          total_amount: total,
          notes: notes || null,
          recipient_name: recipient_name.trim(),
          recipient_phone: fullRecipientPhone,
          status: "pending",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Saisie conservée : le message s'affiche dans la modale, l'envoi peut être relancé
        setError(getApiErrorMessage(data, "Erreur lors de l'envoi de la commande"));
        return;
      }
      setListing((prev) =>
        prev
          ? {
              ...prev,
              available_kg: Math.max(0, Number(prev.available_kg) - weightNum),
            }
          : null,
      );
      setShowConfirmModal(false);
      setSuccess(true);
    } catch (err) {
      // Coupure ou délai dépassé : issue inconnue, la relance renvoie la même demande sans doublon
      setError(getErrorMessage(err, "Erreur lors de l'envoi de la commande"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Chargement de l'annonce GP...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Chargement impossible (réseau ou serveur) : « Réessayer », sans conclure que l'annonce n'existe pas
  if (!listing && loadError && !notFound) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <StatusBar barStyle="light-content" />
          <LoadErrorState
            title="Impossible de charger l'annonce"
            message={loadError}
            offline={loadErrorOffline}
            retrying={retrying}
            onRetry={retryLoad}
            secondaryLabel="← Retour aux annonces"
            onSecondary={goBackToList}
            style={styles.loadErrorWrapper}
          />
        </SafeAreaView>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.centeredState}>
            <Ionicons name="alert-circle-outline" size={48} color="#FFFFFF" />
            <Text style={styles.notFoundText}>Annonce GP introuvable</Text>
            <TouchableOpacity
              style={styles.backBtnCentered}
              onPress={goBackToList}
            >
              <Text style={styles.backBtnCenteredText}>← Retour aux annonces</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const gpProfile = listing.profiles;

  // ÉCRAN DE SUCCÈS
  if (success) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <StatusBar barStyle="light-content" />
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={64} color="#1D6B45" />
            </View>

            <Text style={styles.successTitle}>Demande envoyée avec succès !</Text>
            <Text style={styles.successSub}>
              {gpProfile?.full_name || "Le GP"} a reçu votre demande et va vous contacter rapidement pour confirmer la prise en charge.
            </Text>

            {/* Bouton WhatsApp direct */}
            {gpProfile?.whatsapp && (
              <TouchableOpacity
                style={styles.whatsappBtn}
                activeOpacity={0.85}
                onPress={() => {
                  const url = formatWhatsAppUrl(
                    gpProfile?.whatsapp,
                    `Bonjour ${gpProfile?.full_name || ""}, je viens d'effectuer une réservation pour mon colis sur Dabari.`,
                  );
                  if (url) Linking.openURL(url);
                }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.whatsappBtnText}>Contacter le GP sur WhatsApp</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.ordersLinkBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/commandes")}
            >
              <Text style={styles.ordersLinkText}>Voir mes commandes →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backListBtn}
              activeOpacity={0.7}
              onPress={() => setSuccess(false)}
            >
              <Text style={styles.backListText}>Retour à l'annonce</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* HEADER HAUT (IDENTIQUE APP WEB) */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          <View style={styles.headerRouteRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {listing.departure_city} → {listing.arrival_city}
              </Text>
              <View style={styles.headerDateRow}>
                <Ionicons name="airplane-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.headerDateText}>
                  Départ : {formatDate(listing.departure_date)}
                </Text>
              </View>
              {Boolean(listing.arrival_date) && (
                <View style={[styles.headerDateRow, { marginTop: 3 }]}>
                  <Ionicons name="navigate-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.headerDateText}>
                    Arrivée : {formatDate(listing.arrival_date!)}
                  </Text>
                </View>
              )}
            </View>

            {Boolean(listing.flight_type) && (
              <View style={styles.flightBadgeHeader}>
                <Text style={styles.flightBadgeHeaderText}>
                  {listing.flight_type === "direct" ? "Direct" : "Escale"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <AppKeyboardScrollView
          style={styles.mainScrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
          extraScrollHeight={140}
        >
          {/* Actualisation échouée : l'annonce déjà chargée reste affichée */}
          {Boolean(loadError) && (
            <TouchableOpacity
              style={[styles.errorBox, styles.refreshErrorBox]}
              onPress={retryLoad}
              disabled={retrying}
              activeOpacity={0.8}
            >
              <Ionicons
                name={loadErrorOffline ? "cloud-offline-outline" : "alert-circle"}
                size={18}
                color="#B91C1C"
              />
              <Text style={styles.errorText}>{`Actualisation impossible : ${loadError}`}</Text>
              {retrying ? (
                <ActivityIndicator size="small" color="#B91C1C" />
              ) : (
                <Text style={styles.errorRetryText}>Réessayer</Text>
              )}
            </TouchableOpacity>
          )}

          {listing.is_delayed && (
            <View style={styles.delayAlertBanner}>
              <Ionicons name="warning" size={20} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.delayAlertTitle}>Arrivée retardée</Text>
                {listing.arrival_date ? (
                  <Text style={styles.delayAlertDate}>
                    Nouvelle date prévue : {formatDate(listing.arrival_date)}
                  </Text>
                ) : null}
                {listing.delay_reason ? (
                  <Text style={styles.delayAlertReason}>{listing.delay_reason}</Text>
                ) : null}
              </View>
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="person-outline" size={16} color="#1D6B45" /> À propos du GP
            </Text>

            <View style={styles.gpProfileRow}>
              <View style={styles.gpAvatarCircle}>
                <Text style={styles.gpAvatarInitial}>
                  {gpProfile?.full_name?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.gpNameText}>
                  {gpProfile?.full_name || "GP Anonyme"}
                </Text>
                {Boolean(gpProfile?.phone) && (
                  <Text style={styles.gpPhoneText}>Téléphone :  {gpProfile?.phone}</Text>
                )}
                {listing.review_count > 0 && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color="#FBBF24" />
                    <Text style={styles.ratingScore}>{listing.rating}</Text>
                    <Text style={styles.ratingReviews}>
                      ({listing.review_count} avis)
                    </Text>
                  </View>
                )}
              </View>

              {/* Bouton WhatsApp */}
              {Boolean(gpProfile?.whatsapp) && (
                <TouchableOpacity
                  style={styles.miniWhatsappBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    const url = formatWhatsAppUrl(
                      gpProfile?.whatsapp,
                      `Bonjour ${gpProfile?.full_name || ""}, je vous contacte concernant votre annonce GP (${listing.departure_city} → ${listing.arrival_city}) sur Dabari.`,
                    );
                    if (url) Linking.openURL(url);
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                  <Text style={styles.miniWhatsappBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="cube-outline" size={16} color="#1D6B45" /> Détails de l'annonce
            </Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailBoxLabel}>Kg disponibles</Text>
                <Text style={styles.detailBoxValue}>{Number(listing.available_kg)}</Text>
                <Text style={styles.detailBoxUnit}>kg</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailBoxLabel}>Prix au kg</Text>
                <Text style={styles.detailBoxValue}>{listing.price_per_kg}</Text>
                <Text style={styles.detailBoxUnit}>€/kg</Text>
              </View>
            </View>

            {/* Adresses et lieux de remise / récupération */}
            <View style={styles.routeCardsContainer}>
              {/* Point de Dépôt (Départ) */}
              <View style={styles.locationCardDeparture}>
                <View style={styles.locationCardTopRow}>
                  <View style={styles.locationBadgeGreen}>
                    <Ionicons name="airplane" size={12} color="#1D6B45" />
                    <Text style={styles.locationBadgeGreenText}>DÉPÔT (DÉPART)</Text>
                  </View>
                  <Text style={styles.locationDateText}>
                    {formatDate(listing.departure_date)}
                  </Text>
                </View>

                {/* Zone / Ville */}
                <View style={styles.locationRow}>
                  <Ionicons name="location-sharp" size={18} color="#1D6B45" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationLabelText}>Zone & Ville de dépôt :</Text>
                    <Text style={styles.locationCityText}>
                      {listing.pickup_city || listing.departure_city}
                    </Text>
                  </View>
                </View>

                {/* Adresse exacte si disponible */}
                {Boolean(listing.pickup_address) && (
                  <View style={styles.locationAddressRow}>
                    <Ionicons name="home" size={14} color="#166534" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationAddressLabel}>Adresse exacte de remise :</Text>
                      <Text style={styles.locationAddressText}>
                        {listing.pickup_address}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Point de Récupération (Arrivée) */}
              <View style={styles.locationCardArrival}>
                <View style={styles.locationCardTopRow}>
                  <View style={styles.locationBadgeAmber}>
                    <Ionicons name="navigate" size={12} color="#92400E" />
                    <Text style={styles.locationBadgeAmberText}>RÉCUPÉRATION (ARRIVÉE)</Text>
                  </View>
                  <Text style={styles.locationDateTextAmber}>
                    {listing.arrival_date ? formatDate(listing.arrival_date) : "Date à confirmer"}
                  </Text>
                </View>

                {/* Zone / Ville */}
                <View style={styles.locationRow}>
                  <Ionicons name="location-sharp" size={18} color="#D4870A" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationLabelText}>Zone & Ville de récupération :</Text>
                    <Text style={styles.locationCityText}>
                      {listing.dropoff_city || listing.arrival_city}
                    </Text>
                  </View>
                </View>

                {/* Adresse exacte si disponible */}
                {Boolean(listing.dropoff_address) && (
                  <View style={styles.locationAddressRowAmber}>
                    <Ionicons name="home" size={14} color="#B45309" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationAddressLabelAmber}>Adresse exacte de récupération :</Text>
                      <Text style={styles.locationAddressTextAmber}>
                        {listing.dropoff_address}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Description */}
            {Boolean(listing.description) && (
              <View style={styles.descBox}>
                <View style={styles.descHeaderRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#1D6B45" />
                  <Text style={styles.descHeaderTitle}>Consignes du transporteur :</Text>
                </View>
                <Text style={styles.descText}>{listing.description}</Text>
              </View>
            )}
          </View>

          {isLoggedIn ? (
            !showForm ? (
              <TouchableOpacity
                style={styles.openFormBtn}
                activeOpacity={0.85}
                onPress={() => setShowForm(true)}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.openFormBtnText}>Envoyer un colis avec ce GP</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sectionCard}>
                <View style={styles.formHeaderRow}>
                  <Text style={styles.cardSectionTitle}>Ma demande de transport</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)}>
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Champ 1: Poids du colis */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>POIDS DU COLIS (KG) *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      isWeightExceeded && styles.inputErrorBorder,
                    ]}
                    placeholder={`Max ${listing.available_kg} kg`}
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={weight_kg}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9.,]/g, "");
                      setWeight_kg(clean);
                    }}
                  />
                  {isWeightExceeded && (
                    <View style={styles.weightErrorNotice}>
                      <Ionicons name="alert-circle" size={15} color="#DC2626" />
                      <Text style={styles.weightErrorNoticeText}>
                        Capacité insuffisante : {weightNum} kg dépasse la limite disponible ({listing.available_kg} kg max)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Champ 2: Description du contenu */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>DESCRIPTION DU CONTENU *</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    placeholder="Ex: Vêtements, chaussures, médicaments..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    value={content_desc}
                    onChangeText={setContent_desc}
                  />
                </View>

                {/* Destinataire à l'arrivée */}
                <View style={styles.recipientCardBox}>
                  <View style={styles.recipientHeaderRow}>
                    <Ionicons name="person" size={15} color="#1D6B45" />
                    <Text style={styles.recipientCardTitle}>DESTINATAIRE À L'ARRIVÉE *</Text>
                  </View>
                  <Text style={styles.recipientCardSub}>
                    Personne qui récupérera le colis à l'arrivée ({listing.arrival_city}).
                  </Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>NOM & PRÉNOM DU DESTINATAIRE *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Amadou Diallo"
                      placeholderTextColor="#94A3B8"
                      value={recipient_name}
                      onChangeText={setRecipient_name}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>TÉLÉPHONE DU DESTINATAIRE *</Text>
                    <View style={styles.phoneInputRow}>
                      <TouchableOpacity
                        style={styles.dialCodeBtn}
                        activeOpacity={0.8}
                        onPress={() => setShowDialCodeModal(true)}
                      >
                        <Image
                          source={{ uri: `https://flagcdn.com/w80/${selectedDial.iso}.png` }}
                          style={styles.dialTriggerFlag}
                          resizeMode="cover"
                        />
                        <Text style={styles.dialCodeBtnText}>{recipient_phone_code}</Text>
                        <Ionicons name="chevron-down" size={14} color="#1D6B45" />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.input, styles.phoneInputFlex]}
                        placeholder="Ex: 07 12 34 56 78"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={recipient_phone_number}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9\s]/g, "");
                          setRecipient_phone_number(clean);
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Champ 3: Valeur déclarée */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>VALEUR DÉCLARÉE (€) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 100"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={declared_value}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9.,]/g, "");
                      setDeclared_value(clean);
                    }}
                  />
                </View>

                {/* Champ 4: Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>NOTES ET INSTRUCTIONS</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    placeholder="Instructions particulières, colis fragile..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={2}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                {/* TOTAL ESTIMÉ */}
                <View style={styles.totalEstimatedCard}>
                  <Text style={styles.totalEstimatedLabel}>Total estimé</Text>
                  <Text style={styles.totalEstimatedValue}>
                    {total.toFixed(2)} €
                  </Text>
                </View>

                {/* Message d'erreur, juste au-dessus du bouton pour rester visible */}
                {Boolean(error) && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Bouton de Soumission */}
                <TouchableOpacity
                  style={[
                    styles.submitOrderBtn,
                    isSubmitDisabled && styles.submitOrderBtnDisabled,
                  ]}
                  activeOpacity={0.85}
                  disabled={isSubmitDisabled}
                  onPress={handlePreSubmit}
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.submitOrderBtnText}>
                    {submitting ? "Envoi..." : "Envoyer ma demande"}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <TouchableOpacity
              style={styles.loginRequiredCard}
              activeOpacity={0.85}
              onPress={() => router.push("/login")}
            >
              <View style={styles.loginLockCircle}>
                <Ionicons name="lock-closed" size={24} color="#1D6B45" />
              </View>
              <Text style={styles.loginRequiredTitle}>
                Se connecter pour envoyer un colis
              </Text>
              <Text style={styles.loginRequiredSub}>
                Connectez-vous pour passer votre demande en toute sécurité.
              </Text>
            </TouchableOpacity>
          )}
        </AppKeyboardScrollView>

        {/* POP-UP (MODALE) DE CONFIRMATION DE LA DEMANDE */}
        <Modal
          transparent
          animationType="fade"
          visible={showConfirmModal}
          onRequestClose={() => {
            if (!submittingRef.current) setShowConfirmModal(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="cube-outline" size={28} color="#1D6B45" />
              </View>

              <Text style={styles.modalTitle}>Confirmer l'envoi</Text>
              <Text style={styles.modalSub}>
                Êtes-vous sûr(e) de vouloir envoyer cette demande pour{" "}
                <Text style={{ fontWeight: "800", color: "#0F172A" }}>
                  {weight_kg || "0"} kg
                </Text>{" "}
                d'un montant estimé à{" "}
                <Text style={{ fontWeight: "800", color: "#1D6B45" }}>
                  {total.toFixed(2)} €
                </Text>{" "}
                ?
              </Text>
              {Boolean(recipient_name) && (
                <View style={styles.confirmRecipientBox}>
                  <Text style={styles.confirmRecipientLabel}>Destinataire à l'arrivée :</Text>
                  <Text style={styles.confirmRecipientValue}>
                    {recipient_name} ({recipient_phone_code} {recipient_phone_number})
                  </Text>
                </View>
              )}

              {/* Échec de l'envoi : affiché dans la modale, au-dessus des boutons */}
              {Boolean(error) && (
                <View style={[styles.errorBox, styles.modalErrorBox]}>
                  <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, submitting && styles.submitOrderBtnDisabled]}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>
                    {error ? "Modifier" : "Annuler"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, submitting && styles.submitOrderBtnDisabled]}
                  onPress={confirmOrder}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>
                      {error ? "Réessayer" : "Oui, envoyer"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODALE CHOIX INDICATIF PAYS */}
        <Modal
          transparent
          animationType="slide"
          visible={showDialCodeModal}
          onRequestClose={() => setShowDialCodeModal(false)}
        >
          <View style={styles.dialModalOverlay}>
            <View style={styles.dialModalCard}>
              <View style={styles.dialModalHeader}>
                <Text style={styles.dialModalTitle}>Choisir l'indicatif pays</Text>
                <TouchableOpacity onPress={() => setShowDialCodeModal(false)}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.dialList} showsVerticalScrollIndicator={false}>
                {COUNTRY_DIAL_CODES.map((item) => {
                  const isSelected = item.code === recipient_phone_code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[styles.dialItem, isSelected && styles.dialItemSelected]}
                      onPress={() => {
                        setRecipient_phone_code(item.code);
                        setShowDialCodeModal(false);
                      }}
                    >
                      <Image
                        source={{ uri: `https://flagcdn.com/w80/${item.iso}.png` }}
                        style={styles.dialItemFlagImg}
                        resizeMode="cover"
                      />
                      <Text style={styles.dialItemCountry}>{item.country}</Text>
                      <Text style={styles.dialItemCode}>{item.code}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color="#1D6B45" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topGreenWrapper: {
    flex: 1,
    backgroundColor: "#165034",
  },
  container: {
    flex: 1,
    backgroundColor: "#165034",
  },
  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontWeight: "600",
    fontSize: 14,
  },
  notFoundText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontWeight: "700",
    fontSize: 16,
  },
  backBtnCentered: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
  },
  backBtnCenteredText: {
    color: "#A7F3D0",
    fontWeight: "700",
    fontSize: 13,
  },

  /* Header Card */
  headerCard: {
    backgroundColor: "#165034",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  headerDateText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  flightBadgeHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  flightBadgeHeaderText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* ScrollView Principale */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  delayAlertBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  delayAlertTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400E",
  },
  delayAlertDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    marginTop: 2,
  },
  delayAlertReason: {
    fontSize: 12,
    color: "#78350F",
    marginTop: 4,
    lineHeight: 16,
  },

  /* Cards Générales */
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  /* Profil GP */
  gpProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gpAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
  },
  gpAvatarInitial: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D6B45",
  },
  gpNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  gpPhoneText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  ratingReviews: {
    fontSize: 11,
    color: "#64748B",
  },
  miniWhatsappBtn: {
    backgroundColor: "#25D366",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniWhatsappBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Détails Annonce Grid */
  detailsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  detailBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailBoxLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
  },
  detailBoxValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D6B45",
  },
  detailBoxUnit: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  routeCardsContainer: {
    gap: 12,
    marginBottom: 14,
  },
  locationCardDeparture: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    borderLeftColor: "#1D6B45",
  },
  locationCardArrival: {
    backgroundColor: "#FDFBF7",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderLeftWidth: 4,
    borderLeftColor: "#D4870A",
  },
  locationCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  locationBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationBadgeGreenText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1D6B45",
    letterSpacing: 0.4,
  },
  locationBadgeAmber: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationBadgeAmberText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.4,
  },
  locationDateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  locationDateTextAmber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#78350F",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  locationLabelText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  locationCityText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  locationAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
  },
  locationAddressLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 1,
  },
  locationAddressText: {
    fontSize: 12.5,
    color: "#166534",
    fontWeight: "500",
  },
  locationAddressRowAmber: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
  },
  locationAddressLabelAmber: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 1,
  },
  locationAddressTextAmber: {
    fontSize: 12.5,
    color: "#92400E",
    fontWeight: "500",
  },
  descBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  descHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  descHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
  descText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },

  /* Formulaire */
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  openFormBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  openFormBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  totalEstimatedCard: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  totalEstimatedLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D6B45",
  },
  totalEstimatedValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D6B45",
  },
  submitOrderBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  submitOrderBtnDisabled: {
    opacity: 0.5,
  },
  submitOrderBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Non Connecté Card */
  loginRequiredCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(29, 107, 69, 0.3)",
    padding: 24,
    alignItems: "center",
  },
  loginLockCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  loginRequiredTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1D6B45",
    marginBottom: 4,
  },
  loginRequiredSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },

  /* Modal de Confirmation */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#1D6B45",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Messages d'erreur */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },
  errorRetryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B91C1C",
    textDecorationLine: "underline",
  },
  refreshErrorBox: {
    marginBottom: 0,
  },
  modalErrorBox: {
    width: "100%",
    marginTop: 12,
  },
  loadErrorWrapper: {
    flex: 1,
  },

  /* Écran de Succès */
  successContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D6B45",
    marginBottom: 8,
    textAlign: "center",
  },
  successSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 28,
  },
  whatsappBtn: {
    backgroundColor: "#25D366",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
  whatsappBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  ordersLinkBtn: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  ordersLinkText: {
    color: "#1D6B45",
    fontSize: 14,
    fontWeight: "700",
  },
  backListBtn: {
    paddingVertical: 10,
  },
  backListText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  recipientCardBox: {
    backgroundColor: "#FAF7F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2D9CC",
    padding: 14,
    marginBottom: 16,
  },
  recipientHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  recipientCardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  recipientCardSub: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 15,
  },
  phoneInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dialCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  dialCodeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  phoneInputFlex: {
    flex: 1,
  },
  dialModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  dialModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "75%",
    paddingBottom: 30,
  },
  dialModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  dialModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  dialList: {
    paddingHorizontal: 16,
  },
  dialItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  dialItemSelected: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
  },
  dialItemFlag: {
    fontSize: 20,
  },
  dialTriggerFlag: {
    width: 22,
    height: 15,
    borderRadius: 3,
    marginRight: 4,
  },
  dialItemFlagImg: {
    width: 28,
    height: 19,
    borderRadius: 3,
  },
  dialItemCountry: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  dialItemCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D6B45",
  },
  confirmRecipientBox: {
    backgroundColor: "#FAF7F2",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    width: "100%",
  },
  confirmRecipientLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  confirmRecipientValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  inputErrorBorder: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  weightErrorNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  weightErrorNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
    lineHeight: 16,
  },
});
