import React, { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Traiteur } from "../../../utils/types/traiteur";
import { getSecureToken } from "../../../utils/storage";
import { apiFetch } from "../../../utils/api";
import AddressAutocomplete from "../../../components/AddressAutocomplete";

let DateTimePicker: any = null;
if (Platform.OS !== "web") {
  try {
    DateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch (e) {
    DateTimePicker = null;
  }
}

const EVENT_TYPES = [
  {
    id: "mariage",
    label: "Mariage",
    icon: "heart-outline",
    iconActive: "heart",
  },
  {
    id: "bapteme",
    label: "Baptême",
    icon: "footsteps-outline",
    iconActive: "footsteps",
  },
  {
    id: "anniversaire",
    label: "Anniversaire",
    icon: "gift-outline",
    iconActive: "gift",
  },
  {
    id: "reception",
    label: "Réception",
    icon: "wine-outline",
    iconActive: "wine",
  },
  {
    id: "entreprise",
    label: "Entreprise",
    icon: "briefcase-outline",
    iconActive: "briefcase",
  },
  {
    id: "autre",
    label: "Autre",
    icon: "sparkles-outline",
    iconActive: "sparkles",
  },
];

export default function DevisScreen() {
  const router = useRouter();
  const { traiteurId } = useLocalSearchParams<{ traiteurId: string }>();

  const [traiteur, setTraiteur] = useState<Traiteur | null>(null);

  // États locaux uniquement pour l'interactivité visuelle
  const [dateEvenement, setDateEvenement] = useState("");
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
          setTraiteur(data.data?.traiteur || null);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error("Erreur récupération traiteur pour devis:", err);
      }
    }
    fetchTraiteur();
  }, [traiteurId]);

  // Calendrier pour mobile
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 14);
    return nextMonth;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setDateEvenement(`${yyyy}-${mm}-${dd}`);
    }
  };

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
    const waNumber = rawWhatsapp.replace(/\+/g, "").replace(/\s/g, "");
    const waUrl = `https://wa.me/${waNumber}?text=Bonjour%2C%20je%20viens%20de%20demander%20un%20devis%20sur%20Dabari.`;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={72} color="#1D6B45" />
          </View>
          <Text style={styles.successTitle}>Demande de Devis Envoyée !</Text>
          <Text style={styles.successDesc}>
            {traiteur?.name || "Le traiteur"} a bien reçu votre demande et vous
            recontactera très rapidement.
          </Text>

          {waNumber !== "" && (
            <TouchableOpacity
              style={styles.whatsAppBtn}
              onPress={() => Linking.openURL(waUrl)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.whatsAppBtnText}>Contacter sur WhatsApp</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.successHomeBtn}
            onPress={() => router.replace(`/traiteur/${traiteurId}` as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.successHomeBtnText}>
              Retour au profil traiteur
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#1D6B45", fontWeight: "700" }}>
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          <View style={styles.heroRow}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="restaurant" size={26} color="#1D6B45" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Demande de Devis Événement</Text>
              <Text style={styles.heroSub}>
                Remplissez les détails de votre réception pour recevoir une
                proposition personnalisée.
              </Text>
            </View>
          </View>
        </View>

        {/* Scrollable Form Content */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainFormCard}>
            {/* Traiteur info box */}
            <View style={styles.targetTraiteurCard}>
              <View style={styles.targetTraiteurAvatar}>
                <Ionicons name="storefront" size={20} color="#1D6B45" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.targetTraiteurLabel}>
                  Traiteur sélectionné :
                </Text>
                <Text style={styles.targetTraiteurName}>
                  {traiteur ? traiteur.name : "Chargement du traiteur..."}
                </Text>
              </View>
            </View>
            
            {/* 1. Type d'Événement */}
            <View style={styles.formFieldGroup}>
              <Text style={styles.fieldLabel}>Type d'événement *</Text>
              <View style={styles.eventTypesGrid}>
                {EVENT_TYPES.map((evt) => {
                  const isSelected = typeEvenement === evt.id;
                  return (
                    <TouchableOpacity
                      key={evt.id}
                      style={[
                        styles.eventTypePill,
                        isSelected ? styles.eventTypePillActive : undefined,
                      ]}
                      onPress={() => setTypeEvenement(evt.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={(isSelected ? evt.iconActive : evt.icon) as any}
                        size={16}
                        color={isSelected ? "#1D6B45" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.eventTypePillText,
                          isSelected
                            ? styles.eventTypePillTextActive
                            : undefined,
                        ]}
                      >
                        {evt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Date de l'événement */}
            <View style={styles.formFieldGroup}>
              <Text style={styles.fieldLabel}>Date de l'événement *</Text>
              {Platform.OS === "web" ? (
                <TextInput
                  style={styles.textInput}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#9CA3AF"
                  value={dateEvenement}
                  onChangeText={setDateEvenement}
                />
              ) : (
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color="#1D6B45" />
                  <Text style={styles.pickerBtnText}>
                    {dateEvenement
                      ? selectedDate.toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "Choisir la date de l'événement *"}
                  </Text>
                </TouchableOpacity>
              )}

              {Boolean(
                Platform.OS !== "web" && DateTimePicker && showDatePicker,
              ) && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* 3. Nombre de Personnes */}
            <View style={styles.formFieldGroup}>
              <Text style={styles.fieldLabel}>
                Nombre de convives (personnes) *
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 50, 100, 250..."
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={nbPersonnes}
                onChangeText={setNbPersonnes}
              />
            </View>

            {/* 4. Lieu / Adresse de l'événement */}
            <View style={[styles.formFieldGroup, { zIndex: 50 }]}>
              <Text style={styles.fieldLabel}>
                Lieu ou Adresse de l'événement *
              </Text>
              <AddressAutocomplete
                value={adresse}
                onChangeText={setAdresse}
                onSelectAddress={(item) => setAdresse(item.label)}
                placeholder="Ex: Salle des Fêtes, 75011 Paris..."
              />
            </View>

            {/* 5. Précisions & Demandes particulières */}
            <View style={styles.formFieldGroup}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.fieldLabel}>
                  Notes & Exigences particulières
                </Text>
                <Text style={styles.optionalTag}> (optionnel)</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Menu souhaité, régimes alimentaires, logistique..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Alert Error Box */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#B91C1C"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Bouton d'Envoi */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!isFormValid || loading) && styles.submitBtnDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handlePreSubmit}
              disabled={!isFormValid || loading}
            >
              <Ionicons
                name="send"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.submitBtnText}>
                {loading ? "Envoi en cours..." : "Envoyer ma demande de devis"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pop-up (Modale) de confirmation */}
          {Boolean(showConfirmModal) && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Confirmer la demande de devis
                </Text>
                <Text style={styles.modalDesc}>
                  {`Êtes-vous sûr(e) de vouloir envoyer cette demande de devis à ${
                    traiteur?.name || "ce traiteur"
                  } pour ${
                    nbPersonnes ? `${nbPersonnes} personnes` : "votre événement"
                  } ?`}
                </Text>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowConfirmModal(false)}
                    disabled={loading}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={() => {
                      setShowConfirmModal(false);
                      confirmOrder();
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.modalConfirmText}>
                      {loading ? "Envoi..." : "Oui, envoyer"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
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
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  headerCard: {
    backgroundColor: "#165034",
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 6,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    fontWeight: "700",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 16,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* Unified Main Form Card */
  mainFormCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    gap: 20,
  },
  /* Target Traiteur Card */
  targetTraiteurCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  targetTraiteurAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  targetTraiteurLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  targetTraiteurName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  targetTraiteurRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  targetTraiteurRatingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D4870A",
  },

  formFieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  optionalTag: {
    fontSize: 13,
    fontWeight: "400",
    color: "#9CA3AF",
    marginBottom: 4,
  },

  /* Event Types Grid */
  eventTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  eventTypePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  eventTypePillActive: {
    borderColor: "#1D6B45",
    backgroundColor: "#E8F5E9",
  },
  eventTypePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  eventTypePillTextActive: {
    color: "#1D6B45",
    fontWeight: "800",
  },

  /* Inputs & Pickers */
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
  },
  textAreaInput: {
    height: 90,
    textAlignVertical: "top",
  },
  pickerBtn: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  /* Submit Button */
  submitBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* WhatsApp & Success Styles */
  whatsAppBtn: {
    backgroundColor: "#25D366",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginBottom: 12,
  },
  whatsAppBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Error Box */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  /* Modal Overlay */
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
    marginBottom: 20,
  },
  modalPriceHighlight: {
    fontWeight: "800",
    color: "#1D6B45",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  modalCancelText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#1D6B45",
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Success Screen */
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
  successDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  successHomeBtn: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },
  successHomeBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
