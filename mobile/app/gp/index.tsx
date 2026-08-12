import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../utils/storage";
import { GpListing } from "../../utils/types/gp";

// Mockup Data pour le visuel GP
const MOCK_DESTINATIONS = [
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

  useEffect(()=>{
    const load = async () => {
      const token = await getSecureToken("token");
      if (token) {
        setIsLoggedIn(true);
      }
      try{
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/gp`,{
        headers:{
            "Content-Type": "application/json"
        }
      })
      const data = await response.json()
      if(!response.ok){
        setError('Erreur lors de la récupération des GP')
        return;
      }
      console.log(data)
      setGp(data.data.gp)
      setIsLoading(false)
    }catch(error){
        setError('Erreur lors de la récupération des GP')
        return;
    }
    };
    load();
  },[])

    const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  };


  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Header*/}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push('/accueil')}
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

        {/* Destinations */}
        <View style={styles.searchSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {MOCK_DESTINATIONS.map((dest) => {
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
              {gp.length} GP disponibles
            </Text>
          </View>

          <View style={styles.listingsList}>
            {gp.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gpCard}
                activeOpacity={0.9}
                onPress={() => {
                  router.push(`/gp/${item.id}`)
                }}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.routeGroup}>
                    <Text style={styles.cityName}>
                       {item.departure_city}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#1D6B45" />
                    <Text style={styles.cityName}>
                      {item.arrival_city}
                    </Text>
                  </View>

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
                </View>

                <View style={styles.gpProfileRow}>
                  <View style={styles.gpAvatarCircle}>
                    <Text style={styles.gpAvatarInitial}>
                      {item.profiles.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gpNameText}>{item.profiles.full_name}</Text>
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
                  </View>

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
                </View>

                {/* Métriques */}
                <View style={styles.cardFooter}>
                  <View style={styles.metricGroup}>
                    <Text style={styles.metricLabel}>Disponible</Text>
                    <Text style={styles.metricValue}>
                      {item.available_kg} kg
                    </Text>
                  </View>

                  <View style={styles.dividerVertical} />

                  <View style={styles.metricGroup}>
                    <Text style={styles.metricLabel}>Tarif au kg</Text>
                    <Text style={styles.priceValue}>
                      {item.price_per_kg} €/kg
                    </Text>
                  </View>

                  <View style={styles.dividerVertical} />

                  <View style={styles.metricGroup}>
                    <Text style={styles.metricLabel}>Avis</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color="#FBBF24" />
                      <Text style={styles.ratingValue}>{item.rating}</Text>
                      <Text style={styles.reviewCount}>
                        ({item.review_count})
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.actionArrowBtn}>
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
        </ScrollView>

        <TouchableOpacity
          style={styles.fabBtn}
          activeOpacity={0.85}
          onPress={() => {
            router.push("/gp/nouveau")
          }}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.fabBtnText}>Je suis GP</Text>
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
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  filterScroll: {
    gap: 8,
    paddingRight: 10,
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
    backgroundColor: "#D4870A",
    borderColor: "#D4870A",
  },
  destChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  destChipTextActive: {
    color: "#FFFFFF",
  },

  /* ScrollView Principale */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 90,
  },

  /* Bannière Sécurité */
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  securityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
  },
  securitySub: {
    fontSize: 11,
    color: "#78350F",
    marginTop: 2,
    lineHeight: 15,
  },

  /* Rangée de Tri */
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
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
    fontWeight: "600",
    color: "#64748B",
  },

  /* Liste des Cartes GP */
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

  /* En-tête de la Trajet Card */
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
    fontSize: 14,
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
    backgroundColor: "#FFF8E1",
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

  /* Rangée Profil GP */
  gpProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  gpAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  gpAvatarInitial: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1D6B45",
  },
  gpNameText: {
    fontSize: 13,
    fontWeight: "700",
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
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* Pied de Carte & Métriques */
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 14,
    justifyContent: "space-between",
  },
  metricGroup: {
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  priceValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
    marginTop: 2,
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
    marginTop: 2,
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
  },
  actionArrowText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D6B45",
  },

  /* Floating Action Button (FAB) */
  fabBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: "#1D6B45",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
