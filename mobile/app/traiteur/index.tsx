import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Traiteur } from "../../utils/types/traiteur";
import { apiFetch } from "../../utils/api";

// Filtres de cuisine
const CUISINES = [
  { label: "Tout", value: "tout" },
  { label: "🇸🇳 Sénégalais", value: "senegalais" },
  { label: "🇨🇮 Ivoirien", value: "ivoirien" },
  { label: "🇨🇲 Camerounais", value: "camerounais" },
  { label: "🇨🇬 Congolais", value: "congolais" },
];

const CUISINE_EMOJI: Record<string, string> = {
  senegalais: "🇸🇳",
  ivoirien: "🇨🇮",
  camerounais: "🇨🇲",
  congolais: "🇨🇬",
};

export default function TraiteurScreen() {
  const router = useRouter();

  const [selectedCuisine, setSelectedCuisine] = useState("tout");
  const [selectedZone, setSelectedZone] = useState("Toutes");
  const [searchQuery, setSearchQuery] = useState("");
  const [traiteurs, setTraiteurs] = useState<Traiteur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchTraiteurs() {
      setLoading(true);
      try {
        const response = await apiFetch("/traiteur");
        if (!response.ok) {
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (!ignore) {
          setTraiteurs(data.data.activeTraiteur || []);
        }
      } catch (err) {
        console.error("Erreur fetch traiteurs:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchTraiteurs();
    return () => {
      ignore = true;
    };
  }, []);

  // Extraire les zones de livraison uniques
  const availableZones = useMemo(() => {
    const set = new Set<string>();
    traiteurs.forEach((t) => {
      t.delivery_zones?.forEach((z) => {
        if (z && z.trim()) {
          set.add(z.trim());
        }
      });
    });
    return ["Toutes", ...Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))];
  }, [traiteurs]);

  // Filtrage 
  const filteredTraiteurs = useMemo(() => {
    return traiteurs.filter((traiteur) => {
      const matchCuisine =
        selectedCuisine === "tout" ||
        traiteur.cuisine_type?.some((c) =>
          c.toLowerCase().includes(selectedCuisine.toLowerCase()),
        );

      // Filtre Zone
      const matchZone =
        selectedZone === "Toutes" ||
        traiteur.delivery_zones?.some((z) =>
          z.toLowerCase().includes(selectedZone.toLowerCase()),
        );

      // Filtre Recherche
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        traiteur.name.toLowerCase().includes(query) ||
        traiteur.bio?.toLowerCase().includes(query) ||
        traiteur.delivery_zones?.some((z) => z.toLowerCase().includes(query)) ||
        traiteur.cuisine_type?.some((c) => c.toLowerCase().includes(query));

      return matchCuisine && matchZone && matchSearch;
    });
  }, [traiteurs, selectedCuisine, selectedZone, searchQuery]);

  const handleResetFilters = () => {
    setSelectedCuisine("tout");
    setSelectedZone("Toutes");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedCuisine !== "tout" ||
    selectedZone !== "Toutes" ||
    searchQuery.trim().length > 0;

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/accueil")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Accueil</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Traiteurs africains</Text>
          <Text style={styles.headerSubtitle}>
            Commandez de délicieux plats faits maison pour vos événements ou repas.
          </Text>

          {/* Search Bar */}
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search-outline" size={18} color="#1D6B45" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par zone, ville, nom..."
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
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sticky Filter Bars */}
        <View style={styles.filterBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
            style={styles.filterScroll}
          >
            <Text style={styles.filterPrefixLabel}>CUISINE :</Text>
            {CUISINES.map((c) => {
              const isActive = selectedCuisine === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.filterPill,
                    isActive
                      ? styles.filterPillActive
                      : styles.filterPillInactive,
                  ]}
                  onPress={() => setSelectedCuisine(c.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive
                        ? styles.filterPillTextActive
                        : styles.filterPillTextInactive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Ligne 2: Filtres Zones de Livraison */}
          {availableZones.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
              style={[styles.filterScroll, { marginTop: 8 }]}
            >
              <Text style={styles.filterPrefixLabel}>ZONE :</Text>
              {availableZones.map((zone) => {
                const isActive = selectedZone === zone;
                return (
                  <TouchableOpacity
                    key={zone}
                    style={[
                      styles.zoneFilterPill,
                      isActive
                        ? styles.zoneFilterPillActive
                        : styles.zoneFilterPillInactive,
                    ]}
                    onPress={() => setSelectedZone(zone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="location-sharp"
                      size={12}
                      color={isActive ? "#FFFFFF" : "#1D6B45"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.zoneFilterPillText,
                        isActive
                          ? styles.zoneFilterPillTextActive
                          : styles.zoneFilterPillTextInactive,
                      ]}
                    >
                      {zone === "Toutes" ? "Toutes les zones" : zone}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {hasActiveFilters && (
          <View style={styles.resultsBar}>
            <Text style={styles.resultsText}>
              {filteredTraiteurs.length} traiteur
              {filteredTraiteurs.length > 1 ? "s" : ""} trouvé
              {filteredTraiteurs.length > 1 ? "s" : ""}
            </Text>
            <TouchableOpacity onPress={handleResetFilters}>
              <Text style={styles.resetText}>Effacer les filtres</Text>
            </TouchableOpacity>
          </View>
        )}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#1D6B45" />
              <Text style={styles.loadingText}>Chargement des traiteurs...</Text>
            </View>
          ) : filteredTraiteurs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="restaurant-outline" size={42} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Aucun traiteur disponible</Text>
              <Text style={styles.emptySubtitle}>
                {selectedZone !== "Toutes"
                  ? `Aucun traiteur ne livre actuellement à "${selectedZone}".`
                  : "Aucun traiteur ne correspond à vos critères de recherche."}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={handleResetFilters}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyResetBtnText}>
                    Voir tous les traiteurs
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredTraiteurs.map((traiteur) => (
              <TouchableOpacity
                key={traiteur.id}
                style={styles.traiteurCard}
                onPress={() => router.push(`/traiteur/${traiteur.id}`)}
                activeOpacity={0.9}
              >
                {/* Top Banner Image */}
                <View style={styles.cardCoverBg}>
                  {traiteur.image_url ? (
                    <Image
                      source={{ uri: traiteur.image_url }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.emojiCircle}>
                      <Ionicons name="restaurant" size={28} color="#1D6B45" />
                    </View>
                  )}
                </View>

                {/* Card Details */}
                <View style={styles.cardDetails}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.traiteurName}>{traiteur.name}</Text>

                    {/* Rating Badge */}
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#EAB308" />
                      {traiteur.review_count === 0 ? (
                        <Text style={styles.ratingValue}>Nouveau</Text>
                      ) : (
                        <Text style={styles.ratingValue}>{traiteur.rating}</Text>
                      )}
                      {traiteur.review_count > 0 && (
                        <Text style={styles.ratingCount}>
                          ({traiteur.review_count})
                        </Text>
                      )}
                    </View>
                  </View>

                  <Text style={styles.traiteurBio} numberOfLines={2}>
                    {traiteur.bio}
                  </Text>

                  {traiteur.delivery_zones && traiteur.delivery_zones.length > 0 && (
                    <View style={styles.deliveryZonesRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#1D6B45"
                        style={{ marginTop: 1 }}
                      />
                      <View style={styles.deliveryZonesList}>
                        {traiteur.delivery_zones.map((zone) => {
                          const isMatch =
                            selectedZone !== "Toutes" &&
                            zone.toLowerCase().includes(selectedZone.toLowerCase());
                          return (
                            <View
                              key={zone}
                              style={[
                                styles.zoneBadge,
                                isMatch && styles.zoneBadgeHighlight,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.zoneBadgeText,
                                  isMatch && styles.zoneBadgeTextHighlight,
                                ]}
                              >
                                {zone}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Bottom Row */}
                  <View style={styles.cardFooterRow}>
                    <View style={styles.cuisinePillsRow}>
                      {traiteur.cuisine_type?.slice(0, 2).map((c) => (
                        <View key={c} style={styles.cuisineTag}>
                          <Text style={styles.cuisineTagText}>
                            {CUISINE_EMOJI[c]} {c}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.dishesCountText}>
                      {traiteur.dishes?.filter((d) => d.is_available).length || 0}{" "}
                      plat
                      {(traiteur.dishes?.filter((d) => d.is_available).length ||
                        0) > 1
                        ? "s"
                        : ""}{" "}
                      →
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
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
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
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
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 16,
    marginBottom: 12,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    height: "100%",
    paddingVertical: 0,
  },

  /* Filter Bar */
  filterBarContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 6,
  },
  filterPrefixLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    marginRight: 2,
    letterSpacing: 0.5,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  filterPillActive: {
    backgroundColor: "#1D6B45",
  },
  filterPillInactive: {
    backgroundColor: "#F1F5F9",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  filterPillTextInactive: {
    color: "#475569",
  },

  /* Zone Filter Pills */
  zoneFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  zoneFilterPillActive: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  zoneFilterPillInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  zoneFilterPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  zoneFilterPillTextActive: {
    color: "#FFFFFF",
  },
  zoneFilterPillTextInactive: {
    color: "#334155",
  },

  /* Results Bar */
  resultsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(29, 107, 69, 0.15)",
  },
  resultsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
  resetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C",
  },

  /* Scroll Content */
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyResetBtn: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyResetBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Traiteur Card */
  traiteurCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardCoverBg: {
    height: 125,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDetails: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  traiteurName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  ratingValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D6B45",
  },
  ratingCount: {
    fontSize: 10,
    color: "#64748B",
  },
  traiteurBio: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginBottom: 10,
  },

  /* Delivery Zones */
  deliveryZonesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 10,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  deliveryZonesList: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  zoneBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  zoneBadgeHighlight: {
    backgroundColor: "#E8F5E9",
    borderColor: "#1D6B45",
  },
  zoneBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  zoneBadgeTextHighlight: {
    color: "#1D6B45",
    fontWeight: "800",
  },

  /* Card Footer */
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cuisinePillsRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginRight: 8,
  },
  cuisineTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cuisineTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
    textTransform: "capitalize",
  },
  dishesCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
    flexShrink: 0,
  },
});
