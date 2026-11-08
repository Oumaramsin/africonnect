import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  Modal,
  RefreshControl,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Traiteur, TraiteurRequest } from "../../utils/types/traiteur";
import { apiFetch, getApiErrorMessage, getErrorMessage, isNetworkError } from "../../utils/api";
import { getSecureToken } from "../../utils/storage";
import AppKeyboardScrollView from "../../components/AppKeyboardScrollView";
import { PROPOSALS_UPDATED_EVENT } from "../../utils/appEvents";
import { formatEuros, getNegociation, hasPendingCounterOffer } from "../../utils/negociation";
import LoadErrorState from "../../components/LoadErrorState";

const CUISINE_FILTERS = [
  "Toutes",
  "Sénégal",
  "Côte d'Ivoire",
  "Cameroun",
  "Mali",
  "Congo",
  "Guinée",
  "Afrique de l'Ouest",
];

/** Échec de chargement affichable : message en français et nature (connexion ou réponse de l'API). */
type LoadError = { message: string; offline: boolean };

const toLoadError = (err: unknown, fallback: string): LoadError => ({
  message: getErrorMessage(err, fallback),
  offline: isNetworkError(err),
});

/**
 * Organisateur d'une annonce : l'API ne transmet plus aux traiteurs que « Prénom N. » et la ville
 * du client (ni nom complet, ni coordonnées) ; tous ces champs peuvent donc manquer.
 */
const getClientDisplayName = (req: TraiteurRequest): string =>
  req.client?.full_name?.trim() || "Organisateur";

/** Initiales affichées dans la pastille (« Awa D. » → « AD »). */
const getInitials = (name: string): string => {
  const initials = name
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return (initials || "CL").toUpperCase();
};

