import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../utils/api";
import AddressAutocomplete, { AddressFeature } from "../../components/AddressAutocomplete";
import OrderEditModal, { DetailRowItem } from "../../components/OrderEditModal";
import { showErrorAlert } from "../../utils/alerts";
import { verifyAddressExists } from "../../utils/addressValidation";

let DateTimePicker: any = null;
if (Platform.OS !== "web") {
  try {
    DateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch (e) {
    DateTimePicker = null;
  }
}

const EVENT_TYPES = [
  { id: "Mariage", label: "Mariage 💍" },
  { id: "Anniversaire", label: "Anniversaire 🎂" },
  { id: "Baptême", label: "Baptême 👶" },
  { id: "Buffet / Cocktail", label: "Buffet 🍢" },
  { id: "Fête de famille", label: "Famille 👨‍👩‍👧‍👦" },
  { id: "Dîner privé", label: "Dîner privé 🍽️" },
  { id: "Événement pro", label: "Événement pro 💼" },
  { id: "Autre", label: "Autre ✨" },
];

export default function EditTraiteurRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);

  // DatePicker state
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modales
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Valeurs initiales
  const [initialData, setInitialData] = useState<{
    eventType: string;
    eventDate: string;
    guestCount: string;
    location: string;
    foodPreferences: string;
    budget: string;
    description: string;
  } | null>(null);

  const [eventType, setEventType] = useState("Mariage");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [location, setLocation] = useState("");
  const [foodPreferences, setFoodPreferences] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!id) return;
    loadRequestDetails();
  }, [id]);

  const loadRequestDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/traiteur/requests/${id}`);
      if (!res.ok) {
        throw new Error("Impossible de charger la recherche de traiteur.");
      }
      const data = await res.json();
      const req = data.data?.request || data.request || data.data;
      if (!req) {
        throw new Error("Recherche traiteur introuvable.");
      }

      if (req.status !== "open") {
        showErrorAlert(
          "Action impossible",
          "Cette recherche n'est plus modifiable car elle a été pourvue ou clôturée.",
          () => router.replace("/commandes"),
        );
        return;
      }

      setRequest(req);

      const rawDate = req.event_date;
      const initDate = rawDate
        ? typeof rawDate === "string"
          ? rawDate.split("T")[0]
          : new Date(rawDate).toISOString().split("T")[0]
        : "";

      const initType = req.event_type || "Mariage";
      const initGuests = req.guest_count !== null && req.guest_count !== undefined ? String(req.guest_count) : "";
      const initLoc = req.location || "";
      const initFood = req.food_preferences || "";
      const initBudget = req.budget !== null && req.budget !== undefined ? String(req.budget) : "";
      const initDesc = req.description || "";

      setEventType(initType);
      setEventDate(initDate);
      setGuestCount(initGuests);
      setLocation(initLoc);
      setFoodPreferences(initFood);
      setBudget(initBudget);
      setDescription(initDesc);

      if (initDate) {
        const d = new Date(initDate);
        if (!isNaN(d.getTime())) setSelectedDate(d);
      }

      setInitialData({
        eventType: initType,
        eventDate: initDate,
        guestCount: initGuests,
        location: initLoc,
        foodPreferences: initFood,
        budget: initBudget,
        description: initDesc,
      });
    } catch (e: any) {
      showErrorAlert(
        "Erreur",
        e.message || "Erreur de chargement de l'annonce.",
        () => router.replace("/commandes"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(date);
      chosen.setHours(0, 0, 0, 0);

      if (chosen < today) {
        showErrorAlert(
          "Date non valide",
          "La date de l'événement ne peut pas être antérieure à aujourd'hui.",
        );
        return;
      }

      setSelectedDate(date);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setEventDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  const norm = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
  const normNum = (v: unknown) => {
    const s = norm(v);
    return s === "" ? "" : String(Number(s.replace(",", ".")));
  };

  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    if (norm(eventType) !== norm(initialData.eventType)) return true;
    if (norm(eventDate) !== norm(initialData.eventDate)) return true;
    if (normNum(guestCount) !== normNum(initialData.guestCount)) return true;
    if (norm(location) !== norm(initialData.location)) return true;
    if (norm(foodPreferences) !== norm(initialData.foodPreferences)) return true;
    if (normNum(budget) !== normNum(initialData.budget)) return true;
    if (norm(description) !== norm(initialData.description)) return true;
    return false;
  }, [initialData, eventType, eventDate, guestCount, location, foodPreferences, budget, description]);

  const handleSaveClick = async () => {
    if (!hasChanges || validatingAddress || isSaving) return;

    if (!eventDate.trim() || !location.trim() || !foodPreferences.trim()) {
      showErrorAlert("Champs manquants", "Veuillez renseigner tous les champs obligatoires (*).");
      return;
    }

    if (guestCount.trim() !== "" && (parseInt(guestCount, 10) <= 0 || isNaN(parseInt(guestCount, 10)))) {
      showErrorAlert("Erreur", "Le nombre d'invités doit être supérieur à 0.");
      return;
    }

    if (budget.trim() !== "" && (parseFloat(budget.replace(",", ".")) <= 0 || isNaN(parseFloat(budget.replace(",", "."))))) {
      showErrorAlert("Erreur", "Le budget doit être supérieur à 0 €.");
      return;
    }

    setValidatingAddress(true);
    try {
      const check = await verifyAddressExists(location.trim());
      if (!check.isValid) {
        showErrorAlert(
          "Lieu introuvable",
          check.error || "L'adresse ou la ville indiquée n'a pas été reconnue. Veuillez choisir une suggestion."
        );
        setValidatingAddress(false);
        return;
      }
      if (check.normalizedAddress && check.normalizedAddress !== location.trim()) {
        setLocation(check.normalizedAddress);
      }
      setShowConfirmModal(true);
    } catch (err: any) {
      setShowConfirmModal(true);
    } finally {
      setValidatingAddress(false);
    }
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      const parsedGuest = guestCount.trim() ? parseInt(guestCount.trim(), 10) : null;
      const parsedBudget = budget.trim() ? parseFloat(budget.trim().replace(",", ".")) : null;

      const payload = {
        title: `Recherche traiteur - ${eventType}`,
        event_type: eventType,
        event_date: eventDate,
        guest_count: parsedGuest,
        location: location.trim(),
        food_preferences: foodPreferences.trim(),
        budget: parsedBudget,
        description: description.trim() || null,
      };

      const res = await apiFetch(`/traiteur/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Erreur lors de la modification");
      }

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (e: any) {
      showErrorAlert("Erreur", e.message || "Impossible de sauvegarder l'annonce.");
    } finally {
      setIsSaving(false);
    }
  };

  const modalDetails: DetailRowItem[] = [
    {
      icon: "calendar-outline",
      label: "Événement & Date",
      value: `${eventType} • ${eventDate}`,
      isHighlight: true,
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
            value: `${guestCount} personnes`,
          },
        ]
      : []),
    ...(budget.trim()
      ? [
          {
            icon: "cash-outline" as const,
            label: "Budget",
            value: `${budget} €`,
          },
        ]
      : []),
    {
      icon: "restaurant-outline",
      label: "Spécialités",
      value: foodPreferences,
    },
  ];

  if (loading) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Chargement de l'annonce...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Modifier la recherche</Text>
            <Text style={styles.headerSubtitle}>
              Recherche de traiteur • Annonce active
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Type d'événement */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Type d'événement *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventChipsContainer}
              >
                {EVENT_TYPES.map((t) => {
                  const isSel = eventType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.chip, isSel && styles.chipActive]}
                      onPress={() => setEventType(t.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Date & Invités */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Date de l'événement *</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color="#1D6B45" />
                <Text style={styles.datePickerText}>
                  {eventDate || "Choisir une date"}
                </Text>
              </TouchableOpacity>

              {showDatePicker && Platform.OS !== "web" && DateTimePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}

              {/* Input direct si web ou fallback */}
              {(Platform.OS === "web" || !DateTimePicker) && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={eventDate}
                  onChangeText={setEventDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#94A3B8"
                />
              )}

              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionLabel}>Nombre d'invités (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={guestCount}
                  onChangeText={setGuestCount}
                  placeholder="Ex: 50"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Lieu / Adresse */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Lieu ou Adresse précise *</Text>
              <AddressAutocomplete
                value={location}
                onChangeText={setLocation}
                onSelectAddress={(item: AddressFeature) => {
                  setLocation(item.label);
                }}
                placeholder="Ex: 12 Rue de Paris, Fresnes ou Dakar..."
              />
            </View>

            {/* Spécialités & Budget */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>
                Préférences culinaires / Plats souhaités *
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                multiline
                numberOfLines={3}
                value={foodPreferences}
                onChangeText={setFoodPreferences}
                placeholder="Ex: Tieboudienne, Pastels, Poulet Yassa, Aloco..."
                placeholderTextColor="#94A3B8"
              />

              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionLabel}>Budget indicatif global (€)</Text>
                <TextInput
                  style={styles.input}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="Ex: 600"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionLabel}>Détails supplémentaires</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Précisions sur les horaires, matériel, service..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Bouton Enregistrer Centré */}
            <View style={styles.footerCentered}>
              <TouchableOpacity
                style={[
                  styles.saveBtnCentered,
                  (!hasChanges || validatingAddress || isSaving) && styles.saveBtnDisabled,
                ]}
                onPress={handleSaveClick}
                disabled={!hasChanges || validatingAddress || isSaving}
                activeOpacity={0.85}
              >
                {validatingAddress ? (
                  <View style={styles.saveBtnContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Vérification de l'adresse...</Text>
                  </View>
                ) : isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.saveBtnContent}>
                    <Ionicons
                      name={hasChanges ? "checkmark-circle" : "lock-closed-outline"}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveBtnText}>
                      {hasChanges
                        ? "Enregistrer les modifications"
                        : "Aucune modification"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal de Confirmation */}
        <OrderEditModal
          visible={showConfirmModal}
          type="confirm"
          service="devis"
          title="Confirmer les modifications"
          subtitle="Voulez-vous enregistrer ces changements pour votre recherche de traiteur ?"
          details={modalDetails}
          noticeText="Les traiteurs partenaires recevront les détails mis à jour pour adapter leurs propositions."
          confirmLabel="Oui, enregistrer l'annonce"
          cancelLabel="Continuer d'éditer"
          isLoading={isSaving}
          onConfirm={performSave}
          onCancel={() => setShowConfirmModal(false)}
        />

        {/* Modal de Succès */}
        <OrderEditModal
          visible={showSuccessModal}
          type="success"
          service="devis"
          title="Annonce mise à jour ! 🎉"
          subtitle="Votre recherche de traiteur a été actualisée avec succès."
          details={modalDetails}
          confirmLabel="Retour à mes commandes"
          onConfirm={() => {
            setShowSuccessModal(false);
            router.replace("/commandes");
          }}
          onCancel={() => {
            setShowSuccessModal(false);
            router.replace("/commandes");
          }}
        />
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  header: {
    backgroundColor: "#165034",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  eventChipsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#1D6B45",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipTextActive: {
    color: "#1D6B45",
    fontWeight: "800",
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  datePickerText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  footerCentered: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  saveBtnCentered: {
    backgroundColor: "#1D6B45",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
