import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ServicesScreen() {
  const router = useRouter();

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* En-tête Gradient Vert avec Badge Hub & Services */}
        <View style={styles.headerCard}>
          <View style={styles.hubBadge}>
            <Ionicons name="sparkles" size={12} color="#D4870A" />
            <Text style={styles.hubBadgeText}>Hub & Services</Text>
          </View>

          <Text style={styles.headerTitle}>Nos Services</Text>
          <Text style={styles.headerSubtitle}>
            Sélectionnez un service pour commencer votre commande ou envoi.
          </Text>
        </View>

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Grille 2x2 des Services */}
        <View style={styles.servicesGrid}>
          {/* 1. Traiteur (Actif) */}
          <TouchableOpacity
            style={[styles.serviceCard, styles.traiteurCardBorder]}
            onPress={() => router.push("/traiteur")}
            activeOpacity={0.85}
          >
            <View>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, styles.traiteurIconBg]}>
                  <Ionicons name="restaurant-outline" size={24} color="#1D6B45" />
                </View>
                <View style={styles.activeBadgeGreen}>
                  <Ionicons name="checkmark-circle" size={10} color="#1D6B45" />
                  <Text style={styles.activeBadgeGreenText}>Actif</Text>
                </View>
              </View>

              <Text style={styles.serviceTitle}>Traiteur</Text>
              <Text style={styles.serviceSubtitleGreen}>Plats & Devis</Text>
              <Text style={styles.serviceDesc}>
                Plats africains faits maison & devis événements.
              </Text>
            </View>

            <View style={styles.cardFooterRow}>
              <Text style={styles.ctaTextGreen}>Commander</Text>
              <View style={styles.arrowCircleGreen}>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          {/* 2. GP Colis (Actif) */}
          <TouchableOpacity
            style={[styles.serviceCard, styles.gpCardBorder]}
            onPress={() => router.push("/gp")}
            activeOpacity={0.85}
          >
            <View>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, styles.gpIconBg]}>
                  <Ionicons name="airplane-outline" size={24} color="#D4870A" />
                </View>
                <View style={styles.activeBadgeGold}>
                  <Ionicons name="checkmark-circle" size={10} color="#D4870A" />
                  <Text style={styles.activeBadgeGoldText}>Actif</Text>
                </View>
              </View>

              <Text style={styles.serviceTitle}>GP Colis</Text>
              <Text style={styles.serviceSubtitleGold}>Transport de colis</Text>
              <Text style={styles.serviceDesc}>
                Envoi de colis sécurisé entre l'Europe et l'Afrique.
              </Text>
            </View>

            <View style={styles.cardFooterRow}>
              <Text style={styles.ctaTextGold}>Envoyer</Text>
              <View style={styles.arrowCircleGold}>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          {/* 3. Épicerie (Bientôt) */}
          <View style={[styles.serviceCard, styles.soonCardBorder]}>
            <View>
              <View style={styles.cardHeaderRow}>
                <View style={styles.disabledIconCircle}>
                  <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
                </View>
                <View style={styles.soonBadgeGold}>
                  <Ionicons name="time-outline" size={9} color="#D4870A" />
                  <Text style={styles.soonBadgeGoldText}>Bientôt</Text>
                </View>
              </View>

              <Text style={styles.disabledServiceTitle}>Épicerie</Text>
              <Text style={styles.disabledServiceSubtitle}>Produits du pays</Text>
              <Text style={styles.disabledServiceDesc}>
                Ingrédients et condiments exotiques authentiques.
              </Text>
            </View>

            <View style={styles.cardFooterRow}>
              <Text style={styles.soonFooterText}>Prochainement</Text>
            </View>
          </View>

          {/* 4. Coiffure (Bientôt) */}
          <View style={[styles.serviceCard, styles.soonCardBorder]}>
            <View>
              <View style={styles.cardHeaderRow}>
                <View style={styles.disabledIconCircle}>
                  <Ionicons name="cut-outline" size={24} color="#9CA3AF" />
                </View>
                <View style={styles.soonBadgeGreen}>
                  <Ionicons name="time-outline" size={9} color="#1D6B45" />
                  <Text style={styles.soonBadgeGreenText}>Bientôt</Text>
                </View>
              </View>

              <Text style={styles.disabledServiceTitle}>Coiffure</Text>
              <Text style={styles.disabledServiceSubtitle}>Tresses & Soins</Text>
              <Text style={styles.disabledServiceDesc}>
                Coiffeuses et tresseuses spécialisées à domicile.
              </Text>
            </View>

            <View style={styles.cardFooterRow}>
              <Text style={styles.soonFooterText}>Prochainement</Text>
            </View>
          </View>
        </View>

        {/* Badges de Confiance Compacts */}
        <View style={styles.trustBadgesRow}>
          <View style={styles.trustBadgePill}>
            <Ionicons name="shield-checkmark" size={13} color="#1D6B45" />
            <Text style={styles.trustBadgeText}>Paiement 100% sécurisé</Text>
          </View>

          <View style={styles.trustBadgePill}>
            <Ionicons name="heart" size={13} color="#D4870A" />
            <Text style={styles.trustBadgeText}>Réseau de confiance</Text>
          </View>

          <View style={styles.trustBadgePill}>
            <Ionicons name="headset" size={13} color="#1D6B45" />
            <Text style={styles.trustBadgeText}>Support 7j/7</Text>
          </View>
        </View>
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
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  hubBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  hubBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  /* Services Grid */
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  serviceCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 14,
    justifyContent: "space-between",
    minHeight: 190,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  traiteurCardBorder: {
    borderWidth: 1.5,
    borderColor: "rgba(29, 107, 69, 0.25)",
    backgroundColor: "#FAFDFA",
  },
  gpCardBorder: {
    borderWidth: 1.5,
    borderColor: "rgba(212, 135, 10, 0.25)",
    backgroundColor: "#FFFDF9",
  },
  soonCardBorder: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    opacity: 0.8,
  },

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  traiteurIconBg: {
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.15)",
  },
  gpIconBg: {
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.15)",
  },
  disabledIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Badges */
  activeBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.2)",
  },
  activeBadgeGreenText: {
    color: "#1D6B45",
    fontSize: 10,
    fontWeight: "800",
  },
  activeBadgeGold: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.2)",
  },
  activeBadgeGoldText: {
    color: "#D4870A",
    fontSize: 10,
    fontWeight: "800",
  },
  soonBadgeGold: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 135, 10, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.3)",
  },
  soonBadgeGoldText: {
    color: "#D4870A",
    fontSize: 9,
    fontWeight: "800",
  },
  soonBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 107, 69, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.3)",
  },
  soonBadgeGreenText: {
    color: "#1D6B45",
    fontSize: 9,
    fontWeight: "800",
  },

  /* Titles & Descriptions */
  serviceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  serviceSubtitleGreen: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
    marginTop: 1,
  },
  serviceSubtitleGold: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4870A",
    marginTop: 1,
  },
  serviceDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 14,
  },

  disabledServiceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
  },
  disabledServiceSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 1,
  },
  disabledServiceDesc: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 14,
  },

  /* Card Footers */
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 8,
  },
  ctaTextGreen: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D6B45",
  },
  ctaTextGold: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D4870A",
  },
  arrowCircleGreen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1D6B45",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowCircleGold: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D4870A",
    justifyContent: "center",
    alignItems: "center",
  },
  soonFooterText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  /* Trust Badges */
  trustBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  trustBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
});
