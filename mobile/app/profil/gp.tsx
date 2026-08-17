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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../utils/storage";
import { GpListing } from "../../utils/types/gp";
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

export default function GpProfilScreen() {
  const router = useRouter();

  const [view, setView] = useState<"annonces" | "edit">("annonces");
  const [gpListings, setGpListings] = useState<GpListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteGpId, setDeleteGpId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editGpId, setEditGpId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [departureCity, setDepartureCity] = useState("");
  const [departureCountry, setDepartureCountry] = useState("France");
  const [arrivalCity, setArrivalCity] = useState("");
  const [arrivalCountry, setArrivalCountry] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [flightType, setFlightType] = useState<"direct" | "escale">("direct");
  const [availableKg, setAvailableKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [description, setDescription] = useState("");

  const [isCustomDepartureCity, setIsCustomDepartureCity] = useState(false);
  const [isCustomDepartureCountry, setIsCustomDepartureCountry] =
    useState(false);
  const [isCustomArrivalCity, setIsCustomArrivalCity] = useState(false);
  const [isCustomArrivalCountry, setIsCustomArrivalCountry] = useState(false);

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

  const loadMyGpListings = async () => {
    setIsLoading(true);
    setError(null);
    const token = await getSecureToken("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await apiFetch("/gp/me");
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error || "Erreur lors de la récupération de vos annonces",
        );
        return;
      }
      setGpListings(data.data.gp || []);
    } catch (err) {
      setError("Impossible de contacter le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMyGpListings();
    }, []),
  );

  const handleDeleteGp = async () => {
    if (!deleteGpId) return;
    setIsDeleting(true);

    try {
      const response = await apiFetch(`/gp/${deleteGpId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || "Erreur lors de la suppression");
      }

      setGpListings((prev) => prev.filter((item) => item.id !== deleteGpId));
      setDeleteGpId(null);
    } catch (err: any) {
      setError(err.message || "Erreur de suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const startEdit = (item: GpListing) => {
    setEditGpId(item.id);
    setDepartureCity(item.departure_city || "");
    setDepartureCountry(item.departure_country || "France");
    setArrivalCity(item.arrival_city || "");
    setArrivalCountry(item.arrival_country || "");
    setDepartureDate(
      item.departure_date
        ? new Date(item.departure_date).toISOString().split("T")[0]
        : "",
    );
    setFlightType((item.flight_type as "direct" | "escale") || "direct");
    setAvailableKg(item.available_kg ? item.available_kg.toString() : "");
    setPricePerKg(item.price_per_kg ? item.price_per_kg.toString() : "");
    setPickupCity(item.pickup_city || "");
    setPickupAddress(item.pickup_address || "");
    setDescription(item.description || "");

    setIsCustomDepartureCity(!CITIES_DEPARTURE.includes(item.departure_city));
    setIsCustomDepartureCountry(
      !COUNTRIES_DEPARTURE.includes(item.departure_country || "France"),
    );
    setIsCustomArrivalCity(!CITIES_ARRIVAL.includes(item.arrival_city));
    setIsCustomArrivalCountry(
      !COUNTRIES_ARRIVAL.includes(item.arrival_country || ""),
    );

    setView("edit");
  };

  const handleSaveEdit = async () => {
    if (!editGpId) return;
    setIsSaving(true);
    setError(null);

    const kgNum = parseFloat(availableKg.replace(",", "."));
    const priceNum = parseFloat(pricePerKg.replace(",", "."));

    if (isNaN(kgNum) || kgNum <= 0) {
      setError("Les kilos disponibles doivent être supérieurs à 0.");
      setIsSaving(false);
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Le tarif au kg doit être supérieur à 0.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await apiFetch(`/gp/${editGpId}`, {
        method: "PATCH",
        body: JSON.stringify({
          departure_city: departureCity,
          departure_country: departureCountry,
          arrival_city: arrivalCity,
          arrival_country: arrivalCountry,
          departure_date: departureDate,
          available_kg: kgNum,
          price_per_kg: priceNum,
          flight_type: flightType,
          pickup_address: pickupAddress,
          pickup_city: pickupCity,
          description: description,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Erreur de mise à jour");
      }

      const updatedItem = resData.data.gp;
      setGpListings((prev) =>
        prev.map((item) => (item.id === editGpId ? updatedItem : item)),
      );
      setView("annonces");
    } catch (err: any) {
      setError(err.message || "Impossible de sauvegarder la modification.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/profil" as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Profil</Text>
          </TouchableOpacity>

          <View style={styles.headerProfileRow}>
            <View style={styles.planeIconCircle}>
              <Ionicons name="airplane" size={26} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Espace GP</Text>
              <Text style={styles.headerSubtitle}>
                Gère tes envois et trajets
              </Text>
            </View>
          </View>

          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabChip,
                view === "annonces" && styles.tabChipActive,
              ]}
              onPress={() => setView("annonces")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cube"
                size={14}
                color={view === "annonces" ? "#1D6B45" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabChipText,
                  view === "annonces" && styles.tabChipTextActive,
                ]}
              >
                Mes annonces
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabChip}
              onPress={() => router.push("/gp/nouveau")}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.tabChipText}>Publier</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Boolean(error) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#B91C1C" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {view === "annonces" && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Trajets en cours</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {gpListings.length}{" "}
                    {gpListings.length > 1 ? "annonces" : "annonce"}
                  </Text>
                </View>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1D6B45" />
                  <Text style={styles.loadingText}>
                    Chargement de vos annonces...
                  </Text>
                </View>
              ) : gpListings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="airplane-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>Aucune annonce publiée</Text>
                  <Text style={styles.emptySub}>
                    Proposez vos kilos disponibles aux expéditeurs en publiant
                    votre premier trajet.
                  </Text>
                  <TouchableOpacity
                    style={styles.createFirstBtn}
                    onPress={() => router.push("/gp/nouveau")}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.createFirstBtnText}>
                      Publier ma première annonce
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.listingsList}>
                  {gpListings.map((item) => (
                    <View key={item.id} style={styles.annonceCard}>
                      <View style={styles.cardActiveBar} />

                      <View style={styles.cardHeader}>
                        <View style={styles.routeRow}>
                          <View style={styles.cityCol}>
                            <Text style={styles.cityName}>
                              {item.departure_city}
                            </Text>
                            <Text style={styles.countryName}>
                              {item.departure_country || "France"}
                            </Text>
                          </View>

                          <Ionicons
                            name="arrow-forward"
                            size={18}
                            color="#94A3B8"
                          />

                          <View style={styles.cityCol}>
                            <Text
                              style={[styles.cityName, { color: "#1D6B45" }]}
                            >
                              {item.arrival_city}
                            </Text>
                            <Text
                              style={[
                                styles.countryName,
                                { color: "rgba(29, 107, 69, 0.7)" },
                              ]}
                            >
                              {item.arrival_country || ""}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.statusBadgeActive}>
                          <Text style={styles.statusBadgeActiveText}>
                            Actif
                          </Text>
                        </View>
                      </View>

                      <View style={styles.metricsBox}>
                        <View style={styles.metricItem}>
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color="#64748B"
                          />
                          <Text style={styles.metricItemText}>
                            {formatDate(item.departure_date)}
                          </Text>
                        </View>

                        <View style={styles.dividerVertical} />

                        <View style={styles.metricItem}>
                          <Ionicons
                            name="cube-outline"
                            size={14}
                            color="#64748B"
                          />
                          <Text style={styles.metricItemText}>
                            {Number(item.available_kg)} kg
                          </Text>
                        </View>

                        <View style={styles.dividerVertical} />

                        <View style={styles.metricItem}>
                          <Text style={styles.metricItemLabel}>Prix/kg</Text>
                          <Text style={styles.metricItemPrice}>
                            {Number(item.price_per_kg)} €
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.editActionBtn}
                          onPress={() => startEdit(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="create-outline"
                            size={15}
                            color="#2563EB"
                          />
                          <Text style={styles.editActionBtnText}>Modifier</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteActionBtn}
                          onPress={() => setDeleteGpId(item.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color="#DC2626"
                          />
                          <Text style={styles.deleteActionBtnText}>
                            Supprimer
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {view === "edit" && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Modifier le trajet</Text>
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => setView("annonces")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelEditBtnText}>Annuler</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>
                  <Ionicons name="airplane-outline" size={16} color="#1D6B45" />{" "}
                  Itinéraire
                </Text>

                <View style={styles.inputGridRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>VILLE DE DÉPART *</Text>
                    <TouchableOpacity
                      style={styles.selectBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        openPicker(
                          "Ville de départ",
                          CITIES_DEPARTURE,
                          (val) => {
                            if (val.includes("Autre")) {
                              setIsCustomDepartureCity(true);
                              setDepartureCity("");
                            } else {
                              setIsCustomDepartureCity(false);
                              setDepartureCity(val);
                            }
                          },
                        )
                      }
                    >
                      <Text style={styles.selectBtnText}>
                        {isCustomDepartureCity
                          ? "Autre (Saisie libre)"
                          : departureCity || "Choisir"}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>

                    {isCustomDepartureCity && (
                      <TextInput
                        style={[styles.input, { marginTop: 6 }]}
                        value={departureCity}
                        onChangeText={setDepartureCity}
                        placeholder="Saisissez la ville..."
                        placeholderTextColor="#94A3B8"
                      />
                    )}
                  </View>

                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>PAYS DE DÉPART *</Text>
                    <TouchableOpacity
                      style={styles.selectBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        openPicker(
                          "Pays de départ",
                          COUNTRIES_DEPARTURE,
                          (val) => {
                            if (val.includes("Autre")) {
                              setIsCustomDepartureCountry(true);
                              setDepartureCountry("");
                            } else {
                              setIsCustomDepartureCountry(false);
                              setDepartureCountry(val);
                            }
                          },
                        )
                      }
                    >
                      <Text style={styles.selectBtnText}>
                        {isCustomDepartureCountry
                          ? "Autre (Saisie libre)"
                          : departureCountry || "Choisir"}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>

                    {isCustomDepartureCountry && (
                      <TextInput
                        style={[styles.input, { marginTop: 6 }]}
                        value={departureCountry}
                        onChangeText={setDepartureCountry}
                        placeholder="Saisissez le pays..."
                        placeholderTextColor="#94A3B8"
                      />
                    )}
                  </View>
                </View>

                <View style={styles.arrowRow}>
                  <Ionicons
                    name="arrow-down-circle"
                    size={24}
                    color="#1D6B45"
                  />
                </View>

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
                      <Text style={styles.selectBtnText}>
                        {isCustomArrivalCity
                          ? "Autre (Saisie libre)"
                          : arrivalCity || "Choisir"}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>

                    {isCustomArrivalCity && (
                      <TextInput
                        style={[styles.input, { marginTop: 6 }]}
                        value={arrivalCity}
                        onChangeText={setArrivalCity}
                        placeholder="Saisissez la ville..."
                        placeholderTextColor="#94A3B8"
                      />
                    )}
                  </View>

                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>PAYS D'ARRIVÉE *</Text>
                    <TouchableOpacity
                      style={styles.selectBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        openPicker(
                          "Pays d'arrivée",
                          COUNTRIES_ARRIVAL,
                          (val) => {
                            if (val.includes("Autre")) {
                              setIsCustomArrivalCountry(true);
                              setArrivalCountry("");
                            } else {
                              setIsCustomArrivalCountry(false);
                              setArrivalCountry(val);
                            }
                          },
                        )
                      }
                    >
                      <Text style={styles.selectBtnText}>
                        {isCustomArrivalCountry
                          ? "Autre (Saisie libre)"
                          : arrivalCountry || "Choisir"}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>

                    {isCustomArrivalCountry && (
                      <TextInput
                        style={[styles.input, { marginTop: 6 }]}
                        value={arrivalCountry}
                        onChangeText={setArrivalCountry}
                        placeholder="Saisissez le pays..."
                        placeholderTextColor="#94A3B8"
                      />
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>
                  <Ionicons name="calendar-outline" size={16} color="#1D6B45" />{" "}
                  Détails du vol
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>DATE DE DÉPART *</Text>
                  <View style={styles.dateInputWrapper}>
                    <Ionicons name="calendar" size={18} color="#1D6B45" />
                    <TextInput
                      style={styles.dateInput}
                      value={departureDate}
                      onChangeText={setDepartureDate}
                      placeholder="AAAA-MM-JJ"
                      placeholderTextColor="#94A3B8"
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
                      <Text style={styles.flightTypeRadioText}>Direct</Text>
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
                      <Text style={styles.flightTypeRadioText}>Escale</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>
                  <Ionicons name="cube-outline" size={16} color="#1D6B45" />{" "}
                  Capacité & Tarif
                </Text>

                <View style={styles.inputGridRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>KILOS DISPONIBLES *</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={availableKg}
                      onChangeText={(val) =>
                        setAvailableKg(val.replace(/[^0-9.,]/g, ""))
                      }
                      placeholder="Ex: 10"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>PRIX PAR KG (€) *</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={pricePerKg}
                      onChangeText={(val) =>
                        setPricePerKg(val.replace(/[^0-9.,]/g, ""))
                      }
                      placeholder="Ex: 8"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>
                  <Ionicons name="location-outline" size={16} color="#1D6B45" />{" "}
                  Point de remise
                </Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    QUARTIER / ARRONDISSEMENT
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={pickupCity}
                    onChangeText={setPickupCity}
                    placeholder="Ex: Paris 10e"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>ADRESSE PRÉCISE</Text>
                  <TextInput
                    style={styles.input}
                    value={pickupAddress}
                    onChangeText={setPickupAddress}
                    placeholder="Ex: Gare du Nord"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>
                  <Ionicons name="create-outline" size={16} color="#1D6B45" />{" "}
                  Présentation
                </Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Décrivez vos conditions..."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                disabled={isSaving}
                onPress={handleSaveEdit}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveBtnText}>
                      Enregistrer les modifications
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
          visible={Boolean(deleteGpId)}
          onRequestClose={() => !isDeleting && setDeleteGpId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash-outline" size={28} color="#DC2626" />
              </View>

              <Text style={styles.modalTitle}>Supprimer ce trajet ?</Text>
              <Text style={styles.modalSub}>
                Cette action est irréversible. Le trajet sera définitivement
                effacé de la plateforme.
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  disabled={isDeleting}
                  onPress={() => setDeleteGpId(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  disabled={isDeleting}
                  onPress={handleDeleteGp}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalDeleteBtnText}>
                      Oui, supprimer
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
    marginBottom: 14,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  planeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 10,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  tabChipActive: {
    backgroundColor: "#FFFFFF",
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabChipTextActive: {
    color: "#1D6B45",
  },

  /* ScrollView Main */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 16,
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

  /* Sections */
  sectionContainer: {
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  countBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
  },

  /* Loading State */
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },

  /* Empty State */
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  createFirstBtn: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createFirstBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Cartes d'annonce */
  listingsList: {
    gap: 14,
  },
  annonceCard: {
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
    position: "relative",
    overflow: "hidden",
  },
  cardActiveBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#1D6B45",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cityCol: {
    alignItems: "flex-start",
  },
  cityName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  countryName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  statusBadgeActive: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActiveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D6B45",
  },

  /* Metrics Box */
  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricItemText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  metricItemLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  metricItemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D6B45",
  },
  dividerVertical: {
    width: 1,
    height: 18,
    backgroundColor: "#CBD5E1",
  },

  /* Card Actions */
  cardActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  editActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  editActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  deleteActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  deleteActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },

  /* Écran de modification */
  cancelEditBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cancelEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  /* Section Form Cards */
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
    marginBottom: 12,
  },
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
  saveBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  saveBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* Modales */
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
  deleteIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF2F2",
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
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalDeleteBtnText: {
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
