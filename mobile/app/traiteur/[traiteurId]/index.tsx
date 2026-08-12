import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken, saveSecureToken } from "../../../utils/storage";
import { CartItem, Dish, Traiteur } from "../../../utils/types/traiteur";

// Plat modèle pour la démonstration du visuel
type DishItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  cuisine_type: string;
  image_url?: string;
};

type Props = {
  traiteurId: string;
  traiteurName: string;
  whatsapp?: string | null;
};

type FormState = {
  date_evenement: string;
  nb_personnes: string;
  adresse: string;
  type_evenement: string;
  notes: string;
};

function DishCard({
  dish,
  qty,
  isLoggedIn,
  onAdd,
  onRemove,
  onRequireLogin,
}: {
  dish: any;
  qty: number;
  isLoggedIn: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onRequireLogin: () => void;
}) {
  const [imgIndex, setImgIndex] = useState(0);

  let images: string[] = [];
  if (Array.isArray(dish.image_urls) && dish.image_urls.length > 0) {
    images = dish.image_urls;
  } else if (typeof dish.image_urls === "string" && dish.image_urls.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(dish.image_urls);
      if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
    } catch (e) {
      images = [dish.image_urls];
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
      {/* Image Placeholder du Plat avec Carrousel */}
      <View style={styles.dishImageCover}>
        {images.length > 0 ? (
          <>
            <Image
              source={{ uri: images[imgIndex] }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />

            {/* Navigation Flèches & Points si plusieurs images */}
            {images.length > 1 && (
              <>
                <TouchableOpacity
                  style={styles.arrowLeftBtn}
                  onPress={handlePrev}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.arrowRightBtn}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.dotsRow}>
                  {images.map((_: any, idx: number) => (
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
          <View style={styles.dishEmojiCircle}>
            <Ionicons name="restaurant" size={32} color="#D4870A" />
          </View>
        )}

        {dish.cuisine_type && (
          <View style={styles.cuisineTagBadge}>
            <Text style={styles.cuisineTagBadgeText}>{dish.cuisine_type}</Text>
          </View>
        )}
      </View>

      {/* Dish Info */}
      <View style={styles.dishContent}>
        <Text style={styles.dishName}>{dish.name}</Text>
        <Text style={styles.dishDesc} numberOfLines={3}>
          {dish.description}
        </Text>

        {/* Footer Row (Prix & Bouton Ajouter/Compteur) */}
        <View style={styles.dishFooterRow}>
          <Text style={styles.dishPrice}>
            {Number(dish.price).toFixed(2)} €
          </Text>

          {!isLoggedIn ? (
            <TouchableOpacity
              style={[styles.addBtn, styles.addBtnDisabled]}
              onPress={onRequireLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed-outline" size={12} color="#64748B" />
              <Text style={styles.addBtnTextDisabled}>Connexion requise</Text>
            </TouchableOpacity>
          ) : qty === 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={onAdd}
              activeOpacity={0.8}
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
  const [cart, setCart] = useState<CartItem[]>([]);

  // Calculs du panier basés sur l'état cart
  const getQty = (dishId: string) =>
    cart.find((i) => i.dish.id === dishId)?.quantity || 0;

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, i) => sum + Number(i.dish.price) * i.quantity,
    0
  );

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    date_evenement: "",
    nb_personnes: "",
    adresse: "",
    type_evenement: "",
    notes: "",
  });

  useEffect(() => {
    const load = async () => {
      const token = await getSecureToken("token");
      if (token) {
        setIsLoggedIn(true);
      }
    };
    load();
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreSubmit = async () => {
    if (!form.date_evenement || !form.nb_personnes || !form.adresse) {
      setError("Merci de remplir les champs obligatoires");
      return;
    }

    if (parseInt(form.nb_personnes) < 1) {
      setError("Le nombre de personnes doit être d'au moins 1");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (form.date_evenement < today) {
      setError("La date de l'événement ne peut pas être dans le passé");
      return;
    }

    setError(null);
    setShowConfirmModal(true);
  };

  useEffect(() => {
    async function fetchTraiteurs() {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/traiteur/${traiteurId}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        const data = await response.json();
        console.log(data);
        setTraiteur(data.data.traiteur);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur est survenue", error);
      }
    }
    fetchTraiteurs();
  }, [traiteurId]);

  const confirmOrder = async () => {
    setLoading(true);
    setError(null);
    const token = await getSecureToken("token");
    if (!token) {
      setIsLoggedIn(false);
      return;
    }
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/traiteur`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          traiteur_id: traiteurId,
          date_evenement: form.date_evenement,
          nb_personnes: parseInt(form.nb_personnes),
          adresse: form.adresse,
          type_evenement: form.type_evenement,
          notes: form.notes,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || "Erreur lors de la commande du traiteur");
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  };

  const addToCart = (dish: Dish) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish.id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dish.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i,
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
          i.dish.id === dishId ? { ...i, quantity: i.quantity - 1 } : i,
        );
      }
      return prev.filter((i) => i.dish.id !== dishId);
    });
  };

    const goToCheckout = async () => {
     await saveSecureToken("dabari_cart", JSON.stringify(cart));
    router.push("/traiteur/commander");
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#1D6B45", fontWeight: "700" }}>
            Chargement du traiteur...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!traiteur) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#6B7280" }}>Traiteur introuvable</Text>
        </View>
      </SafeAreaView>
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
        {/* Top Header Card (Gradient Vert Vert & Or) */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/traiteur")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          <View style={styles.profileRow}>
            {/* Traiteur Avatar */}
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: traiteur.image_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.traiteurTitle}>{traiteur.name}</Text>
              <Text style={styles.traiteurBio} numberOfLines={2}>
                {traiteur.bio}
              </Text>
            </View>

            {/* Rating Badge */}
            <View style={styles.ratingBox}>
              <Ionicons
                name="star"
                size={16}
                color={
                  Number(traiteur.rating || 0) > 0
                    ? "#FBBF24"
                    : "rgba(255, 255, 255, 0.4)"
                }
              />
              {Number(traiteur.rating || 0) > 0 ? (
                <>
                  <Text style={styles.ratingScore}>
                    {Number(traiteur.rating).toFixed(1)}
                  </Text>
                  <Text style={styles.ratingReviews}>Avis</Text>
                </>
              ) : (
                <Text style={styles.noRatingText}>Aucun avis</Text>
              )}
            </View>
          </View>

          {/* Zones de livraison */}
          <View style={styles.zonesRow}>
            {traiteur.delivery_zones.map((z) => (
              <View key={z} style={styles.zonePill}>
                <Ionicons name="location" size={12} color="#FFFFFF" />
                <Text style={styles.zoneText}>{z}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section Demande de Devis sur-mesure */}
        <View style={styles.devisCardContainer}>
          <TouchableOpacity
            style={[styles.devisCard, !isLoggedIn && styles.devisCardDisabled]}
            activeOpacity={isLoggedIn ? 0.85 : 0.95}
            onPress={() => {
              if (!isLoggedIn) {
                router.push("/(auth)/login");
              } else {
                router.push(`/traiteur/${traiteurId}/devis`);
              }
            }}
          >
            <View style={[styles.devisIconCircle, !isLoggedIn && styles.devisIconCircleDisabled]}>
              <Ionicons
                name={isLoggedIn ? "calendar" : "lock-closed"}
                size={22}
                color={isLoggedIn ? "#1D6B45" : "#64748B"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.devisTitle, !isLoggedIn && { color: "#64748B" }]}>
                Demander un devis sur-mesure
              </Text>
              <Text style={styles.devisSubtitle}>
                {isLoggedIn
                  ? "Mariages, baptêmes, anniversaires & grands repas de famille."
                  : "Connectez-vous pour demander un devis au traiteur."}
              </Text>
            </View>
            <Ionicons
              name={isLoggedIn ? "chevron-forward" : "log-in-outline"}
              size={18}
              color={isLoggedIn ? "#1D6B45" : "#64748B"}
            />
          </TouchableOpacity>
        </View>

        {/* Header Menu Title */}
        <View style={styles.menuHeaderRow}>
          <Text style={styles.menuTitle}>
            Menu · {traiteur.dishes?.filter((d) => d.is_available).length || 0} plats
          </Text>
        </View>

        {/* Liste des Plats */}
        <View style={styles.dishesList}>
          {traiteur.dishes?.map((dish: any) => (
            <DishCard
              key={dish.id}
              dish={dish}
              qty={getQty(dish.id)}
              isLoggedIn={isLoggedIn}
              onAdd={() => addToCart(dish)}
              onRemove={() => removeFromCart(dish.id)}
              onRequireLogin={() => router.push("/(auth)/login")}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bouton Flottant "Voir mon panier" */}
      {cart.length > 0 && (
        <View style={styles.floatingCartBar}>
          <TouchableOpacity
            style={styles.floatingCartBtn}
            onPress={() => {
              saveSecureToken("dabari_cart", JSON.stringify(cart));
              goToCheckout();
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cartBadgeCount}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>

            <Text style={styles.floatingCartTitle}>Voir mon panier</Text>

            <Text style={styles.floatingCartPrice}>
              {totalPrice.toFixed(2)} €
            </Text>
          </TouchableOpacity>
        </View>
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
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 110,
  },

  /* Header Card */
  headerCard: {
    backgroundColor: "#165034",
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 4,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  traiteurTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  traiteurBio: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 16,
  },
  ratingBox: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 55,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  ratingReviews: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.7)",
  },
  noRatingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
    textAlign: "center",
  },
  zonesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  zonePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  zoneText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },

  /* Devis Banner */
  devisCardContainer: {
    paddingHorizontal: 18,
    marginTop: 16,
  },
  devisCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.2)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  devisCardDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    opacity: 0.9,
  },
  devisIconCircleDisabled: {
    backgroundColor: "#F1F5F9",
  },
  devisIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  devisTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  devisSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  /* Menu Title */
  menuHeaderRow: {
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  /* Dishes List */
  dishesList: {
    paddingHorizontal: 18,
    gap: 16,
  },
  dishCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dishImageCover: {
    height: 140,
    backgroundColor: "#FFF8E7",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dishEmojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cuisineTagBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cuisineTagBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D6B45",
  },
  dishContent: {
    padding: 16,
  },
  dishName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  dishDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 14,
  },
  dishFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  dishPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1D6B45",
  },

  /* Add / Counter Buttons */
  addBtn: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  addBtnDisabled: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  addBtnTextDisabled: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 8,
  },
  counterBtnMinus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(29, 107, 69, 0.3)",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnMinusText: {
    color: "#1D6B45",
    fontSize: 16,
    fontWeight: "800",
  },
  counterQtyText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    minWidth: 16,
    textAlign: "center",
  },
  counterBtnPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1D6B45",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnPlusText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  arrowLeftBtn: {
    position: "absolute",
    left: 8,
    top: "40%",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  arrowRightBtn: {
    position: "absolute",
    right: 8,
    top: "40%",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  dotsRow: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  dotItem: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },

  /* Floating Bottom Cart Bar */
  floatingCartBar: {
    position: "absolute",
    bottom: 20,
    left: 18,
    right: 18,
  },
  floatingCartBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  cartBadgeCount: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  floatingCartTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  floatingCartPrice: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
