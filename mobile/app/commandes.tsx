import React, { useState, useCallback, useEffect, useRef } from "react";
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
  DeviceEventEmitter,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import AppKeyboardScrollView from "../components/AppKeyboardScrollView";
import LoadErrorState from "../components/LoadErrorState";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../utils/storage";
import {
  apiFetch,
  getApiErrorMessage,
  getErrorMessage,
  isNetworkError,
} from "../utils/api";
import { showErrorAlert, showSuccessAlert } from "../utils/alerts";
import { sortOrdersByPriority } from "../utils/orderPriority";
import { OPEN_DEVIS_EVENT } from "../utils/appEvents";
import {
  TraiteurRequest,
  TraiteurProposal,
  CommandeTraiteur,
  formatWhatsAppUrl,
} from "../utils/types/traiteur";
import GpTrackingTimeline, {
  getGpStatusLabel,
} from "../components/GpTrackingTimeline";
import SignalGpDelayModal, {
  SignalGpDelayTarget,
} from "../components/SignalGpDelayModal";
import DevisModal from "../components/DevisModal";
import NegociationThread from "../components/NegociationThread";
import {
  NEGOCIATION_MAX_CONTRE_OFFRES,
  countCounterOffers,
  formatEuros,
  getNegociation,
  hasPendingCounterOffer,
} from "../utils/negociation";

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
  recipient_name?: string | null;
  recipient_phone?: string | null;
  departure_city?: string | null;
  departure_country?: string | null;
  arrival_city?: string | null;
  arrival_country?: string | null;
  departure_date?: string | null;
  arrival_date?: string | null;
  is_delayed?: boolean | null;
  delay_reason?: string | null;
  created_at: string;
  listing?: {
    id?: string;
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
    arrival_date?: string | null;
    pickup_address?: string | null;
    pickup_city?: string | null;
    dropoff_address?: string | null;
    dropoff_city?: string | null;
    gp_id: string;
    is_active?: boolean | null;
    is_delayed?: boolean | null;
    delay_reason?: string | null;
    gp?: { full_name?: string | null; phone?: string | null } | null;
  } | null;
  gp_listings?: {
    id?: string;
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
    arrival_date?: string | null;
    pickup_address?: string | null;
    pickup_city?: string | null;
    dropoff_address?: string | null;
    dropoff_city?: string | null;
    gp_id: string;
    is_active?: boolean | null;
    is_delayed?: boolean | null;
    delay_reason?: string | null;
    gp?: { full_name?: string | null; phone?: string | null } | null;
  } | null;
  sender?: { full_name: string; phone: string | null } | null;
  profiles?: { full_name: string; phone: string | null } | null;
};

type Tab = "envoyees" | "receptions" | "recues";
type ServiceFilter = "tout" | "traiteur" | "gp";

/**
 * Devis émis par le traiteur (prix fixé ou signature engagée) : le client ne peut plus modifier sa
 * demande (même règle que l'API, qui répond 409 DEVIS_ALREADY_ISSUED).
 */
const isDevisIssued = (cmd: CommandeTraiteur) =>
  (cmd.prix_devis !== null && cmd.prix_devis !== undefined && cmd.prix_devis !== "") ||
  (Boolean(cmd.devis_status) && cmd.devis_status !== "draft");

/** Conditions d'acompte d'une offre de traiteur (absentes sur les anciennes offres). */
const describeProposalAcompte = (prop: TraiteurProposal): string => {
  if (!prop.conditions_devis) return "Conditions d'acompte précisées au devis";
  let type = "optionnel";
  let pourcentage = 30;
  try {
    const meta = JSON.parse(prop.conditions_devis);
    if (typeof meta.acompte_type === "string") type = meta.acompte_type;
    if (typeof meta.acompte_pourcentage === "number") pourcentage = meta.acompte_pourcentage;
  } catch {
    return "Conditions d'acompte précisées au devis";
  }
  if (type === "aucun") return "Sans acompte : tout se règle le jour de l'événement";
  const montant = Math.round(Number(prop.proposed_price) * pourcentage) / 100;
  return `Acompte ${type === "obligatoire" ? "obligatoire" : "facultatif"} : ${pourcentage} % (${formatEuros(montant)})`;
};

