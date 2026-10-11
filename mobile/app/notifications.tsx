import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../utils/storage";
import { apiFetch } from "../utils/api";
import {
  AppNotification,
  NotificationCategory,
  getNotificationCategory,
  getNotificationVisuals,
  formatNotificationDate,
  cleanNotificationTitle,
} from "../utils/types/notification";

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    visible: boolean;
    type: "single" | "all";
    id?: string;
    title?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const token = await getSecureToken("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await apiFetch("/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("[Notifications] Erreur récupération :", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchNotifications();

    const sub = DeviceEventEmitter.addListener(
      "dabari_notifications_updated",
      () => fetchNotifications(true),
    );
    return () => sub.remove();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(true);
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const categoryCounts = useMemo(() => {
    const counts = {
      all: notifications.length,
      unread: unreadCount,
      traiteur: 0,
      gp: 0,
      securite: 0,
    };
    notifications.forEach((n) => {
      const cat = getNotificationCategory(n.type);
      if (cat === "traiteur") counts.traiteur += 1;
      else if (cat === "gp") counts.gp += 1;
      else if (cat === "securite") counts.securite += 1;
    });
    return counts;
  }, [notifications, unreadCount]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeCategory === "all") return true;
      if (activeCategory === "unread") return !n.is_read;
      const cat = getNotificationCategory(n.type);
      return cat === activeCategory;
    });
  }, [notifications, activeCategory]);

  const handleMarkAsRead = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await apiFetch(`/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        );
        DeviceEventEmitter.emit("dabari_notifications_updated");
        DeviceEventEmitter.emit("dabari_orders_updated");
      }
    } catch (e) {
      console.error("[Notifications] Erreur markAsRead :", e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await apiFetch("/notifications/read-all", {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        DeviceEventEmitter.emit("dabari_notifications_updated");
        DeviceEventEmitter.emit("dabari_orders_updated");
      }
    } catch (e) {
      console.error("[Notifications] Erreur markAllAsRead :", e);
    }
  };

  const handleDeleteNotification = (id: string, title?: string) => {
    setDeleteModalState({
      visible: true,
      type: "single",
      id,
      title: title || "cette notification",
    });
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    setDeleteModalState({
      visible: true,
      type: "all",
      title: "toutes les notifications",
    });
  };

  const confirmDelete = async () => {
    if (!deleteModalState) return;
    setIsDeleting(true);
    try {
      if (deleteModalState.type === "single" && deleteModalState.id) {
        const id = deleteModalState.id;
        setActionLoadingId(id);

        // Suppression optimiste immédiate dans l'état local
        setNotifications((prev) => prev.filter((n) => n.id !== id));

        let res = await apiFetch(`/notifications/${id}`, {
          method: "DELETE",
        });

        // Fallback POST si la méthode DELETE n'est pas routée
        if (!res.ok && res.status === 404) {
          res = await apiFetch(`/notifications/${id}/delete`, {
            method: "POST",
          });
        }

        if (!res.ok && res.status >= 400 && res.status !== 404) {
          Alert.alert("Erreur", "Impossible de supprimer cette notification du serveur.");
          fetchNotifications(true);
        } else {
          DeviceEventEmitter.emit("dabari_orders_updated");
        }
      } else if (deleteModalState.type === "all") {
        // Effacement optimiste immédiat de tout l'historique
        const backup = [...notifications];
        setNotifications([]);

        let res = await apiFetch("/notifications/clear-all", {
          method: "DELETE",
        });

        // Fallback POST si la méthode DELETE n'est pas routée
        if (!res.ok && res.status === 404) {
          res = await apiFetch("/notifications/clear-all", {
            method: "POST",
          });
        }

        if (!res.ok && res.status >= 400 && res.status !== 404) {
          Alert.alert("Erreur", "Impossible d'effacer tout l'historique sur le serveur.");
          setNotifications(backup);
        } else {
          DeviceEventEmitter.emit("dabari_orders_updated");
        }
      }
    } catch (e) {
      console.error("[Notifications] Erreur suppression :", e);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de la suppression de la notification.",
      );
    } finally {
      setIsDeleting(false);
      setActionLoadingId(null);
      setDeleteModalState(null);
    }
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    // 1. Marquer comme lu si nécessaire
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }

    // 2. Navigation contextuelle basée sur data
    const data = notif.data || {};

    if (data.commande_id) {
      router.push({
        pathname: "/commandes",
        params: { tab: "traiteur", commande_id: data.commande_id },
      });
      return;
    }

    if (data.order_id) {
      router.push({
        pathname: "/commandes",
        params: { tab: "traiteur", sub: "plats" },
      });
      return;
    }

    if (data.request_id || data.listing_id) {
      router.push({
        pathname: "/commandes",
        params: { tab: "gp" },
      });
      return;
    }

    if (data.proposalId || data.requestId) {
      router.push({
        pathname: "/commandes",
        params: { tab: "traiteur", sub: "mes_demandes" },
      });
      return;
    }

    // Si alerte sécurité admin
    if (notif.type === "security_alert") {
      router.push("/admin" as any);
      return;
    }

    // Fallback par défaut vers l'espace commandes
    router.push("/commandes");
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        {/* ── 1. HEADER MODERNE DABARI ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadHeaderBadge}>
                    <Text style={styles.unreadHeaderBadgeText}>
                      {unreadCount} {unreadCount === 1 ? "nouvelle" : "nouvelles"}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerSubtitle}>
                Centre d'alertes & suivi Dabari
              </Text>
            </View>

            {/* Actions rapides header */}
            <View style={styles.headerActionsGroup}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.headerActionBtn}
                  onPress={handleMarkAllAsRead}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done" size={17} color="#6EE7B7" />
                  <Text style={styles.headerActionBtnText}>Tout lire</Text>
                </TouchableOpacity>
              )}

              {notifications.length > 0 && (
                <TouchableOpacity
                  style={[styles.headerActionBtn, styles.headerActionBtnMuted]}
                  onPress={handleClearAll}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={15} color="#FCA5A5" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── 2. ONGLETS DE FILTRAGE PAR CATÉGORIE ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeCategory === "all" && styles.filterChipActive,
              ]}
              onPress={() => setActiveCategory("all")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeCategory === "all" && styles.filterChipTextActive,
                ]}
              >
                Toutes ({categoryCounts.all})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeCategory === "unread" && styles.filterChipActive,
              ]}
              onPress={() => setActiveCategory("unread")}
              activeOpacity={0.8}
            >
              {categoryCounts.unread > 0 && <View style={styles.redDotFilter} />}
              <Text
                style={[
                  styles.filterChipText,
                  activeCategory === "unread" && styles.filterChipTextActive,
                ]}
              >
                Non lues ({categoryCounts.unread})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeCategory === "traiteur" && styles.filterChipActive,
              ]}
              onPress={() => setActiveCategory("traiteur")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="restaurant-outline"
                size={13}
                color={activeCategory === "traiteur" ? "#0B3B24" : "#D1FAE5"}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeCategory === "traiteur" && styles.filterChipTextActive,
                ]}
              >
                Traiteur & Devis ({categoryCounts.traiteur})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeCategory === "gp" && styles.filterChipActive,
              ]}
              onPress={() => setActiveCategory("gp")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="airplane-outline"
                size={13}
                color={activeCategory === "gp" ? "#0B3B24" : "#D1FAE5"}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeCategory === "gp" && styles.filterChipTextActive,
                ]}
              >
                Transport GP ({categoryCounts.gp})
              </Text>
            </TouchableOpacity>

            {categoryCounts.securite > 0 && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  activeCategory === "securite" && styles.filterChipActive,
                ]}
                onPress={() => setActiveCategory("securite")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="shield-outline"
                  size={13}
                  color={activeCategory === "securite" ? "#0B3B24" : "#D1FAE5"}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    activeCategory === "securite" && styles.filterChipTextActive,
                  ]}
                >
                  Sécurité ({categoryCounts.securite})
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ── 3. LISTE DES NOTIFICATIONS ── */}
        <ScrollView
          style={styles.contentScrollView}
          contentContainerStyle={styles.contentScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1D6B45"
              colors={["#1D6B45"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#1D6B45" />
              <Text style={styles.loadingText}>Chargement des notifications...</Text>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={activeCategory === "unread" ? "checkmark-done-circle" : "notifications-off-outline"}
                  size={42}
                  color="#1D6B45"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeCategory === "unread"
                  ? "Vous êtes à jour !"
                  : "Aucune notification"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeCategory === "unread"
                  ? "Vous avez consulté toutes vos alertes récentes."
                  : activeCategory === "traiteur"
                  ? "Aucune notification relative à vos devis et commandes traiteur."
                  : activeCategory === "gp"
                  ? "Aucune notification liée à vos trajets ou envois GP."
                  : "Vos prochaines commandes, devis et actualités apparaîtront ici."}
              </Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {filteredNotifications.map((notif) => {
                const visuals = getNotificationVisuals(notif.type);
                const isUnread = !notif.is_read;
                const data = notif.data || {};

                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[styles.notifCard, isUnread && styles.notifCardUnread]}
                    onPress={() => handleNotificationPress(notif)}
                    activeOpacity={0.75}
                  >
                    {/* Colonne Gauche : Icône thématisée */}
                    <View
                      style={[
                        styles.iconCircleWrapper,
                        { backgroundColor: visuals.badgeBg },
                      ]}
                    >
                      <Ionicons
                        name={visuals.iconName as any}
                        size={22}
                        color={visuals.iconColor}
                      />
                    </View>

                    {/* Contenu Central */}
                    <View style={styles.cardCenterContent}>
                      {/* En-tête de carte : Tag catégorie + Date + Point vert non lu */}
                      <View style={styles.cardTopRow}>
                        <View
                          style={[
                            styles.categoryPill,
                            { backgroundColor: visuals.badgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              { color: visuals.badgeColor },
                            ]}
                          >
                            {visuals.categoryLabel}
                          </Text>
                        </View>

                        <Text style={styles.dateText}>
                          {formatNotificationDate(notif.created_at)}
                        </Text>

                        {isUnread && <View style={styles.unreadDot} />}
                      </View>

                      {/* Titre */}
                      <Text
                        style={[
                          styles.notifTitle,
                          isUnread && styles.notifTitleUnread,
                        ]}
                        numberOfLines={2}
                      >
                        {cleanNotificationTitle(notif.titre)}
                      </Text>

                      {/* Message détaillé */}
                      <Text style={styles.notifMessage}>{notif.message}</Text>

                      {/* Badges de données contextuelles (Montants, Kilos, Retard) */}
                      {(data.prix_devis ||
                        data.acompte_montant ||
                        data.weight_kg ||
                        data.delay_reason ||
                        data.nb_personnes) && (
                        <View style={styles.contextPillsRow}>
                          {Boolean(data.prix_devis) && (
                            <View style={styles.infoChip}>
                              <Ionicons name="pricetag" size={11} color="#2563EB" />
                              <Text style={styles.infoChipText}>
                                Devis : {data.prix_devis} €
                              </Text>
                            </View>
                          )}

                          {Boolean(data.acompte_montant) && (
                            <View style={[styles.infoChip, { backgroundColor: "#ECFDF5" }]}>
                              <Ionicons
                                name="shield-checkmark"
                                size={11}
                                color="#059669"
                              />
                              <Text
                                style={[styles.infoChipText, { color: "#065F46" }]}
                              >
                                Acompte : {data.acompte_montant} €
                              </Text>
                            </View>
                          )}

                          {Boolean(data.weight_kg) && (
                            <View style={[styles.infoChip, { backgroundColor: "#F0F9FF" }]}>
                              <Ionicons name="airplane" size={11} color="#0284C7" />
                              <Text
                                style={[styles.infoChipText, { color: "#0369A1" }]}
                              >
                                {data.weight_kg} kg
                              </Text>
                            </View>
                          )}

                          {Boolean(data.nb_personnes) && (
                            <View style={[styles.infoChip, { backgroundColor: "#FFFBEB" }]}>
                              <Ionicons name="people" size={11} color="#D97706" />
                              <Text
                                style={[styles.infoChipText, { color: "#B45309" }]}
                              >
                                {data.nb_personnes} personnes
                              </Text>
                            </View>
                          )}

                          {Boolean(data.delay_reason) && (
                            <View style={[styles.infoChip, { backgroundColor: "#FEF2F2" }]}>
                              <Ionicons name="time" size={11} color="#DC2626" />
                              <Text
                                style={[styles.infoChipText, { color: "#991B1B" }]}
                              >
                                Retard signalé
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Barre d'action basse de la carte */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.cardPrimaryActionBtn}
                          onPress={() => handleNotificationPress(notif)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.cardPrimaryActionText}>
                            {data.commande_id
                              ? "Consulter la commande"
                              : data.request_id || data.listing_id
                              ? "Voir le trajet GP"
                              : "Afficher les détails"}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color="#1D6B45"
                          />
                        </TouchableOpacity>

                        <View style={styles.cardMiniIconsRow}>
                          {isUnread && (
                            <TouchableOpacity
                              style={styles.iconActionCircle}
                              onPress={() => handleMarkAsRead(notif.id)}
                              activeOpacity={0.7}
                              accessibilityLabel="Marquer comme lu"
                            >
                              <Ionicons
                                name="checkmark-outline"
                                size={15}
                                color="#059669"
                              />
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.iconActionCircle}
                            onPress={() => handleDeleteNotification(notif.id, notif.titre)}
                            activeOpacity={0.7}
                            accessibilityLabel="Supprimer"
                          >
                            <Ionicons
                              name="trash-outline"
                              size={15}
                              color="#94A3B8"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ── MODALE POP-UP DE CONFIRMATION DE SUPPRESSION ── */}
        <Modal
          visible={Boolean(deleteModalState?.visible)}
          transparent
          animationType="fade"
          onRequestClose={() => !isDeleting && setDeleteModalState(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="trash-outline" size={26} color="#DC2626" />
              </View>

              <Text style={styles.modalTitle}>
                {deleteModalState?.type === "all"
                  ? "Effacer tout l'historique ?"
                  : "Supprimer la notification ?"}
              </Text>

              <Text style={styles.modalDescription}>
                {deleteModalState?.type === "all"
                  ? "Voulez-vous supprimer toutes les notifications de votre centre d'alertes ? Cette action est irréversible."
                  : deleteModalState?.title
                    ? `Voulez-vous supprimer cette alerte de votre historique ?\n\n« ${cleanNotificationTitle(deleteModalState.title)} »`
                    : "Voulez-vous supprimer cette notification de votre historique ?"}
              </Text>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDeleteModalState(null)}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, isDeleting && styles.modalBtnDisabled]}
                  onPress={confirmDelete}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="trash" size={15} color="#FFFFFF" />
                      <Text style={styles.modalConfirmBtnText}>Supprimer</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
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
  header: {
    backgroundColor: "#0B3B24",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  unreadHeaderBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  unreadHeaderBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  headerActionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  headerActionBtnMuted: {
    paddingHorizontal: 8,
  },
  headerActionBtnText: {
    color: "#6EE7B7",
    fontSize: 12,
    fontWeight: "700",
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  filterChipActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D1FAE5",
  },
  filterChipTextActive: {
    color: "#0B3B24",
  },
  redDotFilter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  contentScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  cardsList: {
    gap: 12,
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notifCardUnread: {
    backgroundColor: "#FFFFFF",
    borderColor: "#A7F3D0",
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  iconCircleWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardCenterContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginLeft: 6,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 20,
    marginBottom: 4,
  },
  notifTitleUnread: {
    color: "#0F172A",
    fontWeight: "800",
  },
  notifMessage: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 8,
  },
  contextPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cardPrimaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardPrimaryActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
  cardMiniIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ── Modale de confirmation de suppression ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
});
