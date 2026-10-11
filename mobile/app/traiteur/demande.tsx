import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AddressAutocomplete, { AddressFeature } from "../../components/AddressAutocomplete";
import OrderEditModal, { DetailRowItem } from "../../components/OrderEditModal";
import { apiFetch } from "../../utils/api";
import { showErrorAlert } from "../../utils/alerts";
import { verifyAddressExists } from "../../utils/addressValidation";
import { DEMANDE_EVENT_TYPES as EVENT_TYPES, EventTypeOption, DISH_SUGGESTIONS } from "../../utils/constants";

let DateTimePicker: any = null;
if (Platform.OS !== "web") {
  try {
    DateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch {
    DateTimePicker = null;
  }
}

export default function DemandeTraiteurScreen() {
  const router = useRouter();

  const defaultDateObj = useMemo(() => {
    return new Date(Date.now() + 86400000);
  }, []);

  const [eventType, setEventType] = useState("Mariage");
  const [guestCount, setGuestCount] = useState("");
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(defaultDateObj);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventDate, setEventDate] = useState(() => defaultDateObj.toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [foodPreferences, setFoodPreferences] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) {
      setSelectedDateObj(date);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setEventDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  // Estimation du budget par invité
  const budgetPerGuest = useMemo(() => {
    const g = parseInt(guestCount, 10);
    const b = parseFloat(budget.replace(",", "."));
    if (g > 0 && b > 0) {
      return Math.round(b / g);
    }
    return null;
  }, [guestCount, budget]);

  // Validation du formulaire
  const isFormValid =
    eventType.trim().length > 0 &&
    eventDate.trim().length >= 8 &&
    location.trim().length >= 3 &&
    foodPreferences.trim().length >= 8;

  // Récapitulatif pour les modales de confirmation et de succès
  const modalDetails: DetailRowItem[] = useMemo(() => [
    {
      icon: "restaurant-outline",
      label: "Événement",
      value: eventType,
      isHighlight: true,
    },
    {
      icon: "calendar-outline",
      label: "Date prévue",
      value: eventDate,
    },
    {
      icon: "location-outline",
      label: "Lieu",
      value: location,
    },
    ...(guestCount.trim()
      ? [
          {
            icon: "people-outline" as const,
            label: "Invités",
            value: `${guestCount.trim()} pers.`,
          },
        ]
      : []),
    ...(budget.trim()
      ? [
          {
            icon: "cash-outline" as const,
            label: "Budget indicatif",
            value: `${budget.trim()} €`,
            isHighlight: true,
          },
        ]
      : []),
    ...(foodPreferences.trim()
      ? [
          {
            icon: "fast-food-outline" as const,
            label: "Plats / Souhaits",
            value: foodPreferences.trim(),
          },
        ]
      : []),
  ], [eventType, eventDate, location, guestCount, budget, foodPreferences]);

  // Ajouter une suggestion culinaire en un clic
  const handleAddSuggestion = (item: string) => {
    setFoodPreferences((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return item;
      if (trimmed.includes(item)) return prev;
      return `${trimmed}, ${item}`;
    });
  };

  const handleOpenConfirm = () => {
    if (!isFormValid || submitting) return;
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      const addressCheck = await verifyAddressExists(location.trim());
      if (!addressCheck.isValid) {
        showErrorAlert(
          "Lieu non reconnu",
          addressCheck.error ||
            "L'adresse ou ville indiquée n'a pas été trouvée. Veuillez sélectionner une adresse dans les suggestions."
        );
        setSubmitting(false);
        return;
      }

      const safeLocation = addressCheck.normalizedAddress || location.trim();

      const payload = {
        title: `Recherche traiteur - ${eventType}`,
        event_type: eventType,
        guest_count: guestCount.trim() ? parseInt(guestCount.trim(), 10) : null,
        event_date: eventDate.trim(),
        location: safeLocation,
        food_preferences: foodPreferences.trim(),
        budget: budget.trim() ? parseFloat(budget.trim().replace(",", ".")) : null,
        description: description.trim() || null,
      };

      const res = await apiFetch("/traiteur/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showErrorAlert(
          "Erreur",
          data.message || "Impossible de publier l'annonce pour le moment."
        );
        return;
      }

      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Erreur publication demande traiteur:", err);
      showErrorAlert("Erreur", "Une erreur inattendue est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#165034" />

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
              <Text style={styles.headerPillText}>Devis 100% Gratuits</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Déposer une annonce d'événement</Text>
          <Text style={styles.heroSubtitle}>
            Publiez gratuitement vos besoins culinaires pour recevoir les propositions sur-mesure de nos chefs partenaires.
          </Text>

          {/* Badges de réassurance */}
          <View style={styles.reassuranceRow}>
            <View style={styles.reassuranceBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#6EE7B7" />
              <Text style={styles.reassuranceText}>Séquestre Dabari</Text>
            </View>
            <View style={styles.reassuranceBadge}>
              <Ionicons name="restaurant" size={12} color="#FCD34D" />
              <Text style={styles.reassuranceText}>100% fait maison</Text>
            </View>
            <View style={styles.reassuranceBadge}>
              <Ionicons name="flash" size={12} color="#6EE7B7" />
              <Text style={styles.reassuranceText}>Réponses rapides</Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.scrollPadding}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── 2. TYPE D'ÉVÉNEMENT (TUILES VECTORIELLES) ── */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="calendar-outline" size={16} color="#1D6B45" />
                <Text style={styles.sectionTitle}>Type d'événement</Text>
                <Text style={styles.requiredAsterisk}>*</Text>
              </View>

              <View style={styles.eventTypeGrid}>
                {EVENT_TYPES.map((t) => {
                  const isSelected = eventType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.eventTypeTile,
                        isSelected && styles.eventTypeTileSelected,
                      ]}
                      onPress={() => setEventType(t.id)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.tileIconCircle,
                          isSelected && styles.tileIconCircleSelected,
                        ]}
                      >
                        <Ionicons
                          name={t.icon}
                          size={16}
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
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── 3. DATE ET NOMBRE DE CONVIVES ── */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="people-outline" size={16} color="#1D6B45" />
                <Text style={styles.sectionTitle}>Date & Nombre d'invités</Text>
              </View>

              <View style={styles.formGridRow}>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>Date prévue *</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#1D6B45" />
                    <Text style={styles.datePickerBtnText}>
                      {selectedDateObj.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>Nombre de convives</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Ex: 50"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={guestCount}
                    onChangeText={setGuestCount}
                  />
                </View>
              </View>

              {/* Raccourcis convives */}
              <View style={styles.guestShortcutsRow}>
                <Text style={styles.shortcutHelperText}>Suggestions :</Text>
                {["20", "50", "100", "200"].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={styles.shortcutPill}
                    onPress={() => setGuestCount(count)}
                  >
                    <Text style={styles.shortcutPillText}>{count} pers.</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── 4. LIEU DE L'ÉVÉNEMENT ── */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="location-outline" size={16} color="#1D6B45" />
                <Text style={styles.sectionTitle}>Lieu de l'événement</Text>
                <Text style={styles.requiredAsterisk}>*</Text>
              </View>
              <Text style={styles.fieldHelper}>
                Indiquez la ville ou l'adresse où se déroulera la réception.
              </Text>

              <AddressAutocomplete
                value={location}
                onChangeText={setLocation}
                onSelectAddress={(item: AddressFeature) => {
                  setLocation(item.label);
                }}
                placeholder="Ex: Paris, Lyon, Marseille, Dakar..."
              />
            </View>

            {/* ── 5. PLATS SOUHAITÉS & SUGGESTIONS CULINAIRES ── */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="restaurant-outline" size={16} color="#1D6B45" />
                <Text style={styles.sectionTitle}>Plats & Souhaits culinaires</Text>
                <Text style={styles.requiredAsterisk}>*</Text>
              </View>

              <Text style={styles.fieldHelper}>
                Décrivez les spécialités désirées, entrées, accompagnements ou régimes (Halal, végétarien).
              </Text>

              <TextInput
                style={[styles.inputField, styles.textAreaField]}
                placeholder="Ex: Thiéboudienne rouge au mérou, Alloco & Dibi d'agneau braisé, Pastels croustillants..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={foodPreferences}
                onChangeText={setFoodPreferences}
              />

              {/* Suggestions en un clic */}
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Ajouter en un clic :</Text>
                <View style={styles.suggestionsWrap}>
                  {DISH_SUGGESTIONS.map((dish) => (
                    <TouchableOpacity
                      key={dish}
                      style={styles.suggestionPill}
                      onPress={() => handleAddSuggestion(dish)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add" size={12} color="#1D6B45" />
                      <Text style={styles.suggestionText}>{dish}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* ── 6. BUDGET ESTIMÉ & DÉTAILS COMPLÉMENTAIRES ── */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="cash-outline" size={16} color="#D4870A" />
                <Text style={styles.sectionTitle}>Budget estimé & Précisions</Text>
              </View>

              <View style={styles.formCol}>
                <Text style={styles.fieldLabel}>Budget global estimé (€ TTC)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Ex: 1500"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={budget}
                  onChangeText={setBudget}
                />
              </View>

              {budgetPerGuest !== null && (
                <View style={styles.budgetPerGuestBox}>
                  <Ionicons name="calculator-outline" size={15} color="#166534" />
                  <Text style={styles.budgetPerGuestText}>
                    Estimation : env. {budgetPerGuest} € par convive
                  </Text>
                </View>
              )}

              <View style={[styles.formCol, { marginTop: 12 }]}>
                <Text style={styles.fieldLabel}>Détails supplémentaires (optionnel)</Text>
                <TextInput
                  style={[styles.inputField, styles.textAreaFieldSmall]}
                  placeholder="Horaires de service, matériel fourni, contraintes particulières de salle..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>

            {/* ── 7. BOUTON D'ACTION PRINCIPAL ── */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!isFormValid || submitting) && styles.submitBtnDisabled,
              ]}
              disabled={!isFormValid || submitting}
              onPress={handleOpenConfirm}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Publier mon annonce</Text>
                </>
              )}
            </TouchableOpacity>

            {!isFormValid && (
              <Text style={styles.formNoticeText}>
                Veuillez compléter le type d'événement, la date, le lieu et vos souhaits culinaires pour activer la publication.
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── MODALE DE CONFIRMATION DE PUBLICATION ── */}
        <OrderEditModal
          visible={showConfirmModal}
          type="confirm"
          service="event"
          title="Confirmer la publication"
          subtitle="Voulez-vous publier cette annonce pour votre événement ?"
          details={modalDetails}
          noticeText="Votre annonce sera visible auprès de nos chefs partenaires certifiés qui vous enverront leurs propositions sans engagement."
          confirmLabel="Confirmer & Publier"
          cancelLabel="Modifier"
          isLoading={submitting}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />

        {/* ── MODALE DE SUCCÈS ADAPTÉE AUX COULEURS DE L'APPLICATION ── */}
        <OrderEditModal
          visible={showSuccessModal}
          type="success"
          service="event"
          title="Annonce publiée avec succès !"
          subtitle="Votre besoin événementiel a bien été partagé avec nos chefs partenaires certifiés."
          details={modalDetails}
          noticeText="Leurs propositions apparaîtront dans votre espace Devis & Annonces. Vous serez notifié(e) dès qu'un chef vous répondra."
          confirmLabel="Voir mes devis & annonces"
          onConfirm={() => {
            setShowSuccessModal(false);
            router.push("/commandes");
          }}
        />

        {/* DatePicker Modale iOS / Native Android */}
        {Platform.OS === "ios" && DateTimePicker && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.dateModalBackdrop}>
              <View style={styles.dateModalCard}>
                <View style={styles.dateModalHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateModalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateModalTitle}>Date de l'événement</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateModalConfirmText}>Valider</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDateObj}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onValueChange={handleDateChange}
                  onDismiss={() => setShowDatePicker(false)}
                  textColor="#0F172A"
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === "android" && DateTimePicker && showDatePicker && (
          <DateTimePicker
            value={selectedDateObj}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onValueChange={handleDateChange}
            onDismiss={() => setShowDatePicker(false)}
          />
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
    backgroundColor: "#165034",
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
    backgroundColor: "#F8FAFC",
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
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
  textAreaFieldSmall: {
    height: 60,
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

  /* ── Suggestions Culinaires ── */
  suggestionsContainer: {
    gap: 6,
    marginTop: 4,
  },
  suggestionsTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  suggestionText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
  },

  /* ── Budget ── */
  budgetPerGuestBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginTop: 4,
  },
  budgetPerGuestText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
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
  formNoticeText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 12,
  },

  /* ── Confirmation Modal ── */
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
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSummaryBox: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  modalSummaryRow: {
    fontSize: 12,
    color: "#334155",
  },
  modalSummaryLabel: {
    fontWeight: "700",
    color: "#64748B",
  },
  modalReassurance: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
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

  /* ── Date Picker ── */
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  datePickerBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  dateModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dateModalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  dateModalConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1D6B45",
  },
});
