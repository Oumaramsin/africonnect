import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken, saveSecureToken } from "../utils/storage";
import { apiFetch } from "../utils/api";
import type { CommandeTraiteur, OrderPlat } from "../utils/types/traiteur";
import { GpRequest } from "../utils/types/gp";

export default function AccueilScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [fullname, setFullname] = useState("");
  const [ordersPlats, setOrdersPlats] = useState<OrderPlat[]>([]);
  const [commandesTraiteur, setCommandesTraiteur] = useState<CommandeTraiteur[]>([]);
  const [gpRequests, setGpRequests] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showDescription, setShowDescription] = useState<boolean>(false);

  // Recherche rapide sur l'accueil (identique au web)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchService, setSearchService] = useState<"all" | "traiteur" | "gp">("all");

  useEffect(() => {
    async function checkBanner() {
      try {
        const isDismissed = await getSecureToken("hide_description");
        if (isDismissed !== "true") {
          setShowDescription(true);
        }
      } catch (e) {
        console.warn("[Accueil] Erreur statut hide_description:", e);
        setShowDescription(true);
      }
    }
    checkBanner();

    async function loadData() {
      setLoading(true);
      const token = await getSecureToken("token");
      if (!token) {
        setFullname("");
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      setIsLoggedIn(true);
      try {
        const response = await apiFetch("/commande");
        const data = await response.json();
        if (!response.ok) {
          setError(
            data.message || "Erreur lors de la récupération de vos commandes"
          );
          setLoading(false);
          return;
        }
        const userProfile = data.data?.orders;
        if (userProfile) {
          setFullname(userProfile.full_name);
          setGpRequests(userProfile.gp_requests || []);
          setOrdersPlats(userProfile.orders || []);
          setCommandesTraiteur(userProfile.commandes || []);
        }
        const notifRes = await apiFetch("/notifications");
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setUnreadNotifications(
            notifData.notifications?.filter((n: any) => !n.is_read) || []
          );
          setUnreadCount(notifData.unread_count || 0);
        }
      } catch (err) {
        console.error("Erreur chargement dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const sub1 = DeviceEventEmitter.addListener(
      "dabari_orders_updated",
      () => loadData(),
    );
    const sub2 = DeviceEventEmitter.addListener(
      "dabari_notifications_updated",
      () => loadData(),
    );
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  const handleDismissDescription = async () => {
    setShowDescription(false);
    try {
      await saveSecureToken("hide_description", "true");
    } catch (e) {
      console.warn("[Accueil] Erreur sauvegarde hide_description:", e);
    }
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    if (searchService === "gp") {
      router.push(q ? (`/gp?destination=${encodeURIComponent(q)}` as any) : "/gp");
    } else {
      router.push(q ? (`/traiteur?q=${encodeURIComponent(q)}` as any) : "/traiteur");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "en_attente":
      case "pending":
        return (
          <View style={styles.badgePending}>
            <Ionicons name="time-outline" size={11} color="#B45309" />
            <Text style={styles.badgePendingText}>En attente</Text>
          </View>
        );
      case "acceptee":
      case "accepted":
        return (
          <View style={styles.badgeAccepted}>
            <Ionicons name="checkmark-circle" size={11} color="#1D6B45" />
            <Text style={styles.badgeAcceptedText}>Acceptée</Text>
          </View>
        );
      case "refusee":
      case "rejected":
        return (
          <View style={styles.badgeRefused}>
            <Ionicons name="close-circle" size={11} color="#DC2626" />
            <Text style={styles.badgeRefusedText}>Refusée</Text>
          </View>
        );
      case "annulee":
      case "cancelled":
        return (
          <View style={[styles.badgeRefused, { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" }]}>
            <Ionicons name="close-circle-outline" size={11} color="#64748B" />
            <Text style={{ fontSize: 10, color: "#64748B", fontWeight: "700" }}>
              Annulée
            </Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badgeRefused, { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" }]}>
            <Text style={{ fontSize: 10, color: "#64748B", fontWeight: "700" }}>
              {statut}
            </Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={[styles.topGreenWrapper, styles.centerLoader]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.initialLoadingText}>Chargement de Dabari...</Text>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. BANNIÈRE HERO PRINCIPALE (GRADIENT ÉMERAUDE & OR) ── */}
          <View style={styles.heroCard}>
            <View style={styles.decorCircleGold} />

            <View style={styles.heroHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.welcomePill}>
                  <Ionicons name="sparkles" size={12} color="#FBBF24" />
                  <Text style={styles.welcomePillText}>Bienvenue sur Dabari</Text>
                </View>

                <Text style={styles.greetingText}>
                  {isLoggedIn && fullname ? `Bonjour, ${fullname}` : "Bonjour"}
                </Text>
                <Text style={styles.greetingSubtext}>
                  {isLoggedIn
                    ? "Que souhaitez-vous commander ou envoyer aujourd'hui ?"
                    : "Connectez-vous pour profiter de tous vos services."}
                </Text>
              </View>

              {isLoggedIn ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TouchableOpacity
                    style={styles.notifBtnHeader}
                    activeOpacity={0.8}
                    onPress={() => router.push("/notifications" as any)}
                  >
                    <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                    {unreadCount > 0 && (
                      <View style={styles.notifBadgeHeader}>
                        <Text style={styles.notifBadgeHeaderText}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Link href="/profil" asChild>
                    <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.8}>
                      <Text style={styles.avatarText}>
                        {fullname ? fullname.charAt(0).toUpperCase() : "?"}
                      </Text>
                      <View style={styles.avatarStatusDot} />
                    </TouchableOpacity>
                  </Link>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.loginBtnHeader}
                  activeOpacity={0.85}
                  onPress={() => router.push("/login")}
                >
                  <Text style={styles.loginBtnHeaderText}>Connexion</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Barre de Recherche Rapide (avec toggle de service comme sur le Web) */}
            <View style={styles.searchBarContainer}>
              <View style={styles.serviceToggleRow}>
                <TouchableOpacity
                  style={[styles.serviceToggleBtn, searchService === "all" && styles.serviceToggleBtnActive]}
                  onPress={() => setSearchService("all")}
                >
                  <Text style={[styles.serviceToggleText, searchService === "all" && styles.serviceToggleTextActive]}>
                    Tous
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.serviceToggleBtn, searchService === "traiteur" && styles.serviceToggleBtnActive]}
                  onPress={() => setSearchService("traiteur")}
                >
                  <Ionicons
                    name="restaurant"
                    size={11}
                    color={searchService === "traiteur" ? "#1D6B45" : "rgba(255,255,255,0.8)"}
                  />
                  <Text style={[styles.serviceToggleText, searchService === "traiteur" && styles.serviceToggleTextActive]}>
                    Traiteur
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.serviceToggleBtn, searchService === "gp" && styles.serviceToggleBtnActiveGold]}
                  onPress={() => setSearchService("gp")}
                >
                  <Ionicons
                    name="airplane"
                    size={11}
                    color={searchService === "gp" ? "#FFFFFF" : "rgba(255,255,255,0.8)"}
                  />
                  <Text style={[styles.serviceToggleText, searchService === "gp" && styles.serviceToggleTextActiveGold]}>
                    Vol GP
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchInputRow}>
                <Ionicons name="search" size={15} color="rgba(255,255,255,0.7)" />
                <TextInput
                  style={styles.searchTextInput}
                  placeholder={
                    searchService === "gp"
                      ? "Destination (Sénégal, Abidjan, Paris...)"
                      : searchService === "traiteur"
                      ? "Plat, spécialité (Tiep, Mafé, Alloco...)"
                      : "Rechercher un plat, traiteur ou trajet de vol..."
                  }
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={styles.searchSubmitBtn}
                  onPress={handleSearchSubmit}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 3 Raccourcis d'action sur l'accueil (Grille 3 colonnes) */}
            <View style={styles.actionShortcutsGrid}>
              <TouchableOpacity
                style={styles.shortcutBtn}
                onPress={() => router.push("/traiteur/demande")}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={13} color="#FBBF24" />
                <Text style={styles.shortcutBtnText} numberOfLines={1}>
                  Devis traiteur
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutBtn}
                onPress={() => router.push("/gp/nouveau")}
                activeOpacity={0.8}
              >
                <Ionicons name="airplane" size={13} color="#FBBF24" />
                <Text style={styles.shortcutBtnText} numberOfLines={1}>
                  Publier vol
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutBtn}
                onPress={() => router.push("/traiteur")}
                activeOpacity={0.8}
              >
                <Ionicons name="restaurant" size={13} color="#FBBF24" />
                <Text style={styles.shortcutBtnText} numberOfLines={1}>
                  Explorer
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 2. CORPS PRINCIPAL ── */}
          <View style={styles.mainBody}>
            {/* Bannière de présentation Dabari (fermable) */}
            {showDescription && (
              <View style={styles.descriptionCard}>
                <View style={styles.descriptionHeaderRow}>
                  <View style={styles.descriptionTagRow}>
                    <Ionicons name="sparkles" size={12} color="#D4870A" />
                    <Text style={styles.descriptionTagText}>Services de Confiance</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.descriptionCloseBtn}
                    activeOpacity={0.7}
                    onPress={handleDismissDescription}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.descriptionTitle}>
                  Bienvenue sur <Text style={{ color: "#1D6B45" }}>Dabari</Text>
                </Text>

                <Text style={styles.descriptionBody}>
                  <Text style={{ fontWeight: "800", color: "#111827" }}>Dabari</Text> est la plateforme de référence pour commander des{" "}
                  <Text style={{ fontWeight: "700", color: "#1D6B45" }}>plats authentiques & devis traiteur</Text>, et organiser vos envois de{" "}
                  <Text style={{ fontWeight: "700", color: "#D4870A" }}>colis GP</Text> en toute sérénité entre l'Afrique et l'Europe.
                </Text>
              </View>
            )}

            {/* Alerte Erreur si présente */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Notification Alert Banner */}
            {(unreadCount > 0 || unreadNotifications.length > 0) && (
              <TouchableOpacity
                style={styles.notifBanner}
                activeOpacity={0.9}
                onPress={() => router.push("/notifications" as any)}
              >
                <View style={styles.notifLeft}>
                  <View style={styles.notifIconContainer}>
                    <Ionicons name="notifications" size={18} color="#1D6B45" />
                    <View style={styles.notifBadgeCount}>
                      <Text style={styles.notifBadgeText}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>
                      {unreadCount > 1
                        ? `${unreadCount} nouvelles alertes Dabari !`
                        : `${unreadCount} nouvelle alerte Dabari !`}
                    </Text>
                    <Text style={styles.notifDesc} numberOfLines={1}>
                      {unreadNotifications[0]?.titre ||
                        "Vos commandes et devis ont des mises à jour récentes."}
                    </Text>
                  </View>
                </View>

                <View style={styles.notifActionBtn}>
                  <Text style={styles.notifActionText}>Consulter</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ── 3. SERVICES DISPONIBLES (GRILLE 2x2) ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Services disponibles</Text>
              <Text style={styles.servicesSubLabel}>Écosystème Dabari</Text>
            </View>

            <View style={styles.servicesGrid}>
              {/* 1. Traiteur (Actif) */}
              <TouchableOpacity
                style={styles.serviceCardActiveTraiteur}
                activeOpacity={0.88}
                onPress={() => router.push("/traiteur")}
              >
                <View>
                  <View style={styles.serviceTopRow}>
                    <View style={styles.serviceIconBgTraiteur}>
                      <Ionicons name="restaurant" size={22} color="#1D6B45" />
                    </View>
                    <View style={styles.statusPillActiveGreen}>
                      <Ionicons name="checkmark-circle" size={10} color="#1D6B45" />
                      <Text style={styles.statusTextGreen}>Actif</Text>
                    </View>
                  </View>

                  <Text style={styles.serviceTitle}>Traiteur</Text>
                  <Text style={styles.serviceCategoryGreen}>Plats & Devis</Text>
                  <Text style={styles.serviceDescription}>
                    Plats faits maison & buffets de réception.
                  </Text>
                </View>

                <View style={styles.serviceFooterRow}>
                  <Text style={styles.serviceFooterActionGreen}>Découvrir</Text>
                  <View style={styles.actionCircleGreen}>
                    <Ionicons name="arrow-forward" size={11} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 2. GP Colis (Actif) */}
              <TouchableOpacity
                style={styles.serviceCardActiveGp}
                activeOpacity={0.88}
                onPress={() => router.push("/gp")}
              >
                <View>
                  <View style={styles.serviceTopRow}>
                    <View style={styles.serviceIconBgGp}>
                      <Ionicons name="airplane" size={22} color="#D4870A" />
                    </View>
                    <View style={styles.statusPillActiveGold}>
                      <Ionicons name="checkmark-circle" size={10} color="#D4870A" />
                      <Text style={styles.statusTextGold}>Actif</Text>
                    </View>
                  </View>

                  <Text style={styles.serviceTitle}>GP Colis</Text>
                  <Text style={styles.serviceCategoryGold}>Transport de bagages</Text>
                  <Text style={styles.serviceDescription}>
                    Envois rapides Europe ⇄ Afrique.
                  </Text>
                </View>

                <View style={styles.serviceFooterRow}>
                  <Text style={styles.serviceFooterActionGold}>Expédier</Text>
                  <View style={styles.actionCircleGold}>
                    <Ionicons name="arrow-forward" size={11} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 3. Épicerie (Bientôt) */}
              <View style={styles.serviceCardDisabled}>
                <View>
                  <View style={styles.serviceTopRow}>
                    <View style={styles.serviceIconBgDisabled}>
                      <Ionicons name="cart-outline" size={20} color="#9CA3AF" />
                    </View>
                    <View style={styles.statusPillSoon}>
                      <Ionicons name="time-outline" size={9} color="#D4870A" />
                      <Text style={styles.statusTextSoon}>Bientôt</Text>
                    </View>
                  </View>

                  <Text style={styles.serviceTitleDisabled}>Épicerie</Text>
                  <Text style={styles.serviceCategoryDisabled}>Produits du pays</Text>
                  <Text style={styles.serviceDescriptionDisabled}>
                    Condiments, épices & produits exotiques.
                  </Text>
                </View>

                <Text style={styles.soonFooterText}>Prochainement</Text>
              </View>

              {/* 4. Coiffure (Bientôt) */}
              <View style={styles.serviceCardDisabled}>
                <View>
                  <View style={styles.serviceTopRow}>
                    <View style={styles.serviceIconBgDisabled}>
                      <Ionicons name="cut-outline" size={20} color="#9CA3AF" />
                    </View>
                    <View style={styles.statusPillSoonGreen}>
                      <Ionicons name="time-outline" size={9} color="#1D6B45" />
                      <Text style={styles.statusTextSoonGreen}>Bientôt</Text>
                    </View>
                  </View>

                  <Text style={styles.serviceTitleDisabled}>Coiffure</Text>
                  <Text style={styles.serviceCategoryDisabled}>Tresses & Soins</Text>
                  <Text style={styles.serviceDescriptionDisabled}>
                    Coiffeuses spécialisées à domicile.
                  </Text>
                </View>

                <Text style={styles.soonFooterText}>Prochainement</Text>
              </View>
            </View>

            {/* ── 4. COMMANDES RÉCENTES (SI CONNECTÉ) ── */}
            {isLoggedIn &&
            (commandesTraiteur.length > 0 ||
              ordersPlats.length > 0 ||
              gpRequests.length > 0) ? (
              <View style={styles.recentOrdersCard}>
                <View style={styles.recentOrdersHeader}>
                  <Text style={styles.recentOrdersTitle}>Commandes récentes</Text>
                  <TouchableOpacity onPress={() => router.push("/commandes")}>
                    <Text style={styles.seeAllText}>Voir tout</Text>
                  </TouchableOpacity>
                </View>

                {/* Commandes Traiteur événements */}
                {commandesTraiteur.slice(0, 2).map((cmd: CommandeTraiteur) => {
                  const traiteurName =
                    cmd.traiteur?.name || cmd.traiteurs?.name || "Traiteur";
                  return (
                    <View key={cmd.id} style={styles.orderItemRow}>
                      <View style={styles.orderItemLeft}>
                        <View style={styles.orderIconBoxTraiteur}>
                          <Ionicons name="calendar-outline" size={16} color="#1D6B45" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderItemName} numberOfLines={1}>
                            {traiteurName}
                          </Text>
                          <Text style={styles.orderItemDate}>
                            {formatDate(cmd.created_at)} · {cmd.nb_personnes} pers.
                          </Text>
                        </View>
                      </View>
                      {getStatutBadge(cmd.statut)}
                    </View>
                  );
                })}

                {/* Plats à la carte */}
                {ordersPlats.slice(0, 2).map((order: OrderPlat) => {
                  const traiteurName =
                    order.traiteur?.name || order.traiteurs?.name || "Traiteur";
                  return (
                    <View key={order.id} style={styles.orderItemRow}>
                      <View style={styles.orderItemLeft}>
                        <View style={styles.orderIconBoxTraiteur}>
                          <Ionicons name="restaurant-outline" size={16} color="#1D6B45" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderItemName} numberOfLines={1}>
                            {traiteurName}
                          </Text>
                          <Text style={styles.orderItemDate}>
                            {formatDate(order.created_at)} · {Number(order.total_amount).toFixed(2)} €
                          </Text>
                        </View>
                      </View>
                      {getStatutBadge(order.status)}
                    </View>
                  );
                })}

                {/* Demandes GP */}
                {gpRequests.slice(0, 2).map((gp: GpRequest) => (
                  <View key={gp.id} style={styles.orderItemRow}>
                    <View style={styles.orderItemLeft}>
                      <View style={styles.orderIconBoxGp}>
                        <Ionicons name="airplane-outline" size={16} color="#D4870A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderItemName} numberOfLines={1}>
                          {gp.departure_city} → {gp.arrival_city}
                        </Text>
                        <Text style={styles.orderItemDate}>
                          {formatDate(gp.created_at)} · {gp.weight_kg} Kg
                        </Text>
                      </View>
                    </View>
                    {getStatutBadge(gp.status)}
                  </View>
                ))}
              </View>
            ) : null}

            {/* ── 5. RÉASSURANCE & FOOTER ── */}
            <View style={styles.footerTrustBar}>
              <Ionicons name="shield-checkmark" size={14} color="#1D6B45" />
              <Text style={styles.footerTrustText}>
                Plateforme 100% sécurisée • Réseau de confiance Dabari
              </Text>
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
    backgroundColor: "#0B3B24",
  },
  centerLoader: {
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  initialLoadingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  container: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* ── Hero Card ── */
  heroCard: {
    backgroundColor: "#0B3B24",
    paddingTop: 12,
    paddingBottom: 22,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    alignSelf: "flex-start",
    marginBottom: 6,
    gap: 5,
  },
  welcomePillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  greetingSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 16,
    marginTop: 2,
  },
  notifBtnHeader: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notifBadgeHeader: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0B3B24",
  },
  notifBadgeHeaderText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#D4870A",
    borderWidth: 2,
    borderColor: "#165034",
  },
  loginBtnHeader: {
    backgroundColor: "#D4870A",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  loginBtnHeaderText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* ── Search Bar in Hero ── */
  searchBarContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 18,
    padding: 8,
    gap: 8,
  },
  serviceToggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    padding: 2,
    gap: 4,
  },
  serviceToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  serviceToggleBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  serviceToggleBtnActiveGold: {
    backgroundColor: "#D4870A",
  },
  serviceToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  serviceToggleTextActive: {
    color: "#1D6B45",
    fontWeight: "800",
  },
  serviceToggleTextActiveGold: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 12,
    color: "#FFFFFF",
    paddingVertical: 4,
  },
  searchSubmitBtn: {
    backgroundColor: "#D4870A",
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── 3 Action Shortcuts ── */
  actionShortcutsGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 4,
  },
  shortcutBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  /* ── Body ── */
  mainBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },

  /* ── Description Banner ── */
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  descriptionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  descriptionTagRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  descriptionTagText: {
    color: "#D4870A",
    fontSize: 10,
    fontWeight: "700",
  },
  descriptionCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  descriptionBody: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },

  /* ── Notification Banner ── */
  notifBanner: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  notifIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
  },
  notifDesc: {
    fontSize: 11,
    color: "#475569",
    marginTop: 1,
  },
  notifActionBtn: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  notifActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* ── Services Section ── */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  servicesSubLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceCardActiveTraiteur: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    justifyContent: "space-between",
    minHeight: 160,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceCardActiveGp: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    justifyContent: "space-between",
    minHeight: 160,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceCardDisabled: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "space-between",
    minHeight: 160,
  },
  serviceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceIconBgTraiteur: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceIconBgGp: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceIconBgDisabled: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  statusPillActiveGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  statusTextGreen: {
    color: "#065F46",
    fontSize: 10,
    fontWeight: "800",
  },
  statusPillActiveGold: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  statusTextGold: {
    color: "#B45309",
    fontSize: 10,
    fontWeight: "800",
  },
  statusPillSoon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  statusTextSoon: {
    color: "#B45309",
    fontSize: 9,
    fontWeight: "700",
  },
  statusPillSoonGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  statusTextSoonGreen: {
    color: "#065F46",
    fontSize: 9,
    fontWeight: "700",
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  serviceTitleDisabled: {
    fontSize: 15,
    fontWeight: "800",
    color: "#64748B",
  },
  serviceCategoryGreen: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
    marginTop: 1,
  },
  serviceCategoryGold: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
    marginTop: 1,
  },
  serviceCategoryDisabled: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 1,
  },
  serviceDescription: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 14,
  },
  serviceDescriptionDisabled: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
    lineHeight: 14,
  },
  serviceFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 8,
  },
  serviceFooterActionGreen: {
    fontSize: 11,
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "700",
    color: "#94A3B8",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 8,
  },

  /* ── Recent Orders ── */
  recentOrdersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  recentOrdersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recentOrdersTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  orderItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  orderIconBoxTraiteur: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  orderIconBoxGp: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
  },
  orderItemName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  orderItemDate: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  badgePendingText: {
    color: "#B45309",
    fontSize: 10,
    fontWeight: "700",
  },
  badgeAccepted: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  badgeAcceptedText: {
    color: "#065F46",
    fontSize: 10,
    fontWeight: "700",
  },
  badgeRefused: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  badgeRefusedText: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "700",
  },

  /* ── Footer ── */
  footerTrustBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  footerTrustText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
});