export default function TraiteurScreen() {
  const router = useRouter();
  // Ouverture depuis une notification d'offre (contre-proposition...) : onglet des annonces
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<"traiteurs" | "demandes">(
    params.tab === "demandes" ? "demandes" : "traiteurs",
  );
  const [traiteurs, setTraiteurs] = useState<Traiteur[]>([]);
  const [requests, setRequests] = useState<TraiteurRequest[]>([]);
  const [loadingTraiteurs, setLoadingTraiteurs] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  // Échecs de chargement ; *Loaded indique qu'une liste a déjà été reçue (elle reste alors affichée)
  const [traiteursError, setTraiteursError] = useState<LoadError | null>(null);
  const [requestsError, setRequestsError] = useState<LoadError | null>(null);
  const [traiteursLoaded, setTraiteursLoaded] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("Toutes");
  const [showCuisineModal, setShowCuisineModal] = useState(false);

  // Comptage dynamique des chefs par cuisine
  const cuisineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CUISINE_FILTERS.forEach((c) => {
      if (c === "Toutes") {
        counts[c] = traiteurs.length;
      } else {
        counts[c] = traiteurs.filter((t) =>
          t.cuisine_type?.some((ct) => ct.toLowerCase().includes(c.toLowerCase()))
        ).length;
      }
    });
    return counts;
  }, [traiteurs]);

  // Détection du rôle traiteur & propositions déjà envoyées
  const [isTraiteurUser, setIsTraiteurUser] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);

  // Les annonces ne sont proposées qu'aux traiteurs : les autres restent sur la liste des chefs
  const currentTab = isTraiteurUser ? activeTab : "traiteurs";

  // Chargement des traiteurs (silent : rafraîchissement sans indicateur plein écran)
  const fetchTraiteurs = useCallback(async (silent = false) => {
    if (!silent) setLoadingTraiteurs(true);
    try {
      const response = await apiFetch("/traiteur");
      const data = await response.json();
      if (!response.ok) {
        setTraiteursError({
          message: getApiErrorMessage(data, "Impossible de charger les traiteurs pour le moment."),
          offline: false,
        });
        return;
      }
      setTraiteurs(data.data?.activeTraiteur || []);
      setTraiteursLoaded(true);
      setTraiteursError(null);
    } catch (err) {
      console.error("Erreur chargement traiteurs:", err);
      setTraiteursError(toLoadError(err, "Impossible de charger les traiteurs pour le moment."));
    } finally {
      setLoadingTraiteurs(false);
    }
  }, []);

  // Chargement des annonces de devis : réservé aux traiteurs connectés (401/403 pour les autres)
  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setLoadingRequests(true);
    try {
      const response = await apiFetch("/traiteur/requests");
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        // Plus de profil traiteur (ou session expirée) : la section est simplement masquée
        setIsTraiteurUser(false);
        setActiveTab("traiteurs");
        setRequests([]);
        setRequestsError(null);
        return;
      }
      if (!response.ok) {
        setRequestsError({
          message: getApiErrorMessage(data, "Impossible de charger les annonces pour le moment."),
          offline: false,
        });
        return;
      }
      setRequests(data.data?.requests || []);
      setRequestsLoaded(true);
      setRequestsError(null);
    } catch (err) {
      console.error("Erreur chargement demandes devis:", err);
      setRequestsError(toLoadError(err, "Impossible de charger les annonces pour le moment."));
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // Propositions déjà envoyées par le traiteur (pour ne pas proposer deux fois la même annonce)
  const fetchSentProposals = useCallback(async () => {
    try {
      const propRes = await apiFetch("/traiteur/proposals/me");
      if (!propRes.ok) return;
      const propData = await propRes.json();
      setSentRequestIds((propData.data?.proposals || []).map((p: any) => p.request_id));
    } catch (err) {
      // Liste conservée : l'API refuse de toute façon une proposition en double
      console.warn("Erreur chargement propositions envoyées:", err);
    }
  }, []);

  /**
   * Profil traiteur de l'utilisateur : seule une réponse de /traiteur/me confirmant le profil ouvre
   * l'accès aux annonces. Un invité n'appelle jamais /traiteur/requests (un 401 le déconnecterait).
   */
  const loadTraiteurAccess = useCallback(
    async (silent = false) => {
      try {
        const token = await getSecureToken("token");
        if (!token) {
          setIsTraiteurUser(false);
          return;
        }
        const meRes = await apiFetch("/traiteur/me");
        // Réponse inattendue : l'état courant est conservé jusqu'au prochain essai
        if (!meRes.ok) return;
        const meData = await meRes.json();
        if (!meData?.isTraiteur) {
          setIsTraiteurUser(false);
          setActiveTab("traiteurs");
          setRequests([]);
          return;
        }
        setIsTraiteurUser(true);
        await Promise.all([fetchRequests(silent), fetchSentProposals()]);
      } catch (err) {
        // Vérification impossible (connexion) : les annonces restent masquées jusqu'au prochain essai
        console.warn("Vérification du profil traiteur impossible:", err);
      }
    },
    [fetchRequests, fetchSentProposals],
  );

  const loadAll = useCallback(
    async (silent = false) => {
      await Promise.all([fetchTraiteurs(silent), loadTraiteurAccess(silent)]);
    },
    [fetchTraiteurs, loadTraiteurAccess],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Retour sur l'écran (après une réponse, un devis envoyé ailleurs) : annonces relues sans écran d'attente
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      void loadTraiteurAccess(true);
    }, [loadTraiteurAccess]),
  );

  // Devis envoyé depuis l'écran de proposition : annonces et propositions envoyées mises à jour
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(PROPOSALS_UPDATED_EVENT, () => {
      void fetchSentProposals();
      void fetchRequests(true);
    });
    return () => subscription.remove();
  }, [fetchSentProposals, fetchRequests]);

  // Tirer pour rafraîchir : les listes affichées restent visibles pendant le chargement
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  // Filtrage des traiteurs
  const filteredTraiteurs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return traiteurs.filter((t) => {
      const matchesQuery =
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.bio?.toLowerCase().includes(query) ||
        t.delivery_zones?.some((z) => z.toLowerCase().includes(query)) ||
        t.cuisine_type?.some((c) => c.toLowerCase().includes(query));

      const matchesCuisine =
        selectedCuisine === "Toutes" ||
        t.cuisine_type?.some((c) => c.toLowerCase().includes(selectedCuisine.toLowerCase()));

      return matchesQuery && matchesCuisine;
    });
  }, [traiteurs, searchQuery, selectedCuisine]);

  // Filtrage des demandes de devis
  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesQuery =
        !query ||
        r.title?.toLowerCase().includes(query) ||
        r.event_type?.toLowerCase().includes(query) ||
        r.location?.toLowerCase().includes(query) ||
        r.client?.city?.toLowerCase().includes(query) ||
        r.food_preferences?.toLowerCase().includes(query);

      return matchesQuery;
    });
  }, [requests, searchQuery]);

  // Un double appui n'empile pas deux fois le même écran
  const navLockRef = useRef(false);
  const navigateOnce = (href: Parameters<typeof router.push>[0]) => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    router.push(href);
    setTimeout(() => {
      navLockRef.current = false;
    }, 800);
  };

  // Proposition de devis : écran dédié (prix, acompte, détail de l'offre, signature du traiteur). Seul
  // l'identifiant est transmis : l'écran relit l'annonce auprès de l'API.
  const openProposalScreen = (req: TraiteurRequest) => {
    navigateOnce({ pathname: "/traiteur/proposer" as any, params: { requestId: req.id } });
  };

  // Réponse à une contre-proposition du client : écran dédié (prix maintenu ou nouveau devis)
  const openNegotiation = (req: TraiteurRequest) => {
    navigateOnce({ pathname: "/traiteur/negociation" as any, params: { requestId: req.id } });
  };

  /** Offre déjà envoyée sur une annonce : état, négociation en cours et réponse attendue. */
  const renderOwnProposalStatus = (req: TraiteurRequest) => {
    // L'API ne renvoie à un traiteur que sa propre offre sur chaque annonce
    const own = req.proposals?.[0];
    const entries = getNegociation(own?.negociation);
    const lastEntry = entries[entries.length - 1];
    const price = own ? formatEuros(Number(own.proposed_price)) : null;

    if (own && own.status === "pending" && hasPendingCounterOffer(entries) && lastEntry) {
      return (
        <View style={styles.counterBox}>
          <View style={styles.counterHeader}>
            <Ionicons name="swap-vertical" size={14} color="#6D28D9" />
            <Text style={styles.counterTitle}>
              Contre-proposition : {formatEuros(lastEntry.prix)}
              <Text style={styles.counterSub}> (votre devis : {price})</Text>
            </Text>
          </View>
          {lastEntry.message ? (
            <Text style={styles.counterMessage} numberOfLines={3}>
              « {lastEntry.message} »
            </Text>
          ) : null}
          <TouchableOpacity style={styles.counterBtn} onPress={() => openNegotiation(req)} activeOpacity={0.85}>
            <Ionicons name="chatbubbles-outline" size={13} color="#FFFFFF" />
            <Text style={styles.counterBtnText}>Répondre au client</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (own?.status === "rejected") {
      return (
        <View style={styles.ownRequestRow}>
          <Ionicons name="close-circle-outline" size={15} color="#64748B" />
          <Text style={styles.ownRequestText}>Le client a décliné votre devis</Text>
        </View>
      );
    }

    const text = !own
      ? "Votre devis a été transmis à l'organisateur"
      : lastEntry?.type === "prix_maintenu"
        ? `Prix maintenu à ${price} : en attente du client`
        : lastEntry?.type === "nouveau_devis"
          ? `Nouveau devis de ${price} transmis au client`
          : `Votre devis de ${price} a été transmis à l'organisateur`;
    return (
      <View style={styles.alreadySentRow}>
        <Ionicons name="checkmark-circle" size={15} color="#059669" />
        <Text style={styles.alreadySentText}>{text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* ── 1. HEADER COMPACT (NAVIGATION, ONGLETS & RECHERCHE) ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push("/accueil")}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.backBtnText}>Accueil</Text>
            </TouchableOpacity>

            <View style={styles.heroPill}>
              <Ionicons name="sparkles" size={12} color="#D4870A" />
              <Text style={styles.heroPillText}>Gastronomie Africaine</Text>
            </View>
          </View>

          <Text style={styles.headerTitle}>Traiteurs & Chefs</Text>

          {/* Sélecteur d'Onglets Unifié (comme sur le Web) */}
          <View style={styles.tabBarContainer}>
            <TouchableOpacity
              style={[styles.tabButton, currentTab === "traiteurs" && styles.tabButtonActive]}
              onPress={() => setActiveTab("traiteurs")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="restaurant-outline"
                size={14}
                color={currentTab === "traiteurs" ? "#0B3B24" : "rgba(255,255,255,0.85)"}
              />
              <Text
                style={[styles.tabButtonText, currentTab === "traiteurs" && styles.tabButtonTextActive]}
              >
                Chefs & Traiteurs ({traiteurs.length})
              </Text>
            </TouchableOpacity>

            {/* Annonces des clients : onglet réservé aux traiteurs (profil vérifié par /traiteur/me) */}
            {isTraiteurUser && (
              <TouchableOpacity
                style={[styles.tabButton, currentTab === "demandes" && styles.tabButtonActive]}
                onPress={() => setActiveTab("demandes")}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={currentTab === "demandes" ? "#0B3B24" : "rgba(255,255,255,0.85)"}
                />
                <Text
                  style={[styles.tabButtonText, currentTab === "demandes" && styles.tabButtonTextActive]}
                >
                  Annonces de Devis ({requests.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── 2. BARRE DE RECHERCHE & BOUTON FILTRER COMPACTS (1 SEULE LIGNE !) ── */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchBarWrapper}>
              <Ionicons name="search-outline" size={16} color="#0B3B24" />
              <TextInput
                style={styles.searchInput}
                placeholder={
                  currentTab === "traiteurs"
                    ? "Rechercher chef, ville, plat..."
                    : "Rechercher événement, ville..."
                }
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {currentTab === "traiteurs" && (
              <TouchableOpacity
                style={[styles.filterBtn, selectedCuisine !== "Toutes" && styles.filterBtnActive]}
                onPress={() => setShowCuisineModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="options-outline"
                  size={15}
                  color={selectedCuisine !== "Toutes" ? "#0B3B24" : "#FFFFFF"}
                />
                <Text style={[styles.filterBtnText, selectedCuisine !== "Toutes" && styles.filterBtnTextActive]}>
                  {selectedCuisine === "Toutes" ? "Filtrer" : selectedCuisine}
                </Text>
                {selectedCuisine !== "Toutes" && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedCuisine("Toutes");
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={14} color="#0B3B24" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── 3. CONTENU PRINCIPAL PAR ONGLET ── */}
        <AppKeyboardScrollView
          style={styles.mainScrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
          extraScrollHeight={140}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1D6B45"
              colors={["#1D6B45"]}
            />
          }
        >
          {/* Action Publier une Demande de Devis (Dans le ScrollView pour ne plus saturer l'écran !) */}
          <TouchableOpacity
            style={styles.publishRequestBtn}
            onPress={() => router.push("/traiteur/demande")}
            activeOpacity={0.88}
          >
            <View style={styles.publishBtnLeft}>
              <View style={styles.publishIconCircle}>
                <Ionicons name="calendar" size={16} color="#1D6B45" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.publishBtnTitle}>Besoin d'un devis événement ?</Text>
                <Text style={styles.publishBtnSubtitle}>Publiez gratuitement votre recherche culinaire</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#1D6B45" />
          </TouchableOpacity>

          {/* Badges de réassurance */}
          <View style={styles.reassuranceRow}>
            <View style={styles.reassuranceItem}>
              <Ionicons name="shield-checkmark" size={12} color="#1D6B45" />
              <Text style={styles.reassuranceText}>Chefs vérifiés</Text>
            </View>
            <View style={styles.reassuranceItem}>
              <Ionicons name="restaurant" size={12} color="#D4870A" />
              <Text style={styles.reassuranceText}>100% fait maison</Text>
            </View>
            <View style={styles.reassuranceItem}>
              <Ionicons name="lock-closed" size={12} color="#1D6B45" />
              <Text style={styles.reassuranceText}>Devis signé en ligne</Text>
            </View>
          </View>

          {/* Actualisation échouée : la liste déjà chargée reste affichée, avec un message discret */}
          {currentTab === "traiteurs" && traiteursError && traiteursLoaded && !loadingTraiteurs && (
            <StaleDataNotice error={traiteursError} onRetry={handleRefresh} retrying={refreshing} />
          )}
          {currentTab === "demandes" && requestsError && requestsLoaded && !loadingRequests && (
            <StaleDataNotice error={requestsError} onRetry={handleRefresh} retrying={refreshing} />
          )}

          {currentTab === "traiteurs" ? (
            /* ── ONGLET 1 : CHEFS & TRAITEURS ── */
            loadingTraiteurs ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1D6B45" />
                <Text style={styles.loadingText}>Chargement des chefs partenaires...</Text>
              </View>
            ) : traiteursError && !traiteursLoaded ? (
              <LoadErrorState
                title="Impossible de charger les traiteurs"
                message={traiteursError.message}
                offline={traiteursError.offline}
                onRetry={() => loadAll()}
                style={styles.loadErrorBox}
              />
            ) : filteredTraiteurs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="restaurant-outline" size={38} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>
                  {traiteurs.length === 0 ? "Aucun traiteur disponible" : "Aucun traiteur trouvé"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {traiteurs.length === 0
                    ? "Aucun chef partenaire n'est disponible pour le moment. Revenez bientôt !"
                    : "Aucun traiteur ne correspond à vos critères de recherche."}
                </Text>
                {(searchQuery.length > 0 || selectedCuisine !== "Toutes") && (
                  <TouchableOpacity
                    style={styles.resetFiltersBtn}
                    onPress={() => {
                      setSearchQuery("");
                      setSelectedCuisine("Toutes");
                    }}
                  >
                    <Text style={styles.resetFiltersBtnText}>Réinitialiser les filtres</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredTraiteurs.map((traiteur) => {
                const availableDishesCount =
                  traiteur.dishes?.filter((d) => d.is_available).length || 0;

                return (
                  <TouchableOpacity
                    key={traiteur.id}
                    style={styles.traiteurCard}
                    onPress={() => router.push(`/traiteur/${traiteur.id}`)}
                    activeOpacity={0.9}
                  >
                    {/* Photo de couverture */}
                    <View style={styles.cardCoverBg}>
                      {traiteur.image_url ? (
                        <Image
                          source={{ uri: traiteur.image_url }}
                          style={styles.cardCoverImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.fallbackCover}>
                          <Ionicons name="restaurant" size={36} color="#1D6B45" />
                        </View>
                      )}

                      {/* Pastille Chef Vérifié en haut à gauche */}
                      <View style={styles.verifiedFloatingBadge}>
                        <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
                        <Text style={styles.verifiedBadgeText}>Chef Vérifié</Text>
                      </View>

                      {/* Note & Avis en badge flottant en haut à droite */}
                      <View style={styles.ratingFloatingBadge}>
                        <Ionicons name="star" size={12} color="#EAB308" />
                        <Text style={styles.ratingValueText}>
                          {traiteur.review_count === 0 ? "Nouveau" : Number(traiteur.rating || 5).toFixed(1)}
                        </Text>
                        {traiteur.review_count > 0 && (
                          <Text style={styles.ratingCountText}>({traiteur.review_count})</Text>
                        )}
                      </View>

                      {/* Avatar flottant du Chef */}
                      <View style={styles.floatingChefAvatar}>
                        {traiteur.image_url ? (
                          <Image
                            source={{ uri: traiteur.image_url }}
                            style={styles.chefAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="restaurant-outline" size={20} color="#1D6B45" />
                        )}
                      </View>
                    </View>

                    {/* Détails du traiteur */}
                    <View style={styles.cardDetails}>
                      <Text style={styles.traiteurName}>{traiteur.name}</Text>
                      {Boolean(traiteur.bio) && (
                        <Text style={styles.traiteurBio} numberOfLines={2}>
                          {traiteur.bio}
                        </Text>
                      )}

                      {/* Aperçu des spécialités culinaires */}
                      {traiteur.dishes && traiteur.dishes.length > 0 && (
                        <View style={styles.specialtiesBox}>
                          <Text style={styles.specialtiesLabel}>SPÉCIALITÉS AU MENU :</Text>
                          <View style={styles.specialtiesList}>
                            {traiteur.dishes.slice(0, 2).map((dish) => (
                              <View key={dish.id} style={styles.specialtyPill}>
                                <Text style={styles.specialtyName} numberOfLines={1}>
                                  {dish.name}
                                </Text>
                                <Text style={styles.specialtyPrice}>
                                  {Number(dish.price).toFixed(2)} €
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Zones de livraison */}
                      {traiteur.delivery_zones && traiteur.delivery_zones.length > 0 && (
                        <View style={styles.zonesRow}>
                          <Ionicons name="location-outline" size={13} color="#1D6B45" />
                          <Text style={styles.zonesText} numberOfLines={1}>
                            {traiteur.delivery_zones.slice(0, 3).join(" • ")}
                          </Text>
                        </View>
                      )}

                      {/* Tags de spécialités culinaires */}
                      {traiteur.cuisine_type && traiteur.cuisine_type.length > 0 && (
                        <View style={styles.cuisineTagsRow}>
                          {traiteur.cuisine_type.slice(0, 3).map((cuisine) => (
                            <View key={cuisine} style={styles.cuisineTag}>
                              <Text style={styles.cuisineTagText}>{cuisine}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Footer d'action */}
                      <View style={styles.cardFooter}>
                        <View style={styles.dishesAvailableInfo}>
                          <Ionicons name="restaurant-outline" size={13} color="#64748B" />
                          <Text style={styles.dishesAvailableText}>
                            {availableDishesCount} plats au menu
                          </Text>
                        </View>

                        <View style={styles.discoverBtn}>
                          <Text style={styles.discoverBtnText}>Voir le menu & devis</Text>
                          <Ionicons name="chevron-forward" size={14} color="#1D6B45" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          ) : (
            /* ── ONGLET 2 : ANNONCES DE DEVIS & ÉVÉNEMENTS (traiteurs uniquement) ── */
            loadingRequests ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1D6B45" />
                <Text style={styles.loadingText}>Chargement des annonces d'événements...</Text>
              </View>
            ) : requestsError && !requestsLoaded ? (
              <LoadErrorState
                title="Impossible de charger les annonces"
                message={requestsError.message}
                offline={requestsError.offline}
                onRetry={() => fetchRequests()}
                style={styles.loadErrorBox}
              />
            ) : filteredRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>
                  {requests.length === 0 ? "Aucune annonce ouverte" : "Aucune annonce trouvée"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {requests.length === 0
                    ? "Les nouvelles recherches de traiteur publiées par les clients apparaîtront ici."
                    : "Aucune annonce ne correspond à votre recherche."}
                </Text>
              </View>
            ) : (
              filteredRequests.map((req) => {
                const clientName = getClientDisplayName(req);
                const eventDate = req.event_date ? new Date(req.event_date) : null;
                const hasEventDate = Boolean(eventDate && !isNaN(eventDate.getTime()));

                return (
                  <View key={req.id} style={styles.requestCard}>
                    {/* Header : Client + Type d'événement */}
                    <View style={styles.requestCardHeader}>
                      <View style={styles.clientAvatarBox}>
                        {req.client?.avatar_url ? (
                          <Image
                            source={{ uri: req.client.avatar_url }}
                            style={styles.clientAvatarImage}
                          />
                        ) : (
                          <Text style={styles.clientAvatarInitials}>{getInitials(clientName)}</Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestTitle}>
                          {req.title || `Événement ${req.event_type || ""}`.trim()}
                        </Text>
                        <View style={styles.clientSubRow}>
                          <Text style={styles.requestAuthor}>{clientName}</Text>
                          <Text style={styles.dotSeparator}>•</Text>
                          <Ionicons name="location-outline" size={11} color="#64748B" />
                          <Text style={styles.requestLocationText} numberOfLines={1}>
                            {req.location || req.client?.city || "Lieu à préciser"}
                          </Text>
                        </View>
                      </View>

                      {Boolean(req.event_type) && (
                        <View style={styles.eventTypeBadge}>
                          <Text style={styles.eventTypeBadgeText}>{req.event_type}</Text>
                        </View>
                      )}
                    </View>

                    {/* Informations clés : Date, Nombre de personnes, Budget */}
                    <View style={styles.requestMetaGrid}>
                      <View style={styles.requestMetaCol}>
                        <Ionicons name="calendar-outline" size={13} color="#1D6B45" />
                        <Text style={styles.requestMetaText}>
                          {hasEventDate && eventDate
                            ? eventDate.toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                              })
                            : "Date à définir"}
                        </Text>
                      </View>
                      <View style={styles.requestMetaCol}>
                        <Ionicons name="people-outline" size={13} color="#1D6B45" />
                        <Text style={styles.requestMetaText}>{req.guest_count || "?"} pers.</Text>
                      </View>
                      <View style={styles.requestMetaCol}>
                        <Ionicons name="cash-outline" size={13} color="#D4870A" />
                        <Text style={[styles.requestMetaText, { color: "#166534", fontWeight: "800" }]}>
                          {req.budget ? `${Number(req.budget).toFixed(0)} €` : "À définir"}
                        </Text>
                      </View>
                    </View>

                    {/* Description et préférences */}
                    <View style={styles.requestDetailsBox}>
                      {Boolean(req.description) && (
                        <Text style={styles.requestDescText} numberOfLines={2}>
                          {req.description}
                        </Text>
                      )}
                      {Boolean(req.food_preferences) && (
                        <View style={styles.requestPrefRow}>
                          <Ionicons name="restaurant-outline" size={12} color="#64748B" />
                          <Text style={styles.requestPrefValue} numberOfLines={1}>
                            Souhaits : {req.food_preferences}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action ou Statut traiteur */}
                    {(req.proposals?.length ?? 0) > 0 || sentRequestIds.includes(req.id) ? (
                      renderOwnProposalStatus(req)
                    ) : req.is_own ? (
                      <View style={styles.ownRequestRow}>
                        <Ionicons name="person-circle-outline" size={15} color="#64748B" />
                        <Text style={styles.ownRequestText}>Votre annonce : vous ne pouvez pas y répondre</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.proposeBtn}
                        onPress={() => openProposalScreen(req)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="send" size={13} color="#FFFFFF" />
                        <Text style={styles.proposeBtnText}>Faire une proposition de devis</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )
          )}
        </AppKeyboardScrollView>

        {/* ── MODALE DE FILTRAGE PAR SPÉCIALITÉ / PAYS (STYLE WEB) ── */}
        <Modal
          visible={showCuisineModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCuisineModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModalCard}>
              <View style={styles.filterModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterModalTitle}>Filtrer par pays & spécialité</Text>
                  <Text style={styles.filterModalSubtitle}>
                    Sélectionnez l'origine culinaire de votre choix
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.filterModalCloseBtn}
                  onPress={() => setShowCuisineModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.filterModalOptionsList} showsVerticalScrollIndicator={false}>
                {CUISINE_FILTERS.map((cuisine) => {
                  const count = cuisineCounts[cuisine] ?? 0;
                  const isSelected = selectedCuisine === cuisine;
                  return (
                    <TouchableOpacity
                      key={cuisine}
                      style={[styles.filterOptionRow, isSelected && styles.filterOptionRowSelected]}
                      onPress={() => {
                        setSelectedCuisine(cuisine);
                        setShowCuisineModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={18}
                          color={isSelected ? "#0B3B24" : "#94A3B8"}
                        />
                        <Text style={[styles.filterOptionLabel, isSelected && styles.filterOptionLabelSelected]}>
                          {cuisine}
                        </Text>
                      </View>
                      <View style={[styles.filterOptionBadge, isSelected && styles.filterOptionBadgeSelected]}>
                        <Text style={[styles.filterOptionBadgeText, isSelected && styles.filterOptionBadgeTextSelected]}>
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedCuisine !== "Toutes" && (
                <TouchableOpacity
                  style={styles.filterResetBtn}
                  onPress={() => {
                    setSelectedCuisine("Toutes");
                    setShowCuisineModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={15} color="#B91C1C" />
                  <Text style={styles.filterResetBtnText}>Réinitialiser le filtre</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

/** Message discret : l'actualisation a échoué, la liste déjà chargée reste affichée. */
function StaleDataNotice({
  error,
  onRetry,
  retrying,
}: {
  error: LoadError;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <View style={styles.staleNotice}>
      <Ionicons
        name={error.offline ? "cloud-offline-outline" : "alert-circle-outline"}
        size={16}
        color="#B45309"
      />
      <Text style={styles.staleNoticeText}>Liste non actualisée. {error.message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        disabled={retrying}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {retrying ? (
          <ActivityIndicator size="small" color="#B45309" />
        ) : (
          <Text style={styles.staleNoticeRetry}>Réessayer</Text>
        )}
      </TouchableOpacity>
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
  headerCard: {
    backgroundColor: "#0B3B24",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heroPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 14,
    padding: 3,
    gap: 4,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.75)",
  },
  tabButtonTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    padding: 0,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
  },
  filterBtnActive: {
    backgroundColor: "#E5A93C",
    borderColor: "#E5A93C",
  },
  filterBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  filterBtnTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  publishRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(29, 107, 69, 0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  publishBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  publishIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  publishBtnTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  publishBtnSubtitle: {
    color: "#64748B",
    fontSize: 11,
  },
  reassuranceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reassuranceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reassuranceText: {
    color: "#475569",
    fontSize: 10.5,
    fontWeight: "700",
  },

  /* ── Filter Modal Bottom Sheet ── */
  filterModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: "80%",
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  filterModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  filterModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  filterModalOptionsList: {
    maxHeight: 340,
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  filterOptionRowSelected: {
    backgroundColor: "#F0FDF4",
  },
  filterOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  filterOptionLabelSelected: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  filterOptionBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterOptionBadgeSelected: {
    backgroundColor: "#DCFCE7",
  },
  filterOptionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  filterOptionBadgeTextSelected: {
    color: "#0B3B24",
    fontWeight: "800",
  },
  filterResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
  },
  filterResetBtnText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },
  cuisinePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  cuisinePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
  },
  resetFiltersBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1D6B45",
  },
  resetFiltersBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  loadErrorBox: {
    paddingHorizontal: 0,
    paddingVertical: 24,
  },
  staleNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  staleNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
    lineHeight: 16,
  },
  staleNoticeRetry: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "800",
  },
  traiteurCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardCoverBg: {
    height: 130,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  cardCoverImage: {
    width: "100%",
    height: "100%",
  },
  fallbackCover: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  ratingFloatingBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingValueText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  ratingCountText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
  },
  verifiedFloatingBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(29, 107, 69, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  floatingChefAvatar: {
    position: "absolute",
    bottom: -16,
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    overflow: "hidden",
    zIndex: 10,
  },
  chefAvatarImage: {
    width: "100%",
    height: "100%",
  },
  cardDetails: {
    padding: 14,
    paddingTop: 20,
    gap: 6,
  },
  traiteurName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  traiteurBio: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  specialtiesBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 8,
    gap: 5,
    marginTop: 2,
  },
  specialtiesLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  specialtiesList: {
    gap: 4,
  },
  specialtyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  specialtyName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    marginRight: 6,
  },
  specialtyPrice: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  zonesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  zonesText: {
    fontSize: 11,
    color: "#1D6B45",
    fontWeight: "600",
    flex: 1,
  },
  cuisineTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  cuisineTag: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  cuisineTagText: {
    fontSize: 10,
    color: "#166534",
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  dishesAvailableInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dishesAvailableText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  discoverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  discoverBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D6B45",
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  requestCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clientAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  clientAvatarImage: {
    width: "100%",
    height: "100%",
  },
  clientAvatarInitials: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
  },
  clientSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  dotSeparator: {
    fontSize: 10,
    color: "#94A3B8",
  },
  requestLocationText: {
    fontSize: 10,
    color: "#64748B",
    flex: 1,
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  requestAuthor: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },
  eventTypeBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  eventTypeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065F46",
  },
  requestMetaGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 8,
    gap: 10,
  },
  requestMetaCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  requestMetaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  requestDetailsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  requestDescText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
  },
  requestPrefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  requestPrefValue: {
    fontSize: 11,
    color: "#1E293B",
    lineHeight: 16,
    flex: 1,
  },
  alreadySentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  alreadySentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  counterBox: {
    backgroundColor: "#FAF5FF",
    borderColor: "#DDD6FE",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  counterHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  counterTitle: { flex: 1, fontSize: 12.5, fontWeight: "800", color: "#4C1D95" },
  counterSub: { fontSize: 11.5, fontWeight: "600", color: "#6D28D9" },
  counterMessage: { fontSize: 12, color: "#334155", fontStyle: "italic", lineHeight: 17 },
  counterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6D28D9",
    borderRadius: 10,
    paddingVertical: 9,
  },
  counterBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  ownRequestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  ownRequestText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  proposeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1D6B45",
    borderRadius: 12,
    paddingVertical: 10,
  },
  proposeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
});
