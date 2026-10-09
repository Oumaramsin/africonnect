import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AddressAutocomplete, { AddressFeature } from "../../components/AddressAutocomplete";
import { apiFetch } from "../../utils/api";
import { verifyAddressExists } from "../../utils/addressValidation";

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

export default function DemandeTraiteurScreen() {
  const router = useRouter();

  const [eventType, setEventType] = useState("Mariage");
  const [guestCount, setGuestCount] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [foodPreferences, setFoodPreferences] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Validation: required fields are eventType, eventDate, location, and foodPreferences (min 10 chars)
  const isFormValid =
    eventType.trim().length > 0 &&
    eventDate.trim().length >= 8 &&
    location.trim().length >= 3 &&
    foodPreferences.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      const addressCheck = await verifyAddressExists(location.trim());
      if (!addressCheck.isValid) {
        Alert.alert(
          "Lieu non reconnu",
          addressCheck.error ||
            "L'adresse ou ville indiquée n'a pas été trouvée. Veuillez sélectionner une adresse existante dans les suggestions."
        );
        setSubmitting(false);
        return;
      }

      const safeLocation = addressCheck.normalizedAddress || location.trim();

      const payload = {
        title: `Recherche de traiteur - ${eventType}`,
        event_type: eventType,
        guest_count: guestCount.trim() ? parseInt(guestCount.trim(), 10) : null,
        event_date: eventDate.trim(),
        location: safeLocation,
        food_preferences: foodPreferences.trim(),
        budget: budget.trim() ? parseFloat(budget.trim()) : null,
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
        Alert.alert(
          "Erreur",
          data.message || "Impossible de publier l'annonce pour le moment.",
        );
        return;
      }

      Alert.alert(
        "Annonce publiée ! 🎉",
        "Votre recherche de traiteur est désormais visible par nos traiteurs partenaires. Leurs devis apparaîtront dans la section Devis & Annonces.",
        [
          {
            text: "Voir mes annonces",
            onPress: () => router.push("/commandes"),
          },
        ],
      );
    } catch (err: any) {
      console.error("Erreur publication demande traiteur:", err);
      Alert.alert("Erreur", "Une erreur inattendue est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trouver un traiteur</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Bannière intro */}
            <View style={styles.bannerCard}>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={14} color="#FDE68A" />
                <Text style={styles.badgeText}>Service sur-mesure</Text>
              </View>
              <Text style={styles.bannerTitle}>
                Publiez votre événement gratuitement
              </Text>
              <Text style={styles.bannerDesc}>
                Indiquez vos besoins. Les traiteurs intéressés vous enverront
                directement leurs offres tarifaires et menus personnalisés.
              </Text>
            </View>

            {/* Type d'événement */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Type d&apos;événement <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.chipsGrid}>
                {EVENT_TYPES.map((t) => {
                  const isSelected = eventType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                      onPress={() => setEventType(t.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date et Nombre d'invités */}
            <View style={styles.sectionCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Date de l&apos;événement{" "}
                  <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 2026-06-20 ou 15 Juillet 2026"
                  placeholderTextColor="#94A3B8"
                  value={eventDate}
                  onChangeText={setEventDate}
                />
              </View>

              <View style={[styles.fieldGroup, { marginTop: 14 }]}>
                <Text style={styles.label}>
                  Nombre d&apos;invités{" "}
                  <Text style={styles.optional}>(optionnel)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 50"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={guestCount}
                  onChangeText={setGuestCount}
                />
              </View>
            </View>

            {/* Lieu / Ville */}
            <View style={styles.sectionCard}>
              <Text style={styles.label}>
                Lieu ou Ville de l&apos;événement{" "}
                <Text style={styles.required}>*</Text>
              </Text>
              <AddressAutocomplete
                value={location}
                onChangeText={setLocation}
                onSelectAddress={(item: AddressFeature) => {
                  setLocation(item.label);
                }}
                placeholder="Ex: Paris, Lyon, Dakar..."
              />
            </View>

            {/* Nourriture & Préférences culinaires */}
            <View style={styles.sectionCard}>
              <Text style={styles.label}>
                Nourriture et plats souhaités{" "}
                <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.fieldHelper}>
                Ex: Thiéboudienne, Alloco, Poulet DG, Pastels, options
                végétariennes, boissons traditionnelles...
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez ce que vous souhaitez servir à vos convives..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={foodPreferences}
                onChangeText={setFoodPreferences}
              />
            </View>

            {/* Budget & Précisions */}
            <View style={styles.sectionCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Budget estimé en €{" "}
                  <Text style={styles.optional}>(optionnel)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 800"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={budget}
                  onChangeText={setBudget}
                />
              </View>

              <View style={[styles.fieldGroup, { marginTop: 14 }]}>
                <Text style={styles.label}>
                  Précisions supplémentaires{" "}
                  <Text style={styles.optional}>(optionnel)</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textAreaSm]}
                  placeholder="Horaires, contraintes de salle, service à table ou buffet..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>

            {/* Bouton de publication */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !isFormValid && styles.submitBtnDisabled,
              ]}
              disabled={!isFormValid || submitting}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane"
                    size={18}
                    color={isFormValid ? "#FFFFFF" : "#94A3B8"}
                  />
                  <Text
                    style={[
                      styles.submitBtnText,
                      !isFormValid && styles.submitBtnTextDisabled,
                    ]}
                  >
                    Publier ma recherche
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!isFormValid && (
              <Text style={styles.validationNotice}>
                Veuillez renseigner le type d&apos;événement, la date, le lieu
                et vos souhaits de nourriture (min. 10 caractères) pour activer
                la publication.
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topGreenWrapper: {
    flex: 1,
    backgroundColor: "#1D6B45",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: "#1D6B45",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  badgeText: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "700",
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  bannerDesc: {
    color: "#E2E8F0",
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
  },
  required: {
    color: "#EF4444",
  },
  optional: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "normal",
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#1D6B45",
  },
  chipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#1D6B45",
    fontWeight: "700",
  },
  fieldGroup: {},
  label: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
  },
  fieldHelper: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: {
    height: 100,
  },
  textAreaSm: {
    height: 70,
  },
  submitBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  submitBtnTextDisabled: {
    color: "#94A3B8",
  },
  validationNotice: {
    textAlign: "center",
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 10,
    lineHeight: 16,
  },
});
