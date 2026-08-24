import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../utils/storage";

export default function HomeScreen() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getSecureToken("token");
        if (token) {
          router.replace("/accueil");
          return;
        }
      } catch (err) {
        console.warn("[AuthCheck] Erreur lors de la lecture du token:", err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <ActivityIndicator size="large" color="#1D6B45" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoTitle}>Dabari</Text>
          </View>
          <View style={styles.pillBadge}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>Application Mobile</Text>
          </View>
        </View>

        {/* Main Card (Matching Auth Web Card Design) */}
        <View style={styles.mainCard}>
          
          {/* Top Decorative Tag */}
          <View style={styles.tagRow}>
            <Text style={styles.tagText}>Services de Confiance</Text>
          </View>

          {/* Heading */}
          <Text style={styles.headingTitle}>
            Bienvenue sur <Text style={styles.headingHighlight}>Dabari</Text>
          </Text>
          <Text style={styles.headingSubtitle}>
            Vos traiteurs faits maison préférés et vos envois de colis GP réunis en toute sérénité.
          </Text>

          {/* Service Feature Highlights */}
          <View style={styles.servicesGrid}>
            <View style={styles.serviceItem}>
              <View style={[styles.serviceIconCircle, { backgroundColor: "rgba(212, 135, 10, 0.12)" }]}>
                <Ionicons name="restaurant" size={20} color="#D4870A" />
              </View>
              <View style={styles.serviceTextGroup}>
                <Text style={styles.serviceTitle}>Traiteurs d'exception</Text>
                <Text style={styles.serviceSubtitle}>Menus fait maison & événements</Text>
              </View>
            </View>

            <View style={styles.serviceItem}>
              <View style={[styles.serviceIconCircle, { backgroundColor: "rgba(29, 107, 69, 0.12)" }]}>
                <Ionicons name="cube" size={20} color="#1D6B45" />
              </View>
              <View style={styles.serviceTextGroup}>
                <Text style={styles.serviceTitle}>Transport Colis GP</Text>
                <Text style={styles.serviceSubtitle}>Envois sécurisés entre particuliers</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Link href="/login" asChild>
              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Connexion</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </Link>

            <Link href="/(auth)/register" asChild>
              <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>Inscription</Text>
              </TouchableOpacity>
            </Link>

            {/* Bouton Continuer en tant qu'invité */}
            <TouchableOpacity
              style={styles.guestBtn}
              activeOpacity={0.85}
              onPress={() => router.replace("/accueil")}
            >
              <Ionicons name="sparkles" size={16} color="#1D6B45" style={{ marginRight: 6 }} />
              <Text style={styles.guestBtnText}>Continuer en tant qu'invité</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Footer Trust Bar */}
        <View style={styles.footerTrust}>
          <Ionicons name="shield-checkmark-sharp" size={15} color="#1D6B45" />
          <Text style={styles.footerTrustText}>
            Paiements 100% sécurisés • Membres vérifiés
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 107, 69, 0.08)",
    borderColor: "rgba(29, 107, 69, 0.2)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1D6B45",
  },
  pillText: {
    color: "#1D6B45",
    fontSize: 11,
    fontWeight: "700",
  },

  /* Main Card styling matched with Web Auth */
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  tagRow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 135, 10, 0.1)",
    borderColor: "rgba(212, 135, 10, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 16,
  },
  tagText: {
    color: "#D4870A",
    fontSize: 11,
    fontWeight: "700",
  },
  headingTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  headingHighlight: {
    color: "#1D6B45",
  },
  headingSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
    marginBottom: 24,
  },
  servicesGrid: {
    gap: 12,
    marginBottom: 28,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 14,
  },
  serviceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceTextGroup: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  serviceSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionsContainer: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: "#1D6B45",
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  secondaryBtnText: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "700",
  },
  guestBtn: {
    backgroundColor: "rgba(29, 107, 69, 0.08)",
    borderColor: "rgba(29, 107, 69, 0.25)",
    borderWidth: 1.5,
    paddingVertical: 15,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  guestBtnText: {
    color: "#1D6B45",
    fontSize: 15,
    fontWeight: "700",
  },
  centerLoader: {
    justifyContent: "center",
    alignItems: "center",
  },
  footerTrust: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerTrustText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
});
