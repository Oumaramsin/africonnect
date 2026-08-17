import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../utils/storage";
import { apiFetch } from "../../utils/api";

const CITIES_DEPARTURE = [
  "Paris",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Toulouse",
  "Lille",
  "Bruxelles",
  "Genève",
  "Autre (Saisie libre)",
];

const COUNTRIES_DEPARTURE = [
  "France",
  "Belgique",
  "Suisse",
  "Canada",
  "Autre (Saisie libre)",
];

const CITIES_ARRIVAL = [
  "Dakar",
  "Abidjan",
  "Douala",
  "Yaoundé",
  "Brazzaville",
  "Bamako",
  "Conakry",
  "Ouagadougou",
  "Autre (Saisie libre)",
];

const COUNTRIES_ARRIVAL = [
  "Sénégal",
  "Côte d'Ivoire",
  "Cameroun",
  "Congo",
  "Mali",
  "Guinée",
  "Burkina Faso",
  "Gabon",
  "Madagascar",
  "Maroc",
  "Algérie",
  "Tunisie",
  "Autre (Saisie libre)",
];

export default function NouveauGpScreen() {
  const router = useRouter();

  const tomorrow = new Date(Date.now() + 86400000);
  const minDateStr = tomorrow.toISOString().split("T")[0];

  const [departureCity, setDepartureCity] = useState("Paris");
  const [isCustomDepartureCity, setIsCustomDepartureCity] = useState(false);

  const [departureCountry, setDepartureCountry] = useState("France");
  const [isCustomDepartureCountry, setIsCustomDepartureCountry] =
    useState(false);

  const [arrivalCity, setArrivalCity] = useState("Dakar");
  const [isCustomArrivalCity, setIsCustomArrivalCity] = useState(false);

  const [arrivalCountry, setArrivalCountry] = useState("Sénégal");
  const [isCustomArrivalCountry, setIsCustomArrivalCountry] = useState(false);

  const [departureDate, setDepartureDate] = useState(minDateStr);
  const [flightType, setFlightType] = useState<"direct" | "escale">("direct");
  const [availableKg, setAvailableKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const token = await getSecureToken("token");
        if (!token) {
          router.push("/login");
          return;
        }
        setIsLoggedIn(true);
      };
      load();
    }, []),
  );

  const onSubmit = async () => {
    setLoading(true);
    setError(null);

    const token = await getSecureToken("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await apiFetch("/gp", {
        method: "POST",
        body: JSON.stringify({
          departure_city: departureCity,
          departure_country: departureCountry,
          arrival_city: arrivalCity,
          arrival_country: arrivalCountry,
          departure_date: departureDate,
          available_kg: parseFloat(availableKg.replace(",", ".")),
          price_per_kg: parseFloat(pricePerKg.replace(",", ".")),
          flight_type: flightType,
          pickup_address: pickupAddress,
          pickup_city: pickupCity,
          description: description,
        }),
      });

      const dataR = await response.json();
      if (!response.ok) {
        setError(
          dataR.error || dataR.message || "Erreur lors de la publication.",
        );
        setShowConfirmModal(false);
        setLoading(false);
        return;
      }

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    onSelect: (val: string) => void;
  }>({
    visible: false,
    title: "",
    options: [],
    onSelect: () => {},
  });

  const openPicker = (
    title: string,
    options: string[],
    onSelect: (val: string) => void,
  ) => {
    setPickerConfig({
      visible: true,
      title,
      options,
      onSelect,
    });
  };

  const handleAvailableKgChange = (val: string) => {
    const clean = val.replace(/[^0-9.,]/g, "");
    setAvailableKg(clean);
    const num = parseFloat(clean.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      setError("Les kilos disponibles doivent être supérieurs à 0 kg.");
    } else {
      setError(null);
    }
  };

  const handlePricePerKgChange = (val: string) => {
    const clean = val.replace(/[^0-9.,]/g, "");
    setPricePerKg(clean);
    const num = parseFloat(clean.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      setError("Le tarif au kg doit être supérieur à 0 €.");
    } else {
      setError(null);
    }
  };

  const kgNum = parseFloat(availableKg.replace(",", "."));
  const priceNum = parseFloat(pricePerKg.replace(",", "."));
  const isKgInvalid = isNaN(kgNum) || kgNum <= 0;
  const isPriceInvalid = isNaN(priceNum) || priceNum <= 0;

  const isSubmitDisabled =
    Boolean(error) ||
    isKgInvalid ||
    isPriceInvalid ||
    loading ||
    !departureCity.trim() ||
    !departureCountry.trim() ||
    !arrivalCity.trim() ||
    !arrivalCountry.trim();

  const handlePreSubmit = () => {
    if (!departureCity.trim() || !departureCountry.trim()) {
      setError("Veuillez indiquer la ville et le pays de départ.");
      return;
    }

    if (!arrivalCity.trim() || !arrivalCountry.trim()) {
      setError("Veuillez indiquer la ville et le pays d'arrivée.");
      return;
    }

    if (isNaN(kgNum) || kgNum <= 0) {
      setError("Le nombre de kilos disponibles doit être supérieur à 0.");
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Le prix par kg doit être un montant valide supérieur à 0.");
      return;
    }

    const selectedDate = new Date(departureDate);
    const minAllowedDate = new Date();
    minAllowedDate.setHours(0, 0, 0, 0);

    if (isNaN(selectedDate.getTime()) || selectedDate < minAllowedDate) {
      setError("La date de départ doit être ultérieure à aujourd'hui.");
      return;
    }

    setError(null);
    setShowConfirmModal(true);
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

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

          <Text style={styles.headerTitle}>Publier une annonce</Text>
          <Text style={styles.headerSubtitle}>
            Tu voyages ? Propose tes kilos disponibles aux expéditeurs.
          </Text>
        </View>

        {/* Formulaire */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Itinéraire */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="airplane-outline" size={16} color="#1D6B45" />{" "}
              Itinéraire
            </Text>

            {/* Départ : Ville & Pays */}
            <View style={styles.inputGridRow}>
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>VILLE DE DÉPART *</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    openPicker("Ville de départ", CITIES_DEPARTURE, (val) => {
                      if (val.includes("Autre")) {
                        setIsCustomDepartureCity(true);
                        setDepartureCity("");
                      } else {
                        setIsCustomDepartureCity(false);
                        setDepartureCity(val);
                      }
                    })
                  }
                >
                  <Text
                    style={[
                      styles.selectBtnText,
                      !departureCity && styles.placeholderText,
                    ]}
                  >
                    {isCustomDepartureCity
                      ? "Autre (Saisie libre)"
                      : departureCity || "Choisir une ville"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>

                {isCustomDepartureCity && (
                  <TextInput
                    style={[styles.input, { marginTop: 6 }]}
                    value={departureCity}
                    onChangeText={setDepartureCity}
                    placeholder="Saisissez votre ville..."
                    placeholderTextColor="#94A3B8"
                    autoFocus
                  />
                )}
              </View>

              {/* Pays de départ */}
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>PAYS DE DÉPART *</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    openPicker("Pays de départ", COUNTRIES_DEPARTURE, (val) => {
                      if (val.includes("Autre")) {
                        setIsCustomDepartureCountry(true);
                        setDepartureCountry("");
                      } else {
                        setIsCustomDepartureCountry(false);
                        setDepartureCountry(val);
                      }
                    })
                  }
                >
                  <Text
                    style={[
                      styles.selectBtnText,
                      !departureCountry && styles.placeholderText,
                    ]}
                  >
                    {isCustomDepartureCountry
                      ? "Autre (Saisie libre)"
                      : departureCountry || "Choisir un pays"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>

                {isCustomDepartureCountry && (
                  <TextInput
                    style={[styles.input, { marginTop: 6 }]}
                    value={departureCountry}
                    onChangeText={setDepartureCountry}
                    placeholder="Saisissez votre pays..."
                    placeholderTextColor="#94A3B8"
                    autoFocus
                  />
                )}
              </View>
            </View>

            <View style={styles.arrowRow}>
              <Ionicons name="arrow-down-circle" size={24} color="#1D6B45" />
            </View>

            {/* Arrivée : Ville & Pays */}
            <View style={styles.inputGridRow}>
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>VILLE D'ARRIVÉE *</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    openPicker("Ville d'arrivée", CITIES_ARRIVAL, (val) => {
                      if (val.includes("Autre")) {
                        setIsCustomArrivalCity(true);
                        setArrivalCity("");
                      } else {
                        setIsCustomArrivalCity(false);
                        setArrivalCity(val);
                      }
                    })
                  }
                >
                  <Text
                    style={[
                      styles.selectBtnText,
                      !arrivalCity && styles.placeholderText,
                    ]}
                  >
                    {isCustomArrivalCity
                      ? "Autre (Saisie libre)"
                      : arrivalCity || "Choisir une ville"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>

                {isCustomArrivalCity && (
                  <TextInput
                    style={[styles.input, { marginTop: 6 }]}
                    value={arrivalCity}
                    onChangeText={setArrivalCity}
                    placeholder="Ex: Ziguinchor, Bouaké..."
                    placeholderTextColor="#94A3B8"
                    autoFocus
                  />
                )}
              </View>

              {/* Pays d'arrivée */}
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>PAYS D'ARRIVÉE *</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    openPicker("Pays d'arrivée", COUNTRIES_ARRIVAL, (val) => {
                      if (val.includes("Autre")) {
                        setIsCustomArrivalCountry(true);
                        setArrivalCountry("");
                      } else {
                        setIsCustomArrivalCountry(false);
                        setArrivalCountry(val);
                      }
                    })
                  }
                >
                  <Text
                    style={[
                      styles.selectBtnText,
                      !arrivalCountry && styles.placeholderText,
                    ]}
                  >
                    {isCustomArrivalCountry
                      ? "Autre (Saisie libre)"
                      : arrivalCountry || "Choisir un pays"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>

                {isCustomArrivalCountry && (
                  <TextInput
                    style={[styles.input, { marginTop: 6 }]}
                    value={arrivalCountry}
                    onChangeText={setArrivalCountry}
                    placeholder="Saisissez votre pays..."
                    placeholderTextColor="#94A3B8"
                    autoFocus
                  />
                )}
              </View>
            </View>
          </View>

          {/* DÉTAILS DU VOL */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="calendar-outline" size={16} color="#1D6B45" />{" "}
              Détails du vol
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                DATE DE DÉPART * (DÈS DEMAIN)
              </Text>
              <View style={styles.dateInputWrapper}>
                <Ionicons name="calendar" size={18} color="#1D6B45" />
                <TextInput
                  style={styles.dateInput}
                  value={departureDate}
                  onChangeText={setDepartureDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === "web"
                    ? ({ type: "date", min: minDateStr } as any)
                    : {})}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TYPE DE VOL *</Text>
              <View style={styles.flightTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.flightTypeRadio,
                    flightType === "direct" && styles.flightTypeRadioActive,
                  ]}
                  onPress={() => setFlightType("direct")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      flightType === "direct"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={18}
                    color={flightType === "direct" ? "#1D6B45" : "#94A3B8"}
                  />
                  <Text style={styles.flightTypeRadioText}>Vol Direct</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.flightTypeRadio,
                    flightType === "escale" && styles.flightTypeRadioActive,
                  ]}
                  onPress={() => setFlightType("escale")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      flightType === "escale"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={18}
                    color={flightType === "escale" ? "#1D6B45" : "#94A3B8"}
                  />
                  <Text style={styles.flightTypeRadioText}>Avec Escale</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* CAPACITÉ & TARIF */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="cube-outline" size={16} color="#1D6B45" />{" "}
              Capacité & Tarif
            </Text>

            <View style={styles.inputGridRow}>
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>
                  KILOS DISPONIBLES * (&gt; 0)
                </Text>
                <TextInput
                  style={[styles.input, isKgInvalid && styles.inputError]}
                  keyboardType="decimal-pad"
                  value={availableKg}
                  onChangeText={handleAvailableKgChange}
                  placeholder="Ex: 10"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>
                  PRIX PAR KG (€) * (&gt; 0)
                </Text>
                <TextInput
                  style={[styles.input, isPriceInvalid && styles.inputError]}
                  keyboardType="decimal-pad"
                  value={pricePerKg}
                  onChangeText={handlePricePerKgChange}
                  placeholder="Ex: 8"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>

          {/* POINT DE REMISE */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="location-outline" size={16} color="#1D6B45" />{" "}
              Point de remise
            </Text>
            <Text style={styles.cardSectionSub}>
              Où les expéditeurs peuvent déposer leur colis avant le départ
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>QUARTIER / ARRONDISSEMENT</Text>
              <TextInput
                style={styles.input}
                value={pickupCity}
                onChangeText={setPickupCity}
                placeholder="Ex: Paris 10e, Aubervilliers..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ADRESSE PRÉCISE (OPTIONNEL)</Text>
              <TextInput
                style={styles.input}
                value={pickupAddress}
                onChangeText={setPickupAddress}
                placeholder="Ex: Gare du Nord, Paris"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* PRÉSENTATION & CONDITIONS */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>
              <Ionicons name="create-outline" size={16} color="#1D6B45" />{" "}
              Présentation
            </Text>
            <Text style={styles.cardSectionSub}>
              Décris-toi et tes conditions pour rassurer les expéditeurs
            </Text>

            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Voyageur régulier. Pas de liquides ni produits périssables..."
              placeholderTextColor="#94A3B8"
            />
          </View>

          {Boolean(error) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#B91C1C" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              isSubmitDisabled && styles.submitBtnDisabled,
            ]}
            activeOpacity={0.85}
            disabled={isSubmitDisabled}
            onPress={handlePreSubmit}
          >
            <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Publier mon annonce</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          transparent
          animationType="slide"
          visible={pickerConfig.visible}
          onRequestClose={() =>
            setPickerConfig((prev) => ({ ...prev, visible: false }))
          }
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() =>
              setPickerConfig((prev) => ({ ...prev, visible: false }))
            }
          >
            <View style={styles.pickerModalCard}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>
                  {pickerConfig.title}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setPickerConfig((prev) => ({ ...prev, visible: false }))
                  }
                >
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }}>
                {pickerConfig.options.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.pickerOptionItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      pickerConfig.onSelect(opt);
                      setPickerConfig((prev) => ({ ...prev, visible: false }));
                    }}
                  >
                    <View style={styles.pickerOptionLeft}>
                      {opt.includes("Autre") && (
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color="#1D6B45"
                          style={{ marginRight: 6 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.pickerOptionText,
                          opt.includes("Autre") &&
                            styles.pickerOptionTextCustom,
                        ]}
                      >
                        {opt}
                      </Text>
                    </View>

                    {opt.includes("Autre") ? (
                      <Ionicons name="pencil" size={16} color="#1D6B45" />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#94A3B8"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={showConfirmModal}
          onRequestClose={() => !loading && setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="airplane" size={28} color="#1D6B45" />
              </View>

              <Text style={styles.modalTitle}>Publier l'annonce</Text>
              <Text style={styles.modalSub}>
                Es-tu sûr(e) de vouloir publier cette annonce pour ton trajet de{" "}
                <Text style={{ fontWeight: "800", color: "#0F172A" }}>
                  {departureCity || "Paris"}
                </Text>{" "}
                vers{" "}
                <Text style={{ fontWeight: "800", color: "#1D6B45" }}>
                  {arrivalCity || "Dakar"}
                </Text>{" "}
                le{" "}
                <Text style={{ fontWeight: "800", color: "#0F172A" }}>
                  {departureDate}
                </Text>{" "}
                ?
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  disabled={loading}
                  onPress={() => setShowConfirmModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  disabled={loading}
                  onPress={onSubmit}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Oui, publier</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={showSuccessModal}
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View
                style={[styles.modalIconCircle, { backgroundColor: "#E8F5E9" }]}
              >
                <Ionicons name="checkmark-circle" size={48} color="#1D6B45" />
              </View>

              <Text style={styles.modalTitle}>Annonce publiée ! 🎉</Text>
              <Text style={styles.modalSub}>
                Ton annonce est désormais en ligne. Les expéditeurs peuvent
                réserver des kilos sur ton trajet.
              </Text>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { width: "100%" }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push("/gp");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmBtnText}>
                  Voir les annonces →
                </Text>
              </TouchableOpacity>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
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

  /* Banner Erreur */
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 16,
    padding: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#B91C1C",
  },

  /* Cards Formulaire */
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
    marginBottom: 4,
  },
  cardSectionSub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 14,
  },

  /* Champs Saisie Grid */
  inputGridRow: {
    flexDirection: "row",
    gap: 12,
  },
  flexField: {
    flex: 1,
  },
  fieldGroup: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6,
  },
  selectBtn: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  placeholderText: {
    color: "#94A3B8",
    fontWeight: "400",
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
  inputError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  dateInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  arrowRow: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },

  /* Radio Types de Vol */
  flightTypeRow: {
    flexDirection: "row",
    gap: 12,
  },
  flightTypeRadio: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
  },
  flightTypeRadioActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#1D6B45",
  },
  flightTypeRadioText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* Sécurité Banner */
  securityInfoBanner: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  securityInfoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 2,
  },
  securityInfoSub: {
    fontSize: 11,
    color: "#B45309",
    lineHeight: 15,
  },

  /* Bouton Soumission */
  submitBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* Modale Overlay General */
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

  /* Picker Bottom Sheet */
  pickerModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  pickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  pickerOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  pickerOptionTextCustom: {
    color: "#1D6B45",
    fontWeight: "800",
  },
});
