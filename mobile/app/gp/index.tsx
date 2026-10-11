import React, { useCallback, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../utils/storage";
import { GpListing } from "../../utils/types/gp";
import { apiFetch } from "../../utils/api";

const destination = [
  { label: "Tout voir", value: "tout", icon: "globe-outline" },
  { label: "France", value: "France", icon: "location-outline" },
  { label: "Sénégal", value: "Sénégal", icon: "location-outline" },
  { label: "Côte d'Ivoire", value: "Côte d'Ivoire", icon: "location-outline" },
  { label: "Cameroun", value: "Cameroun", icon: "location-outline" },
  { label: "Mali", value: "Mali", icon: "location-outline" },
  { label: "Guinée", value: "Guinée", icon: "location-outline" },
  { label: "Congo", value: "Congo", icon: "location-outline" },
  { label: "RDC", value: "RDC", icon: "location-outline" },
  { label: "Burkina Faso", value: "Burkina Faso", icon: "location-outline" },
  { label: "Bénin", value: "Bénin", icon: "location-outline" },
  { label: "Togo", value: "Togo", icon: "location-outline" },
  { label: "Gabon", value: "Gabon", icon: "location-outline" },
  { label: "Maroc", value: "Maroc", icon: "location-outline" },
  { label: "Belgique", value: "Belgique", icon: "location-outline" },
  { label: "Canada", value: "Canada", icon: "location-outline" },
];

export default function GpScreen() {
  const router = useRouter();

  const [selectedDestination, setSelectedDestination] = useState("tout");
  const [searchQuery, setSearchQuery] = useState("");
  const [direction, setDirection] = useState<"all" | "to_africa" | "to_france">("all");
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [gp, setGp] = useState<GpListing[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setIsLoading(true);
        setError("");
        const token = await getSecureToken("token");
        if (token) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }

        try {
          const response = await apiFetch("/gp");
          const data = await response.json();
          if (!response.ok) {
            setError(
              data.error ||
                data.message ||
                "Erreur lors de la récupération des GP",
            );
            return;
          }
          setGp(data.data.gp || []);
        } catch (error) {
          setError(
            "Impossible de contacter le serveur. Vérifiez votre connexion.",
          );
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, []),
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  };

  const destinationCounts = useMemo(() => {
    const counts: Record<string, number> = { tout: gp.length };
    for (const d of destination) {
      if (d.value === "tout") continue;
      const val = d.value.toLowerCase();
      counts[d.value] = gp.filter((item) => {
        const arr = (item.arrival_country || "").toLowerCase();
        const dep = (item.departure_country || "").toLowerCase();
        return arr.includes(val) || dep.includes(val);
      }).length;
    }
    return counts;
  }, [gp]);

  const filteredGp = useMemo(() => {
    return gp.filter((item) => {
      // 1. Filtre par pays de destination ou départ
      if (selectedDestination !== "tout") {
        const destLower = selectedDestination.toLowerCase();
        const arrCountry = (item.arrival_country || "").toLowerCase();
        const arrCity = (item.arrival_city || "").toLowerCase();
        const depCountry = (item.departure_country || "").toLowerCase();
        const depCity = (item.departure_city || "").toLowerCase();

        const matches =
          arrCountry.includes(destLower) ||
          arrCity.includes(destLower) ||
          depCountry.includes(destLower) ||
          depCity.includes(destLower) ||
          destLower.includes(arrCountry) ||
          destLower.includes(arrCity) ||
          destLower.includes(depCountry) ||
          destLower.includes(depCity);

        if (!matches) return false;
      }

      // 2. Filtre de direction
      if (direction === "to_africa") {
        const dep = (item.departure_country || "").toLowerCase();
        if (!dep.includes("france") && !dep.includes("belgique") && !dep.includes("europe")) {
          return false;
        }
      } else if (direction === "to_france") {
        const arr = (item.arrival_country || "").toLowerCase();
        if (!arr.includes("france") && !arr.includes("belgique") && !arr.includes("europe")) {
          return false;
        }
      }

      // 3. Barre de recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const arrCountry = (item.arrival_country || "").toLowerCase();
        const arrCity = (item.arrival_city || "").toLowerCase();
        const depCountry = (item.departure_country || "").toLowerCase();
        const depCity = (item.departure_city || "").toLowerCase();
        const travelerName = (item.profiles?.full_name || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();

        if (
          !arrCountry.includes(q) &&
          !arrCity.includes(q) &&
          !depCountry.includes(q) &&
          !depCity.includes(q) &&
          !travelerName.includes(q) &&
          !desc.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [gp, selectedDestination, direction, searchQuery]);

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        {/* Header Vert Compact */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push("/accueil")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.backBtnText}>Accueil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerPublishBtn}
              onPress={() => {
                if (isLoggedIn) {
                  router.push("/gp/nouveau");
                } else {
                  router.push("/login");
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color="#0B3B24" />
              <Text style={styles.headerPublishBtnText}>Publier un vol</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.headerTitle}>Transport GP Colis</Text>

          {/* Direction toggle (Tous / Vers Afrique / Vers Europe) */}
          <View style={styles.directionToggleContainer}>
            <TouchableOpacity
              style={[
                styles.directionToggleBtn,
                direction === "all" && styles.directionToggleBtnActive,
              ]}
              onPress={() => setDirection("all")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.directionToggleText,
                  direction === "all" && styles.directionToggleTextActive,
                ]}
              >
                Tous
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionToggleBtn,
                direction === "to_africa" && styles.directionToggleBtnActive,
              ]}
              onPress={() => setDirection("to_africa")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.directionToggleText,
                  direction === "to_africa" && styles.directionToggleTextActive,
                ]}
              >
                Vers l'Afrique
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionToggleBtn,
                direction === "to_france" && styles.directionToggleBtnActive,
              ]}
              onPress={() => setDirection("to_france")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.directionToggleText,
                  direction === "to_france" && styles.directionToggleTextActive,
                ]}
              >
                Vers l'Europe
              </Text>
            </TouchableOpacity>
          </View>

          {/* Barre de Recherche & Bouton Filtrer Compacts (1 seule ligne) */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchBarWrapper}>
              <Ionicons name="search-outline" size={16} color="#0B3B24" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher ville, pays, GP..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.filterBtn,
                selectedDestination !== "tout" && styles.filterBtnActive,
              ]}
              onPress={() => setShowDestinationModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="airplane-outline"
                size={15}
                color={selectedDestination !== "tout" ? "#0B3B24" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.filterBtnText,
                  selectedDestination !== "tout" && styles.filterBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {selectedDestination === "tout" ? "Pays" : selectedDestination}
              </Text>
              {selectedDestination !== "tout" && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedDestination("tout");
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={14} color="#0B3B24" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/*  Erreur Réseau / Serveur */}
          {Boolean(error) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#B91C1C" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}
          {/* Banner Sécurité */}
          <View style={styles.securityBanner}>
            <View style={styles.securityIconCircle}>
              <Ionicons name="shield-checkmark" size={22} color="#D4870A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Paiement 100% Sécurisé</Text>
              <Text style={styles.securitySub}>
                Vos fonds sont bloqués en toute sécurité jusqu'à la confirmation
                de livraison du colis.
              </Text>
            </View>
          </View>

          {/* Rangée Tri & Compteur */}
          <View style={styles.sortRow}>
            <TouchableOpacity
              style={[styles.sortBtn, sortByDistance && styles.sortBtnActive]}
              onPress={() => setSortByDistance(!sortByDistance)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="location"
                size={14}
                color={sortByDistance ? "#FFFFFF" : "#1D6B45"}
              />
              <Text
                style={[
                  styles.sortBtnText,
                  sortByDistance && styles.sortBtnTextActive,
                ]}
              >
                {sortByDistance ? "Trié par proximité" : "Trier par distance"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.countText}>
              {filteredGp.length} GP{" "}
              {filteredGp.length > 1 ? "disponibles" : "disponible"}
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1D6B45" />
              <Text style={styles.loadingText}>
                Chargement des annonces GP...
              </Text>
            </View>
          ) : filteredGp.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="airplane-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Aucun trajet GP trouvé</Text>
              <Text style={styles.emptySub}>
                {selectedDestination === "tout"
                  ? "Aucun transporteur GP n'a publié d'annonce pour le moment."
                  : `Aucun transporteur ne dessert "${selectedDestination}" pour le moment.`}
              </Text>
            </View>
          ) : (
            <View style={styles.listingsList}>
              {filteredGp.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gpCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    router.push(`/gp/${item.id}` as any);
                  }}
                >
                  <View style={styles.routeHeader}>
                    <View style={styles.routeGroup}>
                      <Text style={styles.cityName}>{item.departure_city}</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color="#1D6B45"
                      />
                      <Text style={styles.cityName}>{item.arrival_city}</Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {item.is_delayed && (
                        <View style={styles.delayBadge}>
                          <Ionicons name="warning" size={11} color="#92400E" />
                          <Text style={styles.delayBadgeText}>Retardé</Text>
                        </View>
                      )}
                      {Boolean(item.flight_type) && (
                        <View
                          style={[
                            styles.flightBadge,
                            item.flight_type === "direct"
                              ? styles.flightBadgeDirect
                              : styles.flightBadgeEscale,
                          ]}
                        >
                          <Text
                            style={[
                              styles.flightBadgeText,
                              item.flight_type === "direct"
                                ? styles.flightBadgeTextDirect
                                : styles.flightBadgeTextEscale,
                            ]}
                          >
                            {item.flight_type === "direct" ? "Direct" : "Escale"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {item.is_delayed && (
                    <View style={styles.delayCardNotice}>
                      <Ionicons name="alert-circle" size={14} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.delayNoticeTitle}>
                          Arrivée retardée{item.arrival_date ? ` • Est. ${formatDate(item.arrival_date)}` : ""}
                        </Text>
                        {item.delay_reason ? (
                          <Text style={styles.delayNoticeReason} numberOfLines={2}>
                            {item.delay_reason}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}

                  <View style={styles.gpProfileRow}>
                    <View style={styles.gpAvatarCircle}>
                      <Text style={styles.gpAvatarInitial}>
                        {item.profiles?.full_name?.charAt(0).toUpperCase() ||
                          "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gpNameText}>
                        {item.profiles?.full_name || "GP Transporteur"}
                      </Text>
                      {Boolean(item.pickup_city) && (
                        <View style={styles.locationSubRow}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color="#64748B"
                          />
                          <Text style={styles.locationSubText}>
                            {item.pickup_city}
                          </Text>
                        </View>
                      )}
                    </View>

                    {Boolean(item.departure_date) && (
                      <View style={styles.dateBadge}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color="#1D6B45"
                        />
                        <Text style={styles.dateBadgeText}>
                          {formatDate(item.departure_date)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Paired Trajet : Départ & Arrivée */}
                  <View style={styles.cardRouteDetailBox}>
                    <View style={styles.cardRouteStep}>
                      <Ionicons
                        name="airplane-outline"
                        size={14}
                        color="#1D6B45"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardStepTitle}>
                          Départ : {formatDate(item.departure_date)}
                        </Text>
                        <Text style={styles.cardStepSub}>
                          Dépôt : {item.pickup_city || item.departure_city}
                          {item.pickup_address ? ` (${item.pickup_address})` : ""}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardRouteStep}>
                      <Ionicons
                        name="navigate-outline"
                        size={14}
                        color="#D4870A"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardStepTitle}>
                          Arrivée : {item.arrival_date ? formatDate(item.arrival_date) : "Date à confirmer"}
                        </Text>
                        <Text style={styles.cardStepSub}>
                          Récupération : {item.dropoff_city || item.arrival_city}
                          {item.dropoff_address ? ` (${item.dropoff_address})` : ""}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Métriques */}
                  <View style={styles.cardFooter}>
                    <View style={styles.metricGroup}>
                      <Text style={styles.metricLabel}>Disponible</Text>
                      <Text style={styles.metricValue}>
                        {Number(item.available_kg)} kg
                      </Text>
                    </View>

                    <View style={styles.dividerVertical} />

                    <View style={styles.metricGroup}>
                      <Text style={styles.metricLabel}>Tarif au kg</Text>
                      <Text style={styles.priceValue}>
                        {Number(item.price_per_kg)} €/kg
                      </Text>
                    </View>

                    <View style={styles.dividerVertical} />

                    <View style={styles.metricGroup}>
                      <Text style={styles.metricLabel}>Avis</Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#FBBF24" />
                        <Text style={styles.ratingValue}>
                          {item.rating || 0}
                        </Text>
                        <Text style={styles.reviewCount}>
                          ({item.review_count || 0})
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.actionArrowBtn}
                      onPress={() => {
                        router.push(`/gp/${item.id}` as any);
                      }}
                    >
                      <Text style={styles.actionArrowText}>Réserver</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#1D6B45"
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.fabBtn, !isLoggedIn && styles.fabBtnLogin]}
          activeOpacity={0.85}
          onPress={() => {
            if (isLoggedIn) {
              router.push("/gp/nouveau");
            } else {
              router.push("/login");
            }
          }}
        >
          <Ionicons
            name={isLoggedIn ? "add" : "log-in-outline"}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.fabBtnText}>
            {isLoggedIn ? "Je suis GP" : "Se connecter pour publier"}
          </Text>
        </TouchableOpacity>

        {/* Modale Bottom Sheet de Filtrage par Destination */}
        <Modal
          visible={showDestinationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDestinationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModalCard}>
              <View style={styles.filterModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterModalTitle}>Filtrer par destination</Text>
                  <Text style={styles.filterModalSubtitle}>
                    Sélectionnez le pays d'arrivée ou de départ de votre colis
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.filterModalCloseBtn}
                  onPress={() => setShowDestinationModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.filterModalOptionsList}
                showsVerticalScrollIndicator={false}
              >
                {destination.map((dest) => {
                  const count = destinationCounts[dest.value] ?? 0;
                  const isSelected = selectedDestination === dest.value;
                  return (
                    <TouchableOpacity
                      key={dest.value}
                      style={[
                        styles.filterOptionRow,
                        isSelected && styles.filterOptionRowSelected,
                      ]}
                      onPress={() => {
                        setSelectedDestination(dest.value);
                        setShowDestinationModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons
                          name={dest.icon as any}
                          size={18}
                          color={isSelected ? "#0B3B24" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.filterOptionLabel,
                            isSelected && styles.filterOptionLabelSelected,
                          ]}
                        >
                          {dest.label}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.filterOptionBadge,
                          isSelected && styles.filterOptionBadgeSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterOptionBadgeText,
                            isSelected && styles.filterOptionBadgeTextSelected,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedDestination !== "tout" && (
                <TouchableOpacity
                  style={styles.filterResetBtn}
                  onPress={() => {
                    setSelectedDestination("tout");
                    setShowDestinationModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={15} color="#B91C1C" />
                  <Text style={styles.filterResetBtnText}>
                    Réinitialiser le filtre pays
                  </Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: "#0B3B24",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },

  /* Header Card */
  headerCard: {
    backgroundColor: "#0B3B24",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
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
    gap: 6,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "700",
  },
  headerPublishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E5A93C",
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 20,
  },
  headerPublishBtnText: {
    color: "#0B3B24",
    fontSize: 11.5,
    fontWeight: "800",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  /* Direction Toggle */
  directionToggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  directionToggleBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  directionToggleBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  directionToggleText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  directionToggleTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },

  /* Search & Filter Compact Row */
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    padding: 0,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
  },
  filterBtnActive: {
    backgroundColor: "#E5A93C",
    borderColor: "#E5A93C",
  },
  filterBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  filterBtnTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },

  /* Modale Overlay & Bottom Sheet */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: "80%",
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  filterModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  filterModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  filterModalOptionsList: {
    maxHeight: 340,
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  filterOptionRowSelected: {
    backgroundColor: "#F0FDF4",
  },
  filterOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  filterOptionLabelSelected: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  filterOptionBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterOptionBadgeSelected: {
    backgroundColor: "#DCFCE7",
  },
  filterOptionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  filterOptionBadgeTextSelected: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  filterResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
  },
  filterResetBtnText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },

  /* ScrollView Principale */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 80,
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

  /* Sécurité Banner */
  securityBanner: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  securityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 2,
  },
  securitySub: {
    fontSize: 11,
    color: "#B45309",
    lineHeight: 15,
  },

  /* Tri & Compteur */
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  sortBtnActive: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
  sortBtnTextActive: {
    color: "#FFFFFF",
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
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
    marginVertical: 12,
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
  },

  /* Cartes GP */
  listingsList: {
    gap: 14,
  },
  gpCard: {
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
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 12,
  },
  routeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cityName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  flightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flightBadgeDirect: {
    backgroundColor: "#E8F5E9",
  },
  flightBadgeEscale: {
    backgroundColor: "#FEF3C7",
  },
  flightBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  flightBadgeTextDirect: {
    color: "#1D6B45",
  },
  flightBadgeTextEscale: {
    color: "#D4870A",
  },
  delayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  delayBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  delayCardNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  delayNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  delayNoticeReason: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
  },
  gpProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  gpAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  gpAvatarInitial: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1D6B45",
  },
  gpNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  locationSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  locationSubText: {
    fontSize: 11,
    color: "#64748B",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
  },
  /* Route Details on card */
  cardRouteDetailBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    gap: 8,
  },
  cardRouteStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cardStepTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardStepSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricGroup: {
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D6B45",
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  dividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  reviewCount: {
    fontSize: 10,
    color: "#64748B",
  },
  actionArrowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 4,
  },
  actionArrowText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
  },

  /* FAB Button */
  fabBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: "#1D6B45",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabBtnLogin: {
    backgroundColor: "#0F172A",
  },
  fabBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