export default function CommandeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string;
    sub?: string;
    service?: string;
    commande_id?: string;
  }>();

  const [tab, setTab] = useState<Tab>("envoyees");
  const [serviceFilter, setServiceFilter] = useState<
    "tout" | "traiteur" | "gp"
  >("tout");

  useEffect(() => {
    if (params.tab === "gp" || params.service === "gp") {
      setServiceFilter("gp");
    } else if (params.tab === "traiteur" || params.service === "traiteur") {
      setServiceFilter("traiteur");
    }
  }, [params.tab, params.service]);

  // Notification d'offre (devis reçu, prix maintenu, nouveau devis) : onglet « Devis & Annonces »
  useEffect(() => {
    if (params.sub === "mes_demandes") setTab("receptions");
  }, [params.sub]);
  const [isTraiteur, setIsTraiteur] = useState(false);
  const [isGp, setIsGp] = useState(false);
  const [loading, setLoading] = useState(true);
  // Chargement : premier affichage (plein écran), rafraîchissement (tirer vers le bas) ou erreur
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<{
    message: string;
    offline: boolean;
  } | null>(null);
  const hasLoadedRef = useRef(false);
  // Numéro du dernier chargement lancé : une réponse plus ancienne n'écrase pas une plus récente
  const loadSeqRef = useRef(0);
  // Commande ciblée par une notification : ouverte une seule fois, pas à chaque rafraîchissement
  const autoOpenedCommandeRef = useRef<string | null>(null);
  const [statusActionNote, setStatusActionNote] = useState<string>("");
  const [statusActionSubmitting, setStatusActionSubmitting] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const statusActionLockRef = useRef(false);
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

  // Mes recherches de traiteur & propositions reçues
  const [myTraiteurRequests, setMyTraiteurRequests] = useState<TraiteurRequest[]>([]);
  // Verrou immédiat contre le double appui : une action d'offre n'ouvre qu'un seul écran
  const navLockRef = useRef(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  const [commandesRecues, setCommandesRecues] = useState<CommandeTraiteur[]>(
    [],
  );
  const [ordersRecues, setOrdersRecues] = useState<OrderPlat[]>([]);
  const [gpRecues, setGpRecues] = useState<GpRequest[]>([]);

  // ── Modal Devis Officiel ──
  const [selectedDevisCommande, setSelectedDevisCommande] = useState<CommandeTraiteur | null>(null);
  const [isTraiteurViewForDevis, setIsTraiteurViewForDevis] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const handleUpdateDevisCommande = (updated: CommandeTraiteur) => {
    // Ne rouvre pas le devis si l'utilisateur l'a fermé pendant la requête
    setSelectedDevisCommande((prev) =>
      prev && prev.id === updated.id ? updated : prev
    );
    setCommandesEnvoyees((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
    setCommandesRecues((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  };

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

  const openEditTraiteurRequest = (req: TraiteurRequest) => {
    if ((req.proposals || []).some((p) => p.status === "pending")) {
      showErrorAlert(
        "Annonce non modifiable",
        "Vous avez déjà reçu des devis signés sur cette annonce : la modifier les rendrait faux. Négociez avec les traiteurs, ou annulez-la et publiez-en une nouvelle.",
      );
      return;
    }
    router.push({
      pathname: "/commande/edit-traiteur-request",
      params: { id: req.id },
    });
  };

  // ── État Retard & Suivi GP ──
  const [delayTargetGp, setDelayTargetGp] = useState<SignalGpDelayTarget | null>(null);
  const [updatingGpStatusId, setUpdatingGpStatusId] = useState<string | null>(null);
  const [gpStatusConfirm, setGpStatusConfirm] = useState<{
    id: string;
    newStatus: string;
    statusLabel: string;
  } | null>(null);
  const [gpStatusError, setGpStatusError] = useState<string | null>(null);
  const gpStatusLockRef = useRef(false);

  const closeGpStatusConfirm = () => {
    if (gpStatusLockRef.current) return;
    setGpStatusConfirm(null);
    setGpStatusError(null);
  };

  const handleConfirmUpdateGpStatus = async () => {
    if (!gpStatusConfirm || gpStatusLockRef.current) return;
    gpStatusLockRef.current = true;
    const { id, newStatus, statusLabel } = gpStatusConfirm;
    setUpdatingGpStatusId(id);
    setGpStatusError(null);
    try {
      const res = await apiFetch(`/commande/gp/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Erreur affichée dans la modale, qui reste ouverte pour pouvoir réessayer
        setGpStatusError(
          getApiErrorMessage(data, "Erreur lors de la mise à jour du statut GP."),
        );
        return;
      }
      setGpStatusConfirm(null);
      showSuccessAlert(
        "Étape validée",
        `Le colis est maintenant marqué « ${statusLabel} ». L'expéditeur a été notifié.`
      );
      loadAll();
    } catch (e) {
      setGpStatusError(
        getErrorMessage(e, "Erreur lors de la mise à jour du statut GP."),
      );
    } finally {
      gpStatusLockRef.current = false;
      setUpdatingGpStatusId(null);
    }
  };

  // ── État Annulation Commande / Suppression Annonce ──
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState<{
    type: "traiteur" | "order" | "gp" | "traiteur_request" | "proposal_reject";
    id: string;
    title: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancelLockRef = useRef(false);

  const openCancelConfirm = (
    type: "traiteur" | "order" | "gp" | "traiteur_request" | "proposal_reject",
    id: string,
    title: string,
  ) => {
    setCancelError(null);
    setCancelConfirmTarget({ type, id, title });
  };

  const closeCancelConfirm = () => {
    if (cancelLockRef.current) return;
    setCancelConfirmTarget(null);
    setCancelError(null);
  };

  const executeCancelOrder = async () => {
    if (!cancelConfirmTarget || cancelLockRef.current) return;
    cancelLockRef.current = true;
    setIsCancelling(true);
    setCancelError(null);
    const { type, id } = cancelConfirmTarget;
    try {
      if (type === "proposal_reject") {
        // Refus définitif de l'offre d'un traiteur (il ne pourra plus en envoyer pour cette annonce)
        const res = await apiFetch(`/traiteur/proposals/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "refusee" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setCancelError(getApiErrorMessage(data, "Impossible de décliner cette offre. Réessayez."));
          loadAll();
          return;
        }
      } else if (type === "traiteur_request") {
        // Suppression définitive de l'annonce d'événement et de ses propositions
        const res = await apiFetch(`/traiteur/requests/${id}`, {
          method: "DELETE",
        });
        // 404 : l'annonce n'existe plus (suppression déjà aboutie lors d'une tentative
        // précédente dont la réponse s'est perdue) ; le résultat attendu est donc atteint.
        if (!res.ok && res.status !== 404) {
          const data = await res.json().catch(() => ({}));
          // Erreur affichée dans la modale, qui reste ouverte pour pouvoir réessayer
          setCancelError(
            getApiErrorMessage(data, "Erreur lors de la suppression de l'annonce."),
          );
          return;
        }

        // Retrait de la liste locale une fois la suppression confirmée
        setMyTraiteurRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        const res = await apiFetch(`/commande/cancel/${type}/${id}`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setCancelError(getApiErrorMessage(data, "Erreur lors de l'annulation."));
          // Le statut a pu changer entre-temps : la liste est resynchronisée en arrière-plan
          loadAll();
          return;
        }

        // Mise à jour locale une fois l'annulation confirmée par le serveur
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
      }

      setCancelConfirmTarget(null);
      // Synchronisation en arrière-plan : les listes restent affichées
      loadAll();
    } catch (e) {
      setCancelError(getErrorMessage(e, "Erreur lors de l'opération. Réessayez."));
    } finally {
      cancelLockRef.current = false;
      setIsCancelling(false);
    }
  };

  // Écran au premier plan : seul celui-ci ouvre un devis demandé par un autre écran
  const isFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      loadAll();
      return () => {
        isFocusedRef.current = false;
      };
    }, []),
  );

  // Offre acceptée (devis signé) depuis l'écran de signature : le devis s'ouvre une fois la liste à jour
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(OPEN_DEVIS_EVENT, (commandeId: unknown) => {
      if (isFocusedRef.current && typeof commandeId === "string" && commandeId) {
        void loadAll({ openCommandeId: commandeId });
      }
    });
    return () => subscription.remove();
  }, []);

  /**
   * Charge toutes les commandes. Au premier chargement, écran d'attente plein écran ; ensuite
   * (retour sur l'écran, synchronisation après une action) les listes restent affichées pendant la
   * mise à jour et sont conservées si elle échoue. `pullToRefresh` : indicateur « tirer pour
   * rafraîchir » (et bouton Réessayer). `openCommandeId` : devis à ouvrir une fois la liste à jour
   * (celui créé par l'acceptation d'une offre). Renvoie true si ce devis a été ouvert.
   */
  async function loadAll(
    options: { pullToRefresh?: boolean; openCommandeId?: string } = {},
  ): Promise<boolean> {
    const seq = ++loadSeqRef.current;
    let redirecting = false;
    let openedRequested = false;
    if (options.pullToRefresh) {
      setRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setLoading(true);
    }
    try {
      const token = await getSecureToken("token");
      if (!token) {
        redirecting = true;
        router.push("/login");
        return false;
      }

      // Marquage des notifications comme lues : sans incidence sur l'affichage, un échec est
      // ignoré (hors ligne, il sera refait au prochain chargement)
      apiFetch("/notifications/read-all", {
        method: "PATCH",
      })
        .then(() => {
          DeviceEventEmitter.emit("dabari_notifications_updated");
        })
        .catch(() => {});

      const response = await apiFetch("/commande");
      const res = await response.json();
      // Un chargement plus récent a été lancé entre-temps : c'est lui qui fait foi
      if (seq !== loadSeqRef.current) return false;
      const profile = res?.data?.orders;
      if (!response.ok || !profile) {
        // Les données déjà affichées sont conservées ; un message invite à réessayer
        setLoadError({
          message: getApiErrorMessage(
            res,
            "Impossible de charger vos commandes. Réessayez dans un instant.",
          ),
          offline: false,
        });
        return false;
      }
      if (profile.id) setCurrentUserId(profile.id);
      // ── 1. Commandes envoyées (Client) ──
      setCommandesEnvoyees(sortOrdersByPriority(profile.commandes || [], "devis", "client"));
      setOrdersEnvoyees(sortOrdersByPriority(profile.orders || [], "plat", "client"));
      setGpEnvoyees(sortOrdersByPriority(profile.gp_requests || [], "gp", "client"));
      // ── 2. Recherches de traiteur (Client) & Devis reçus ──
      setMyTraiteurRequests(profile.traiteur_requests || []);
      // ── 3. Statut & Commandes reçues (Traiteur) ──
      const allTraiteurs = profile.traiteurs || [];
      if (profile.role === "traiteur" || allTraiteurs.length > 0) {
        setIsTraiteur(true);
        const allCommandes = allTraiteurs.flatMap(
          (t: any) => t.commandes || [],
        );
        const allOrders = allTraiteurs.flatMap((t: any) => t.orders || []);
        setCommandesRecues(sortOrdersByPriority(allCommandes, "devis", "pro"));
        setOrdersRecues(sortOrdersByPriority(allOrders, "plat", "pro"));
      }
      // ── 4. Statut & Demandes reçues (GP Voyageur) ──
      const gpListings = profile.gp_listings || [];
      if (gpListings.length > 0) {
        setIsGp(true);
        // Récupère toutes les demandes reçues sur tous vos trajets
        const allGpRequestsReceived = gpListings.flatMap(
          (l: any) => l.requests || [],
        );
        setGpRecues(sortOrdersByPriority(allGpRequestsReceived, "gp", "pro"));
      }
      hasLoadedRef.current = true;
      setHasLoaded(true);
      setLoadError(null);

      // ── 5. Ouverture d'un devis : celui demandé par l'appelant (offre tout juste acceptée) ou
      // celui ciblé par une notification (une seule fois, pas à chaque rafraîchissement) ──
      const fromNotification =
        !options.openCommandeId &&
        Boolean(params.commande_id) &&
        autoOpenedCommandeRef.current !== params.commande_id;
      const targetId = options.openCommandeId || (fromNotification ? params.commande_id : undefined);
      if (targetId) {
        const targetCmdEnvoyee = (profile.commandes || []).find(
          (c: any) => c.id === targetId,
        );
        const allCommandes = allTraiteurs.flatMap((t: any) => t.commandes || []);
        const targetCmdRecue = allCommandes.find(
          (c: any) => c.id === targetId,
        );

        if (targetCmdEnvoyee || targetCmdRecue) {
          if (fromNotification) autoOpenedCommandeRef.current = targetId;
          openedRequested = Boolean(options.openCommandeId);
          setTab(targetCmdEnvoyee ? "envoyees" : "recues");
          setSelectedDevisCommande(targetCmdEnvoyee || targetCmdRecue);
          setIsTraiteurViewForDevis(!targetCmdEnvoyee);
        }
      }
    } catch (error) {
      if (seq !== loadSeqRef.current) return false;
      if (!isNetworkError(error)) {
        console.warn("Erreur lors de la récupération des commandes:", error);
      }
      setLoadError({
        message: getErrorMessage(
          error,
          "Impossible de charger vos commandes. Réessayez dans un instant.",
        ),
        offline: isNetworkError(error),
      });
    } finally {
      if (seq === loadSeqRef.current) {
        if (!redirecting) setLoading(false);
        setRefreshing(false);
      }
    }
    return openedRequested;
  }


  // Un double appui n'empile pas deux fois le même écran
  const navigateOnce = (href: Parameters<typeof router.push>[0]) => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    router.push(href);
    setTimeout(() => {
      navLockRef.current = false;
    }, 800);
  };

  // Accepter une offre, c'est signer le devis proposé : écran dédié (signature et accord du client).
  // Seuls les identifiants sont transmis : l'écran relit l'offre auprès de l'API.
  const openAcceptOffer = (prop: TraiteurProposal, req: TraiteurRequest) => {
    navigateOnce({
      pathname: "/commande/accepter-offre" as any,
      params: { requestId: req.id, proposalId: prop.id },
    });
  };

  // Prix trop élevé : contre-proposition au traiteur (écran dédié)
  const openCounterOffer = (prop: TraiteurProposal, req: TraiteurRequest) => {
    navigateOnce({
      pathname: "/commande/negocier" as any,
      params: { requestId: req.id, proposalId: prop.id },
    });
  };

  // Refus d'une offre : définitif, il passe par la fenêtre de confirmation
  const handleRejectProposal = (prop: TraiteurProposal) =>
    openCancelConfirm(
      "proposal_reject",
      prop.id,
      `l'offre de ${prop.traiteur?.name || "ce traiteur"} (${formatEuros(Number(prop.proposed_price))})`,
    );

  const handleCancelTraiteurRequest = (req: TraiteurRequest) => {
    openCancelConfirm(
      "traiteur_request",
      req.id,
      req.title || `votre recherche ${req.event_type}`,
    );
  };

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

  const formatDate = (d?: string | null) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

  /**
   * Accepte ou refuse une demande reçue. L'interface n'est mise à jour qu'une fois l'action
   * confirmée par le serveur. Renvoie le message d'erreur à afficher, ou null en cas de succès.
   */
  async function handleStatusUpdate(
    actionType:
      | "accepter_traiteur"
      | "refuser_traiteur"
      | "accepter_order"
      | "refuser_order"
      | "accepter_gp"
      | "refuser_gp",
    item: any,
    note?: string,
  ): Promise<string | null> {
    let url = "";
    let body: any = {};
    const trimmedNote = note?.trim() || undefined;

    switch (actionType) {
      case "accepter_traiteur":
        url = `/commande/traiteur/${item.id}/status`;
        body = { statut: "acceptee", message_traiteur: trimmedNote };
        break;
      case "refuser_traiteur":
        url = `/commande/traiteur/${item.id}/status`;
        body = { statut: "refusee", message_traiteur: trimmedNote };
        break;
      case "accepter_order":
        url = `/commande/order/${item.id}/status`;
        body = { status: "accepted", message: trimmedNote };
        break;
      case "refuser_order":
        url = `/commande/order/${item.id}/status`;
        body = { status: "rejected", message: trimmedNote };
        break;
      case "accepter_gp":
        url = `/commande/gp/${item.id}/status`;
        body = { status: "accepted", message: trimmedNote };
        break;
      case "refuser_gp":
        url = `/commande/gp/${item.id}/status`;
        body = { status: "rejected", message: trimmedNote };
        break;
    }

    const fallback = actionType.startsWith("accepter")
      ? "Impossible d'accepter cette demande. Réessayez."
      : "Impossible de refuser cette demande. Réessayez.";

    let res: Response;
    try {
      // Même note → même corps : une relance après une coupure réutilise la clé d'idempotence
      res = await apiFetch(url, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } catch (err) {
      return getErrorMessage(err, fallback);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // La demande a pu changer d'état entre-temps (annulation...) : resynchronisation
      loadAll();
      return getApiErrorMessage(data, fallback);
    }

    // Action confirmée par le serveur : mise à jour immédiate de l'interface
    if (actionType === "accepter_traiteur") {
      setCommandesRecues((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? { ...c, statut: "acceptee", message_traiteur: trimmedNote || c.message_traiteur }
            : c,
        ),
      );
    } else if (actionType === "refuser_traiteur") {
      setCommandesRecues((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? { ...c, statut: "refusee", message_traiteur: trimmedNote || c.message_traiteur }
            : c,
        ),
      );
    } else if (actionType === "accepter_order") {
      setOrdersRecues((prev) =>
        prev.map((o) =>
          o.id === item.id
            ? { ...o, status: "accepted", notes: trimmedNote || o.notes }
            : o,
        ),
      );
    } else if (actionType === "refuser_order") {
      setOrdersRecues((prev) =>
        prev.map((o) =>
          o.id === item.id
            ? { ...o, status: "rejected", notes: trimmedNote || o.notes }
            : o,
        ),
      );
    } else if (actionType === "accepter_gp") {
      setGpRecues((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? { ...r, status: "accepted", notes: trimmedNote || r.notes }
            : r,
        ),
      );
    } else if (actionType === "refuser_gp") {
      setGpRecues((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? { ...r, status: "rejected", notes: trimmedNote || r.notes }
            : r,
        ),
      );
    }

    DeviceEventEmitter.emit("dabari_notifications_updated");
    DeviceEventEmitter.emit("dabari_orders_updated");
    // Synchro finale backend, en arrière-plan
    loadAll();
    return null;
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
    setStatusActionNote("");
    setStatusActionError(null);
    setConfirmAction({ type: actionType, item });
  }

  // Validation de la modale Accepter / Refuser : un seul envoi à la fois ; la modale reste ouverte
  // (note conservée, erreur affichée dedans) tant que le serveur n'a pas confirmé l'action.
  async function submitStatusAction() {
    if (!confirmAction || statusActionLockRef.current) return;
    statusActionLockRef.current = true;
    setStatusActionSubmitting(true);
    setStatusActionError(null);
    try {
      const errorMessage = await handleStatusUpdate(
        confirmAction.type,
        confirmAction.item,
        statusActionNote,
      );
      if (errorMessage) {
        setStatusActionError(errorMessage);
        return;
      }
      setConfirmAction(null);
      setStatusActionNote("");
    } catch (err) {
      setStatusActionError(getErrorMessage(err, "Une erreur est survenue. Réessayez."));
    } finally {
      statusActionLockRef.current = false;
      setStatusActionSubmitting(false);
    }
  }

  function closeStatusActionModal() {
    if (statusActionLockRef.current) return;
    setConfirmAction(null);
    setStatusActionNote("");
    setStatusActionError(null);
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
  const totalPendingProposals = myTraiteurRequests.reduce(
    (acc, r) =>
      acc + (r.proposals?.filter((p) => p.status === "pending").length || 0),
    0,
  );

  // Les listes (et leurs états « aucune commande ») ne s'affichent qu'une fois les données reçues :
  // un premier chargement en échec affiche l'erreur et le bouton Réessayer à la place.
  const showLists = hasLoaded || !loadError;

  if (loading && !hasLoaded) {
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
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => router.push("/accueil")}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerBadge}>
                <Ionicons name="cube-outline" size={12} color="#FDE68A" />
                <Text style={styles.headerBadgeText}>Suivi Centralisé</Text>
              </View>
              <Text style={styles.headerTitle}>Commandes & Réceptions</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Gérez vos devis traiteur, commandes de plats et colis GP.
          </Text>

          {/* Onglets Principaux défilables horizontalement (évite tout chevauchement) */}
          <View style={styles.tabsScrollContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
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
                  color={tab === "envoyees" ? "#0B3B24" : "#FFFFFF"}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    tab === "envoyees"
                      ? styles.tabBtnTextActive
                      : styles.tabBtnTextInactive,
                  ]}
                >
                  Mes commandes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  tab === "receptions"
                    ? styles.tabBtnActive
                    : styles.tabBtnInactive,
                ]}
                onPress={() => setTab("receptions")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={tab === "receptions" ? "#0B3B24" : "#FFFFFF"}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    tab === "receptions"
                      ? styles.tabBtnTextActive
                      : styles.tabBtnTextInactive,
                  ]}
                >
                  Devis & Annonces
                </Text>

                {totalPendingProposals > 0 && (
                  <View style={styles.tabBadgeAmberInline}>
                    <Text style={styles.tabBadgeAmberText}>
                      {totalPendingProposals}
                    </Text>
                  </View>
                )}
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
                    name="briefcase-outline"
                    size={16}
                    color={tab === "recues" ? "#0B3B24" : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      tab === "recues"
                        ? styles.tabBtnTextActive
                        : styles.tabBtnTextInactive,
                    ]}
                  >
                    Espace Pro
                  </Text>

                  {pendingRecues > 0 && (
                    <View style={styles.tabBadgeRedInline}>
                      <Text style={styles.tabBadgeRedText}>{pendingRecues}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Sous-filtres Traiteur / GP avec compteurs dynamiques */}
          {tab !== "receptions" && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.serviceFiltersRow}
            >
              {[
                {
                  id: "tout",
                  label: "Tout voir",
                  count:
                    tab === "envoyees"
                      ? commandesEnvoyees.length +
                        ordersEnvoyees.length +
                        gpEnvoyees.length
                      : commandesRecues.length +
                        ordersRecues.length +
                        gpRecues.length,
                },
                {
                  id: "traiteur",
                  label: "Traiteur & Plats",
                  count:
                    tab === "envoyees"
                      ? commandesEnvoyees.length + ordersEnvoyees.length
                      : commandesRecues.length + ordersRecues.length,
                },
                {
                  id: "gp",
                  label: "GP Colis",
                  count:
                    tab === "envoyees"
                      ? gpEnvoyees.length
                      : gpRecues.length,
                },
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
                  <View
                    style={[
                      styles.filterCountBadge,
                      serviceFilter === f.id
                        ? styles.filterCountBadgeActive
                        : styles.filterCountBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        serviceFilter === f.id
                          ? styles.filterCountTextActive
                          : styles.filterCountTextInactive,
                      ]}
                    >
                      {f.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Corps Principal de la Liste des Commandes */}
        <AppKeyboardScrollView
          style={styles.mainScrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
          extraScrollHeight={140}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadAll({ pullToRefresh: true });
              }}
              tintColor="#1D6B45"
              colors={["#1D6B45"]}
            />
          }
        >
          {/* PREMIER CHARGEMENT EN ÉCHEC : erreur + Réessayer à la place des listes */}
          {!hasLoaded && loadError && (
            <LoadErrorState
              title="Impossible de charger vos commandes"
              message={loadError.message}
              offline={loadError.offline}
              retrying={refreshing}
              onRetry={() => loadAll({ pullToRefresh: true })}
              style={styles.loadErrorState}
            />
          )}

          {/* ACTUALISATION EN ÉCHEC : les commandes déjà chargées restent affichées */}
          {hasLoaded && loadError && (
            <View style={styles.refreshErrorBox}>
              <Ionicons
                name={loadError.offline ? "cloud-offline-outline" : "alert-circle-outline"}
                size={18}
                color="#B45309"
              />
              <Text style={styles.refreshErrorText}>
                <Text style={styles.refreshErrorTitle}>Liste non actualisée. </Text>
                {loadError.message}
              </Text>
              <TouchableOpacity
                style={styles.refreshErrorBtn}
                onPress={() => loadAll({ pullToRefresh: true })}
                disabled={refreshing}
                activeOpacity={0.8}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#B45309" />
                ) : (
                  <Text style={styles.refreshErrorBtnText}>Réessayer</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* SECTION ENVOYÉES */}
          {showLists && tab === "envoyees" && (
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

                                {Boolean(cmd.message_traiteur) && (
                                  <View style={styles.motifBox}>
                                    <Ionicons
                                      name="chatbubble-ellipses-outline"
                                      size={14}
                                      color={cmd.statut === "refusee" ? "#B91C1C" : "#1D6B45"}
                                    />
                                    <Text
                                      style={[
                                        styles.motifText,
                                        cmd.statut === "refusee" && styles.motifTextRefuse,
                                      ]}
                                    >
                                      {cmd.statut === "refusee" ? "Motif du refus : " : "Note traiteur : "}
                                      {cmd.message_traiteur}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* BOUTON CONSULTER LE DEVIS OFFICIEL */}
                              <TouchableOpacity
                                style={styles.openDevisBtn}
                                activeOpacity={0.85}
                                onPress={() => {
                                  setSelectedDevisCommande(cmd);
                                  setIsTraiteurViewForDevis(false);
                                }}
                              >
                                <Ionicons
                                  name="document-text-outline"
                                  size={16}
                                  color="#FFFFFF"
                                />
                                <Text style={styles.openDevisBtnText}>
                                  {cmd.prix_devis
                                    ? `Consulter le devis (${Number(cmd.prix_devis).toFixed(2)} €)`
                                    : "Consulter le devis officiel"}
                                </Text>
                                {Boolean(cmd.prix_devis) && !cmd.client_signed_at && (
                                  <View style={styles.actionPillAmber}>
                                    <Text style={styles.actionPillAmberText}>À signer</Text>
                                  </View>
                                )}
                              </TouchableOpacity>

                              {(cmd.statut === "en_attente" ||
                                cmd.statut === "pending") && (
                                <View style={styles.clientActionRow}>
                                  {/* Devis déjà émis (prix fixé) : la demande n'est plus modifiable */}
                                  {!isDevisIssued(cmd) && (
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
                                  )}

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
                                  onPress={() => {
                                    const traiteurInfo = cmd.traiteur || cmd.traiteurs;
                                    const phone = traiteurInfo?.whatsapp;
                                    const url = formatWhatsAppUrl(
                                      phone,
                                      `Bonjour ${traiteurInfo?.name || ""}, je fais suite à mon devis accepté sur Dabari.`
                                    );
                                    if (url) {
                                      Linking.openURL(url);
                                    } else {
                                      showErrorAlert("Contact WhatsApp", "Le numéro WhatsApp de ce traiteur n'est pas renseigné.");
                                    }
                                  }}
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

                                {Boolean(ord.notes) && (
                                  <View style={styles.motifBox}>
                                    <Ionicons
                                      name="chatbubble-ellipses-outline"
                                      size={14}
                                      color={ord.status === "rejected" ? "#B91C1C" : "#1D6B45"}
                                    />
                                    <Text
                                      style={[
                                        styles.motifText,
                                        ord.status === "rejected" && styles.motifTextRefuse,
                                      ]}
                                    >
                                      {ord.status === "rejected" ? "Motif du refus : " : "Note traiteur : "}
                                      {ord.notes}
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

                              {(ord.status === "accepted" ||
                                ord.status === "acceptee" ||
                                ord.status === "en_cours" ||
                                ord.status === "livraison") && (
                                <TouchableOpacity
                                  style={styles.whatsAppBtn}
                                  activeOpacity={0.85}
                                  onPress={() => {
                                    const traiteurInfo =
                                      ord.traiteur || ord.traiteurs;
                                    const phone = traiteurInfo?.whatsapp;
                                    const url = formatWhatsAppUrl(
                                      phone,
                                      `Bonjour ${traiteurInfo?.name || ""}, je vous contacte concernant ma commande de plats sur Dabari.`
                                    );
                                    if (url) {
                                      Linking.openURL(url);
                                    } else {
                                      showErrorAlert(
                                        "Contact WhatsApp",
                                        "Le numéro WhatsApp de ce traiteur n'est pas renseigné."
                                      );
                                    }
                                  }}
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
                          const isDelayed = Boolean(gp.is_delayed || listing?.is_delayed);
                          const delayReason = gp.delay_reason || listing?.delay_reason;
                          const arrivalDate = gp.arrival_date || listing?.arrival_date;

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
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  {isDelayed && (
                                    <View style={styles.delayBadge}>
                                      <Ionicons name="warning" size={11} color="#92400E" />
                                      <Text style={styles.delayBadgeText}>Retardé</Text>
                                    </View>
                                  )}
                                  {renderStatusBadge(gp.status)}
                                </View>
                              </View>

                              <View style={styles.orderDetailsBox}>
                                {isDelayed && (
                                  <View style={styles.delayCardNotice}>
                                    <Ionicons name="alert-circle" size={15} color="#D97706" />
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.delayNoticeTitle}>
                                        Arrivée retardée{arrivalDate ? ` • Est. ${formatDate(arrivalDate)}` : ""}
                                      </Text>
                                      {delayReason ? (
                                        <Text style={styles.delayNoticeReason} numberOfLines={2}>
                                          {delayReason}
                                        </Text>
                                      ) : null}
                                    </View>
                                  </View>
                                )}
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

                                {Boolean(gp.recipient_name) && (
                                  <View style={styles.detailRow}>
                                    <Ionicons
                                      name="person-outline"
                                      size={15}
                                      color="#1D6B45"
                                    />
                                    <Text style={[styles.detailText, { flex: 1, fontWeight: "700", color: "#0F172A" }]}>
                                      Destinataire : {gp.recipient_name}
                                      {gp.recipient_phone ? ` (${gp.recipient_phone})` : ""}
                                    </Text>
                                  </View>
                                )}

                                {Boolean(gp.departure_date || listing?.departure_date) && (
                                  <View style={styles.detailRow}>
                                    <Ionicons
                                      name="airplane-outline"
                                      size={15}
                                      color="#D4870A"
                                    />
                                    <Text style={[styles.detailText, { flex: 1 }]}>
                                      Départ : {formatDate(gp.departure_date || listing?.departure_date)}
                                      {listing?.pickup_city ? ` (Dépôt : ${listing.pickup_city})` : ""}
                                    </Text>
                                  </View>
                                )}

                                {Boolean(gp.arrival_date || listing?.arrival_date) && (
                                  <View style={styles.detailRow}>
                                    <Ionicons
                                      name="navigate-outline"
                                      size={15}
                                      color="#D4870A"
                                    />
                                    <Text style={[styles.detailText, { flex: 1 }]}>
                                      Arrivée : {formatDate(gp.arrival_date || listing?.arrival_date)}
                                      {listing?.dropoff_city ? ` (Récup : ${listing.dropoff_city})` : ""}
                                    </Text>
                                  </View>
                                )}

                                {Boolean(gp.notes) && (
                                  <View style={styles.motifBox}>
                                    <Ionicons
                                      name="chatbubble-ellipses-outline"
                                      size={14}
                                      color={
                                        gp.status === "rejected" || gp.status === "refused"
                                          ? "#B91C1C"
                                          : "#D4870A"
                                      }
                                    />
                                    <Text
                                      style={[
                                        styles.motifText,
                                        (gp.status === "rejected" || gp.status === "refused") &&
                                          styles.motifTextRefuse,
                                      ]}
                                    >
                                      {gp.status === "rejected" || gp.status === "refused"
                                        ? "Motif du refus : "
                                        : "Note transporteur : "}
                                      {gp.notes}
                                    </Text>
                                  </View>
                                )}

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

                              {/* Suivi interactif pour les colis acceptés / en cours */}
                              {gp.status !== "pending" &&
                                gp.status !== "cancelled" &&
                                gp.status !== "refusee" && (
                                  <View style={{ marginTop: 10 }}>
                                    <GpTrackingTimeline
                                      status={gp.status}
                                      departureCity={depCity}
                                      arrivalCity={arrCity}
                                      departureDate={gp.departure_date || listing?.departure_date}
                                      arrivalDate={arrivalDate}
                                      pickupAddress={listing?.pickup_address}
                                      pickupCity={listing?.pickup_city}
                                      dropoffAddress={listing?.dropoff_address}
                                      dropoffCity={listing?.dropoff_city}
                                      weightKg={gp.weight_kg}
                                      contentDesc={gp.content_desc}
                                      totalAmount={gp.total_amount}
                                      contactName={listing?.gp?.full_name || "Transporteur GP"}
                                      contactPhone={listing?.gp?.phone}
                                      isDelayed={isDelayed}
                                      delayReason={delayReason}
                                      isGpMode={false}
                                    />
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

          {/* SECTION DEVIS & ANNONCES (RÉCEPTIONS) */}
          {showLists && tab === "receptions" && (
            <View style={{ gap: 14 }}>
              {/* CTA Publier une recherche */}
              <TouchableOpacity
                style={styles.receptionCtaBanner}
                onPress={() => router.push("/traiteur/demande")}
                activeOpacity={0.88}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={styles.receptionCtaBadge}>
                    <Ionicons name="sparkles" size={13} color="#FDE68A" />
                    <Text style={styles.receptionCtaBadgeText}>
                      Service sur-mesure
                    </Text>
                  </View>
                  <Text style={styles.receptionCtaTitle}>
                    Vous cherchez un traiteur ?
                  </Text>
                  <Text style={styles.receptionCtaDesc}>
                    Publiez votre événement. Les traiteurs partenaires vous
                    enverront directement leurs devis personnalisés !
                  </Text>
                </View>
                <Ionicons name="add-circle" size={32} color="#FFFFFF" />
              </TouchableOpacity>

              {myTraiteurRequests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View
                    style={[
                      styles.emptyIconContainer,
                      { backgroundColor: "#E8F5E9" },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={32}
                      color="#1D6B45"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Aucune annonce publiée</Text>
                  <Text style={styles.emptySubtitle}>
                    Vous n&apos;avez pas encore publié de recherche de traiteur.
                    Décrivez vos envies culinaires pour recevoir des devis !
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push("/traiteur/demande")}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.emptyButtonText}>
                      Publier une annonce
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                myTraiteurRequests.map((req) => {
                  const proposals = req.proposals || [];
                  const isOpen = req.status === "open";
                  const isFulfilled = req.status === "fulfilled";
                  const isCancelled = req.status === "cancelled";

                  return (
                    <View key={req.id} style={styles.orderCard}>
                      {/* Top Header */}
                      <View style={styles.orderCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 4,
                            }}
                          >
                            <View style={styles.eventTypeBadge}>
                              <Text style={styles.eventTypeBadgeText}>
                                {req.event_type}
                              </Text>
                            </View>
                            {isOpen && (
                              <View style={styles.badgeSuccessSm}>
                                <Ionicons name="ellipse" size={7} color="#059669" />
                                <Text style={styles.badgeSuccessSmText}>
                                  Active
                                </Text>
                              </View>
                            )}
                            {isFulfilled && (
                              <View style={styles.badgeBlueSm}>
                                <Ionicons name="checkmark-circle" size={11} color="#2563EB" />
                                <Text style={styles.badgeBlueSmText}>
                                  Pourvue
                                </Text>
                              </View>
                            )}
                            {isCancelled && (
                              <View style={styles.badgeGraySm}>
                                <Text style={styles.badgeGraySmText}>
                                  Annulée
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.providerName}>
                            {req.title ||
                              `Recherche de traiteur - ${req.event_type}`}
                          </Text>
                          <Text style={styles.orderDate}>
                            Publié le {formatDate(req.created_at)}
                          </Text>
                        </View>

                        {isOpen && (
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 6,
                              alignItems: "center",
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => openEditTraiteurRequest(req)}
                              style={styles.editRequestBtn}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="create-outline"
                                size={13}
                                color="#1D6B45"
                              />
                              <Text style={styles.editRequestBtnText}>
                                Modifier
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() =>
                                handleCancelTraiteurRequest(req)
                              }
                              style={styles.cancelRequestBtn}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.cancelRequestBtnText}>
                                Annuler
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* Details Box */}
                      <View style={styles.orderDetailsBox}>
                        <View style={styles.detailRow}>
                          <Ionicons
                            name="calendar-outline"
                            size={15}
                            color="#1D6B45"
                          />
                          <Text style={styles.detailText}>
                            Date : {formatDate(req.event_date)}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Ionicons
                            name="people-outline"
                            size={15}
                            color="#1D6B45"
                          />
                          <Text style={styles.detailText}>
                            Invités :{" "}
                            {req.guest_count
                              ? `${req.guest_count} pers.`
                              : "Non précisé"}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Ionicons
                            name="location-outline"
                            size={15}
                            color="#1D6B45"
                          />
                          <Text style={styles.detailText} numberOfLines={1}>
                            Lieu : {req.location}
                          </Text>
                        </View>
                        {req.budget && (
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="cash-outline"
                              size={15}
                              color="#1D6B45"
                            />
                            <Text style={styles.detailText}>
                              Budget estimé : {req.budget} €
                            </Text>
                          </View>
                        )}

                        <View style={styles.foodPrefBox}>
                          <Text style={styles.foodPrefLabel}>
                            Nourriture souhaitée :
                          </Text>
                          <Text style={styles.foodPrefText}>
                            {req.food_preferences}
                          </Text>
                        </View>
                      </View>

                      {/* Proposals Section */}
                      <View style={styles.proposalsContainer}>
                        <View style={styles.proposalsHeaderRow}>
                          <Ionicons
                            name="chatbubbles-outline"
                            size={16}
                            color="#1D6B45"
                          />
                          <Text style={styles.proposalsHeaderTitle}>
                            Offres des traiteurs ({proposals.length})
                          </Text>
                        </View>

                        {proposals.length === 0 ? (
                          <View style={styles.emptyProposalsBox}>
                            <Ionicons
                              name="time-outline"
                              size={18}
                              color="#D97706"
                            />
                            <Text style={styles.emptyProposalsText}>
                              En attente des premières propositions des
                              traiteurs...
                            </Text>
                          </View>
                        ) : (
                          proposals.map((prop) => {
                            const traiteur = prop.traiteur;
                            const isPending = prop.status === "pending";
                            const isAccepted = prop.status === "accepted";
                            const isRejected = prop.status === "rejected";
                            // Négociation : une contre-proposition à la fois, dans la limite autorisée
                            const negociation = getNegociation(prop.negociation);
                            const counterPending = hasPendingCounterOffer(negociation);
                            const canCounter =
                              isPending &&
                              isOpen &&
                              !counterPending &&
                              countCounterOffers(negociation) < NEGOCIATION_MAX_CONTRE_OFFRES;
                            const whatsappNum =
                              traiteur?.whatsapp ||
                              traiteur?.profile?.phone;
                            const waUrl = formatWhatsAppUrl(
                              whatsappNum,
                              `Bonjour ${traiteur?.name || ""}, je fais suite à votre offre sur Dabari pour mon événement (${req.event_type}) à ${prop.proposed_price}€.`
                            );

                            return (
                              <View
                                key={prop.id}
                                style={[
                                  styles.proposalCard,
                                  isAccepted && styles.proposalCardAccepted,
                                  isRejected && styles.proposalCardRejected,
                                ]}
                              >
                                <View style={styles.proposalTopRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.proposalTraiteurName}>
                                      {traiteur?.name || "Traiteur"}
                                    </Text>
                                    <Text style={styles.proposalDate}>
                                      Reçu le {formatDate(prop.created_at)}
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: "flex-end" }}>
                                    <Text style={styles.proposalPrice}>
                                      {formatEuros(Number(prop.proposed_price))}
                                    </Text>
                                    {isAccepted && (
                                      <Text
                                        style={styles.proposalBadgeAccepted}
                                      >
                                        Retenue
                                      </Text>
                                    )}
                                    {isRejected && (
                                      <Text
                                        style={styles.proposalBadgeRejected}
                                      >
                                        Déclinée
                                      </Text>
                                    )}
                                  </View>
                                </View>

                                <View style={styles.proposalMessageBox}>
                                  <Text style={styles.proposalMessageText}>
                                    {prop.message}
                                  </Text>
                                </View>

                                {/* Conditions du devis proposé et signature du traiteur */}
                                <View style={styles.proposalTermsRow}>
                                  <Ionicons name="wallet-outline" size={13} color="#1D6B45" />
                                  <Text style={styles.proposalTermsText}>
                                    {describeProposalAcompte(prop)}
                                  </Text>
                                </View>
                                <View style={styles.proposalTermsRow}>
                                  <Ionicons
                                    name={prop.traiteur_signature ? "checkmark-circle" : "time-outline"}
                                    size={13}
                                    color={prop.traiteur_signature ? "#15803D" : "#B45309"}
                                  />
                                  <Text
                                    style={[
                                      styles.proposalTermsText,
                                      !prop.traiteur_signature && styles.proposalTermsTextPending,
                                    ]}
                                  >
                                    {prop.traiteur_signature
                                      ? `Devis signé par ${prop.traiteur_signature}`
                                      : "Offre non signée : le traiteur signera après votre accord"}
                                  </Text>
                                </View>

                                <NegociationThread
                                  entries={negociation}
                                  viewer="client"
                                  traiteurName={traiteur?.name}
                                />

                                {/* Actions */}
                                <View style={styles.proposalActionsRow}>
                                  {waUrl && (
                                    <TouchableOpacity
                                      style={styles.proposalWaBtn}
                                      onPress={() => Linking.openURL(waUrl)}
                                      activeOpacity={0.8}
                                    >
                                      <Ionicons
                                        name="logo-whatsapp"
                                        size={15}
                                        color="#1D6B45"
                                      />
                                      <Text style={styles.proposalWaBtnText}>
                                        WhatsApp
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  {isPending && isOpen && (
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        gap: 8,
                                        marginLeft: "auto",
                                      }}
                                    >
                                      <TouchableOpacity
                                        style={styles.proposalRejectBtn}
                                        disabled={isCancelling && cancelConfirmTarget?.id === prop.id}
                                        onPress={() =>
                                          handleRejectProposal(prop)
                                        }
                                        activeOpacity={0.8}
                                      >
                                        <Text
                                          style={
                                            styles.proposalRejectBtnText
                                          }
                                        >
                                          Décliner
                                        </Text>
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={styles.proposalAcceptBtn}
                                        disabled={isCancelling && cancelConfirmTarget?.id === prop.id}
                                        onPress={() => openAcceptOffer(prop, req)}
                                        activeOpacity={0.85}
                                      >
                                        <Ionicons
                                          name="checkmark"
                                          size={14}
                                          color="#FFFFFF"
                                        />
                                        <Text
                                          style={
                                            styles.proposalAcceptBtnText
                                          }
                                        >
                                          Signer et accepter
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>

                                {isPending && isOpen && counterPending && (
                                  <View style={styles.proposalCounterPending}>
                                    <Ionicons name="hourglass-outline" size={13} color="#6D28D9" />
                                    <Text style={styles.proposalCounterPendingText}>
                                      Contre-proposition envoyée : en attente de la réponse du traiteur.
                                    </Text>
                                  </View>
                                )}
                                {canCounter && (
                                  <TouchableOpacity
                                    style={styles.proposalNegotiateBtn}
                                    disabled={isCancelling && cancelConfirmTarget?.id === prop.id}
                                    onPress={() => openCounterOffer(prop, req)}
                                    activeOpacity={0.85}
                                  >
                                    <Ionicons name="swap-vertical" size={14} color="#6D28D9" />
                                    <Text style={styles.proposalNegotiateBtnText}>
                                      Trop cher ? Proposer un autre prix
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* SECTION REÇUES */}
          {showLists && tab === "recues" && (
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
                          const waUrl = formatWhatsAppUrl(
                            clientPhone,
                            "Bonjour, je fais suite à votre demande de devis sur Dabari."
                          );

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

                                {Boolean(cmd.message_traiteur) && (
                                  <View style={styles.motifBox}>
                                    <Ionicons
                                      name="chatbubble-ellipses-outline"
                                      size={14}
                                      color={cmd.statut === "refusee" ? "#B91C1C" : "#1D6B45"}
                                    />
                                    <Text
                                      style={[
                                        styles.motifText,
                                        cmd.statut === "refusee" && styles.motifTextRefuse,
                                      ]}
                                    >
                                      {cmd.statut === "refusee" ? "Motif du refus : " : "Note renseignée : "}
                                      {cmd.message_traiteur}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* BOUTON GÉRER / CHIFFRER LE DEVIS (TRAITEUR) */}
                              <TouchableOpacity
                                style={styles.openDevisBtnTraiteur}
                                activeOpacity={0.85}
                                onPress={() => {
                                  setSelectedDevisCommande(cmd);
                                  setIsTraiteurViewForDevis(true);
                                }}
                              >
                                <Ionicons
                                  name="create-outline"
                                  size={16}
                                  color="#FFFFFF"
                                />
                                <Text style={styles.openDevisBtnText}>
                                  {cmd.prix_devis
                                    ? `Gérer le devis (${Number(cmd.prix_devis).toFixed(2)} €)`
                                    : "Chiffrer le devis officiel"}
                                </Text>
                                {!cmd.prix_devis && (
                                  <View style={styles.actionPillAmber}>
                                    <Text style={styles.actionPillAmberText}>À chiffrer</Text>
                                  </View>
                                )}
                              </TouchableOpacity>

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
                                Boolean(waUrl) && (
                                  <TouchableOpacity
                                    style={styles.whatsAppBtn}
                                    onPress={() => Linking.openURL(waUrl!)}
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

                                {Boolean(ord.notes) && (
                                  <View style={styles.motifBox}>
                                    <Ionicons
                                      name="chatbubble-ellipses-outline"
                                      size={14}
                                      color={ord.status === "rejected" ? "#B91C1C" : "#1D6B45"}
                                    />
                                    <Text
                                      style={[
                                        styles.motifText,
                                        ord.status === "rejected" && styles.motifTextRefuse,
                                      ]}
                                    >
                                      {ord.status === "rejected" ? "Motif du refus : " : "Note renseignée : "}
                                      {ord.notes}
                                    </Text>
                                  </View>
                                )}
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

                              {(ord.status === "acceptee" ||
                                ord.status === "accepted") && (
                                <TouchableOpacity
                                  style={styles.whatsAppBtn}
                                  activeOpacity={0.85}
                                  onPress={() => {
                                    const clientInfo =
                                      ord.client || ord.profiles;
                                    const phone = clientInfo?.phone;
                                    const url = formatWhatsAppUrl(
                                      phone,
                                      `Bonjour ${clientInfo?.full_name || ""}, je prépare votre commande de plats sur Dabari.`
                                    );
                                    if (url) {
                                      Linking.openURL(url);
                                    } else {
                                      showErrorAlert(
                                        "Contact WhatsApp",
                                        "Le numéro WhatsApp de ce client n'est pas renseigné."
                                      );
                                    }
                                  }}
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
                          const isDelayed = Boolean(gp.is_delayed || listing?.is_delayed);
                          const delayReason = gp.delay_reason || listing?.delay_reason;
                          const arrivalDate = gp.arrival_date || listing?.arrival_date;
                          const senderInfo = gp.sender || gp.profiles;

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
                                    {senderInfo?.full_name ? ` par ${senderInfo.full_name}` : ""}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  {isDelayed && (
                                    <View style={styles.delayBadge}>
                                      <Ionicons name="warning" size={11} color="#92400E" />
                                      <Text style={styles.delayBadgeText}>Retardé</Text>
                                    </View>
                                  )}
                                  {renderStatusBadge(gp.status)}
                                </View>
                              </View>

                              <View style={styles.orderDetailsBox}>
                                {isDelayed && (
                                  <View style={styles.delayCardNotice}>
                                    <Ionicons name="alert-circle" size={15} color="#D97706" />
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.delayNoticeTitle}>
                                        Arrivée retardée{arrivalDate ? ` • Est. ${formatDate(arrivalDate)}` : ""}
                                      </Text>
                                      {delayReason ? (
                                        <Text style={styles.delayNoticeReason} numberOfLines={2}>
                                          {delayReason}
                                        </Text>
                                      ) : null}
                                    </View>
                                  </View>
                                )}
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

                                {Boolean(gp.recipient_name) && (
                                  <View style={styles.detailRow}>
                                    <Ionicons
                                      name="person-outline"
                                      size={15}
                                      color="#1D6B45"
                                    />
                                    <Text style={[styles.detailText, { flex: 1, fontWeight: "700", color: "#0F172A" }]}>
                                      Destinataire à l'arrivée : {gp.recipient_name}
                                      {gp.recipient_phone ? ` (${gp.recipient_phone})` : ""}
                                    </Text>
                                  </View>
                                )}

                                {Boolean(gp.departure_date || listing?.departure_date) && (
                                  <View style={styles.detailRow}>
                                    <Ionicons
                                      name="airplane-outline"
                                      size={15}
                                      color="#D4870A"
                                    />
                                    <Text style={[styles.detailText, { flex: 1 }]}>
                                      Départ : {formatDate(gp.departure_date || listing?.departure_date)}
                                      {listing?.pickup_city ? ` (Dépôt : ${listing.pickup_city})` : ""}
                                    </Text>
                                  </View>
                                )}

                                {Boolean(gp.arrival_date || listing?.arrival_date) && (
                                  <View style={styles.detailRow}>
                                    <Ionicons
                                      name="navigate-outline"
                                      size={15}
                                      color="#D4870A"
                                    />
                                    <Text style={[styles.detailText, { flex: 1 }]}>
                                      Arrivée : {formatDate(gp.arrival_date || listing?.arrival_date)}
                                      {listing?.dropoff_city ? ` (Récup : ${listing.dropoff_city})` : ""}
                                    </Text>
                                  </View>
                                )}

                                {Boolean(gp.notes) && (
                                  <View style={styles.motifBox}>
                                    <Ionicons
                                      name="chatbubble-ellipses-outline"
                                      size={14}
                                      color={
                                        gp.status === "rejected" || gp.status === "refused"
                                          ? "#B91C1C"
                                          : "#D4870A"
                                      }
                                    />
                                    <Text
                                      style={[
                                        styles.motifText,
                                        (gp.status === "rejected" || gp.status === "refused") &&
                                          styles.motifTextRefuse,
                                      ]}
                                    >
                                      {gp.status === "rejected" || gp.status === "refused"
                                        ? "Motif du refus : "
                                        : "Note renseignée : "}
                                      {gp.notes}
                                    </Text>
                                  </View>
                                )}
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

                               {/* Si la demande est acceptée ou en cours d'acheminement, afficher le suivi GP transporteur */}
                              {gp.status !== "en_attente" &&
                              gp.status !== "pending" &&
                              gp.status !== "refusee" &&
                              gp.status !== "refused" &&
                              gp.status !== "cancelled" ? (
                                <View style={{ marginTop: 10 }}>
                                  <GpTrackingTimeline
                                    status={gp.status}
                                    departureCity={depCity}
                                    arrivalCity={arrCity}
                                    departureDate={gp.departure_date || listing?.departure_date}
                                    arrivalDate={arrivalDate}
                                    pickupAddress={listing?.pickup_address}
                                    pickupCity={listing?.pickup_city}
                                    dropoffAddress={listing?.dropoff_address}
                                    dropoffCity={listing?.dropoff_city}
                                    weightKg={gp.weight_kg}
                                    contentDesc={gp.content_desc}
                                    totalAmount={gp.total_amount}
                                    contactName={senderInfo?.full_name || "Expéditeur"}
                                    contactPhone={senderInfo?.phone}
                                    isDelayed={isDelayed}
                                    delayReason={delayReason}
                                    isGpMode={true}
                                    updatingStatus={updatingGpStatusId === gp.id}
                                    onUpdateStatus={(newStatus) => {
                                      const labelMap: Record<string, string> = {
                                        in_transit: "En vol / Transit",
                                        arrived: "Arrivé à destination",
                                        delivered: "Remis au destinataire",
                                      };
                                      setGpStatusError(null);
                                      setGpStatusConfirm({
                                        id: gp.id,
                                        newStatus,
                                        statusLabel: labelMap[newStatus] || newStatus,
                                      });
                                    }}
                                    onSignalDelay={() => {
                                      setDelayTargetGp({
                                        id: gp.listing_id || (listing?.id ?? gp.id),
                                        currentArrivalDate: arrivalDate,
                                        departureDate: gp.departure_date || listing?.departure_date,
                                        routeLabel: depCity && arrCity ? `${depCity} ➔ ${arrCity}` : undefined,
                                        delayReason: delayReason || undefined,
                                        isListing: true,
                                      });
                                    }}
                                  />
                                </View>
                              ) : (
                                (gp.status === "pending" || gp.status === "en_attente") && (
                                  <TouchableOpacity
                                    style={styles.whatsAppBtn}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                      const senderPhone = senderInfo?.phone;
                                      const url = formatWhatsAppUrl(
                                        senderPhone,
                                        `Bonjour ${senderInfo?.full_name || ""}, je vous contacte concernant votre colis GP (${gp.weight_kg} kg) sur Dabari.`
                                      );
                                      if (url) {
                                        Linking.openURL(url);
                                      } else {
                                        showErrorAlert(
                                          "Contact WhatsApp",
                                          "Le numéro WhatsApp de cet expéditeur n'est pas renseigné."
                                        );
                                      }
                                    }}
                                  >
                                    <Ionicons
                                      name="logo-whatsapp"
                                      size={16}
                                      color="#FFFFFF"
                                    />
                                    <Text style={styles.whatsAppBtnText}>
                                      Contacter l'expéditeur sur WhatsApp
                                    </Text>
                                  </TouchableOpacity>
                                )
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
        </AppKeyboardScrollView>

        {/* MODAL DE CONFIRMATION */}
        {confirmAction && (
          <Modal
            transparent
            animationType="fade"
            visible={!!confirmAction}
            onRequestClose={closeStatusActionModal}
          >
            {/* Android affiche les modales bord à bord et ne les redimensionne plus quand le clavier s'ouvre :
                la fenêtre est remontée au-dessus du clavier sur les deux plateformes. */}
            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
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

                <View style={styles.modalNoteContainer}>
                  <Text style={styles.modalNoteLabel}>
                    {confirmAction.type.startsWith("accepter")
                      ? "Note ou consigne pour le client (facultatif) :"
                      : "Motif ou raison du refus (facultatif) :"}
                  </Text>
                  <TextInput
                    style={styles.modalNoteInput}
                    placeholder={
                      confirmAction.type.startsWith("accepter")
                        ? "Ex: Bien reçu, je prépare votre commande avec soin !"
                        : "Ex: Créneau complet à cette date, désolé..."
                    }
                    placeholderTextColor="#94A3B8"
                    value={statusActionNote}
                    onChangeText={setStatusActionNote}
                    editable={!statusActionSubmitting}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Erreur affichée dans la modale : la note est conservée pour réessayer */}
                {statusActionError && (
                  <View style={styles.modalErrorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
                    <Text style={styles.modalErrorText}>{statusActionError}</Text>
                  </View>
                )}

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalCancelBtn,
                      statusActionSubmitting && { opacity: 0.6 },
                    ]}
                    onPress={closeStatusActionModal}
                    disabled={statusActionSubmitting}
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
                      statusActionSubmitting && { opacity: 0.7 },
                    ]}
                    activeOpacity={0.85}
                    onPress={submitStatusAction}
                    disabled={statusActionSubmitting}
                  >
                    {statusActionSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>
                        {statusActionError ? "Réessayer" : "Confirmer"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        )}

        {/* MODALE CONFIRMATION ANNULATION CLIENT */}
        {cancelConfirmTarget !== null && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={closeCancelConfirm}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.confirmModalCard}>
                <View style={styles.confirmIconContainer}>
                  <Ionicons
                    name={
                      cancelConfirmTarget.type === "traiteur_request"
                        ? "trash-outline"
                        : cancelConfirmTarget.type === "proposal_reject"
                          ? "close-circle-outline"
                          : "alert-circle-outline"
                    }
                    size={36}
                    color="#B91C1C"
                  />
                </View>

                <Text style={styles.confirmModalTitle}>
                  {cancelConfirmTarget.type === "traiteur_request"
                    ? "Supprimer l'annonce ?"
                    : cancelConfirmTarget.type === "proposal_reject"
                      ? "Décliner cette offre ?"
                      : "Annuler la commande ?"}
                </Text>

                <Text style={styles.confirmModalSubtext}>
                  {cancelConfirmTarget.type === "traiteur_request"
                    ? `Êtes-vous sûr(e) de vouloir annuler et supprimer ${cancelConfirmTarget.title} ? Cette action supprimera définitivement votre recherche d'événement ainsi que les propositions associées.`
                    : cancelConfirmTarget.type === "proposal_reject"
                      ? `Vous allez décliner ${cancelConfirmTarget.title}. Le traiteur ne pourra plus vous envoyer de devis pour cette annonce.`
                      : `Êtes-vous sûr(e) de vouloir annuler ${cancelConfirmTarget.title} ? Cette action est irréversible.`}
                </Text>

                {cancelError && (
                  <View style={styles.modalErrorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
                    <Text style={styles.modalErrorText}>{cancelError}</Text>
                  </View>
                )}

                <View style={styles.confirmModalButtonsRow}>
                  <TouchableOpacity
                    style={styles.confirmCancelBtn}
                    onPress={closeCancelConfirm}
                    disabled={isCancelling}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmCancelText}>
                      {cancelConfirmTarget.type === "traiteur_request"
                        ? "Non, garder l'annonce"
                        : cancelConfirmTarget.type === "proposal_reject"
                          ? "Non, garder l'offre"
                          : "Non, garder"}
                    </Text>
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
                        {cancelConfirmTarget.type === "traiteur_request"
                          ? "Oui, supprimer"
                          : cancelConfirmTarget.type === "proposal_reject"
                            ? "Oui, décliner"
                            : "Oui, annuler"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* MODALE RETARD DE VOL GP */}
        {delayTargetGp && (
          <SignalGpDelayModal
            visible={!!delayTargetGp}
            target={delayTargetGp}
            onClose={() => setDelayTargetGp(null)}
            onSuccess={() => {
              setDelayTargetGp(null);
              loadAll();
            }}
          />
        )}

        {/* MODALE MISE À JOUR STATUT GP TRANSPORTEUR */}
        {gpStatusConfirm && (
          <Modal
            transparent
            animationType="fade"
            visible={!!gpStatusConfirm}
            onRequestClose={closeGpStatusConfirm}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View
                  style={[
                    styles.modalIconCircle,
                    { backgroundColor: "#CCFBF1" },
                  ]}
                >
                  <Ionicons name="airplane" size={32} color="#0D9488" />
                </View>

                <Text style={styles.modalTitle}>Faire progresser le colis</Text>

                <Text style={styles.modalSubtext}>
                  Voulez-vous passer le statut de ce colis à « {gpStatusConfirm.statusLabel} » ? L'expéditeur sera immédiatement averti.
                </Text>

                {gpStatusError && (
                  <View style={styles.modalErrorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
                    <Text style={styles.modalErrorText}>{gpStatusError}</Text>
                  </View>
                )}

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={closeGpStatusConfirm}
                    disabled={updatingGpStatusId === gpStatusConfirm.id}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalConfirmBtn,
                      { backgroundColor: "#0D9488" },
                      updatingGpStatusId === gpStatusConfirm.id && { opacity: 0.7 },
                    ]}
                    activeOpacity={0.85}
                    onPress={handleConfirmUpdateGpStatus}
                    disabled={updatingGpStatusId === gpStatusConfirm.id}
                  >
                    {updatingGpStatusId === gpStatusConfirm.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Valider l'étape</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* MODALE DEVIS TRAITEUR OFFICIEL */}
        <DevisModal
          visible={Boolean(selectedDevisCommande)}
          commande={selectedDevisCommande}
          currentUserId={currentUserId}
          isTraiteurView={isTraiteurViewForDevis}
          onClose={() => setSelectedDevisCommande(null)}
          onUpdate={handleUpdateDevisCommande}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  openDevisBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1D6B45",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  openDevisBtnTraiteur: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D9488",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  openDevisBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  actionPillAmber: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionPillAmberText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  topGreenWrapper: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },
  headerCard: {
    backgroundColor: "#0B3B24",
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    gap: 4,
    marginBottom: 3,
  },
  headerBadgeText: {
    color: "#FDE68A",
    fontSize: 10.5,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
    lineHeight: 16,
  },

  /* Tabs */
  tabsScrollContainer: {
    marginBottom: 10,
  },
  tabsScrollContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 14,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  tabBtnTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  tabBtnTextInactive: {
    color: "#FFFFFF",
  },
  tabBadgeAmberInline: {
    backgroundColor: "#E5A93C",
    borderRadius: 10,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  tabBadgeAmberText: {
    color: "#0B3B24",
    fontSize: 10.5,
    fontWeight: "900",
  },
  tabBadgeRedInline: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  tabBadgeRedText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "900",
  },

  /* Service Filter Pills */
  serviceFiltersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: "#E5A93C",
  },
  filterPillInactive: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  filterPillTextInactive: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  filterCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  filterCountBadgeActive: {
    backgroundColor: "rgba(11, 59, 36, 0.15)",
  },
  filterCountBadgeInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: "800",
  },
  filterCountTextActive: {
    color: "#0B3B24",
  },
  filterCountTextInactive: {
    color: "rgba(255, 255, 255, 0.8)",
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
  modalErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalErrorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  /* Loading State */
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  /* Erreurs de chargement */
  loadErrorState: {
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  refreshErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshErrorText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    lineHeight: 17,
  },
  refreshErrorTitle: {
    fontWeight: "800",
  },
  refreshErrorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    minWidth: 82,
    alignItems: "center",
  },
  refreshErrorBtnText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "800",
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

  /* Reception / Devis & Annonces styles */
  receptionCtaBanner: {
    backgroundColor: "#1D6B45",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  receptionCtaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 6,
    gap: 4,
  },
  receptionCtaBadgeText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "700",
  },
  receptionCtaTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  receptionCtaDesc: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 16,
  },
  eventTypeBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventTypeBadgeText: {
    color: "#1D6B45",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeSuccessSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  badgeSuccessSmText: {
    color: "#065F46",
    fontSize: 10,
    fontWeight: "600",
  },
  badgeBlueSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  badgeBlueSmText: {
    color: "#1E40AF",
    fontSize: 10,
    fontWeight: "600",
  },
  badgeGraySm: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  badgeGraySmText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
  },
  editRequestBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editRequestBtnText: {
    color: "#1D6B45",
    fontSize: 11,
    fontWeight: "700",
  },
  cancelRequestBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  cancelRequestBtnText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "600",
  },
  foodPrefBox: {
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginTop: 6,
  },
  foodPrefLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  foodPrefText: {
    fontSize: 12,
    color: "#1E293B",
    lineHeight: 16,
  },
  proposalsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  proposalsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  proposalsHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyProposalsBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  emptyProposalsText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
    lineHeight: 16,
  },
  proposalCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  proposalCardAccepted: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  proposalCardRejected: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    opacity: 0.6,
  },
  proposalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  proposalTraiteurName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  proposalDate: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  proposalPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1D6B45",
  },
  proposalBadgeAccepted: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  proposalBadgeRejected: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  proposalMessageBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  proposalMessageText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 16,
  },
  proposalActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Écrans étroits : les boutons passent à la ligne au lieu de déborder de la carte
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 8,
    paddingTop: 4,
  },
  proposalWaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  proposalWaBtnText: {
    color: "#1D6B45",
    fontSize: 11.5,
    fontWeight: "700",
  },
  proposalRejectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  proposalRejectBtnText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  proposalAcceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1D6B45",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  proposalAcceptBtnText: {
    fontSize: 11.5,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  proposalTermsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  proposalTermsText: {
    flex: 1,
    fontSize: 11.5,
    color: "#166534",
    fontWeight: "700",
  },
  proposalTermsTextPending: {
    color: "#B45309",
  },
  proposalCounterPending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  proposalCounterPendingText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "700",
    color: "#5B21B6",
  },
  proposalNegotiateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    backgroundColor: "#FAF5FF",
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 8,
  },
  proposalNegotiateBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6D28D9",
  },

  /* Retard Vol GP */
  delayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  delayBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  delayCardNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  delayNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  delayNoticeReason: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
  },

  /* Notes & Motifs lors de l'acceptation / refus */
  modalNoteContainer: {
    width: "100%",
    marginTop: 12,
    marginBottom: 8,
  },
  modalNoteLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  modalNoteInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 64,
    textAlignVertical: "top",
  },
  motifBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  motifText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    lineHeight: 16,
    fontWeight: "500",
  },
  motifTextRefuse: {
    color: "#991B1B",
  },
});

