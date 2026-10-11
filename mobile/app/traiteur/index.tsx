import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Traiteur, TraiteurRequest } from "../../utils/types/traiteur";
import { apiFetch } from "../../utils/api";
import { getSecureToken } from "../../utils/storage";

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

export default function TraiteurScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"traiteurs" | "demandes">("traiteurs");
  const [traiteurs, setTraiteurs] = useState<Traiteur[]>([]);
  const [requests, setRequests] = useState<TraiteurRequest[]>([]);
  const [loadingTraiteurs, setLoadingTraiteurs] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
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

  // Proposition de devis (si l'utilisateur est traiteur et répond à une demande)
  const [selectedRequestForProposal, setSelectedRequestForProposal] = useState<TraiteurRequest | null>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [sendingProposal, setSendingProposal] = useState(false);

  // Chargement des traiteurs
  const fetchTraiteurs = useCallback(async () => {
    setLoadingTraiteurs(true);
    try {
      const response = await apiFetch("/traiteur");
      if (response.ok) {
        const data = await response.json();
        setTraiteurs(data.data?.activeTraiteur || []);
      }
    } catch (err) {
      console.error("Erreur chargement traiteurs:", err);
    } finally {
      setLoadingTraiteurs(false);
    }
  }, []);

  // Chargement des demandes de devis
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const response = await apiFetch("/traiteur/requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data?.requests || []);
      }
    } catch (err) {
      console.error("Erreur chargement demandes devis:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchTraiteurs();
    fetchRequests();
  }, [fetchTraiteurs, fetchRequests]);

  // Détection profil traiteur et propositions déjà envoyées
  useEffect(() => {
    (async () => {
      try {
        const token = await getSecureToken("token");
        if (!token) return;
        const meRes = await apiFetch("/traiteur/me");
        if (!meRes.ok) return;
        const meData = await meRes.json();
        if (meData?.isTraiteur) {
          setIsTraiteurUser(true);
          const propRes = await apiFetch("/traiteur/proposals/me");
          if (propRes.ok) {
            const propData = await propRes.json();
            setSentRequestIds((propData.data?.proposals || []).map((p: any) => p.request_id));
          }
        }
      } catch {
        // silencieux
      }
    })();
  }, []);

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
        r.event_type.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query) ||
        r.food_preferences.toLowerCase().includes(query);

      return matchesQuery;
    });
  }, [requests, searchQuery]);

  // Envoi d'une proposition tarifaire par un traiteur
  const handleSendProposal = async () => {
    if (!selectedRequestForProposal) return;
    const numPrice = parseFloat(proposedPrice.replace(",", "."));
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert("Montant invalide", "Veuillez saisir un tarif proposé valide en euros.");
      return;
    }
    if (!proposalMessage.trim()) {
      Alert.alert("Message requis", "Veuillez préciser votre offre ou le menu proposé.");
      return;
    }

    setSendingProposal(true);
    try {
      const res = await apiFetch(`/traiteur/requests/${selectedRequestForProposal.id}/proposals`, {
        method: "POST",
        body: JSON.stringify({
          proposed_price: numPrice,
          message: proposalMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors de l'envoi de la proposition.");
      }

      setSentRequestIds((prev) => [...prev, selectedRequestForProposal.id]);
      Alert.alert("Proposition transmise", "Votre devis a été envoyé à l'organisateur avec succès !");
      setSelectedRequestForProposal(null);
      setProposedPrice("");
      setProposalMessage("");
      fetchRequests();
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible d'envoyer la proposition.");
    } finally {
      setSendingProposal(false);
    }
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

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
              style={[styles.tabButton, activeTab === "traiteurs" && styles.tabButtonActive]}
              onPress={() => setActiveTab("traiteurs")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="restaurant-outline"
                size={14}
                color={activeTab === "traiteurs" ? "#0B3B24" : "rgba(255,255,255,0.85)"}
              />
              <Text
                style={[styles.tabButtonText, activeTab === "traiteurs" && styles.tabButtonTextActive]}
              >
                Chefs & Traiteurs ({traiteurs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "demandes" && styles.tabButtonActive]}
              onPress={() => setActiveTab("demandes")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="document-text-outline"
                size={14}
                color={activeTab === "demandes" ? "#0B3B24" : "rgba(255,255,255,0.85)"}
              />
              <Text
                style={[styles.tabButtonText, activeTab === "demandes" && styles.tabButtonTextActive]}
              >
                Annonces de Devis ({requests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 2. BARRE DE RECHERCHE & BOUTON FILTRER COMPACTS (1 SEULE LIGNE !) ── */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchBarWrapper}>
              <Ionicons name="search-outline" size={16} color="#0B3B24" />
              <TextInput
                style={styles.searchInput}
                placeholder={
                  activeTab === "traiteurs"
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

            {activeTab === "traiteurs" && (
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
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
              <Text style={styles.reassuranceText}>Séquestre Dabari</Text>
            </View>
          </View>
          {activeTab === "traiteurs" ? (
            /* ── ONGLET 1 : CHEFS & TRAITEURS ── */
            loadingTraiteurs ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1D6B45" />
                <Text style={styles.loadingText}>Chargement des chefs partenaires...</Text>
              </View>
            ) : filteredTraiteurs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="restaurant-outline" size={38} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>Aucun traiteur trouvé</Text>
                <Text style={styles.emptySubtitle}>
                  Aucun traiteur ne correspond à vos critères de recherche.
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
            /* ── ONGLET 2 : ANNONCES DE DEVIS & ÉVÉNEMENTS ── */
            loadingRequests ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1D6B45" />
                <Text style={styles.loadingText}>Chargement des annonces d'événements...</Text>
              </View>
            ) : filteredRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>Aucune annonce publiée</Text>
                <Text style={styles.emptySubtitle}>
                  Soyez le premier à publier une recherche de traiteur pour votre événement !
                </Text>
                <TouchableOpacity
                  style={styles.publishFirstBtn}
                  onPress={() => router.push("/traiteur/demande")}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.publishFirstBtnText}>Publier ma demande</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredRequests.map((req) => (
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
                        <Text style={styles.clientAvatarInitials}>
                          {req.client?.full_name?.slice(0, 2).toUpperCase() || "CL"}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestTitle}>{req.title || `Événement ${req.event_type}`}</Text>
                      <View style={styles.clientSubRow}>
                        <Text style={styles.requestAuthor}>
                          {req.client?.full_name || "Organisateur"}
                        </Text>
                        <Text style={styles.dotSeparator}>•</Text>
                        <Ionicons name="location-outline" size={11} color="#64748B" />
                        <Text style={styles.requestLocationText} numberOfLines={1}>
                          {req.location}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.eventTypeBadge}>
                      <Text style={styles.eventTypeBadgeText}>{req.event_type}</Text>
                    </View>
                  </View>

                  {/* Informations clés : Date, Nombre de personnes, Budget */}
                  <View style={styles.requestMetaGrid}>
                    <View style={styles.requestMetaCol}>
                      <Ionicons name="calendar-outline" size={13} color="#1D6B45" />
                      <Text style={styles.requestMetaText}>
                        {new Date(req.event_date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
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
                    <View style={styles.requestPrefRow}>
                      <Ionicons name="restaurant-outline" size={12} color="#64748B" />
                      <Text style={styles.requestPrefValue} numberOfLines={1}>
                        Souhaits : {req.food_preferences}
                      </Text>
                    </View>
                  </View>

                  {/* Action ou Statut traiteur */}
                  {sentRequestIds.includes(req.id) ? (
                    <View style={styles.alreadySentRow}>
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text style={styles.alreadySentText}>Votre devis a été transmis à l'organisateur</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.proposeBtn}
                      onPress={() => setSelectedRequestForProposal(req)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="send" size={13} color="#FFFFFF" />
                      <Text style={styles.proposeBtnText}>Faire une proposition de devis</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )
          )}
        </ScrollView>

        {/* ── 4. MODALE DE RÉPONSE / PROPOSITION TRAITEUR ── */}
        {selectedRequestForProposal && (
          <Modal
            transparent
            animationType="slide"
            visible={Boolean(selectedRequestForProposal)}
            onRequestClose={() => setSelectedRequestForProposal(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Proposer un Devis</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedRequestForProposal.title || `Événement ${selectedRequestForProposal.event_type}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedRequestForProposal(null)}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  <Text style={styles.modalLabel}>Votre proposition tarifaire (€ TTC) :</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="Ex: 1800"
                    placeholderTextColor="#94A3B8"
                    value={proposedPrice}
                    onChangeText={setProposedPrice}
                  />

                  <Text style={[styles.modalLabel, { marginTop: 10 }]}>Votre message & détails du menu :</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 90, textAlignVertical: "top" }]}
                    multiline
                    placeholder="Précisez les entrées, plats, desserts, matériel ou service inclus..."
                    placeholderTextColor="#94A3B8"
                    value={proposalMessage}
                    onChangeText={setProposalMessage}
                  />

                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setSelectedRequestForProposal(null)}
                    >
                      <Text style={styles.modalCancelBtnText}>Annuler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalSubmitBtn}
                      onPress={handleSendProposal}
                      disabled={sendingProposal}
                    >
                      {sendingProposal ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.modalSubmitBtnText}>Transmettre l'offre</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        )}

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
  publishFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1D6B45",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
  },
  publishFirstBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
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
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalForm: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: "#1D6B45",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
