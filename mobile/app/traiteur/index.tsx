import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Traiteur } from "../../utils/types/traiteur";

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

  // État local uniquement pour le visuel et les filtres
  const [selectedCuisine, setSelectedCuisine] = useState("tout");
  const [error, setError] = useState("");
  const [traiteurs, setTraiteurs] = useState<Traiteur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchTraiteurs() {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/traiteur`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        if (!response.ok) {
          setLoading(false);
          return;
        }
        const data = await response.json();
        console.log(data);
        if (!ignore) {
          setTraiteurs(data.data.activeTraiteur);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchTraiteurs();
    return () => {
      ignore = true;
    };
  }, [selectedCuisine]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header Card (Gradient Vert) */}
      <View style={styles.headerCard}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Accueil</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Traiteurs africains</Text>
        <Text style={styles.headerSubtitle}>
          Commandez de délicieux plats faits maison pour vos événements ou
          repas.
        </Text>
      </View>

      {/* Sticky Horizontal Filter Bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
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
      </View>

      {/* Main Content List (Vue Démonstration) */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Traiteur Demo 1 */}
        {traiteurs.map((traiteur) => (
          <TouchableOpacity
            key={traiteur.id}
            style={styles.traiteurCard}
            onPress={() => router.push(`/traiteur/${traiteur.id}`)}
            activeOpacity={0.9}
          >
            {/* Top Banner Image / Gradient Placeholder */}
            <View style={styles.cardCoverBg}>
              {traiteur.image_url ? (
                <Image
                  source={{ uri: traiteur.image_url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.emojiCircle}>
                  <Text style={styles.emojiText}>👨‍🍳</Text>
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
                  {traiteur.review_count === 0 && (
                    <Text style={styles.ratingValue}>Aucun Avis</Text>
                  )}
                  {traiteur.review_count > 0 && (
                    <Text style={styles.ratingValue}>{traiteur.rating}</Text>
                  )}
                  <Text style={styles.ratingCount}>
                    ({traiteur.review_count})
                  </Text>
                </View>
              </View>

              <Text style={styles.traiteurBio} numberOfLines={2}>
                {traiteur.bio}
              </Text>

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
                  {(traiteur.dishes?.filter((d) => d.is_available).length || 0) > 1
                    ? "s"
                    : ""}{" "}
                  →
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  headerCard: {
    backgroundColor: "#165034",
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },

  /* Filter Bar */
  filterBarContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  filterPrefixLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CA3AF",
    marginRight: 4,
    letterSpacing: 0.5,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: "#1D6B45",
  },
  filterPillInactive: {
    backgroundColor: "#F3F4F6",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  filterPillTextInactive: {
    color: "#4B5563",
  },

  /* Scroll Content */
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* Traiteur Card */
  traiteurCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardCoverBg: {
    height: 120,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  emojiText: {
    fontSize: 30,
  },
  cardDetails: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  traiteurName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
  ratingCount: {
    fontSize: 11,
    color: "#6B7280",
  },
  noRatingBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  noRatingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  traiteurBio: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
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
    paddingVertical: 4,
    borderRadius: 12,
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
