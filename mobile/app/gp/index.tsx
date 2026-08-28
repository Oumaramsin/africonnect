import React, { useCallback, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../utils/storage";
import { GpListing } from "../../utils/types/gp";
import { apiFetch } from "../../utils/api";

const destination = [
  { label: "Tout", value: "tout" },
  { label: "🇸🇳 Sénégal", value: "Sénégal" },
  { label: "🇨🇮 Côte d'Ivoire", value: "Côte d'Ivoire" },
  { label: "🇨🇲 Cameroun", value: "Cameroun" },
  { label: "🇨🇬 Congo", value: "Congo" },
  { label: "🇲🇱 Mali", value: "Mali" },
];

export default function GpScreen() {
  const router = useRouter();

  const [selectedDestination, setSelectedDestination] = useState("tout");
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

  const filteredGp = gp.filter((item) => {
    if (selectedDestination === "tout") return true;

    const destLower = selectedDestination.toLowerCase();
    const arrivalCountry = (item.arrival_country || "").toLowerCase();
    const arrivalCity = (item.arrival_city || "").toLowerCase();

    return (
      arrivalCountry.includes(destLower) ||
      arrivalCity.includes(destLower) ||
      destLower.includes(arrivalCountry) ||
      destLower.includes(arrivalCity)
    );
  });

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/accueil")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Accueil</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Transport GP Colis</Text>
          <Text style={styles.headerSubtitle}>
            Envoyez vos colis rapidement et en toute sécurité entre l'Europe et
            l'Afrique.
          </Text>
        </View>

        {/* Destinations Chips */}
        <View style={styles.searchSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {destination.map((dest) => {
              const active = selectedDestination === dest.value;
              return (
                <TouchableOpacity
                  key={dest.value}
                  style={[styles.destChip, active && styles.destChipActive]}
                  onPress={() => setSelectedDestination(dest.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.destChipText,
                      active && styles.destChipTextActive,
                    ]}
                  >
                    {dest.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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

  /* Section Recherche & Filtres */
  searchSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  filterScroll: {
    gap: 8,
  },
  destChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  destChipActive: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  destChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  destChipTextActive: {
    color: "#FFFFFF",
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
