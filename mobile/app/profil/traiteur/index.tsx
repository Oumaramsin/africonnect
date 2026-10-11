import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Modal,
  ActivityIndicator,
  Linking,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../../utils/storage";
import { apiFetch } from "../../../utils/api";

type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  cuisine_type: string;
  is_available: boolean;
  image_urls?: string[];
};

type TraiteurProfile = {
  id: string;
  name: string;
  bio: string;
  cuisine_type: string[];
  delivery_zones: string[];
  is_active: boolean;
  image_url?: string;
  whatsapp?: string;
  rating?: number;
  review_count?: number;
};

export default function TraiteurEspaceScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"plats" | "profil">("plats");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [traiteur, setTraiteur] = useState<TraiteurProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);

  const [dishToDelete, setDishToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTraiteur();
    }, []),
  );

  async function loadTraiteur() {
    setLoading(true);
    setError(null);
    const token = await getSecureToken("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await apiFetch("/traiteur/me");
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error ||
            data.message ||
            "Erreur lors de la récupération du profil traiteur.",
        );
        setLoading(false);
        return;
      }
      if (data.isTraiteur && data.traiteur) {
        setTraiteur(data.traiteur);
        setDishes(data.traiteur.dishes || []);
      } else {
        router.replace("/profil/traiteur/create" as any);
      }
    } catch (err: any) {
      console.error(err);
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability(dishId: string, current: boolean) {
    setError(null);
    // Optimistic update
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, is_available: !current } : d)),
    );

    try {
      const response = await apiFetch(`/traiteur/dishes/${dishId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: !current }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Rollback on failure
        setDishes((prev) =>
          prev.map((d) => (d.id === dishId ? { ...d, is_available: current } : d)),
        );
        setError(
          data.error ||
            data.message ||
            "Erreur lors de la mise à jour de la disponibilité.",
        );
      }
    } catch (e) {
      console.error("Erreur toggle disponibilité:", e);
      setDishes((prev) =>
        prev.map((d) => (d.id === dishId ? { ...d, is_available: current } : d)),
      );
      setError("Impossible de modifier la disponibilité du plat.");
    }
  }

  async function toggleWorkshopStatus() {
    if (!traiteur || togglingStatus) return;
    const newStatus = !traiteur.is_active;
    setTogglingStatus(true);
    setError(null);

    // Optimistic update
    setTraiteur((prev) => (prev ? { ...prev, is_active: newStatus } : null));

    try {
      const response = await apiFetch("/traiteur/profile", {
        method: "PATCH",
        body: JSON.stringify({ is_active: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setTraiteur((prev) => (prev ? { ...prev, is_active: !newStatus } : null));
        setError(
          data.error ||
            data.message ||
            "Impossible de modifier le statut de l'atelier.",
        );
      }
    } catch (e) {
      setTraiteur((prev) => (prev ? { ...prev, is_active: !newStatus } : null));
      setError("Erreur de connexion au serveur.");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function confirmDeleteDish() {
    if (!dishToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      const response = await apiFetch(`/traiteur/dishes/${dishToDelete}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error ||
            data.message ||
            "Erreur lors de la suppression du plat.",
        );
        return;
      }
      setDishes((prev) => prev.filter((d) => d.id !== dishToDelete));
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError("Impossible de supprimer le plat. Vérifiez votre connexion.");
    } finally {
      setIsDeleting(false);
      setDishToDelete(null);
    }
  }

  function handleOpenWhatsapp() {
    if (!traiteur?.whatsapp) return;
    const cleanPhone = traiteur.whatsapp.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {
      setError("Impossible d'ouvrir l'application WhatsApp.");
    });
  }

  const availableDishesCount = dishes.filter((d) => d.is_available).length;
  const hiddenDishesCount = dishes.filter((d) => !d.is_available).length;

  if (loading) {
    return (
      <View style={[styles.topGreenWrapper, styles.centerLoader]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.initialLoadingText}>
          Chargement de votre atelier traiteur...
        </Text>
      </View>
    );
  }

  if (!traiteur && error) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />
          <View style={styles.headerTopBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push("/profil")}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backBtnText}>Mon compte</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.errorFullWrapper}>
            <View style={styles.errorFullCard}>
              <View style={styles.errorIconCircle}>
                <Ionicons name="alert-circle-outline" size={42} color="#DC2626" />
              </View>
              <Text style={styles.errorFullTitle}>
                Impossible de charger votre atelier
              </Text>
              <Text style={styles.errorFullSub}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => loadTraiteur()}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!traiteur) {
    return null;
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        {/* ── HEADER HERO VERT FORET (#0B3B24) ── */}
        <View style={styles.headerHero}>
          {/* Top navigation row */}
          <View style={styles.headerTopBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push("/profil")}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backBtnText}>Mon compte</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.publicPageQuickBtn}
              onPress={() => router.push(`/traiteur/${traiteur.id}` as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={15} color="#FFFFFF" />
              <Text style={styles.publicPageQuickText}>Ma vitrine</Text>
            </TouchableOpacity>
          </View>

          {/* Identity card */}
          <View style={styles.identityRow}>
            <View style={styles.avatarWrapper}>
              {traiteur.image_url ? (
                <Image
                  source={{ uri: traiteur.image_url }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="restaurant" size={28} color="#0B3B24" />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.identityInfo}>
              <View style={styles.identityTitleRow}>
                <Text style={styles.identityName} numberOfLines={1}>
                  {traiteur.name}
                </Text>
              </View>

              <View style={styles.badgesRow}>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#D4870A" />
                  <Text style={styles.verifiedBadgeText}>Partenaire Vérifié</Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    traiteur.is_active
                      ? styles.statusPillActive
                      : styles.statusPillInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      traiteur.is_active
                        ? styles.statusDotActive
                        : styles.statusDotInactive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      traiteur.is_active
                        ? styles.statusPillTextActive
                        : styles.statusPillTextInactive,
                    ]}
                  >
                    {traiteur.is_active ? "En ligne" : "En pause"}
                  </Text>
                </View>
              </View>

              {/* Subtitle / note */}
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingScore}>
                  {traiteur.rating != null ? Number(traiteur.rating).toFixed(1) : "5.0"}
                </Text>
                <Text style={styles.reviewCount}>
                  ({traiteur.review_count || dishes.length * 3 + 4} avis)
                </Text>
              </View>
            </View>
          </View>

          {/* Segmented control navigation */}
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === "plats" && styles.segmentBtnActive,
              ]}
              onPress={() => setActiveTab("plats")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="fast-food"
                size={16}
                color={activeTab === "plats" ? "#0B3B24" : "rgba(255, 255, 255, 0.75)"}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  activeTab === "plats" && styles.segmentBtnTextActive,
                ]}
              >
                Carte & Plats ({dishes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === "profil" && styles.segmentBtnActive,
              ]}
              onPress={() => setActiveTab("profil")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="storefront"
                size={16}
                color={activeTab === "profil" ? "#0B3B24" : "rgba(255, 255, 255, 0.75)"}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  activeTab === "profil" && styles.segmentBtnTextActive,
                ]}
              >
                Mon Atelier & Infos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CORPS DE PAGE (GRIS CLAIR #F8FAFC) ── */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.inlineErrorBox}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.inlineErrorText}>{error}</Text>
              <TouchableOpacity
                onPress={() => setError(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color="#B91C1C" />
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════
              ONGLET 1 : CARTE & PLATS
             ══════════════════════════════════════════ */}
          {activeTab === "plats" && (
            <View style={styles.tabContentContainer}>
              {/* KPIs Row */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiNumber}>{dishes.length}</Text>
                  <Text style={styles.kpiLabel}>Total plats</Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardGreen]}>
                  <Text style={[styles.kpiNumber, styles.kpiNumberGreen]}>
                    {availableDishesCount}
                  </Text>
                  <Text style={styles.kpiLabel}>Disponibles</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiNumber, styles.kpiNumberAmber]}>
                    {hiddenDishesCount}
                  </Text>
                  <Text style={styles.kpiLabel}>Masqués</Text>
                </View>
              </View>

              {/* Bouton Ajouter un plat */}
              <TouchableOpacity
                style={styles.addDishCTA}
                onPress={() => router.push("/profil/traiteur/dish" as any)}
                activeOpacity={0.85}
              >
                <View style={styles.addDishCTAIcons}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.addDishCTAText}>Ajouter un nouveau plat</Text>
              </TouchableOpacity>

              {/* Liste des plats */}
              {dishes.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="restaurant-outline" size={44} color="#0B3B24" />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    Votre carte est encore vide
                  </Text>
                  <Text style={styles.emptyStateSub}>
                    Ajoutez vos spécialités culinaires pour permettre aux clients
                    de commander vos menus sur Dabari.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateBtn}
                    onPress={() => router.push("/profil/traiteur/dish" as any)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyStateBtnText}>
                      Créer mon premier plat
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dishesList}>
                  {dishes.map((dish) => {
                    const hasImage = dish.image_urls && dish.image_urls.length > 0;
                    const imageUrl = hasImage ? dish.image_urls![0] : null;

                    return (
                      <View key={dish.id} style={styles.dishCard}>
                        <View style={styles.dishCardMainRow}>
                          {/* Image ou Placeholder */}
                          <View style={styles.dishImageContainer}>
                            {imageUrl ? (
                              <Image
                                source={{ uri: imageUrl }}
                                style={styles.dishImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.dishImageFallback}>
                                <Ionicons
                                  name="fast-food-outline"
                                  size={26}
                                  color="#94A3B8"
                                />
                              </View>
                            )}

                            {/* Badge Prix sur l'image */}
                            <View style={styles.dishPriceTag}>
                              <Text style={styles.dishPriceTagText}>
                                {Number(dish.price).toFixed(2)} €
                              </Text>
                            </View>
                          </View>

                          {/* Infos du plat */}
                          <View style={styles.dishInfoCol}>
                            <View style={styles.dishHeaderMeta}>
                              <View style={styles.dishCuisineBadge}>
                                <Text style={styles.dishCuisineBadgeText}>
                                  {dish.cuisine_type}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.dishTitle} numberOfLines={1}>
                              {dish.name}
                            </Text>

                            <Text style={styles.dishDesc} numberOfLines={2}>
                              {dish.description ||
                                "Recette authentique préparée selon les traditions culinaires."}
                            </Text>
                          </View>
                        </View>

                        {/* Barre d'actions & Switch Disponibilité */}
                        <View style={styles.dishFooterRow}>
                          {/* Bouton direct Disponibilité */}
                          <TouchableOpacity
                            style={[
                              styles.availabilityToggleBtn,
                              dish.is_available
                                ? styles.availabilityToggleBtnActive
                                : styles.availabilityToggleBtnInactive,
                            ]}
                            onPress={() =>
                              toggleAvailability(dish.id, dish.is_available)
                            }
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={
                                dish.is_available
                                  ? "checkmark-circle"
                                  : "pause-circle-outline"
                              }
                              size={15}
                              color={dish.is_available ? "#15803D" : "#64748B"}
                            />
                            <Text
                              style={[
                                styles.availabilityToggleText,
                                dish.is_available
                                  ? styles.availabilityToggleTextActive
                                  : styles.availabilityToggleTextInactive,
                              ]}
                            >
                              {dish.is_available ? "Disponible" : "Indisponible"}
                            </Text>
                          </TouchableOpacity>

                          {/* Actions Modifier & Supprimer */}
                          <View style={styles.actionButtonsGroup}>
                            <TouchableOpacity
                              style={styles.actionIconButton}
                              onPress={() =>
                                router.push({
                                  pathname: "/profil/traiteur/dish",
                                  params: {
                                    id: dish.id,
                                    name: dish.name,
                                    description: dish.description || "",
                                    price: String(dish.price),
                                    cuisine_type: dish.cuisine_type,
                                    is_available: String(dish.is_available),
                                    image_urls: JSON.stringify(
                                      dish.image_urls || [],
                                    ),
                                  },
                                })
                              }
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="create-outline"
                                size={17}
                                color="#2563EB"
                              />
                              <Text style={styles.actionEditLabel}>Modifier</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionIconButton}
                              onPress={() => setDishToDelete(dish.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color="#DC2626"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════
              ONGLET 2 : MON ATELIER & INFOS
             ══════════════════════════════════════════ */}
          {activeTab === "profil" && (
            <View style={styles.tabContentContainer}>
              {/* Carte Statut & Visibilité */}
              <View style={styles.sectionCard}>
                <View style={styles.statusCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionCardTitle}>
                      Visibilité de l'atelier
                    </Text>
                    <Text style={styles.sectionCardSubtitle}>
                      {traiteur.is_active
                        ? "Votre atelier est visible des clients et peut recevoir des commandes de plats et des demandes de devis."
                        : "Votre atelier est actuellement en pause. Vos plats n'apparaissent pas sur la vitrine publique."}
                    </Text>
                  </View>
                  <Switch
                    value={traiteur.is_active}
                    onValueChange={toggleWorkshopStatus}
                    trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                    thumbColor={traiteur.is_active ? "#15803D" : "#94A3B8"}
                    disabled={togglingStatus}
                  />
                </View>
              </View>

              {/* Carte Informations de l'Atelier */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="storefront-outline" size={20} color="#0B3B24" />
                    <Text style={styles.sectionCardTitle}>Mon Enseigne</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editCardBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/profil/traiteur/edit",
                        params: {
                          name: traiteur.name,
                          bio: traiteur.bio,
                          cuisines: JSON.stringify(traiteur.cuisine_type),
                          zones: JSON.stringify(traiteur.delivery_zones),
                          whatsapp: traiteur.whatsapp || "",
                          image_url: traiteur.image_url || "",
                        },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={14} color="#1D6B45" />
                    <Text style={styles.editCardBtnText}>Modifier</Text>
                  </TouchableOpacity>
                </View>

                {/* Nom commercial */}
                <View style={styles.detailFieldItem}>
                  <Text style={styles.detailFieldLabel}>Nom de l'atelier</Text>
                  <Text style={styles.detailFieldValueBold}>{traiteur.name}</Text>
                </View>

                {/* Présentation / Bio */}
                <View style={styles.detailFieldItem}>
                  <Text style={styles.detailFieldLabel}>Histoire & Présentation</Text>
                  <Text style={styles.detailFieldText}>
                    {traiteur.bio || "Aucune description renseignée."}
                  </Text>
                </View>

                {/* Spécialités Culinaires */}
                <View style={styles.detailFieldItem}>
                  <Text style={styles.detailFieldLabel}>
                    Spécialités culinaires ({traiteur.cuisine_type.length})
                  </Text>
                  <View style={styles.chipsCloud}>
                    {traiteur.cuisine_type.map((c) => (
                      <View key={c} style={styles.cuisineChip}>
                        <Ionicons name="restaurant-outline" size={12} color="#1D6B45" />
                        <Text style={styles.cuisineChipText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Zones de Livraison */}
                <View style={styles.detailFieldItem}>
                  <Text style={styles.detailFieldLabel}>
                    Zones de livraison desservies ({traiteur.delivery_zones.length})
                  </Text>
                  <View style={styles.chipsCloud}>
                    {traiteur.delivery_zones.map((z) => (
                      <View key={z} style={styles.zoneChip}>
                        <Ionicons name="location-outline" size={12} color="#475569" />
                        <Text style={styles.zoneChipText}>{z}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* WhatsApp */}
                {traiteur.whatsapp && (
                  <View style={styles.detailFieldItem}>
                    <Text style={styles.detailFieldLabel}>
                      WhatsApp professionnel
                    </Text>
                    <TouchableOpacity
                      style={styles.whatsappRowBtn}
                      onPress={handleOpenWhatsapp}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                      <Text style={styles.whatsappRowText}>{traiteur.whatsapp}</Text>
                      <Ionicons name="open-outline" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Bouton Accès Vitrine Publique */}
              <TouchableOpacity
                style={styles.publicShowcaseCard}
                onPress={() => router.push(`/traiteur/${traiteur.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.publicShowcaseLeft}>
                  <View style={styles.publicShowcaseIconCircle}>
                    <Ionicons name="eye-outline" size={22} color="#1D6B45" />
                  </View>
                  <View>
                    <Text style={styles.publicShowcaseTitle}>
                      Voir ma page vitrine publique
                    </Text>
                    <Text style={styles.publicShowcaseSub}>
                      Aperçu tel que vu par vos clients sur Dabari
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* Reassurance Card Dabari Traiteur */}
              <View style={styles.reassuranceCard}>
                <View style={styles.reassuranceTitleRow}>
                  <Ionicons name="sparkles" size={18} color="#D4870A" />
                  <Text style={styles.reassuranceTitle}>
                    Avantages du Traiteur Partenaire Dabari
                  </Text>
                </View>

                <View style={styles.reassuranceList}>
                  <View style={styles.reassuranceItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#15803D"
                      style={{ marginTop: 2 }}
                    />
                    <Text style={styles.reassuranceText}>
                      Vitrine référencée auprès de la diaspora et des amateurs de
                      gastronomie africaine.
                    </Text>
                  </View>

                  <View style={styles.reassuranceItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#15803D"
                      style={{ marginTop: 2 }}
                    />
                    <Text style={styles.reassuranceText}>
                      Réception d'appels d'offres pour événements (mariages, fêtes,
                      réceptions d'entreprises).
                    </Text>
                  </View>

                  <View style={styles.reassuranceItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#15803D"
                      style={{ marginTop: 2 }}
                    />
                    <Text style={styles.reassuranceText}>
                      Paiements sécurisés et garantis via la plateforme Dabari.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── MODAL DE SUPPRESSION D'UN PLAT ── */}
        <Modal
          transparent
          animationType="fade"
          visible={Boolean(dishToDelete)}
          onRequestClose={() => setDishToDelete(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircleDelete}>
                <Ionicons name="trash-outline" size={28} color="#B91C1C" />
              </View>

              <Text style={styles.modalTitle}>Supprimer ce plat ?</Text>
              <Text style={styles.modalSub}>
                Êtes-vous sûr de vouloir supprimer définitivement ce plat de votre
                carte ? Cette action est irréversible.
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDishToDelete(null)}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDeleteConfirmBtn}
                  onPress={confirmDeleteDish}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalDeleteConfirmBtnText}>
                      Supprimer
                    </Text>
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
  centerLoader: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  initialLoadingText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },

  /* Header Hero */
  headerHero: {
    backgroundColor: "#0B3B24",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  publicPageQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  publicPageQuickText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Identity Row */
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: "#D4870A",
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#D4870A",
  },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#15803D",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0B3B24",
  },
  identityInfo: {
    flex: 1,
  },
  identityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  identityName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(212, 135, 10, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillActive: {
    backgroundColor: "rgba(21, 128, 61, 0.25)",
  },
  statusPillInactive: {
    backgroundColor: "rgba(100, 116, 139, 0.25)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: "#4ADE80",
  },
  statusDotInactive: {
    backgroundColor: "#94A3B8",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusPillTextActive: {
    color: "#86EFAC",
  },
  statusPillTextInactive: {
    color: "#CBD5E1",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingScore: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  reviewCount: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 12,
  },

  /* Segmented Navigation */
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.75)",
  },
  segmentBtnTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },

  /* Main Scroll View */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContentContainer: {
    gap: 16,
  },

  /* Inline Error */
  inlineErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    fontWeight: "600",
  },

  /* Full Page Error */
  errorFullWrapper: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errorFullCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  errorIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorFullTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  errorFullSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0B3B24",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  /* KPIs Row */
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiCardGreen: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  kpiNumber: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },
  kpiNumberGreen: {
    color: "#15803D",
  },
  kpiNumberAmber: {
    color: "#D97706",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },

  /* Add Dish CTA */
  addDishCTA: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addDishCTAIcons: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  addDishCTAText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Empty state */
  emptyStateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  emptyStateSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyStateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1D6B45",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  emptyStateBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Dishes list */
  dishesList: {
    gap: 12,
  },
  dishCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  dishCardMainRow: {
    flexDirection: "row",
    gap: 12,
  },
  dishImageContainer: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  dishImage: {
    width: "100%",
    height: "100%",
  },
  dishImageFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dishPriceTag: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(11, 59, 36, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dishPriceTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  dishInfoCol: {
    flex: 1,
    justifyContent: "space-between",
  },
  dishHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dishCuisineBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  dishCuisineBadgeText: {
    color: "#15803D",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  dishTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  dishDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
    marginTop: 2,
  },
  dishFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  availabilityToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  availabilityToggleBtnActive: {
    backgroundColor: "#DCFCE7",
  },
  availabilityToggleBtnInactive: {
    backgroundColor: "#F1F5F9",
  },
  availabilityToggleText: {
    fontSize: 11,
    fontWeight: "800",
  },
  availabilityToggleTextActive: {
    color: "#15803D",
  },
  availabilityToggleTextInactive: {
    color: "#64748B",
  },
  actionButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionEditLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* Sections Mon Atelier */
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 14,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionCardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginTop: 3,
  },
  editCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  editCardBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
  detailFieldItem: {
    gap: 4,
  },
  detailFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailFieldValueBold: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  detailFieldText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
  },
  chipsCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 3,
  },
  cuisineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  cuisineChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    textTransform: "capitalize",
  },
  zoneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  zoneChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  whatsappRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 2,
  },
  whatsappRowText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
  },

  /* Public Showcase Card */
  publicShowcaseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  publicShowcaseLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  publicShowcaseIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  publicShowcaseTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  publicShowcaseSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  /* Reassurance Card */
  reassuranceCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 12,
  },
  reassuranceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reassuranceTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  reassuranceList: {
    gap: 8,
  },
  reassuranceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  reassuranceText: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 17,
    flex: 1,
  },

  /* Modal */
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
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconCircleDelete: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  modalDeleteConfirmBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalDeleteConfirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
