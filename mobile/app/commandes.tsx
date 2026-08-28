import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Linking,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../utils/storage";
import { apiFetch } from "../utils/api";

type CommandeTraiteur = {
  id: string;
  date_evenement: string;
  nb_personnes: number;
  adresse: string;
  type_evenement: string | null;
  notes: string | null;
  statut: string;
  message_traiteur: string | null;
  created_at: string;
  client_id: string;
  traiteur_id: string;
  traiteur?: { name: string; whatsapp: string | null } | null;
  traiteurs?: { name: string; whatsapp: string | null } | null;
  client?: { full_name: string; phone: string | null } | null;
  profiles?: { full_name: string; phone: string | null } | null;
};

type OrderPlat = {
  id: string;
  client_id: string;
  traiteur_id: string;
  status: string;
  delivery_type: string;
  delivery_address: string | null;
  delivery_date: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  traiteur?: { name: string; whatsapp: string | null } | null;
  traiteurs?: { name: string; whatsapp: string | null } | null;
  client?: { full_name: string; phone: string | null } | null;
  profiles?: { full_name: string; phone: string | null } | null;
  order_items?: {
    id: string;
    quantity: number;
    dish?: { name: string; price: number } | null;
    dishes?: { name: string; price: number } | null;
  }[];
};

type GpRequest = {
  id: string;
  listing_id: string;
  sender_id: string;
  weight_kg: number;
  content_desc: string;
  declared_value: number;
  status: string;
  total_amount: number;
  notes: string | null;
  departure_city?: string | null;
  departure_country?: string | null;
  arrival_city?: string | null;
  arrival_country?: string | null;
  departure_date?: string | null;
  created_at: string;
  listing?: {
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
    gp_id: string;
    is_active?: boolean | null;
  } | null;
  gp_listings?: {
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
    gp_id: string;
    is_active?: boolean | null;
  } | null;
  sender?: { full_name: string; phone: string | null } | null;
  profiles?: { full_name: string; phone: string | null } | null;
};

type Tab = "envoyees" | "recues";
type ServiceFilter = "tout" | "traiteur" | "gp";

