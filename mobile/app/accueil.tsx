import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../utils/storage";

export default function AccueilScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  let full_name = null;
  let commandesTraiteur: any[] = [];
  let ordersPlats: any[] = [];
  let gpRequests: any[] = [];
  let pendingCount = 0;
  let unreadNotifications: any[] = [];
  let unreadCount = 0;

  useEffect(() => {
    async function loadData() {
      const token = await getSecureToken("token");
      if (!token) {
        full_name = "";
        return;
      }
      try {
        const baseUrl =
          process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api";
        const response = await fetch(`${baseUrl}/commande`, {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          setError(
            data.message || "Erreur lors de la récupération de vos commande",
          );
          return;
        }
        console.log(data);
        const userProfile = data.data?.orders;
        if (userProfile) {
          full_name = userProfile.full_name;
          gpRequests = userProfile.gp_requests || [];
          ordersPlats = userProfile.orders || [];
          commandesTraiteur = userProfile.commandes || [];
          const traiteurOrdersPending =
            userProfile.traiteurs
              ?.flatMap((t: any) => t.orders || [])
              .filter(
                (o: any) => o.status === "pending" || o.status === "en_attente",
              )?.length || 0;
          const traiteurCommandesPending =
            userProfile.traiteurs
              ?.flatMap((t: any) => t.commandes || [])
              .filter(
                (c: any) => c.statut === "en_attente" || c.statut === "pending",
              )?.length || 0;
          const gpRequestsPending =
            userProfile.gp_listings
              ?.flatMap((g: any) => g.requests || [])
              .filter(
                (r: any) => r.status === "pending" || r.status === "en_attente",
              )?.length || 0;

          pendingCount =
            traiteurOrdersPending +
            traiteurCommandesPending +
            gpRequestsPending;
        }
        const notifRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          unreadNotifications =
            notifData.notifications?.filter((n: any) => !n.is_read) || [];
          unreadCount = notifData.unread_count || 0;
        }
        
      } catch (error) {
        console.error("Erreur dans le fetch du dashboard :", error);
      }
      
    }
    loadData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Header Card (Gradient Vert & Or) */}
        <View style={styles.heroCard}>
          {/* Background Gold Blur Decoration */}
          <View style={styles.decorCircleGold} />

          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.welcomePill}>
                <Ionicons name="sparkles" size={12} color="#FBBF24" />
                <Text style={styles.welcomePillText}>Bienvenue sur Dabari</Text>
              </View>

              <Text style={styles.greetingText}>Bonjour, {full_name} 👋</Text>
              <Text style={styles.greetingSubtext}>
                Que souhaitez-vous commander ou envoyer aujourd'hui ?
              </Text>
            </View>

            <Link href="/profil" asChild>
              <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.8}>
                <Text style={styles.avatarText}>
                  {full_name ? full_name.charAt(0).toUpperCase : "?"}
                </Text>
                <View style={styles.avatarStatusDot} />
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <View style={styles.mainBody}>
          {/* Notification Alert Banner */}
          {unreadNotifications.length > 0 && (
            <TouchableOpacity style={styles.notifBanner} activeOpacity={0.9}>
              <View style={styles.notifLeft}>
                <View style={styles.notifIconContainer}>
                  <Ionicons name="notifications" size={20} color="#1D6B45" />
                  <View style={styles.notifBadgeCount}>
                    <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  {unreadCount > 1 ? (
                    <Text style={styles.notifTitle}>
                      {unreadCount} nouvelles notifications !
                    </Text>
                  ) : (
                    <Text style={styles.notifTitle}>
                      {unreadCount} nouvelle notification !
                    </Text>
                  )}
                  <Text style={styles.notifDesc}>
                    Votre commande traiteur est en cours de préparation.
                  </Text>
                </View>
              </View>

              <View style={styles.notifActionBtn}>
                <Text style={styles.notifActionText}>Voir</Text>
              </View>
            </TouchableOpacity>
          )}
          {/* Section: Services Disponibles */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services disponibles</Text>
            <TouchableOpacity onPress={() => router.push("/services")}>
              <Text style={styles.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          </View>

          {/* Grille 2x2 de Services */}
          <View style={styles.servicesGrid}>
            {/* 1. Traiteur (Actif) */}
            <TouchableOpacity
              style={styles.serviceCardActiveTraiteur}
              activeOpacity={0.85}
              onPress={()=>{router.push("/traiteur")}}
            >
              <View>
                <View style={styles.serviceTopRow}>
                  <View style={styles.serviceIconBgTraiteur}>
                    <Ionicons name="restaurant" size={24} color="#1D6B45" />
                  </View>
                  <View style={styles.statusPillActiveGreen}>
                    <Ionicons
                      name="checkmark-circle"
                      size={10}
                      color="#1D6B45"
                    />
                    <Text style={styles.statusTextGreen}>Actif</Text>
                  </View>
                </View>

                <Text style={styles.serviceTitle}>Traiteur</Text>
                <Text style={styles.serviceCategoryGreen}>Plats & Devis</Text>
                <Text style={styles.serviceDescription}>
                  Plats faits maison & devis événements.
                </Text>
              </View>

              <View style={styles.serviceFooterRow}>
                <Text style={styles.serviceFooterActionGreen}>Commander</Text>
                <View style={styles.actionCircleGreen}>
                  <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>

            {/* 2. GP Colis (Actif) */}
            <TouchableOpacity
              style={styles.serviceCardActiveGp}
              activeOpacity={0.85}
              onPress={()=>{router.push("/gp")}}
            >
              <View>
                <View style={styles.serviceTopRow}>
                  <View style={styles.serviceIconBgGp}>
                    <Ionicons name="airplane" size={24} color="#D4870A" />
                  </View>
                  <View style={styles.statusPillActiveGold}>
                    <Ionicons
                      name="checkmark-circle"
                      size={10}
                      color="#D4870A"
                    />
                    <Text style={styles.statusTextGold}>Actif</Text>
                  </View>
                </View>

                <Text style={styles.serviceTitle}>GP Colis</Text>
                <Text style={styles.serviceCategoryGold}>
                  Transport de colis
                </Text>
                <Text style={styles.serviceDescription}>
                  Envois sécurisés Europe - Afrique.
                </Text>
              </View>

              <View style={styles.serviceFooterRow}>
                <Text style={styles.serviceFooterActionGold}>Envoyer</Text>
                <View style={styles.actionCircleGold}>
                  <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>

            {/* 3. Épicerie (Bientôt) */}
            <View style={styles.serviceCardDisabled}>
              <View>
                <View style={styles.serviceTopRow}>
                  <View style={styles.serviceIconBgDisabled}>
                    <Ionicons name="cart-outline" size={22} color="#9CA3AF" />
                  </View>
                  <View style={styles.statusPillSoon}>
                    <Ionicons name="time-outline" size={9} color="#D4870A" />
                    <Text style={styles.statusTextSoon}>Bientôt</Text>
                  </View>
                </View>

                <Text style={styles.serviceTitleDisabled}>Épicerie</Text>
                <Text style={styles.serviceCategoryDisabled}>
                  Produits du pays
                </Text>
                <Text style={styles.serviceDescriptionDisabled}>
                  Ingrédients & condiments exotiques.
                </Text>
              </View>

              <Text style={styles.soonFooterText}>Prochainement</Text>
            </View>

            {/* 4. Coiffure (Bientôt) */}
            <View style={styles.serviceCardDisabled}>
              <View>
                <View style={styles.serviceTopRow}>
                  <View style={styles.serviceIconBgDisabled}>
                    <Ionicons name="cut-outline" size={22} color="#9CA3AF" />
                  </View>
                  <View style={styles.statusPillSoonGreen}>
                    <Ionicons name="time-outline" size={9} color="#1D6B45" />
                    <Text style={styles.statusTextSoonGreen}>Bientôt</Text>
                  </View>
                </View>

                <Text style={styles.serviceTitleDisabled}>Coiffure</Text>
                <Text style={styles.serviceCategoryDisabled}>
                  Tresses & Soins
                </Text>
                <Text style={styles.serviceDescriptionDisabled}>
                  Tresseuses spécialisées à domicile.
                </Text>
              </View>

              <Text style={styles.soonFooterText}>Prochainement</Text>
            </View>
          </View>

          {/* Section: Commandes Récentes */}
          <View style={styles.recentOrdersCard}>
            <View style={styles.recentOrdersHeader}>
              <Text style={styles.recentOrdersTitle}>Commandes récentes</Text>
              <TouchableOpacity onPress={()=>{router.push("/commande")}}>
                <Text style={styles.seeAllText}>Voir tout →</Text>
              </TouchableOpacity>
            </View>

            {/* Order Item 1 */}
            {ordersPlats}
            <View style={styles.orderItemRow}>
              <View style={styles.orderItemLeft}>
                <View style={styles.orderIconBoxTraiteur}>
                  <Ionicons name="restaurant" size={18} color="#1D6B45" />
                </View>
                <View>
                  <Text style={styles.orderItemName}>Traiteur Oumar</Text>
                  <Text style={styles.orderItemDate}>
                    29 Juil. • Menu Tiep & Poulet
                  </Text>
                </View>
              </View>

              <View style={styles.badgePending}>
                <Ionicons name="time-outline" size={12} color="#B45309" />
                <Text style={styles.badgePendingText}>En attente</Text>
              </View>
            </View>

            {/* Order Item 2 */}
            <View style={[styles.orderItemRow, { borderBottomWidth: 0 }]}>
              <View style={styles.orderItemLeft}>
                <View style={styles.orderIconBoxGp}>
                  <Ionicons name="airplane" size={18} color="#D4870A" />
                </View>
                <View>
                  <Text style={styles.orderItemName}>GP Paris → Dakar</Text>
                  <Text style={styles.orderItemDate}>
                    26 Juil. • Colis 5 kg
                  </Text>
                </View>
              </View>

              <View style={styles.badgeAccepted}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={12}
                  color="#1D6B45"
                />
                <Text style={styles.badgeAcceptedText}>Acceptée</Text>
              </View>
            </View>
          </View>

          {/* Footer Security Notice */}
          <View style={styles.footerTrustBar}>
            <Ionicons name="shield-checkmark" size={14} color="#1D6B45" />
            <Text style={styles.footerTrustText}>
              Plateforme 100% sécurisée • Réseau de confiance Dabari
            </Text>
          </View>
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
    paddingBottom: 40,
  },

  /* Top Hero Header Card */
  heroCard: {
    backgroundColor: "#165034",
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  decorCircleGold: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(212, 135, 10, 0.2)",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 10,
    gap: 6,
  },
  welcomePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#D4870A",
    borderWidth: 2,
    borderColor: "#165034",
  },

  /* Body Content */
  mainBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 18,
  },

  /* Notification Alert Banner */
  notifBanner: {
    backgroundColor: "#E8F5E9",
    borderColor: "rgba(29, 107, 69, 0.3)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  notifIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notifBadgeCount: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  notifDesc: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 2,
  },
  notifActionBtn: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginLeft: 10,
  },
  notifActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },

  /* Services Grid 2x2 */
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  serviceCardActiveTraiteur: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(29, 107, 69, 0.25)",
    justifyContent: "space-between",
    minHeight: 175,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceCardActiveGp: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(212, 135, 10, 0.25)",
    justifyContent: "space-between",
    minHeight: 175,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceCardDisabled: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    justifyContent: "space-between",
    minHeight: 175,
    opacity: 0.8,
  },
  serviceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  serviceIconBgTraiteur: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceIconBgGp: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFF8E7",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceIconBgDisabled: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  statusPillActiveGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusTextGreen: {
    color: "#1D6B45",
    fontSize: 10,
    fontWeight: "700",
  },
  statusPillActiveGold: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusTextGold: {
    color: "#D4870A",
    fontSize: 10,
    fontWeight: "700",
  },
  statusPillSoon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  statusTextSoon: {
    color: "#D4870A",
    fontSize: 9,
    fontWeight: "700",
  },
  statusPillSoonGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  statusTextSoonGreen: {
    color: "#1D6B45",
    fontSize: 9,
    fontWeight: "700",
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  serviceTitleDisabled: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },
  serviceCategoryGreen: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
    marginTop: 1,
  },
  serviceCategoryGold: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4870A",
    marginTop: 1,
  },
  serviceCategoryDisabled: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 1,
  },
  serviceDescription: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 15,
  },
  serviceDescriptionDisabled: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 15,
  },
  serviceFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 8,
  },
  serviceFooterActionGreen: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
  },
  actionCircleGreen: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1D6B45",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceFooterActionGold: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4870A",
  },
  actionCircleGold: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D4870A",
    justifyContent: "center",
    alignItems: "center",
  },
  soonFooterText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 8,
  },

  /* Recent Orders Card */
  recentOrdersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recentOrdersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  recentOrdersTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  orderItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  orderIconBoxTraiteur: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  orderIconBoxGp: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF8E7",
    justifyContent: "center",
    alignItems: "center",
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  orderItemDate: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgePendingText: {
    color: "#B45309",
    fontSize: 10,
    fontWeight: "700",
  },
  badgeAccepted: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeAcceptedText: {
    color: "#1D6B45",
    fontSize: 10,
    fontWeight: "700",
  },

  /* Footer Trust Notice */
  footerTrustBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  footerTrustText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
  },
});
