import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Platform,
  Linking,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Traiteur, formatWhatsAppUrl } from "../../../utils/types/traiteur";
import { getSecureToken } from "../../../utils/storage";
import { apiFetch } from "../../../utils/api";
import AddressAutocomplete from "../../../components/AddressAutocomplete";
import { verifyAddressExists } from "../../../utils/addressValidation";
import { EVENT_TYPES } from "../../../utils/constants";

export default function DevisScreen() {
  const router = useRouter();
  const { traiteurId } = useLocalSearchParams<{ traiteurId: string }>();

  const tomorrow = useMemo(() => {
    const d = new Date(Date.now() + 86400000 * 14); // Par défaut dans 2 semaines
    return d.toISOString().split("T")[0];
  }, []);

  const [traiteur, setTraiteur] = useState<Traiteur | null>(null);

  const [dateEvenement, setDateEvenement] = useState(tomorrow);
  const [nbPersonnes, setNbPersonnes] = useState("");
  const [adresse, setAdresse] = useState("");
  const [typeEvenement, setTypeEvenement] = useState("mariage");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchTraiteur() {
      const token = await getSecureToken("token");
      if (!token) {
        router.push("/login");
        return;
      }

      if (!traiteurId) return;
      try {
        const response = await apiFetch(`/traiteur/${traiteurId}`);
        if (response.ok) {
          const data = await response.json();
          if (!ignore) {
            setTraiteur(data.data?.traiteur || null);
            setIsLoggedIn(true);
          }
        }
      } catch (err) {
        console.error("Erreur récupération traiteur pour devis:", err);
      }
    }
    fetchTraiteur();
    return () => {
      ignore = true;
    };
  }, [traiteurId, router]);

  const parsedNbPersonnes = parseInt(nbPersonnes, 10);
  const isFormValid =
    Boolean(dateEvenement) &&
    !isNaN(parsedNbPersonnes) &&
    parsedNbPersonnes > 0 &&
    adresse.trim().length > 0;

  const handlePreSubmit = async () => {
    if (!dateEvenement || !nbPersonnes || !adresse.trim()) {
      setError("Merci de remplir tous les champs obligatoires (*)");
      return;
    }

    if (isNaN(parsedNbPersonnes) || parsedNbPersonnes < 1) {
      setError("Le nombre de personnes doit être d'au moins 1");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (dateEvenement < today) {
      setError("La date de l'événement ne peut pas être dans le passé");
      return;
    }

    const check = await verifyAddressExists(adresse.trim());
    if (!check.isValid) {
      setError(
        check.error ||
          "L'adresse indiquée n'a pas été reconnue. Veuillez sélectionner une adresse existante dans les suggestions."
      );
      return;
    }
    if (check.normalizedAddress && check.normalizedAddress !== adresse.trim()) {
      setAdresse(check.normalizedAddress);
    }

    setError("");
    setShowConfirmModal(true);
  };

  const confirmOrder = async () => {
    setLoading(true);
    setError("");
    const token = await getSecureToken("token");
    if (!token) {
      setError("Veuillez vous connecter pour envoyer une demande de devis.");
      setLoading(false);
      return;
    }
    try {
      const response = await apiFetch("/traiteur", {
        method: "POST",
        body: JSON.stringify({
          traiteur_id: traiteurId,
          date_evenement: dateEvenement,
          nb_personnes: parsedNbPersonnes,
          adresse: adresse.trim(),
          type_evenement: typeEvenement,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.message || "Erreur lors de la demande de devis");
        setLoading(false);
        return;
      }
      setShowConfirmModal(false);
      setSuccess(true);
    } catch (e: any) {
      console.error("Erreur devis:", e);
      setError("Une erreur est survenue lors de l'envoi de la demande.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const rawWhatsapp = traiteur?.whatsapp || (traiteur as any)?.phone || "";
    const waUrl = formatWhatsAppUrl(
      rawWhatsapp,
      `Bonjour Chef ${traiteur?.name || ""}, je viens de vous envoyer une demande de devis pour un événement sur Dabari.`
    );

    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={68} color="#1D6B45" />
            </View>
            <Text style={styles.successTitle}>Demande de devis transmise</Text>
            <Text style={styles.successDesc}>
              {traiteur?.name || "Le traiteur"} a bien reçu votre demande et vous répondra sous 24h à 48h avec une proposition sur-mesure.
            </Text>

            {Boolean(waUrl) && (
              <TouchableOpacity
                style={styles.whatsAppBtn}
                onPress={() => Linking.openURL(waUrl!)}
                activeOpacity={0.88}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.whatsAppBtnText}>Contacter le chef sur WhatsApp</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.successOrdersBtn}
              onPress={() => router.replace("/commandes")}
              activeOpacity={0.88}
            >
              <Text style={styles.successOrdersBtnText}>
                Suivre dans Mes Commandes & Devis
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successHomeBtn}
              onPress={() => router.replace(`/traiteur/${traiteurId}` as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.successHomeBtnText}>
                Retour à la fiche du chef
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Vérification du profil...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* ── 1. HEADER HERO DABARI ── */}
        <View style={styles.headerHero}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>

            <View style={styles.headerPill}>
              <Ionicons name="sparkles" size={11} color="#D4870A" />
              <Text style={styles.headerPillText}>Devis Direct Chef</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Demande de devis événement</Text>
          <Text style={styles.heroSubtitle}>
            Précisez vos souhaits pour votre réception. Le chef étudiera votre demande et vous transmettra son offre personnalisée.
          </Text>

          {/* Badges de réassurance */}
          <View style={styles.reassuranceRow}>
            <View style={styles.reassuranceBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#6EE7B7" />
              <Text style={styles.reassuranceText}>Sans engagement</Text>
            </View>
            <View style={styles.reassuranceBadge}>
              <Ionicons name="lock-closed" size={12} color="#6EE7B7" />
              <Text style={styles.reassuranceText}>Séquestre Dabari</Text>
            </View>
            <View style={styles.reassuranceBadge}>
              <Ionicons name="time" size={12} color="#FCD34D" />
              <Text style={styles.reassuranceText}>Réponse 24h-48h</Text>
            </View>
          </View>
        </View>

        {/* ── 2. CONTENU DU FORMULAIRE ── */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollPadding}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Fiche récapitulative du chef ciblé */}
          <View style={styles.targetTraiteurCard}>
            <View style={styles.targetTraiteurAvatar}>
              <Ionicons name="restaurant" size={20} color="#1D6B45" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.targetTraiteurLabel}>Traiteur sollicité :</Text>
              <Text style={styles.targetTraiteurName}>
                {traiteur ? traiteur.name : "Chargement du chef..."}
              </Text>
            </View>
            <View style={styles.verifiedMiniPill}>
              <Ionicons name="shield-checkmark" size={12} color="#1D6B45" />
              <Text style={styles.verifiedMiniPillText}>Partenaire</Text>
            </View>
          </View>

          {/* 1. Type d'Événement (Tuiles Vectorielles) */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calendar-outline" size={16} color="#1D6B45" />
              <Text style={styles.sectionTitle}>Type d'événement</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>

            <View style={styles.eventTypeGrid}>
              {EVENT_TYPES.map((evt) => {
                const isSelected = typeEvenement === evt.id;
                return (
                  <TouchableOpacity
                    key={evt.id}
                    style={[
                      styles.eventTypeTile,
                      isSelected && styles.eventTypeTileSelected,
                    ]}
                    onPress={() => setTypeEvenement(evt.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.tileIconCircle,
                        isSelected && styles.tileIconCircleSelected,
                      ]}
                    >
                      <Ionicons
                        name={evt.icon}
                        size={15}
                        color={isSelected ? "#FFFFFF" : "#1D6B45"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.tileLabel,
                        isSelected && styles.tileLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {evt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 2. Date et Nombre de personnes */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people-outline" size={16} color="#1D6B45" />
              <Text style={styles.sectionTitle}>Date & Convives</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>

            <View style={styles.formGridRow}>
              <View style={styles.formCol}>
                <Text style={styles.fieldLabel}>Date de réception *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#94A3B8"
                  value={dateEvenement}
                  onChangeText={setDateEvenement}
                />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.fieldLabel}>Nombre de convives *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Ex: 50"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={nbPersonnes}
                  onChangeText={setNbPersonnes}
                />
              </View>
            </View>

            {/* Raccourcis convives */}
            <View style={styles.guestShortcutsRow}>
              <Text style={styles.shortcutHelperText}>Suggestions :</Text>
              {["25", "50", "100", "200"].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={styles.shortcutPill}
                  onPress={() => setNbPersonnes(count)}
                >
                  <Text style={styles.shortcutPillText}>{count} pers.</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3. Lieu ou Adresse de l'événement */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="location-outline" size={16} color="#1D6B45" />
              <Text style={styles.sectionTitle}>Lieu ou Adresse de livraison</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <Text style={styles.fieldHelper}>
              Précisez l'adresse ou la ville de réception afin que le traiteur vérifie sa zone de livraison.
            </Text>

            <AddressAutocomplete
              value={adresse}
              onChangeText={setAdresse}
              onSelectAddress={(item) => setAdresse(item.label)}
              placeholder="Ex: 14 Rue de Paris, 75011 Paris..."
            />
          </View>

          {/* 4. Précisions & Souhaits du menu */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="create-outline" size={16} color="#1D6B45" />
              <Text style={styles.sectionTitle}>Notes & Exigences particulières</Text>
              <Text style={styles.optionalTag}>(optionnel)</Text>
            </View>
            <Text style={styles.fieldHelper}>
              Plats préférés, formules avec service à table ou buffet chaud, régimes halal ou sans gluten...
            </Text>

            <TextInput
              style={[styles.inputField, styles.textAreaField]}
              placeholder="Détaillez vos souhaits culinaires ou contraintes matérielles..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Message d'erreur */}
          {Boolean(error) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Bouton d'Envoi */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!isFormValid || loading) && styles.submitBtnDisabled,
            ]}
            activeOpacity={0.88}
            onPress={handlePreSubmit}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={15} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Transmettre ma demande de devis</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* ── 3. MODALE DE CONFIRMATION AVANT ENVOI ── */}
        {showConfirmModal && (
          <Modal
            transparent
            animationType="fade"
            visible={showConfirmModal}
            onRequestClose={() => setShowConfirmModal(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Ionicons name="checkmark-circle-outline" size={26} color="#1D6B45" />
                  <Text style={styles.modalTitle}>Confirmer la demande</Text>
                </View>

                <Text style={styles.modalDesc}>
                  Vous vous apprêtez à envoyer votre demande de devis à{" "}
                  <Text style={{ fontWeight: "800", color: "#0F172A" }}>
                    {traiteur?.name || "ce chef traiteur"}
                  </Text>{" "}
                  pour {nbPersonnes} convives à la date du {dateEvenement}.
                </Text>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowConfirmModal(false)}
                    disabled={loading}
                  >
                    <Text style={styles.modalCancelBtnText}>Modifier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={confirmOrder}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalConfirmBtnText}>Confirmer & Envoyer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
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
    backgroundColor: "#F8FAFC",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* ── Hero Header ── */
  headerHero: {
    backgroundColor: "#165034",
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 16,
  },
  reassuranceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  reassuranceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reassuranceText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },

  /* ── Scroll & Content ── */
  contentScroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  targetTraiteurCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  targetTraiteurAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
  },
  targetTraiteurLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  targetTraiteurName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  verifiedMiniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedMiniPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D6B45",
  },
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  requiredAsterisk: {
    color: "#EF4444",
    fontWeight: "800",
  },
  optionalTag: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  fieldHelper: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },

  /* ── Event Types Grid ── */
  eventTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  eventTypeTile: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  eventTypeTileSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#1D6B45",
  },
  tileIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  tileIconCircleSelected: {
    backgroundColor: "#1D6B45",
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    flex: 1,
  },
  tileLabelSelected: {
    color: "#166534",
    fontWeight: "800",
  },

  /* ── Forms ── */
  formGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  formCol: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  textAreaField: {
    height: 80,
  },
  guestShortcutsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  shortcutHelperText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  shortcutPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  shortcutPillText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "700",
  },

  /* ── Error Banner ── */
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBannerText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },

  /* ── Submit Button ── */
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1D6B45",
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 4,
  },
  submitBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* ── Success Screen ── */
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#A7F3D0",
    marginBottom: 6,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  successDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
  whatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "100%",
    maxWidth: 280,
    marginTop: 8,
  },
  whatsAppBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  successOrdersBtn: {
    backgroundColor: "#1D6B45",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "100%",
    maxWidth: 280,
    alignItems: "center",
  },
  successOrdersBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  successHomeBtn: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "100%",
    maxWidth: 280,
    alignItems: "center",
  },
  successHomeBtnText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },

  /* ── Modal Confirmation ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 380,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: "#1D6B45",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
