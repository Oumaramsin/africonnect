import React, { useEffect, useState, useMemo } from "react";
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
  Share,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken, saveSecureToken } from "../../../utils/storage";
import { CartItem, Dish, Traiteur } from "../../../utils/types/traiteur";
import { apiFetch } from "../../../utils/api";

function DishCard({
  dish,
  qty,
  isLoggedIn,
  onAdd,
  onRemove,
  onRequireLogin,
  onOpenModal,
}: {
  dish: Dish;
  qty: number;
  isLoggedIn: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onRequireLogin: () => void;
  onOpenModal: () => void;
}) {
  const [imgIndex, setImgIndex] = useState(0);

  let images: string[] = [];
  const rawUrls = (dish as any).image_urls;
  if (Array.isArray(rawUrls) && rawUrls.length > 0) {
    images = rawUrls;
  } else if (typeof rawUrls === "string" && rawUrls.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(rawUrls);
      if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
    } catch {
      images = [rawUrls];
    }
  } else if (dish.image_url) {
    images = [dish.image_url];
  }

  const handleNext = () => {
    setImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <View style={styles.dishCard}>
      {/* Zone visuelle du plat */}
      <TouchableOpacity
        style={styles.dishImageCover}
        onPress={onOpenModal}
        activeOpacity={0.92}
      >
        {images.length > 0 ? (
          <>
            <Image
              source={{ uri: images[imgIndex] }}
              style={styles.dishImage}
              resizeMode="cover"
            />

            {images.length > 1 && (
              <>
                <TouchableOpacity
                  style={styles.arrowLeftBtn}
                  onPress={handlePrev}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={14} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.arrowRightBtn}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.dotsRow}>
                  {images.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.dotItem,
                        idx === imgIndex ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.dishFallbackBox}>
            <Ionicons name="restaurant" size={32} color="#1D6B45" />
          </View>
        )}

        {dish.cuisine_type ? (
          <View style={styles.cuisineTagBadge}>
            <Text style={styles.cuisineTagBadgeText}>{dish.cuisine_type}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Contenu et Détails du Plat */}
      <View style={styles.dishContent}>
        <TouchableOpacity onPress={onOpenModal} activeOpacity={0.8}>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishDesc} numberOfLines={2}>
            {dish.description || "Préparé selon la recette traditionnelle avec des ingrédients frais."}
          </Text>
        </TouchableOpacity>

        <View style={styles.dishFooterRow}>
          <View>
            <Text style={styles.dishPriceLabel}>Prix unitaire</Text>
            <Text style={styles.dishPrice}>{Number(dish.price).toFixed(2)} €</Text>
          </View>

          {!isLoggedIn ? (
            <TouchableOpacity
              style={styles.addBtnDisabled}
              onPress={onRequireLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed" size={12} color="#64748B" />
              <Text style={styles.addBtnTextDisabled}>Connexion</Text>
            </TouchableOpacity>
          ) : qty === 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={onAdd}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>+ Ajouter</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtnMinus}
                onPress={onRemove}
                activeOpacity={0.8}
              >
                <Text style={styles.counterBtnMinusText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.counterQtyText}>{qty}</Text>

              <TouchableOpacity
                style={styles.counterBtnPlus}
                onPress={onAdd}
                activeOpacity={0.8}
              >
                <Text style={styles.counterBtnPlusText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function TraiteurDetailScreen() {
  const router = useRouter();
  const { traiteurId } = useLocalSearchParams<{ traiteurId: string }>();

  const [traiteur, setTraiteur] = useState<Traiteur | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDishModal, setSelectedDishModal] = useState<Dish | null>(null);

  // Vérifier la connexion utilisateur
  useEffect(() => {
    (async () => {
      const token = await getSecureToken("token");
      setIsLoggedIn(Boolean(token));
    })();
  }, []);

  // Récupération de la fiche traiteur
  useEffect(() => {
    let ignore = false;
    async function fetchTraiteurData() {
      setLoading(true);
      try {
        const response = await apiFetch(`/traiteur/${traiteurId}`);
        if (response.ok) {
          const data = await response.json();
          if (!ignore) {
            setTraiteur(data.data?.traiteur || null);
          }
        }
      } catch (err) {
        console.error("Erreur chargement traiteur:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchTraiteurData();
    return () => {
      ignore = true;
    };
  }, [traiteurId]);

  // Plats disponibles
  const availableDishes = useMemo(() => {
    return traiteur?.dishes?.filter((d) => d.is_available) || [];
  }, [traiteur?.dishes]);

  // Catégories / Origines culinaires pour les filtres
  const categories = useMemo(() => {
    const list: { label: string; value: string; count: number }[] = [
      { label: "Toutes les spécialités", value: "all", count: availableDishes.length },
    ];
    const map = new Map<string, number>();
    availableDishes.forEach((d) => {
      if (d.cuisine_type) {
        const key = d.cuisine_type.trim();
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    map.forEach((count, key) => {
      list.push({ label: key, value: key.toLowerCase(), count });
    });
    return list;
  }, [availableDishes]);

  // Filtrage de la carte des plats
  const filteredDishes = useMemo(() => {
    return availableDishes.filter((dish) => {
      const matchesCategory =
        selectedCategory === "all" ||
        dish.cuisine_type?.toLowerCase() === selectedCategory;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        dish.name.toLowerCase().includes(q) ||
        dish.description?.toLowerCase().includes(q) ||
        dish.cuisine_type?.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [availableDishes, selectedCategory, searchQuery]);

  // Gestion du panier
  const getQty = (dishId: string) =>
    cart.find((i) => i.dish.id === dishId)?.quantity || 0;

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, i) => sum + Number(i.dish.price) * i.quantity,
    0
  );

  const addToCart = (dish: Dish) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish.id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dish.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          dish,
          quantity: 1,
          traiteur_id: traiteur?.id || "",
          traiteur_name: traiteur?.name || "",
        },
      ];
    });
  };

  const removeFromCart = (dishId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish.id === dishId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.dish.id === dishId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.dish.id !== dishId);
    });
  };

  const goToCheckout = async () => {
    await saveSecureToken("dabari_cart", JSON.stringify(cart));
    router.push("/traiteur/commander");
  };

  // Partager le profil du chef
  const handleShare = async () => {
    if (!traiteur) return;
    try {
      await Share.share({
        title: `${traiteur.name} - Traiteur sur Dabari`,
        message: `Découvrez ${traiteur.name}, traiteur de gastronomie africaine sur Dabari : https://dabari.fr/traiteur/${traiteur.id}`,
      });
    } catch {
      // Ignoré
    }
  };

  // Contacter via WhatsApp
  const handleContactWhatsApp = () => {
    if (!traiteur?.whatsapp) return;
    const cleanNumber = traiteur.whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Bonjour Chef ${traiteur.name}, je vous contacte via Dabari concernant vos prestations traiteur.`
    );
    Linking.openURL(`https://wa.me/${cleanNumber}?text=${msg}`).catch(() => {
      Alert.alert("Erreur", "Impossible d'ouvrir l'application WhatsApp.");
    });
  };

  if (loading) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.centerContainer} edges={["top"]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Chargement du chef traiteur...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!traiteur) {
    return (
      <View style={styles.topGreenWrapper}>
        <SafeAreaView style={styles.centerContainer} edges={["top"]}>
          <Ionicons name="alert-circle-outline" size={48} color="#FFFFFF" />
          <Text style={styles.notFoundTitle}>Traiteur introuvable</Text>
          <TouchableOpacity
            style={styles.backToListBtn}
            onPress={() => router.push("/traiteur")}
          >
            <Ionicons name="arrow-back" size={16} color="#1D6B45" />
            <Text style={styles.backToListText}>Retour aux traiteurs</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. HERO DU CHEF (IDENTIQUE AU DESIGN WEB) ── */}
          <View style={styles.heroCard}>
            {/* Ligne de retour navigation */}
            <View style={styles.heroNavRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.push("/traiteur")}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                <Text style={styles.backBtnText}>Tous les traiteurs</Text>
              </TouchableOpacity>

              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark" size={12} color="#6EE7B7" />
                <Text style={styles.verifiedPillText}>Chef Partenaire Vérifié</Text>
              </View>
            </View>

            {/* Profil Chef & Avatar */}
            <View style={styles.chefProfileRow}>
              <View style={styles.chefAvatarBox}>
                {traiteur.image_url ? (
                  <Image
                    source={{ uri: traiteur.image_url }}
                    style={styles.chefAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="restaurant" size={32} color="#FFFFFF" />
                )}
              </View>

              <View style={styles.chefProfileInfo}>
                <Text style={styles.chefName}>{traiteur.name}</Text>
                <Text style={styles.chefBio} numberOfLines={3}>
                  {traiteur.bio || "Spécialiste de la cuisine traditionnelle africaine. Plats cuisinés avec amour et ingrédients authentiques."}
                </Text>
              </View>
            </View>

            {/* Note & Avis */}
            <View style={styles.statsBar}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text style={styles.ratingBadgeValue}>
                  {traiteur.review_count === 0 ? "Nouveau Chef" : Number(traiteur.rating || 5).toFixed(1)}
                </Text>
                {Boolean(traiteur.review_count && traiteur.review_count > 0) && (
                  <Text style={styles.ratingBadgeCount}>({traiteur.review_count} avis)</Text>
                )}
              </View>

              {/* Bouton Partager */}
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={15} color="#FFFFFF" />
                <Text style={styles.shareBtnText}>Partager</Text>
              </TouchableOpacity>
            </View>

            {/* Zones de livraison desservies */}
            {traiteur.delivery_zones && traiteur.delivery_zones.length > 0 && (
              <View style={styles.zonesSection}>
                <Ionicons name="location-outline" size={13} color="#6EE7B7" />
                <Text style={styles.zonesLabel}>Zones :</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zonesScroll}>
                  {traiteur.delivery_zones.map((zone) => (
                    <View key={zone} style={styles.zonePill}>
                      <Text style={styles.zoneText}>{zone}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Actions Rapides du Chef */}
            <View style={styles.heroActionRow}>
              {/* Bouton Devis Événement Sur-Mesure */}
              <TouchableOpacity
                style={styles.devisBtnGold}
                onPress={() => router.push(`/traiteur/${traiteurId}/devis`)}
                activeOpacity={0.88}
              >
                <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                <Text style={styles.devisBtnGoldText}>Demander un devis</Text>
              </TouchableOpacity>

              {/* Bouton Contact WhatsApp direct si disponible */}
              {Boolean(traiteur.whatsapp) && (
                <TouchableOpacity
                  style={styles.whatsAppBtn}
                  onPress={handleContactWhatsApp}
                  activeOpacity={0.88}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                  <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── 2. BANNIÈRE ASSURANCE QUALITÉ ET SÉQUESTRE ── */}
          <View style={styles.assuranceBanner}>
            <View style={styles.assuranceItem}>
              <Ionicons name="shield-checkmark" size={14} color="#1D6B45" />
              <Text style={styles.assuranceText}>Paiement sécurisé par séquestre</Text>
            </View>
            <View style={styles.assuranceItem}>
              <Ionicons name="checkmark-circle" size={14} color="#D4870A" />
              <Text style={styles.assuranceText}>Plats 100% frais préparés le jour J</Text>
            </View>
          </View>

          {/* ── 3. RECHERCHE & FILTRES DU MENU ── */}
          <View style={styles.menuSectionHeader}>
            <View>
              <Text style={styles.menuSectionTitle}>La Carte du Chef</Text>
              <Text style={styles.menuSectionSubtitle}>
                {availableDishes.length} plat{availableDishes.length > 1 ? "s" : ""} disponible{availableDishes.length > 1 ? "s" : ""} à la commande
              </Text>
            </View>
          </View>

          {availableDishes.length > 0 && (
            <View style={styles.searchFilterWrapper}>
              <View style={styles.searchBarBox}>
                <Ionicons name="search-outline" size={16} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un plat (Tiep, Yassa, Aloco, Ndolé...)"
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {categories.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesScroll}
                >
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                        onPress={() => setSelectedCategory(cat.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                          {cat.label} ({cat.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── 4. LISTE DES PLATS DE LA CARTE ── */}
          <View style={styles.dishesList}>
            {availableDishes.length === 0 ? (
              <View style={styles.emptyDishesBox}>
                <Ionicons name="restaurant-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyDishesTitle}>Aucun plat à la carte pour l'instant</Text>
                <Text style={styles.emptyDishesSubtitle}>
                  Ce chef propose principalement des prestations sur devis pour les réceptions et événements.
                </Text>
                <TouchableOpacity
                  style={styles.emptyDevisBtn}
                  onPress={() => router.push(`/traiteur/${traiteurId}/devis`)}
                >
                  <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.emptyDevisBtnText}>Demander un devis sur-mesure</Text>
                </TouchableOpacity>
              </View>
            ) : filteredDishes.length === 0 ? (
              <View style={styles.emptyFilterBox}>
                <Text style={styles.emptyFilterTitle}>Aucun plat ne correspond à vos filtres</Text>
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  <Text style={styles.resetFilterText}>Réinitialiser les filtres</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredDishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  qty={getQty(dish.id)}
                  isLoggedIn={isLoggedIn}
                  onAdd={() => addToCart(dish)}
                  onRemove={() => removeFromCart(dish.id)}
                  onRequireLogin={() => router.push("/(auth)/login")}
                  onOpenModal={() => setSelectedDishModal(dish)}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* ── 5. PANIER FLOTTANT (STYLE WEB MOBILE MODERNE) ── */}
        {cart.length > 0 && (
          <View style={styles.floatingCartContainer}>
            <TouchableOpacity
              style={styles.floatingCartBar}
              onPress={goToCheckout}
              activeOpacity={0.92}
            >
              <View style={styles.floatingCartLeft}>
                <View style={styles.cartCountPill}>
                  <Text style={styles.cartCountText}>{totalItems}</Text>
                </View>
                <Text style={styles.floatingCartTitle}>Voir mon panier</Text>
              </View>

              <View style={styles.floatingCartRight}>
                <Text style={styles.floatingCartTotal}>{totalPrice.toFixed(2)} €</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 6. MODALE DÉTAILS ET PHOTO DU PLAT (POPUP IDENTIQUE AU WEB) ── */}
        {selectedDishModal && (
          <Modal
            transparent
            animationType="fade"
            visible={Boolean(selectedDishModal)}
            onRequestClose={() => setSelectedDishModal(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                {/* Photo du plat en grand */}
                <View style={styles.modalImageContainer}>
                  {selectedDishModal.image_urls && selectedDishModal.image_urls.length > 0 ? (
                    <Image
                      source={{ uri: selectedDishModal.image_urls[0] }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  ) : selectedDishModal.image_url ? (
                    <Image
                      source={{ uri: selectedDishModal.image_url }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.modalFallbackCover}>
                      <Ionicons name="restaurant" size={44} color="#1D6B45" />
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedDishModal(null)}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  {selectedDishModal.cuisine_type ? (
                    <View style={styles.modalCuisineBadge}>
                      <Text style={styles.modalCuisineBadgeText}>
                        {selectedDishModal.cuisine_type}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Contenu de la modale */}
                <View style={styles.modalBody}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalDishTitle}>{selectedDishModal.name}</Text>
                    <Text style={styles.modalDishPrice}>
                      {Number(selectedDishModal.price).toFixed(2)} €
                    </Text>
                  </View>

                  <Text style={styles.modalDishDescription}>
                    {selectedDishModal.description ||
                      "Plat traditionnel cuisiné avec des ingrédients frais selon les recettes authentiques de la diaspora africaine."}
                  </Text>

                  {/* Bouton d'ajout */}
                  <View style={styles.modalFooter}>
                    {isLoggedIn ? (
                      <TouchableOpacity
                        style={styles.modalAddBtn}
                        onPress={() => {
                          addToCart(selectedDishModal);
                          setSelectedDishModal(null);
                        }}
                        activeOpacity={0.88}
                      >
                        <Ionicons name="bag-add" size={16} color="#FFFFFF" />
                        <Text style={styles.modalAddBtnText}>
                          Ajouter au panier ({Number(selectedDishModal.price).toFixed(2)} €)
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.modalLoginBtn}
                        onPress={() => {
                          setSelectedDishModal(null);
                          router.push("/(auth)/login");
                        }}
                      >
                        <Ionicons name="lock-closed" size={14} color="#1D6B45" />
                        <Text style={styles.modalLoginBtnText}>
                          Se connecter pour commander
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  notFoundTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  backToListBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backToListText: {
    color: "#1D6B45",
    fontSize: 12,
    fontWeight: "800",
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  /* ── 1. Hero Card ── */
  heroCard: {
    backgroundColor: "#165034",
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 12,
  },
  heroNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  verifiedPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  chefProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  chefAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chefAvatarImage: {
    width: "100%",
    height: "100%",
  },
  chefProfileInfo: {
    flex: 1,
    gap: 2,
  },
  chefName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  chefBio: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 16,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  ratingBadgeValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  ratingBadgeCount: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  shareBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  zonesSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  zonesLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    fontWeight: "700",
  },
  zonesScroll: {
    gap: 6,
  },
  zonePill: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  zoneText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  heroActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  devisBtnGold: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D4870A",
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  devisBtnGoldText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  whatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#25D366",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  whatsAppBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* ── 2. Reassurance Banner ── */
  assuranceBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  assuranceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  assuranceText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },

  /* ── 3. Menu Title & Filters ── */
  menuSectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  menuSectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  searchFilterWrapper: {
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
  },
  categoriesScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  categoryPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  /* ── 4. Dishes List ── */
  dishesList: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
  },
  dishCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dishImageCover: {
    height: 140,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  dishImage: {
    width: "100%",
    height: "100%",
  },
  dishFallbackBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  arrowLeftBtn: {
    position: "absolute",
    left: 8,
    top: "40%",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  arrowRightBtn: {
    position: "absolute",
    right: 8,
    top: "40%",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  dotsRow: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  dotItem: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  cuisineTagBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cuisineTagBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1D6B45",
    textTransform: "uppercase",
  },
  dishContent: {
    padding: 12,
    gap: 6,
  },
  dishName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  dishDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  dishFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  dishPriceLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dishPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: "#166534",
  },
  addBtn: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  addBtnDisabled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  addBtnTextDisabled: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  counterBtnMinus: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  counterBtnMinusText: {
    color: "#1D6B45",
    fontSize: 14,
    fontWeight: "800",
  },
  counterQtyText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1D6B45",
    minWidth: 14,
    textAlign: "center",
  },
  counterBtnPlus: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#1D6B45",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnPlusText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyDishesBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyDishesTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  emptyDishesSubtitle: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },
  emptyDevisBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D4870A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyDevisBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyFilterBox: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 6,
  },
  emptyFilterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
  },

  /* ── 5. Floating Cart ── */
  floatingCartContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  floatingCartBar: {
    backgroundColor: "#1D6B45",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingCartLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartCountPill: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cartCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  floatingCartTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  floatingCartRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  floatingCartTotal: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  /* ── 6. Modal Dish Detail ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 380,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalImageContainer: {
    height: 180,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalFallbackCover: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  modalCuisineBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modalCuisineBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D6B45",
    textTransform: "uppercase",
  },
  modalBody: {
    padding: 16,
    gap: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  modalDishTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalDishPrice: {
    fontSize: 17,
    fontWeight: "900",
    color: "#166534",
  },
  modalDishDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  modalFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  modalAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1D6B45",
    paddingVertical: 11,
    borderRadius: 12,
  },
  modalAddBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  modalLoginBtnText: {
    color: "#1D6B45",
    fontSize: 12,
    fontWeight: "800",
  },
});