export default function CommandeScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("envoyees");
  const [serviceFilter, setServiceFilter] = useState<
    "tout" | "traiteur" | "gp"
  >("tout");
  const [isTraiteur, setIsTraiteur] = useState(false);
  const [isGp, setIsGp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    type:
      | "accepter_traiteur"
      | "refuser_traiteur"
      | "accepter_order"
      | "refuser_order"
      | "accepter_gp"
      | "refuser_gp";
    item: any;
  } | null>(null);

  const [commandesEnvoyees, setCommandesEnvoyees] = useState<
    CommandeTraiteur[]
  >([]);
  const [ordersEnvoyees, setOrdersEnvoyees] = useState<OrderPlat[]>([]);
  const [gpEnvoyees, setGpEnvoyees] = useState<GpRequest[]>([]);

  const [commandesRecues, setCommandesRecues] = useState<CommandeTraiteur[]>(
    [],
  );
  const [ordersRecues, setOrdersRecues] = useState<OrderPlat[]>([]);
  const [gpRecues, setGpRecues] = useState<GpRequest[]>([]);

  // ── Navigation vers les pages dédiées de modification ──
  const openEditCommandeTraiteur = (cmd: CommandeTraiteur) => {
    router.push({
      pathname: "/commande/edit-devis",
      params: { id: cmd.id },
    });
  };

  const openEditOrderPlat = (ord: OrderPlat) => {
    router.push({
      pathname: "/commande/edit-plat",
      params: { id: ord.id },
    });
  };

  const openEditGpRequest = (gp: GpRequest) => {
    router.push({
      pathname: "/commande/edit-gp",
      params: { id: gp.id },
    });
  };

  // ── État Annulation Commande ──
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState<{
    type: "traiteur" | "order" | "gp";
    id: string;
    title: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const openCancelConfirm = (
    type: "traiteur" | "order" | "gp",
    id: string,
    title: string,
  ) => {
    setCancelConfirmTarget({ type, id, title });
  };

  const executeCancelOrder = async () => {
    if (!cancelConfirmTarget) return;
    setIsCancelling(true);
    const { type, id } = cancelConfirmTarget;
    try {
      const res = await apiFetch(`/commande/cancel/${type}/${id}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'annulation");
      }

      // Mise à jour locale optimiste
      if (type === "traiteur") {
        setCommandesEnvoyees((prev) =>
          prev.map((c) => (c.id === id ? { ...c, statut: "annulee" } : c)),
        );
      } else if (type === "order") {
        setOrdersEnvoyees((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)),
        );
      } else if (type === "gp") {
        setGpEnvoyees((prev) =>
          prev.map((g) => (g.id === id ? { ...g, status: "cancelled" } : g)),
        );
      }

      setCancelConfirmTarget(null);
      await loadAll();
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Erreur lors de l'annulation");
    } finally {
      setIsCancelling(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, []),
  );

  const sortOrdersByPendingFirst = <
    T extends { statut?: string; status?: string; created_at?: string },
  >(
    items: T[],
  ): T[] => {
    return [...items].sort((a, b) => {
      const statusA = a.statut || a.status || "";
      const statusB = b.statut || b.status || "";

      const isPendingA = statusA === "en_attente" || statusA === "pending";
      const isPendingB = statusB === "en_attente" || statusB === "pending";

      if (isPendingA && !isPendingB) return -1;
      if (!isPendingA && isPendingB) return 1;

      //tri ordre décroissant
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  };

  async function loadAll() {
    setLoading(true);
    const token = await getSecureToken("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      apiFetch("/notifications/read-all", {
        method: "PATCH",
      }).catch((err) => console.error("Erreur mark-all-as-read:", err));

      const response = await apiFetch("/commande");
      const res = await response.json();
      if (!response.ok) {
        console.error(res.message || "Erreur de chargement des commandes");
        setLoading(false);
        return;
      }
      const profile = res.data.orders;
      if (!profile) return;
      // ── 1. Commandes envoyées (Client) ──
      setCommandesEnvoyees(sortOrdersByPendingFirst(profile.commandes || []));
      setOrdersEnvoyees(sortOrdersByPendingFirst(profile.orders || []));
      setGpEnvoyees(sortOrdersByPendingFirst(profile.gp_requests || []));
      // ── 2. Statut & Commandes reçues (Traiteur) ──
      const allTraiteurs = profile.traiteurs || [];
      if (profile.role === "traiteur" || allTraiteurs.length > 0) {
        setIsTraiteur(true);
        const allCommandes = allTraiteurs.flatMap(
          (t: any) => t.commandes || [],
        );
        const allOrders = allTraiteurs.flatMap((t: any) => t.orders || []);
        setCommandesRecues(sortOrdersByPendingFirst(allCommandes));
        setOrdersRecues(sortOrdersByPendingFirst(allOrders));
      }
      // ── 3. Statut & Demandes reçues (GP Voyageur) ──
      const gpListings = profile.gp_listings || [];
      if (gpListings.length > 0) {
        setIsGp(true);
        // Récupère toutes les demandes reçues sur tous vos trajets
        const allGpRequestsReceived = gpListings.flatMap(
          (l: any) => l.requests || [],
        );
        setGpRecues(sortOrdersByPendingFirst(allGpRequestsReceived));
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
    } finally {
      setLoading(false);
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "en_attente":
      case "pending":
        return (
          <View style={styles.badgePending}>
            <Ionicons name="time-outline" size={12} color="#D4870A" />
            <Text style={styles.badgePendingText}>En attente</Text>
          </View>
        );
      case "acceptee":
      case "accepted":
        return (
          <View style={styles.badgeSuccess}>
            <Ionicons
              name="checkmark-circle-outline"
              size={12}
              color="#1D6B45"
            />
            <Text style={styles.badgeSuccessText}>Acceptée</Text>
          </View>
        );
      case "refusee":
      case "rejected":
        return (
          <View style={styles.badgeDanger}>
            <Ionicons name="close-circle-outline" size={12} color="#B91C1C" />
            <Text style={styles.badgeDangerText}>Refusée</Text>
          </View>
        );
      case "annulee":
      case "cancelled":
        return (
          <View style={styles.badgeCancelled}>
            <Ionicons name="close-circle-outline" size={12} color="#64748B" />
            <Text style={styles.badgeCancelledText}>Annulée</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  async function handleStatusUpdate(
    actionType:
      | "accepter_traiteur"
      | "refuser_traiteur"
      | "accepter_order"
      | "refuser_order"
      | "accepter_gp"
      | "refuser_gp",
    item: any,
  ) {
    const token = await getSecureToken("token");
    if (!token) return;

    let url = "";
    let body: any = {};

    switch (actionType) {
      case "accepter_traiteur":
        url = `/commande/traiteur/${item.id}/status`;
        body = { statut: "acceptee" };
        break;
      case "refuser_traiteur":
        url = `/commande/traiteur/${item.id}/status`;
        body = { statut: "refusee" };
        break;
      case "accepter_order":
        url = `/commande/order/${item.id}/status`;
        body = { status: "accepted" };
        break;
      case "refuser_order":
        url = `/commande/order/${item.id}/status`;
        body = { status: "rejected" };
        break;
      case "accepter_gp":
        url = `/commande/gp/${item.id}/status`;
        body = { status: "accepted" };
        break;
      case "refuser_gp":
        url = `/commande/gp/${item.id}/status`;
        body = { status: "rejected" };
        break;
    }

    // Mise à jour optimiste immédiate de l'interface
    if (actionType === "accepter_traiteur") {
      setCommandesRecues((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, statut: "acceptee" } : c)),
      );
    } else if (actionType === "refuser_traiteur") {
      setCommandesRecues((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, statut: "refusee" } : c)),
      );
    } else if (actionType === "accepter_order") {
      setOrdersRecues((prev) =>
        prev.map((o) => (o.id === item.id ? { ...o, status: "accepted" } : o)),
      );
    } else if (actionType === "refuser_order") {
      setOrdersRecues((prev) =>
        prev.map((o) => (o.id === item.id ? { ...o, status: "rejected" } : o)),
      );
    } else if (actionType === "accepter_gp") {
      setGpRecues((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: "accepted" } : r)),
      );
    } else if (actionType === "refuser_gp") {
      setGpRecues((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: "rejected" } : r)),
      );
    }

    try {
      const res = await apiFetch(url, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadAll(); // Synchro finale backend
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut :", err);
    }
  }

  function confirmAndExecuteAction(
    actionType:
      | "accepter_traiteur"
      | "refuser_traiteur"
      | "accepter_order"
      | "refuser_order"
      | "accepter_gp"
      | "refuser_gp",
    item: any,
  ) {
    setConfirmAction({ type: actionType, item });
  }

  const pendingRecues =
    commandesRecues.filter(
      (c) => c.statut === "en_attente" || c.statut === "pending",
    ).length +
    ordersRecues.filter(
      (o) => o.status === "pending" || o.status === "en_attente",
    ).length +
    gpRecues.filter((r) => r.status === "pending" || r.status === "en_attente")
      .length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D6B45" />
        <Text style={styles.loadingText}>Chargement de vos commandes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Header Vert avec Titre et Onglets */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="cube-outline" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Commandes</Text>
          </View>

          {/* Onglets Principaux (Mes envois / Reçues) */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === "envoyees"
                  ? styles.tabBtnActive
                  : styles.tabBtnInactive,
              ]}
              onPress={() => setTab("envoyees")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cart-outline"
                size={16}
                color={tab === "envoyees" ? "#1D6B45" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "envoyees"
                    ? styles.tabBtnTextActive
                    : styles.tabBtnTextInactive,
                ]}
              >
                Mes envois
              </Text>
            </TouchableOpacity>

            {(isTraiteur || isGp) && (
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  tab === "recues"
                    ? styles.tabBtnActive
                    : styles.tabBtnInactive,
                ]}
                onPress={() => setTab("recues")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="archive-outline"
                  size={16}
                  color={tab === "recues" ? "#1D6B45" : "#FFFFFF"}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    tab === "recues"
                      ? styles.tabBtnTextActive
                      : styles.tabBtnTextInactive,
                  ]}
                >
                  Reçues
                </Text>

                {pendingRecues > 0 && (
                  <View style={styles.tabBadgeRed}>
                    <Text style={styles.tabBadgeRedText}>{pendingRecues}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Sous-filtres Traiteur / GP */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.serviceFiltersRow}
          >
            {[
              { id: "tout", label: "Tout voir" },
              { id: "traiteur", label: "Traiteur & Plats" },
              { id: "gp", label: "GP Colis" },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterPill,
                  serviceFilter === f.id
                    ? styles.filterPillActive
                    : styles.filterPillInactive,
                ]}
                onPress={() => setServiceFilter(f.id as ServiceFilter)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    serviceFilter === f.id
                      ? styles.filterPillTextActive
                      : styles.filterPillTextInactive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Corps Principal de la Liste des Commandes */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION ENVOYÉES */}
          {tab === "envoyees" && (
            <>
              {(serviceFilter === "tout" &&
                commandesEnvoyees.length === 0 &&
                ordersEnvoyees.length === 0 &&
                gpEnvoyees.length === 0) ||
              (serviceFilter === "traiteur" &&
                commandesEnvoyees.length === 0 &&
                ordersEnvoyees.length === 0) ||
              (serviceFilter === "gp" && gpEnvoyees.length === 0) ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="cart-outline" size={32} color="#1D6B45" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    Vous n&apos;avez passé aucune commande
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {serviceFilter === "traiteur"
                      ? "Vous n'avez effectué aucune demande de devis ni commande de plat."
                      : serviceFilter === "gp"
                        ? "Vous n'avez effectué aucune réservation de transport GP."
                        : "Vos demandes de devis traiteur, commandes de plats et envois de colis GP apparaîtront ici."}
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push("/accueil")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emptyButtonText}>
                      Découvrir nos services
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* SECTION TRAITEUR & DEVIS */}
                  {(serviceFilter === "tout" || serviceFilter === "traiteur") &&
                    commandesEnvoyees.length > 0 && (
                      <View style={styles.sectionGroup}>
                        <View style={styles.sectionTitleRow}>
                          <Ionicons
                            name="restaurant-outline"
                            size={16}
                            color="#1D6B45"
                          />
                          <Text style={styles.sectionTitle}>
                            Demandes de Devis Traiteur
                          </Text>
                        </View>

                        {commandesEnvoyees.map((cmd) => {
                          const traiteurInfo = cmd.traiteur || cmd.traiteurs;
                          return (
                            <View key={cmd.id} style={styles.orderCard}>
                              <View style={styles.orderCardHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.providerName}>
                                    {traiteurInfo?.name || "Traiteur"}
                                  </Text>
                                  <Text style={styles.orderDate}>
                                    Demandé le {formatDate(cmd.created_at)}
                                  </Text>
                                </View>
                                {renderStatusBadge(cmd.statut)}
                              </View>

                              <View style={styles.orderDetailsBox}>
                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="calendar-outline"
                                    size={15}
                                    color="#1D6B45"
                                  />
                                  <Text style={styles.detailText}>
                                    Événement : {formatDate(cmd.date_evenement)}{" "}
                                    ({cmd.type_evenement || "Général"})
                                  </Text>
                                </View>

                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="people-outline"
                                    size={15}
                                    color="#1D6B45"
                                  />
                                  <Text style={styles.detailText}>
                                    {cmd.nb_personnes} personnes
                                  </Text>
                                </View>

                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="location-outline"
                                    size={15}
                                    color="#1D6B45"
                                  />
                                  <Text style={styles.detailText}>
                                    {cmd.adresse}
                                  </Text>
                                </View>

                                {Boolean(cmd.notes) && (
                                  <View style={styles.detailRow}>
                                    <Ionicons
                                      name="document-text-outline"
                                      size={15}
                                      color="#64748B"
                                    />
                                    <Text style={styles.notesText}>
                                      {cmd.notes}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {(cmd.statut === "en_attente" ||
                                cmd.statut === "pending") && (
                                <View style={styles.clientActionRow}>
                                  <TouchableOpacity
                                    style={styles.clientEditBtn}
                                    onPress={() =>
                                      openEditCommandeTraiteur(cmd)
                                    }
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons
                                      name="create-outline"
                                      size={14}
                                      color="#1D6B45"
                                    />
                                    <Text style={styles.clientEditBtnText}>
                                      Modifier la demande
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.clientCancelBtn}
                                    onPress={() =>
                                      openCancelConfirm(
                                        "traiteur",
                                        cmd.id,
                                        traiteurInfo?.name ||
                                          "votre demande de devis",
                                      )
                                    }
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons
                                      name="close-circle-outline"
                                      size={14}
                                      color="#B91C1C"
                                    />
                                    <Text style={styles.clientCancelBtnText}>
                                      Annuler
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}

                              {cmd.statut === "acceptee" && (
                                <TouchableOpacity
                                  style={styles.whatsAppBtn}
                                  activeOpacity={0.85}
                                >
                                  <Ionicons
                                    name="logo-whatsapp"
                                    size={16}
                                    color="#FFFFFF"
                                  />
                                  <Text style={styles.whatsAppBtnText}>
                                    Contacter le traiteur
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                  {/* SECTION COMMANDES DE PLATS */}
                  {(serviceFilter === "tout" || serviceFilter === "traiteur") &&
                    ordersEnvoyees.length > 0 && (
                      <View style={styles.sectionGroup}>
                        <View style={styles.sectionTitleRow}>
                          <Ionicons
                            name="fast-food-outline"
                            size={16}
                            color="#1D6B45"
                          />
                          <Text style={styles.sectionTitle}>
                            Commandes de Plats
                          </Text>
                        </View>

                        {ordersEnvoyees.map((ord) => {
                          const traiteurInfo = ord.traiteur || ord.traiteurs;
                          return (
                            <View key={ord.id} style={styles.orderCard}>
                              <View style={styles.orderCardHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.providerName}>
                                    {traiteurInfo?.name || "Traiteur"}
                                  </Text>
                                  <Text style={styles.orderDate}>
                                    {formatDate(ord.created_at)}
                                  </Text>
                                </View>
                                {renderStatusBadge(ord.status)}
                              </View>

                              <View style={styles.orderDetailsBox}>
                                {ord.order_items?.map((item, idx) => {
                                  const dishInfo = item.dish || item.dishes;
                                  const price = dishInfo?.price || 0;
                                  return (
                                    <View
                                      key={item.id || idx}
                                      style={styles.itemRow}
                                    >
                                      <Text style={styles.itemQty}>
                                        {item.quantity}x
                                      </Text>
                                      <Text style={styles.itemName}>
                                        {dishInfo?.name || "Plat"}
                                      </Text>
                                      <Text style={styles.itemPrice}>
                                        {Number(price * item.quantity).toFixed(
                                          2,
                                        )}{" "}
                                        €
                                      </Text>
                                    </View>
                                  );
                                })}

                                <View style={styles.divider} />

                                <View style={styles.totalRow}>
                                  <Text style={styles.totalLabel}>
                                    Montant Total
                                  </Text>
                                  <Text style={styles.totalValue}>
                                    {Number(ord.total_amount || 0).toFixed(2)} €
                                  </Text>
                                </View>

                                {ord.delivery_address && (
                                  <View
                                    style={[
                                      styles.detailRow,
                                      { marginTop: 8 },
                                    ]}
                                  >
                                    <Ionicons
                                      name="location-outline"
                                      size={14}
                                      color="#1D6B45"
                                    />
                                    <Text style={styles.detailText}>
                                      {ord.delivery_address}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {ord.status === "pending" && (
                                <View style={styles.clientActionRow}>
                                  <TouchableOpacity
                                    style={styles.clientEditBtn}
                                    onPress={() => openEditOrderPlat(ord)}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons
                                      name="create-outline"
                                      size={14}
                                      color="#1D6B45"
                                    />
                                    <Text style={styles.clientEditBtnText}>
                                      Modifier la commande
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.clientCancelBtn}
                                    onPress={() =>
                                      openCancelConfirm(
                                        "order",
                                        ord.id,
                                        "votre commande de plats",
                                      )
                                    }
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons
                                      name="close-circle-outline"
                                      size={14}
                                      color="#B91C1C"
                                    />
                                    <Text style={styles.clientCancelBtnText}>
                                      Annuler
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                  {/* SECTION GP COLIS */}
                  {(serviceFilter === "tout" || serviceFilter === "gp") &&
                    gpEnvoyees.length > 0 && (
                      <View style={styles.sectionGroup}>
                        <View style={styles.sectionTitleRow}>
                          <Ionicons
                            name="airplane-outline"
                            size={16}
                            color="#D4870A"
                          />
                          <Text style={styles.sectionTitleGold}>
                            Transport GP Colis
                          </Text>
                        </View>

                        {gpEnvoyees.map((gp) => {
                          const listing = gp.listing || gp.gp_listings;
                          const depCity =
                            gp.departure_city || listing?.departure_city;
                          const arrCity =
                            gp.arrival_city || listing?.arrival_city;
                          return (
                            <View key={gp.id} style={styles.gpCard}>
                              <View style={styles.orderCardHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.gpRoute}>
                                    {depCity && arrCity
                                      ? `${depCity} ➔ ${arrCity}`
                                      : "Trajet GP"}
                                  </Text>
                                  <Text style={styles.orderDate}>
                                    Demandé le {formatDate(gp.created_at)}
                                  </Text>
                                </View>
                                {renderStatusBadge(gp.status)}
                              </View>

                              <View style={styles.orderDetailsBox}>
                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="scale-outline"
                                    size={15}
                                    color="#D4870A"
                                  />
                                  <Text style={styles.detailText}>
                                    Poids : {gp.weight_kg} kg
                                  </Text>
                                </View>

                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="cube-outline"
                                    size={15}
                                    color="#D4870A"
                                  />
                                  <Text style={styles.detailText}>
                                    {gp.content_desc}
                                  </Text>
                                </View>

                                {gp.status === "pending" && (
                                  <View style={styles.clientActionRow}>
                                    <TouchableOpacity
                                      style={[
                                        styles.clientEditBtn,
                                        { borderColor: "#D4870A" },
                                      ]}
                                      onPress={() => openEditGpRequest(gp)}
                                      activeOpacity={0.8}
                                    >
                                      <Ionicons
                                        name="create-outline"
                                        size={14}
                                        color="#D4870A"
                                      />
                                      <Text
                                        style={[
                                          styles.clientEditBtnText,
                                          { color: "#D4870A" },
                                        ]}
                                      >
                                        Modifier la demande
                                      </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      style={styles.clientCancelBtn}
                                      onPress={() =>
                                        openCancelConfirm(
                                          "gp",
                                          gp.id,
                                          "votre demande de colis GP",
                                        )
                                      }
                                      activeOpacity={0.8}
                                    >
                                      <Ionicons
                                        name="close-circle-outline"
                                        size={14}
                                        color="#B91C1C"
                                      />
                                      <Text style={styles.clientCancelBtnText}>
                                        Annuler
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                </>
              )}
            </>
          )}

          {/* SECTION REÇUES */}
          {tab === "recues" && (
            <>
              {commandesRecues.length === 0 &&
              ordersRecues.length === 0 &&
              gpRecues.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View
                    style={[
                      styles.emptyIconContainer,
                      { backgroundColor: "#FEF3C7" },
                    ]}
                  >
                    <Ionicons
                      name="archive-outline"
                      size={32}
                      color="#D4870A"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Aucune demande reçue</Text>
                  <Text style={styles.emptySubtitle}>
                    Vous n&apos;avez reçu aucune commande de plat ni demande de
                    devis pour le moment.
                  </Text>
                </View>
              ) : (
                <>
                  {/* SECTION 1 : DEMANDES DE DEVIS TRAITEUR REÇUES */}
                  {isTraiteur &&
                    (serviceFilter === "tout" ||
                      serviceFilter === "traiteur") &&
                    commandesRecues.length > 0 && (
                      <View style={styles.sectionGroup}>
                        <View style={styles.sectionTitleRow}>
                          <Ionicons
                            name="document-text-outline"
                            size={16}
                            color="#1D6B45"
                          />
                          <Text style={styles.sectionTitle}>
                            Demandes de Devis Reçues ({commandesRecues.length})
                          </Text>
                        </View>

                        {commandesRecues.map((cmd) => {
                          const clientInfo = cmd.client || cmd.profiles;
                          const clientPhone = clientInfo?.phone || "";
                          const waNumber = clientPhone
                            .replace(/\+/g, "")
                            .replace(/\s/g, "");
                          const waUrl = `https://wa.me/${waNumber}?text=Bonjour%2C%20je%20fais%20suite%20%C3%A0%20votre%20demande%20de%20devis%20sur%20Dabari.`;

                          return (
                            <View key={cmd.id} style={styles.orderCard}>
                              <View style={styles.orderCardHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.providerName}>
                                    {clientInfo?.full_name || "Client"}
                                  </Text>
                                  <Text style={styles.orderDate}>
                                    Reçu le {formatDate(cmd.created_at)}
                                  </Text>
                                </View>
                                {renderStatusBadge(cmd.statut)}
                              </View>

                              <View style={styles.orderDetailsBox}>
                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="calendar-outline"
                                    size={15}
                                    color="#1D6B45"
                                  />
                                  <Text style={styles.detailText}>
                                    Événement : {formatDate(cmd.date_evenement)}{" "}
                                    ({cmd.type_evenement || "Général"})
                                  </Text>
                                </View>

                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="people-outline"
                                    size={15}
                                    color="#1D6B45"
                                  />
                                  <Text style={styles.detailText}>
                                    {cmd.nb_personnes} personnes
                                  </Text>
                                </View>

                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="location-outline"
                                    size={15}
                                    color="#1D6B45"
                                  />
                                  <Text style={styles.detailText}>
                                    {cmd.adresse}
                                  </Text>
                                </View>

                                {Boolean(cmd.notes) && (
                                  <View style={styles.detailRow}>
                                    <Ionicons
                                      name="document-text-outline"
                                      size={15}
                                      color="#64748B"
                                    />
                                    <Text style={styles.notesText}>
                                      {cmd.notes}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* BOUTONS D'ACTION RECEVOIR (ACCEPTER / REFUSER) */}
                              {(cmd.statut === "en_attente" ||
                                cmd.statut === "pending") && (
                                <View style={styles.actionButtonsRow}>
                                  <TouchableOpacity
                                    style={styles.acceptBtn}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      confirmAndExecuteAction(
                                        "accepter_traiteur",
                                        cmd,
                                      )
                                    }
                                  >
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={16}
                                      color="#FFFFFF"
                                    />
                                    <Text style={styles.acceptBtnText}>
                                      Accepter
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.refuseBtn}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      confirmAndExecuteAction(
                                        "refuser_traiteur",
                                        cmd,
                                      )
                                    }
                                  >
                                    <Ionicons
                                      name="close-circle"
                                      size={16}
                                      color="#B91C1C"
                                    />
                                    <Text style={styles.refuseBtnText}>
                                      Refuser
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}

                              {(cmd.statut === "acceptee" ||
                                cmd.statut === "accepted") &&
                                waNumber !== "" && (
                                  <TouchableOpacity
                                    style={styles.whatsAppBtn}
                                    onPress={() => Linking.openURL(waUrl)}
                                    activeOpacity={0.85}
                                  >
                                    <Ionicons
                                      name="logo-whatsapp"
                                      size={16}
                                      color="#FFFFFF"
                                    />
                                    <Text style={styles.whatsAppBtnText}>
                                      Contacter le client sur WhatsApp
                                    </Text>
                                  </TouchableOpacity>
                                )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                  {/* SECTION 2 : COMMANDES DE PLATS REÇUES */}
                  {isTraiteur &&
                    (serviceFilter === "tout" ||
                      serviceFilter === "traiteur") &&
                    ordersRecues.length > 0 && (
                      <View style={styles.sectionGroup}>
                        <View style={styles.sectionTitleRow}>
                          <Ionicons
                            name="fast-food-outline"
                            size={16}
                            color="#1D6B45"
                          />
                          <Text style={styles.sectionTitle}>
                            Commandes de Plats
                          </Text>
                        </View>

                        {ordersRecues.map((ord) => {
                          const clientInfo = ord.client || ord.profiles;
                          return (
                            <View key={ord.id} style={styles.orderCard}>
                              <View style={styles.orderCardHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.providerName}>
                                    {clientInfo?.full_name || "Client"}
                                  </Text>
                                  <Text style={styles.orderDate}>
                                    {formatDate(ord.created_at)}
                                  </Text>
                                </View>
                                {renderStatusBadge(ord.status)}
                              </View>

                              <View style={styles.orderDetailsBox}>
                                {ord.order_items?.map((item, idx) => {
                                  const dishInfo = item.dish || item.dishes;
                                  const price = dishInfo?.price || 0;
                                  return (
                                    <View
                                      key={item.id || idx}
                                      style={styles.itemRow}
                                    >
                                      <Text style={styles.itemQty}>
                                        {item.quantity}x
                                      </Text>
                                      <Text style={styles.itemName}>
                                        {dishInfo?.name || "Plat"}
                                      </Text>
                                      <Text style={styles.itemPrice}>
                                        {Number(price * item.quantity).toFixed(
                                          2,
                                        )}{" "}
                                        €
                                      </Text>
                                    </View>
                                  );
                                })}

                                <View style={styles.divider} />

                                <View style={styles.totalRow}>
                                  <Text style={styles.totalLabel}>
                                    Montant Total
                                  </Text>
                                  <Text style={styles.totalValue}>
                                    {Number(ord.total_amount || 0).toFixed(2)} €
                                  </Text>
                                </View>
                              </View>

                              {/* BOUTONS D'ACTION RECEVOIR (ACCEPTER / REFUSER) */}
                              {(ord.status === "en_attente" ||
                                ord.status === "pending") && (
                                <View style={styles.actionButtonsRow}>
                                  <TouchableOpacity
                                    style={styles.acceptBtn}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      confirmAndExecuteAction(
                                        "accepter_order",
                                        ord,
                                      )
                                    }
                                  >
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={16}
                                      color="#FFFFFF"
                                    />
                                    <Text style={styles.acceptBtnText}>
                                      Accepter
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.refuseBtn}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      confirmAndExecuteAction(
                                        "refuser_order",
                                        ord,
                                      )
                                    }
                                  >
                                    <Ionicons
                                      name="close-circle"
                                      size={16}
                                      color="#B91C1C"
                                    />
                                    <Text style={styles.refuseBtnText}>
                                      Refuser
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                  {/* SECTION GP COLIS */}
                  {isGp &&
                    (serviceFilter === "tout" || serviceFilter === "gp") &&
                    gpRecues.length > 0 && (
                      <View style={styles.sectionGroup}>
                        <View style={styles.sectionTitleRow}>
                          <Ionicons
                            name="airplane-outline"
                            size={16}
                            color="#D4870A"
                          />
                          <Text style={styles.sectionTitleGold}>
                            Transport GP Colis
                          </Text>
                        </View>

                        {gpRecues.map((gp) => {
                          const listing = gp.listing || gp.gp_listings;
                          const depCity =
                            gp.departure_city || listing?.departure_city;
                          const arrCity =
                            gp.arrival_city || listing?.arrival_city;
                          return (
                            <View key={gp.id} style={styles.gpCard}>
                              <View style={styles.orderCardHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.gpRoute}>
                                    {depCity && arrCity
                                      ? `${depCity} ➔ ${arrCity}`
                                      : "Trajet GP"}
                                  </Text>
                                  <Text style={styles.orderDate}>
                                    Demandé le {formatDate(gp.created_at)}
                                  </Text>
                                </View>
                                {renderStatusBadge(gp.status)}
                              </View>

                              <View style={styles.orderDetailsBox}>
                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="scale-outline"
                                    size={15}
                                    color="#D4870A"
                                  />
                                  <Text style={styles.detailText}>
                                    Poids : {gp.weight_kg} kg
                                  </Text>
                                </View>

                                <View style={styles.detailRow}>
                                  <Ionicons
                                    name="cube-outline"
                                    size={15}
                                    color="#D4870A"
                                  />
                                  <Text style={styles.detailText}>
                                    {gp.content_desc}
                                  </Text>
                                </View>
                              </View>

                              {/* BOUTONS D'ACTION RECEVOIR (ACCEPTER / REFUSER) */}
                              {(gp.status === "en_attente" ||
                                gp.status === "pending") && (
                                <View style={styles.actionButtonsRow}>
                                  <TouchableOpacity
                                    style={styles.acceptBtn}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      confirmAndExecuteAction("accepter_gp", gp)
                                    }
                                  >
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={16}
                                      color="#FFFFFF"
                                    />
                                    <Text style={styles.acceptBtnText}>
                                      Accepter
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.refuseBtn}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      confirmAndExecuteAction("refuser_gp", gp)
                                    }
                                  >
                                    <Ionicons
                                      name="close-circle"
                                      size={16}
                                      color="#B91C1C"
                                    />
                                    <Text style={styles.refuseBtnText}>
                                      Refuser
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* MODAL DE CONFIRMATION */}
        {confirmAction && (
          <Modal
            transparent
            animationType="fade"
            visible={!!confirmAction}
            onRequestClose={() => setConfirmAction(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View
                  style={[
                    styles.modalIconCircle,
                    confirmAction.type.startsWith("accepter")
                      ? styles.modalIconCircleAccept
                      : styles.modalIconCircleRefuse,
                  ]}
                >
                  <Ionicons
                    name={
                      confirmAction.type.startsWith("accepter")
                        ? "checkmark-circle-outline"
                        : "alert-circle-outline"
                    }
                    size={36}
                    color={
                      confirmAction.type.startsWith("accepter")
                        ? "#1D6B45"
                        : "#B91C1C"
                    }
                  />
                </View>

                <Text style={styles.modalTitle}>
                  {confirmAction.type.startsWith("accepter")
                    ? "Êtes-vous sûr d'accepter ?"
                    : "Êtes-vous sûr de refuser ?"}
                </Text>

                <Text style={styles.modalSubtext}>
                  {confirmAction.type.startsWith("accepter")
                    ? "Cette action confirmera la demande et informera le client."
                    : "Cette action déclinera la demande de commande."}
                </Text>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setConfirmAction(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalConfirmBtn,
                      confirmAction.type.startsWith("accepter")
                        ? styles.modalConfirmBtnAccept
                        : styles.modalConfirmBtnRefuse,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      const { type, item } = confirmAction;
                      setConfirmAction(null);
                      handleStatusUpdate(type, item);
                    }}
                  >
                    <Text style={styles.modalConfirmText}>Confirmer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* MODALE CONFIRMATION ANNULATION CLIENT */}
        {cancelConfirmTarget !== null && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setCancelConfirmTarget(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.confirmModalCard}>
                <View style={styles.confirmIconContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={36}
                    color="#B91C1C"
                  />
                </View>

                <Text style={styles.confirmModalTitle}>
                  Annuler la commande ?
                </Text>

                <Text style={styles.confirmModalSubtext}>
                  Êtes-vous sûr(e) de vouloir annuler {cancelConfirmTarget.title} ? Cette action est irréversible.
                </Text>

                <View style={styles.confirmModalButtonsRow}>
                  <TouchableOpacity
                    style={styles.confirmCancelBtn}
                    onPress={() => setCancelConfirmTarget(null)}
                    disabled={isCancelling}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmCancelText}>Non, garder</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmExecuteBtn,
                      isCancelling && { opacity: 0.7 },
                    ]}
                    onPress={executeCancelOrder}
                    disabled={isCancelling}
                    activeOpacity={0.85}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmExecuteText}>
                        Oui, annuler
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
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
  headerCard: {
    backgroundColor: "#165034",
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Tabs */
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 4,
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    position: "relative",
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  tabBtnInactive: {
    backgroundColor: "transparent",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabBtnTextActive: {
    color: "#1D6B45",
  },
  tabBtnTextInactive: {
    color: "#FFFFFF",
  },
  tabBadgeRed: {
    position: "absolute",
    top: -4,
    right: 8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#165034",
  },
  tabBadgeRedText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  /* Service Filter Pills */
  serviceFiltersRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filterPillActive: {
    backgroundColor: "#FFFFFF",
  },
  filterPillInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#1D6B45",
  },
  filterPillTextInactive: {
    color: "#FFFFFF",
  },

  /* Main ScrollView */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },

  /* Section Groups */
  sectionGroup: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D6B45",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitleGold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D4870A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Order Card */
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  gpCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.25)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },

  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  providerName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  gpRoute: {
    fontSize: 15,
    fontWeight: "800",
    color: "#D4870A",
  },
  orderDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },

  /* Status Badges */
  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.3)",
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4870A",
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.3)",
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
  },
  badgeDanger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(185, 28, 28, 0.3)",
  },
  badgeDangerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B91C1C",
  },
  badgeCancelled: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  badgeCancelledText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },

  /* Client Action Row (Modifier / Annuler) */
  clientActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  clientEditBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.3)",
    gap: 6,
  },
  clientEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
  clientCancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "rgba(185, 28, 28, 0.2)",
    gap: 4,
  },
  clientCancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C",
  },

  /* Order Details Box */
  orderDetailsBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  notesText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    flex: 1,
  },

  /* Item list inside order card */
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemQty: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
    marginRight: 6,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1D6B45",
  },

  /* WhatsApp CTA */
  whatsAppBtn: {
    backgroundColor: "#25D366",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  whatsAppBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Confirm Cancel Modal */
  confirmModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmModalSubtext: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmModalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmExecuteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#B91C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmExecuteText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Action Buttons (Accepter / Refuser) */
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#1D6B45",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  refuseBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderColor: "rgba(185, 28, 28, 0.3)",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  refuseBtnText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Modal Confirmation UI */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalIconCircleAccept: {
    backgroundColor: "#DCFCE7",
  },
  modalIconCircleRefuse: {
    backgroundColor: "#FEE2E2",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmBtnAccept: {
    backgroundColor: "#1D6B45",
  },
  modalConfirmBtnRefuse: {
    backgroundColor: "#B91C1C",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Loading State */
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#1D6B45",
    fontSize: 14,
    fontWeight: "700",
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

