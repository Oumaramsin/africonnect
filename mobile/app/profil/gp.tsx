import React, { useCallback, useMemo, useState } from "react";
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
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../utils/storage";
import { GpListing, GP_COUNTRIES } from "../../utils/types/gp";
import { apiFetch } from "../../utils/api";
import AddressAutocomplete, {
  getQuarterOrCityFromAddress,
} from "../../components/AddressAutocomplete";

import { COMMON_CITIES_WITH_OTHER as COMMON_CITIES } from "../../utils/constants/locations";

let DateTimePicker: any = null;
if (Platform.OS !== "web") {
  try {
    DateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch {
    DateTimePicker = null;
  }
}

const CITIES_DEPARTURE = COMMON_CITIES;
const COUNTRIES_DEPARTURE = [...GP_COUNTRIES];

const CITIES_ARRIVAL = COMMON_CITIES;
const COUNTRIES_ARRIVAL = [...GP_COUNTRIES];

export default function GpProfilScreen() {
  const router = useRouter();

  const [view, setView] = useState<"annonces" | "edit">("annonces");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [gpListings, setGpListings] = useState<GpListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suppression
  const [deleteGpId, setDeleteGpId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Retard
  const [delayModalItem, setDelayModalItem] = useState<GpListing | null>(null);
  const [newArrivalDate, setNewArrivalDate] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [submittingDelay, setSubmittingDelay] = useState(false);

  // Modification
  const [editGpId, setEditGpId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialEditData, setInitialEditData] = useState<{
    departureCity: string;
    departureCountry: string;
    arrivalCity: string;
    arrivalCountry: string;
    departureDate: string;
    arrivalDate: string;
    flightType: "direct" | "escale";
    availableKg: string;
    pricePerKg: string;
    pickupCity: string;
    pickupAddress: string;
    dropoffCity: string;
    dropoffAddress: string;
    description: string;
  } | null>(null);

  const [departureCity, setDepartureCity] = useState("");
  const [departureCountry, setDepartureCountry] = useState("France");
  const [arrivalCity, setArrivalCity] = useState("");
  const [arrivalCountry, setArrivalCountry] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);

  const minAllowedDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const parseDateSafe = (str: string, fallback: Date): Date => {
    if (!str) return fallback;
    const parts = str.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    return fallback;
  };

  const toDateString = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10),
        );
        return d.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const departureDateObj = useMemo(() => {
    return parseDateSafe(departureDate, new Date());
  }, [departureDate]);

  const arrivalMinDate = useMemo(() => {
    return parseDateSafe(departureDate, minAllowedDate);
  }, [departureDate, minAllowedDate]);

  const arrivalDateObj = useMemo(() => {
    return parseDateSafe(arrivalDate, arrivalMinDate);
  }, [arrivalDate, arrivalMinDate]);

  const isDateRangeInvalid = useMemo(() => {
    if (!departureDate || !arrivalDate) return false;
    return departureDate > arrivalDate;
  }, [departureDate, arrivalDate]);

  const isDeparturePast = useMemo(() => {
    if (!departureDate) return false;
    const d = parseDateSafe(departureDate, new Date());
    d.setHours(0, 0, 0, 0);
    return d < minAllowedDate;
  }, [departureDate, minAllowedDate]);

  const dateError = isDateRangeInvalid
    ? "La date de départ ne peut pas être postérieure à la date d'arrivée."
    : isDeparturePast
    ? "La date de départ ne peut pas être antérieure à aujourd'hui."
    : null;

  const handleDepartureDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === "android") setShowDeparturePicker(false);
    if (event?.type === "dismissed") return;
    if (selected) {
      const nextDep = toDateString(selected);
      setDepartureDate(nextDep);
      if (arrivalDate && arrivalDate < nextDep) {
        setArrivalDate("");
      }
      setError(null);
    }
  };

  const handleArrivalDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === "android") setShowArrivalPicker(false);
    if (event?.type === "dismissed") return;
    if (selected) {
      const nextArr = toDateString(selected);
      setArrivalDate(nextArr);
      setError(null);
    }
  };

  const [flightType, setFlightType] = useState<"direct" | "escale">("direct");
  const [availableKg, setAvailableKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [description, setDescription] = useState("");

  const [isCustomDepartureCity, setIsCustomDepartureCity] = useState(false);
  const [isCustomDepartureCountry, setIsCustomDepartureCountry] = useState(false);
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
          data.error || "Erreur lors de la récupération de vos annonces GP.",
        );
        return;
      }
      setGpListings(data.data.gp || []);
    } catch (err) {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMyGpListings();
    }, []),
  );

  // Statistiques calculées
  const activeCount = useMemo(
    () => gpListings.filter((item) => item.is_active).length,
    [gpListings],
  );
  const inactiveCount = useMemo(
    () => gpListings.filter((item) => !item.is_active).length,
    [gpListings],
  );
  const totalKg = useMemo(
    () =>
      gpListings.reduce(
        (acc, item) => acc + (Number(item.available_kg) || 0),
        0,
      ),
    [gpListings],
  );
  const potentialRevenue = useMemo(
    () =>
      gpListings.reduce(
        (acc, item) =>
          acc +
          (Number(item.available_kg) || 0) * (Number(item.price_per_kg) || 0),
        0,
      ),
    [gpListings],
  );

  const filteredListings = useMemo(() => {
    if (statusFilter === "active") {
      return gpListings.filter((item) => item.is_active);
    }
    if (statusFilter === "inactive") {
      return gpListings.filter((item) => !item.is_active);
    }
    return gpListings;
  }, [gpListings, statusFilter]);

  const toggleListingActive = async (id: string, currentStatus: boolean) => {
    setError(null);
    // Optimistic update
    setGpListings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_active: !currentStatus } : item,
      ),
    );

    try {
      const res = await apiFetch(`/gp/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!res.ok) {
        // Rollback
        setGpListings((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_active: currentStatus } : item,
          ),
        );
        const resData = await res.json();
        setError(resData.error || "Impossible de mettre à jour le statut du vol.");
      }
    } catch (e) {
      setGpListings((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_active: currentStatus } : item,
        ),
      );
      setError("Erreur de connexion.");
    }
  };

  const handleDeleteGp = async () => {
    if (!deleteGpId) return;
    setIsDeleting(true);

    try {
      const response = await apiFetch(`/gp/${deleteGpId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || "Erreur lors de la suppression.");
      }

      setGpListings((prev) => prev.filter((item) => item.id !== deleteGpId));
      setDeleteGpId(null);
    } catch (err: any) {
      setError(err.message || "Impossible de supprimer l'annonce.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDelayModal = (item: GpListing) => {
    setDelayModalItem(item);
    setNewArrivalDate(
      item.arrival_date
        ? new Date(item.arrival_date).toISOString().split("T")[0]
        : "",
    );
    setDelayReason(item.delay_reason || "");
  };

  const handleReportDelay = async () => {
    if (!delayModalItem || !newArrivalDate.trim()) {
      setError("Veuillez indiquer la nouvelle date d'arrivée estimée.");
      return;
    }
    setSubmittingDelay(true);
    setError(null);

    try {
      const response = await apiFetch(`/gp/${delayModalItem.id}/delay`, {
        method: "PATCH",
        body: JSON.stringify({
          arrival_date: newArrivalDate.trim(),
          delay_reason: delayReason.trim() || undefined,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(
          resData.error || "Erreur lors du signalement du retard.",
        );
      }

      setGpListings((prev) =>
        prev.map((item) =>
          item.id === delayModalItem.id
            ? {
                ...item,
                is_delayed: true,
                arrival_date: newArrivalDate.trim(),
                delay_reason: delayReason.trim(),
              }
            : item,
        ),
      );
      setDelayModalItem(null);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement du retard.");
    } finally {
      setSubmittingDelay(false);
    }
  };

  const startEdit = (item: GpListing) => {
    setEditGpId(item.id);
    const depDate = item.departure_date
      ? new Date(item.departure_date).toISOString().split("T")[0]
      : "";
    const arrDate = item.arrival_date
      ? new Date(item.arrival_date).toISOString().split("T")[0]
      : "";

    setDepartureCity(item.departure_city);
    setDepartureCountry(item.departure_country || "France");
    setArrivalCity(item.arrival_city);
    setArrivalCountry(item.arrival_country || "Sénégal");
    setDepartureDate(depDate);
    setArrivalDate(arrDate);
    setFlightType((item.flight_type as "direct" | "escale") || "direct");
    setAvailableKg(String(item.available_kg || ""));
    setPricePerKg(String(item.price_per_kg || ""));
    setPickupCity(item.pickup_city || "");
    setPickupAddress(item.pickup_address || "");
    setDropoffCity(item.dropoff_city || "");
    setDropoffAddress(item.dropoff_address || "");
    setDescription(item.description || "");

    setInitialEditData({
      departureCity: item.departure_city,
      departureCountry: item.departure_country || "France",
      arrivalCity: item.arrival_city,
      arrivalCountry: item.arrival_country || "Sénégal",
      departureDate: depDate,
      arrivalDate: arrDate,
      flightType: (item.flight_type as "direct" | "escale") || "direct",
      availableKg: String(item.available_kg || ""),
      pricePerKg: String(item.price_per_kg || ""),
      pickupCity: item.pickup_city || "",
      pickupAddress: item.pickup_address || "",
      dropoffCity: item.dropoff_city || "",
      dropoffAddress: item.dropoff_address || "",
      description: item.description || "",
    });

    setIsCustomDepartureCity(!CITIES_DEPARTURE.includes(item.departure_city));
    setIsCustomDepartureCountry(
      !COUNTRIES_DEPARTURE.includes((item.departure_country || "France") as any),
    );
    setIsCustomArrivalCity(!CITIES_ARRIVAL.includes(item.arrival_city));
    setIsCustomArrivalCountry(
      !COUNTRIES_ARRIVAL.includes((item.arrival_country || "") as any),
    );

    setView("edit");
  };

  const handleSaveEdit = async () => {
    if (!editGpId) return;
    setIsSaving(true);
    setError(null);

    if (!departureCity.trim() || !departureCountry.trim()) {
      setError("Veuillez indiquer la ville et le pays de départ.");
      setIsSaving(false);
      return;
    }

    if (!arrivalCity.trim() || !arrivalCountry.trim()) {
      setError("Veuillez indiquer la ville et le pays d'arrivée.");
      setIsSaving(false);
      return;
    }

    if (
      departureCountry.trim().toLowerCase() ===
      arrivalCountry.trim().toLowerCase()
    ) {
      setError("Le pays de départ et le pays d'arrivée doivent être différents.");
      setIsSaving(false);
      return;
    }

    if (!pickupAddress || !pickupAddress.trim()) {
      setError("L'adresse précise de dépôt est obligatoire.");
      setIsSaving(false);
      return;
    }

    if (!dropoffAddress || !dropoffAddress.trim()) {
      setError("L'adresse précise de récupération est obligatoire.");
      setIsSaving(false);
      return;
    }

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

    if (!departureDate.trim()) {
      setError("La date de départ est obligatoire.");
      setIsSaving(false);
      return;
    }

    if (isDateRangeInvalid) {
      setError(
        "La date de départ ne peut pas être postérieure à la date d'arrivée.",
      );
      setIsSaving(false);
      return;
    }

    if (isDeparturePast) {
      setError("La date de départ doit être égale ou ultérieure à aujourd'hui.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await apiFetch(`/gp/${editGpId}`, {
        method: "PATCH",
        body: JSON.stringify({
          departure_city: departureCity.trim(),
          departure_country: departureCountry.trim(),
          arrival_city: arrivalCity.trim(),
          arrival_country: arrivalCountry.trim(),
          departure_date: departureDate,
          arrival_date: arrivalDate || null,
          available_kg: kgNum,
          price_per_kg: priceNum,
          flight_type: flightType,
          pickup_address: pickupAddress || null,
          pickup_city: pickupCity || null,
          dropoff_address: dropoffAddress || null,
          dropoff_city: dropoffCity || null,
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
      year: "numeric",
    });
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        {/* ── HEADER FOREST GREEN (#0B3B24) ── */}
        <View style={styles.headerCard}>
          {/* Top navigation row */}
          <View style={styles.headerTopBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (view === "edit") {
                  setView("annonces");
                } else {
                  router.push("/profil" as any);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.backBtnText}>
                {view === "edit" ? "Mes annonces" : "Mon compte"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.publishHeaderBtn}
              onPress={() => router.push("/gp/nouveau")}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.publishHeaderBtnText}>Publier un vol</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Hero Row */}
          <View style={styles.headerProfileRow}>
            <View style={styles.planeIconCircle}>
              <Ionicons name="airplane" size={26} color="#0B3B24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Espace Transporteur GP</Text>
              <Text style={styles.headerSubtitle}>
                Gestion de vos trajets, suivi de vos capacités de bagages et délais
              </Text>
            </View>
          </View>

          {/* KPIs Bar (4 colonnes métriques comme sur le Web) */}
          <View style={styles.kpisRow}>
            <View style={styles.kpiPill}>
              <Text style={styles.kpiValue}>{gpListings.length}</Text>
              <Text style={styles.kpiLabel}>Vols créés</Text>
            </View>

            <View style={[styles.kpiPill, styles.kpiPillActive]}>
              <Text style={[styles.kpiValue, styles.kpiValueEmerald]}>
                {activeCount}
              </Text>
              <Text style={styles.kpiLabel}>En cours</Text>
            </View>

            <View style={styles.kpiPill}>
              <Text style={[styles.kpiValue, styles.kpiValueAmber]}>
                {totalKg.toFixed(0)} kg
              </Text>
              <Text style={styles.kpiLabel}>Capacité</Text>
            </View>

            <View style={styles.kpiPill}>
              <Text style={styles.kpiValue}>
                {potentialRevenue.toFixed(0)} €
              </Text>
              <Text style={styles.kpiLabel}>Potentiel</Text>
            </View>
          </View>

          {/* Filtres de statut (Tous / Actifs / En pause) */}
          {view === "annonces" && (
            <View style={styles.filterTabsRow}>
              <TouchableOpacity
                style={[
                  styles.filterTabBtn,
                  statusFilter === "all" && styles.filterTabBtnActive,
                ]}
                onPress={() => setStatusFilter("all")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterTabBtnText,
                    statusFilter === "all" && styles.filterTabBtnTextActive,
                  ]}
                >
                  Tous ({gpListings.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTabBtn,
                  statusFilter === "active" && styles.filterTabBtnActive,
                ]}
                onPress={() => setStatusFilter("active")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterTabBtnText,
                    statusFilter === "active" && styles.filterTabBtnTextActive,
                  ]}
                >
                  Actifs ({activeCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTabBtn,
                  statusFilter === "inactive" && styles.filterTabBtnActive,
                ]}
                onPress={() => setStatusFilter("inactive")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterTabBtnText,
                    statusFilter === "inactive" && styles.filterTabBtnTextActive,
                  ]}
                >
                  En pause ({inactiveCount})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── CORPS DE PAGE (#F8FAFC) ── */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Boolean(error) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity
                onPress={() => setError(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color="#B91C1C" />
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════
              VUE 1 : LISTE DES VOLS & ANNONCES
             ══════════════════════════════════════════ */}
          {view === "annonces" && (
            <View style={styles.sectionContainer}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0B3B24" />
                  <Text style={styles.loadingText}>
                    Chargement de vos trajets GP...
                  </Text>
                </View>
              ) : filteredListings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="airplane-outline" size={44} color="#0B3B24" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {statusFilter === "active"
                      ? "Aucun vol actif en cours"
                      : statusFilter === "inactive"
                      ? "Aucun vol archivé ou en pause"
                      : "Aucun vol publié pour le moment"}
                  </Text>
                  <Text style={styles.emptySub}>
                    Proposez vos kilos disponibles aux expéditeurs de la communauté
                    Dabari en publiant votre prochain vol.
                  </Text>
                  <TouchableOpacity
                    style={styles.createFirstBtn}
                    onPress={() => router.push("/gp/nouveau")}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.createFirstBtnText}>
                      Publier mon premier vol
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.listingsList}>
                  {filteredListings.map((item) => (
                    <View key={item.id} style={styles.annonceCard}>
                      {/* En-tête Route & Statut */}
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

                          <View style={styles.routeArrowContainer}>
                            <Ionicons
                              name="arrow-forward"
                              size={16}
                              color="#64748B"
                            />
                          </View>

                          <View style={styles.cityCol}>
                            <Text style={[styles.cityName, styles.cityArrival]}>
                              {item.arrival_city}
                            </Text>
                            <Text style={styles.countryArrival}>
                              {item.arrival_country || "Afrique"}
                            </Text>
                          </View>
                        </View>

                        {/* Switch Actif / Inactif direct sur la carte */}
                        <View style={styles.cardStatusCol}>
                          <View
                            style={[
                              styles.statusBadge,
                              item.is_active
                                ? styles.statusBadgeActive
                                : styles.statusBadgeInactive,
                            ]}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                item.is_active
                                  ? styles.statusDotActive
                                  : styles.statusDotInactive,
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusBadgeText,
                                item.is_active
                                  ? styles.statusBadgeTextActive
                                  : styles.statusBadgeTextInactive,
                              ]}
                            >
                              {item.is_active ? "En ligne" : "En pause"}
                            </Text>
                          </View>
                          <Switch
                            value={item.is_active}
                            onValueChange={() =>
                              toggleListingActive(item.id, item.is_active)
                            }
                            trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                            thumbColor={item.is_active ? "#15803D" : "#94A3B8"}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                          />
                        </View>
                      </View>

                      {/* Notice Retard si vol retardé */}
                      {item.is_delayed && (
                        <View style={styles.delayCardNotice}>
                          <Ionicons name="alert-circle" size={16} color="#D97706" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.delayNoticeTitle}>
                              Arrivée retardée
                              {item.arrival_date
                                ? ` • Est. ${formatDate(item.arrival_date)}`
                                : ""}
                            </Text>
                            {item.delay_reason ? (
                              <Text style={styles.delayNoticeReason} numberOfLines={2}>
                                {item.delay_reason}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      )}

                      {/* Métadonnées : Dates & Type de vol */}
                      <View style={styles.metaRow}>
                        <View style={styles.metaBadge}>
                          <Ionicons name="calendar-outline" size={13} color="#0B3B24" />
                          <Text style={styles.metaBadgeText}>
                            Départ : {formatDate(item.departure_date)}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.flightTypePill,
                            item.flight_type === "escale"
                              ? styles.flightTypePillAmber
                              : styles.flightTypePillBlue,
                          ]}
                        >
                          <Ionicons
                            name={
                              item.flight_type === "escale"
                                ? "git-branch-outline"
                                : "paper-plane-outline"
                            }
                            size={11}
                            color={
                              item.flight_type === "escale" ? "#D97706" : "#2563EB"
                            }
                          />
                          <Text
                            style={[
                              styles.flightTypePillText,
                              item.flight_type === "escale"
                                ? styles.flightTypePillTextAmber
                                : styles.flightTypePillTextBlue,
                            ]}
                          >
                            {item.flight_type === "escale" ? "Escale" : "Vol direct"}
                          </Text>
                        </View>
                      </View>

                      {/* Adresses de collecte et dépôt */}
                      <View style={styles.cardRouteDetailBox}>
                        <View style={styles.cardRouteStep}>
                          <Ionicons name="log-in-outline" size={14} color="#15803D" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardStepTitle}>
                              Collecte : {item.pickup_city || item.departure_city}
                            </Text>
                            <Text style={styles.cardStepSub} numberOfLines={1}>
                              {item.pickup_address || "Adresse renseignée à la réservation"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardRouteStep}>
                          <Ionicons name="log-out-outline" size={14} color="#D4870A" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardStepTitle}>
                              Livraison : {item.dropoff_city || item.arrival_city}
                            </Text>
                            <Text style={styles.cardStepSub} numberOfLines={1}>
                              {item.dropoff_address || "Remise en mains propres"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Kilos & Tarif */}
                      <View style={styles.metricsBox}>
                        <View style={styles.metricItem}>
                          <Ionicons name="cube-outline" size={15} color="#0B3B24" />
                          <Text style={styles.metricItemText}>
                            {Number(item.available_kg)} kg disponibles
                          </Text>
                        </View>

                        <View style={styles.dividerVertical} />

                        <View style={styles.metricItem}>
                          <Text style={styles.metricItemPrice}>
                            {Number(item.price_per_kg)} €/kg
                          </Text>
                          <Text style={styles.metricPotentialText}>
                            (Max:{" "}
                            {(
                              Number(item.available_kg) * Number(item.price_per_kg)
                            ).toFixed(0)}{" "}
                            €)
                          </Text>
                        </View>
                      </View>

                      {/* Barre d'actions */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.actionBtnOutline}
                          onPress={() => router.push(`/gp/${item.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={14} color="#475569" />
                          <Text style={styles.actionBtnOutlineText}>Vitrine</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnOutline}
                          onPress={() => openDelayModal(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="time-outline" size={14} color="#D97706" />
                          <Text
                            style={[
                              styles.actionBtnOutlineText,
                              { color: "#D97706" },
                            ]}
                          >
                            Retard
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnBlue}
                          onPress={() => startEdit(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={14} color="#2563EB" />
                          <Text style={styles.actionBtnBlueText}>Modifier</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnRed}
                          onPress={() => setDeleteGpId(item.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════
              VUE 2 : MODIFICATION DU TRAJET GP
             ══════════════════════════════════════════ */}
          {view === "edit" && (
            <View style={styles.sectionContainer}>
              <View style={styles.editHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Modifier le trajet</Text>
                  <Text style={styles.editSubtitle}>
                    Mise à jour des informations pour vos expéditeurs
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => setView("annonces")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelEditBtnText}>Annuler</Text>
                </TouchableOpacity>
              </View>

              {/* Card 1 : Itinéraire */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>Itinéraire du vol</Text>

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
                          COUNTRIES_DEPARTURE.filter(
                            (c) => c !== arrivalCountry,
                          ),
                          (val) => {
                            if (val.includes("Autre")) {
                              setIsCustomDepartureCountry(true);
                              setDepartureCountry("");
                            } else {
                              setIsCustomDepartureCountry(false);
                              setDepartureCountry(val);
                              if (arrivalCountry === val) {
                                setArrivalCountry(
                                  val === "France" ? "Sénégal" : "France",
                                );
                              }
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
                  <Ionicons name="arrow-down-circle" size={24} color="#0B3B24" />
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
                          COUNTRIES_ARRIVAL.filter(
                            (c) => c !== departureCountry,
                          ),
                          (val) => {
                            if (val.includes("Autre")) {
                              setIsCustomArrivalCountry(true);
                              setArrivalCountry("");
                            } else {
                              setIsCustomArrivalCountry(false);
                              setArrivalCountry(val);
                              if (departureCountry === val) {
                                setDepartureCountry(
                                  val === "France" ? "Sénégal" : "France",
                                );
                              }
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

              {/* Card 2 : Dates & Type de vol */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>Dates & Type de vol</Text>

                <View style={styles.inputGridRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>DATE DE DÉPART *</Text>
                    {Platform.OS === "web" ? (
                      <View
                        style={[
                          styles.dateInputWrapper,
                          isDateRangeInvalid && styles.dateInputWrapperError,
                        ]}
                      >
                        <Ionicons
                          name="calendar"
                          size={18}
                          color={isDateRangeInvalid ? "#EF4444" : "#0B3B24"}
                        />
                        <TextInput
                          style={styles.dateInput}
                          value={departureDate}
                          onChangeText={setDepartureDate}
                          onChange={(e: any) => {
                            if (e?.target?.value) setDepartureDate(e.target.value);
                          }}
                          placeholder="AAAA-MM-JJ"
                          placeholderTextColor="#94A3B8"
                          {...({ type: "date" } as any)}
                        />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.datePickerBtn,
                          isDateRangeInvalid && styles.dateInputWrapperError,
                        ]}
                        onPress={() => setShowDeparturePicker(true)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.datePickerBtnIconBox,
                            isDateRangeInvalid && styles.datePickerBtnIconBoxError,
                          ]}
                        >
                          <Ionicons
                            name="calendar"
                            size={18}
                            color={isDateRangeInvalid ? "#EF4444" : "#0B3B24"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.datePickerBtnValText} numberOfLines={1}>
                            {formatDateDisplay(departureDate) || "Choisir date"}
                          </Text>
                          <Text style={styles.datePickerBtnSubText}>
                            {departureDate || "YYYY-MM-DD"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.flexField}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={styles.fieldLabel}>DATE D'ARRIVÉE</Text>
                      {Boolean(arrivalDate) && (
                        <TouchableOpacity
                          onPress={() => setArrivalDate("")}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ paddingBottom: 2 }}
                        >
                          <Text style={styles.clearDateText}>Effacer</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {Platform.OS === "web" ? (
                      <View
                        style={[
                          styles.dateInputWrapper,
                          isDateRangeInvalid && styles.dateInputWrapperError,
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={isDateRangeInvalid ? "#EF4444" : "#0B3B24"}
                        />
                        <TextInput
                          style={styles.dateInput}
                          value={arrivalDate}
                          onChangeText={setArrivalDate}
                          onChange={(e: any) => {
                            if (e?.target?.value) setArrivalDate(e.target.value);
                          }}
                          placeholder="AAAA-MM-JJ"
                          placeholderTextColor="#94A3B8"
                          {...({
                            type: "date",
                            min: departureDate || undefined,
                          } as any)}
                        />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.datePickerBtn,
                          isDateRangeInvalid && styles.dateInputWrapperError,
                        ]}
                        onPress={() => setShowArrivalPicker(true)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.datePickerBtnIconBox,
                            isDateRangeInvalid && styles.datePickerBtnIconBoxError,
                          ]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={isDateRangeInvalid ? "#EF4444" : "#0B3B24"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.datePickerBtnValText,
                              !arrivalDate && styles.datePickerBtnPlaceholder,
                            ]}
                            numberOfLines={1}
                          >
                            {arrivalDate
                              ? formatDateDisplay(arrivalDate)
                              : "Optionnelle"}
                          </Text>
                          <Text style={styles.datePickerBtnSubText}>
                            {arrivalDate ? arrivalDate : "Non renseignée"}
                          </Text>
                        </View>
                        {Boolean(arrivalDate) && (
                          <TouchableOpacity
                            onPress={() => setArrivalDate("")}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color="#94A3B8"
                            />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {Boolean(dateError) && (
                  <View style={styles.dateErrorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.dateErrorBannerText}>{dateError}</Text>
                  </View>
                )}

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
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={18}
                        color={flightType === "direct" ? "#0B3B24" : "#94A3B8"}
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
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={18}
                        color={flightType === "escale" ? "#0B3B24" : "#94A3B8"}
                      />
                      <Text style={styles.flightTypeRadioText}>Avec escale</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Card 3 : Capacité & Tarification */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>Capacité & Prix</Text>

                <View style={styles.inputGridRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>KILOS DISPONIBLES *</Text>
                    <TextInput
                      style={styles.input}
                      value={availableKg}
                      onChangeText={setAvailableKg}
                      placeholder="Ex : 23"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>PRIX AU KILO (€) *</Text>
                    <TextInput
                      style={styles.input}
                      value={pricePerKg}
                      onChangeText={setPricePerKg}
                      placeholder="Ex : 10"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Card 4 : Adresses de collecte et livraison */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardSectionTitle}>Points de rendez-vous</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>ADRESSE PRÉCISE DE DÉPÔT *</Text>
                  <AddressAutocomplete
                    placeholder="Saisissez l'adresse de dépôt du colis..."
                    value={pickupAddress}
                    onChangeText={setPickupAddress}
                    onSelectAddress={(item) => {
                      setPickupAddress(item.label);
                      setPickupCity(getQuarterOrCityFromAddress(item));
                    }}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    ADRESSE PRÉCISE DE RÉCUPÉRATION *
                  </Text>
                  <AddressAutocomplete
                    placeholder="Saisissez l'adresse de livraison du colis..."
                    value={dropoffAddress}
                    onChangeText={setDropoffAddress}
                    onSelectAddress={(item) => {
                      setDropoffAddress(item.label);
                      setDropoffCity(getQuarterOrCityFromAddress(item));
                    }}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>INSTRUCTIONS OU REMARQUES</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Types de colis acceptés, délais particuliers, interdictions..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* Bouton de sauvegarde */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (isSaving || Boolean(dateError)) && styles.saveBtnDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={isSaving || Boolean(dateError)}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                      Enregistrer les modifications
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* ── MODALE SIGNALER UN RETARD ── */}
        <Modal
          transparent
          animationType="fade"
          visible={Boolean(delayModalItem)}
          onRequestClose={() => setDelayModalItem(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.delayIconCircle}>
                <Ionicons name="time" size={28} color="#D97706" />
              </View>

              <Text style={styles.modalTitle}>Signaler un retard de vol</Text>
              <Text style={styles.modalSub}>
                Informez immédiatement les expéditeurs de la nouvelle estimation
                d'arrivée de leurs bagages.
              </Text>

              <View style={{ width: "100%", gap: 10, marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>NOUVELLE DATE D'ARRIVÉE *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#94A3B8"
                  value={newArrivalDate}
                  onChangeText={setNewArrivalDate}
                />

                <Text style={styles.fieldLabel}>MOTIF DU RETARD (OPTIONNEL)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  placeholder="Ex : Vol reporté par la compagnie, correspondance..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={delayReason}
                  onChangeText={setDelayReason}
                />
              </View>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDelayModalItem(null)}
                  disabled={submittingDelay}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDelaySubmitBtn}
                  onPress={handleReportDelay}
                  disabled={submittingDelay}
                  activeOpacity={0.8}
                >
                  {submittingDelay ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalDeleteBtnText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODALE SUPPRESSION ── */}
        <Modal
          transparent
          animationType="fade"
          visible={Boolean(deleteGpId)}
          onRequestClose={() => setDeleteGpId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash-outline" size={28} color="#DC2626" />
              </View>

              <Text style={styles.modalTitle}>Supprimer cette annonce ?</Text>
              <Text style={styles.modalSub}>
                Êtes-vous sûr de vouloir supprimer définitivement ce vol ? Les
                expéditeurs ne pourront plus y réserver de kilos.
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDeleteGpId(null)}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={handleDeleteGp}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalDeleteBtnText}>Supprimer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── PICKER MODAL (Villes / Pays) ── */}
        <Modal
          transparent
          animationType="fade"
          visible={pickerConfig.visible}
          onRequestClose={() =>
            setPickerConfig((prev) => ({ ...prev, visible: false }))
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalCard}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>{pickerConfig.title}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setPickerConfig((prev) => ({ ...prev, visible: false }))
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {pickerConfig.options.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.pickerOptionItem}
                    onPress={() => {
                      pickerConfig.onSelect(opt);
                      setPickerConfig((prev) => ({ ...prev, visible: false }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        opt.includes("Autre") && styles.pickerOptionTextCustom,
                      ]}
                    >
                      {opt}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* DatePicker Modals / Pickers */}
        {Platform.OS === "ios" && DateTimePicker && (
          <>
            <Modal
              visible={showDeparturePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDeparturePicker(false)}
            >
              <View style={styles.dateModalBackdrop}>
                <View style={styles.dateModalCard}>
                  <View style={styles.dateModalHeader}>
                    <TouchableOpacity
                      onPress={() => setShowDeparturePicker(false)}
                    >
                      <Text style={styles.dateModalCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateModalTitle}>Date de départ</Text>
                    <TouchableOpacity
                      onPress={() => setShowDeparturePicker(false)}
                    >
                      <Text style={styles.dateModalConfirmText}>Valider</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={departureDateObj}
                    mode="date"
                    display="spinner"
                    minimumDate={minAllowedDate}
                    onValueChange={handleDepartureDateChange}
                    onDismiss={() => setShowDeparturePicker(false)}
                    textColor="#0F172A"
                  />
                </View>
              </View>
            </Modal>

            <Modal
              visible={showArrivalPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowArrivalPicker(false)}
            >
              <View style={styles.dateModalBackdrop}>
                <View style={styles.dateModalCard}>
                  <View style={styles.dateModalHeader}>
                    <TouchableOpacity
                      onPress={() => setShowArrivalPicker(false)}
                    >
                      <Text style={styles.dateModalCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateModalTitle}>Date d'arrivée</Text>
                    <TouchableOpacity
                      onPress={() => setShowArrivalPicker(false)}
                    >
                      <Text style={styles.dateModalConfirmText}>Valider</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={arrivalDateObj}
                    mode="date"
                    display="spinner"
                    minimumDate={arrivalMinDate}
                    onValueChange={handleArrivalDateChange}
                    onDismiss={() => setShowArrivalPicker(false)}
                    textColor="#0F172A"
                  />
                </View>
              </View>
            </Modal>
          </>
        )}

        {Platform.OS === "android" && DateTimePicker && (
          <>
            {showDeparturePicker && (
              <DateTimePicker
                value={departureDateObj}
                mode="date"
                display="default"
                minimumDate={minAllowedDate}
                onValueChange={handleDepartureDateChange}
                onDismiss={() => setShowDeparturePicker(false)}
              />
            )}
            {showArrivalPicker && (
              <DateTimePicker
                value={arrivalDateObj}
                mode="date"
                display="default"
                minimumDate={arrivalMinDate}
                onValueChange={handleArrivalDateChange}
                onDismiss={() => setShowArrivalPicker(false)}
              />
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topGreenWrapper: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },

  /* Header Card */
  headerCard: {
    backgroundColor: "#0B3B24",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  publishHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D4870A",
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  publishHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Profile Hero */
  headerProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  planeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D4870A",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
    lineHeight: 16,
  },

  /* KPIs Bar */
  kpisRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  kpiPill: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  kpiPillActive: {
    backgroundColor: "rgba(21, 128, 61, 0.35)",
    borderColor: "rgba(74, 222, 128, 0.4)",
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  kpiValueEmerald: {
    color: "#86EFAC",
  },
  kpiValueAmber: {
    color: "#FDE68A",
  },
  kpiLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
    marginTop: 1,
  },

  /* Filter Tabs */
  filterTabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  filterTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: "center",
  },
  filterTabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  filterTabBtnTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },

  /* Main ScrollView */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Error */
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },

  /* Container */
  sectionContainer: {
    gap: 14,
  },

  /* Loading & Empty */
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  createFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0B3B24",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createFirstBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Flight Listings */
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },

  /* Card Header */
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cityCol: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  countryName: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },
  routeArrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cityArrival: {
    color: "#15803D",
  },
  countryArrival: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
    marginTop: 1,
  },
  cardStatusCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgeInactive: {
    backgroundColor: "#F1F5F9",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: "#15803D",
  },
  statusDotInactive: {
    backgroundColor: "#94A3B8",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusBadgeTextActive: {
    color: "#15803D",
  },
  statusBadgeTextInactive: {
    color: "#64748B",
  },

  /* Delay Notice */
  delayCardNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    padding: 10,
  },
  delayNoticeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  delayNoticeReason: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
  },

  /* Metadata row */
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  flightTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flightTypePillBlue: {
    backgroundColor: "#EFF6FF",
  },
  flightTypePillAmber: {
    backgroundColor: "#FEF3C7",
  },
  flightTypePillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  flightTypePillTextBlue: {
    color: "#2563EB",
  },
  flightTypePillTextAmber: {
    color: "#D97706",
  },

  /* Route details */
  cardRouteDetailBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardRouteStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cardStepTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardStepSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  /* Metrics */
  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricItemText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  dividerVertical: {
    width: 1,
    height: 18,
    backgroundColor: "#CBD5E1",
  },
  metricItemPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0B3B24",
  },
  metricPotentialText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },

  /* Card Actions */
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  actionBtnBlue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnBlueText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  actionBtnRed: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginLeft: "auto",
  },

  /* Edit View */
  editHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  editSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  cancelEditBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cancelEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },

  /* Form Cards */
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  inputGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexField: {
    flex: 1,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  selectBtn: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  dateInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  arrowRow: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: -4,
  },
  flightTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  flightTypeRadio: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
  },
  flightTypeRadioActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#0B3B24",
  },
  flightTypeRadioText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: "#0B3B24",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0B3B24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  deleteIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  delayIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDelaySubmitBtn: {
    flex: 1,
    backgroundColor: "#D97706",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeleteBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Picker Bottom Sheet */
  pickerModalCard: {
    backgroundColor: "#FFFFFF",
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
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  pickerOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  pickerOptionTextCustom: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 46,
  },
  datePickerBtnIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerBtnIconBoxError: {
    backgroundColor: "#FEE2E2",
  },
  datePickerBtnValText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  datePickerBtnSubText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 1,
  },
  datePickerBtnPlaceholder: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  clearDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  dateErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  dateErrorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },
  dateInputWrapperError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
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
    paddingBottom: 36,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  dateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  dateModalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  dateModalConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B3B24",
  },
});
