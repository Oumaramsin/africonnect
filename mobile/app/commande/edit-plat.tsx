import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../utils/api";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import {
  showConfirmAlert,
  showSuccessAlert,
  showErrorAlert,
} from "../../utils/alerts";

type OrderItem = {
  dish_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
};

function getDishImage(dish: any): string | null {
  if (!dish) return null;
  if (Array.isArray(dish.image_urls) && dish.image_urls.length > 0) {
    return dish.image_urls[0];
  }
  if (
    typeof dish.image_urls === "string" &&
    dish.image_urls.trim().startsWith("[")
  ) {
    try {
      const parsed = JSON.parse(dish.image_urls);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (_) {}
  }
  if (dish.image_url) return dish.image_url;
  if (dish.image) return dish.image;
  return null;
}

export default function EditPlatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Valeurs initiales pour détecter les modifications réelles
  const [initialData, setInitialData] = useState<{
    deliveryType: "delivery" | "pickup";
    deliveryAddress: string;
    orderNotes: string;
    orderItems: { dish_id: string; quantity: number }[];
  } | null>(null);

  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [availableDishes, setAvailableDishes] = useState<any[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadOrderDetails();
  }, [id]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/commande/order/${id}`);
      if (!res.ok) {
        throw new Error("Impossible de charger la commande.");
      }
      const data = await res.json();
      const ord = data.data?.order;
      if (!ord) {
        throw new Error("Commande introuvable.");
      }

      if (ord.status !== "pending") {
        showErrorAlert(
          "Action impossible",
          "Cette commande a déjà été traitée et ne peut plus être modifiée.",
          () => router.replace("/commandes"),
        );
        return;
      }

      setOrder(ord);
      const initDeliveryType = (ord.delivery_type as any) || "delivery";
      const initAddress = ord.delivery_address || "";
      const initNotes = ord.notes || "";

      setDeliveryType(initDeliveryType);
      setDeliveryAddress(initAddress);
      setOrderNotes(initNotes);

      const items: OrderItem[] = (ord.order_items || []).map((item: any) => {
        const dish = item.dish || item.dishes;
        return {
          dish_id: item.dish_id || dish?.id || item.id,
          name: dish?.name || "Plat",
          price: Number(item.unit_price || dish?.price || 0),
          quantity: item.quantity || 1,
          image_url: getDishImage(dish),
        };
      });
      setOrderItems(items);

      // Stocker les valeurs initiales
      setInitialData({
        deliveryType: initDeliveryType,
        deliveryAddress: initAddress,
        orderNotes: initNotes,
        orderItems: items.map((i) => ({
          dish_id: i.dish_id,
          quantity: i.quantity,
        })),
      });

      // Récupération des plats du traiteur
      const traiteurDishes = ord.traiteur?.dishes || [];
      if (traiteurDishes.length > 0) {
        setAvailableDishes(traiteurDishes);
      } else if (ord.traiteur_id) {
        try {
          const tRes = await apiFetch(`/traiteur/${ord.traiteur_id}`);
          if (tRes.ok) {
            const tData = await tRes.json();
            const dishes =
              tData.data?.traiteur?.dishes ||
              tData.data?.dishes ||
              tData.traiteur?.dishes ||
              [];
            setAvailableDishes(dishes);
          }
        } catch (_) {}
      }
    } catch (e: any) {
      showErrorAlert(
        "Erreur",
        e.message || "Erreur de chargement de la commande.",
        () => router.replace("/commandes"),
      );
    } finally {
      setLoading(false);
    }
  };

  // Détection des changements réels
  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    if (deliveryType !== initialData.deliveryType) return true;
    if (deliveryAddress.trim() !== initialData.deliveryAddress.trim())
      return true;
    if (orderNotes.trim() !== initialData.orderNotes.trim()) return true;

    if (orderItems.length !== initialData.orderItems.length) return true;
    for (const item of orderItems) {
      const orig = initialData.orderItems.find(
        (o) => o.dish_id === item.dish_id,
      );
      if (!orig || orig.quantity !== item.quantity) return true;
    }
    return false;
  }, [initialData, deliveryType, deliveryAddress, orderNotes, orderItems]);

  const updateQuantity = (dishId: string, delta: number) => {
    setOrderItems(
      (prev) =>
        prev
          .map((item) => {
            if (item.dish_id === dishId) {
              const nextQty = item.quantity + delta;
              return nextQty > 0 ? { ...item, quantity: nextQty } : null;
            }
            return item;
          })
          .filter(Boolean) as OrderItem[],
    );
  };

  const removeDish = (dishId: string) => {
    setOrderItems((prev) => prev.filter((i) => i.dish_id !== dishId));
  };

  const addDish = (dish: any) => {
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.dish_id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dish_id === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          dish_id: dish.id,
          name: dish.name,
          price: Number(dish.price),
          quantity: 1,
          image_url: getDishImage(dish),
        },
      ];
    });
  };

  const getTotalAmount = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  };

  // Demande de confirmation avant enregistrement 
  const handleSaveClick = () => {
    if (orderItems.length === 0) {
      showErrorAlert(
        "Attention",
        "Votre commande doit comporter au moins 1 plat.",
      );
      return;
    }

    if (deliveryType === "delivery" && !deliveryAddress.trim()) {
      showErrorAlert(
        "Adresse manquante",
        "Veuillez renseigner votre adresse de livraison.",
      );
      return;
    }

    showConfirmAlert(
      "Confirmer les modifications",
      "Êtes-vous sûr(e) de vouloir enregistrer les modifications pour cette commande de plats ?",
      performSave,
    );
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        delivery_type: deliveryType,
        delivery_address: deliveryAddress,
        notes: orderNotes,
        items: orderItems.map((item) => ({
          dish_id: item.dish_id,
          quantity: item.quantity,
        })),
      };

      const res = await apiFetch(`/commande/order/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la modification");
      }

      showSuccessAlert(
        "Succès 🎉",
        "Votre commande a été modifiée avec succès !",
        () => router.replace("/commandes"),
      );
    } catch (e: any) {
      showErrorAlert(
        "Erreur",
        e.message || "Impossible de sauvegarder la commande.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1D6B45" />
        <Text style={styles.loadingText}>Chargement de la commande...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/commandes")}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Modifier la commande</Text>
          <Text style={styles.headerSubtitle}>
            {order?.traiteur?.name || "Traiteur Dabari"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode de réception */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>MODE DE RÉCEPTION</Text>
          <View style={styles.pillsRow}>
            <TouchableOpacity
              style={[
                styles.modePill,
                deliveryType === "delivery" && styles.modePillActive,
              ]}
              onPress={() => setDeliveryType("delivery")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="bicycle"
                size={18}
                color={deliveryType === "delivery" ? "#1D6B45" : "#64748B"}
              />
              <Text
                style={[
                  styles.modePillText,
                  deliveryType === "delivery" && styles.modePillTextActive,
                ]}
              >
                Livraison à domicile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modePill,
                deliveryType === "pickup" && styles.modePillActive,
              ]}
              onPress={() => setDeliveryType("pickup")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="storefront"
                size={18}
                color={deliveryType === "pickup" ? "#1D6B45" : "#64748B"}
              />
              <Text
                style={[
                  styles.modePillText,
                  deliveryType === "pickup" && styles.modePillTextActive,
                ]}
              >
                À emporter
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plats commandés */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>
              PLATS SÉLECTIONNÉS ({orderItems.length})
            </Text>
            <TouchableOpacity
              style={styles.addMoreToggle}
              onPress={() => setShowAddMenu(!showAddMenu)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showAddMenu ? "chevron-up" : "add-circle-outline"}
                size={16}
                color="#1D6B45"
              />
              <Text style={styles.addMoreToggleText}>
                {showAddMenu ? "Fermer la carte" : "Ajouter des plats"}
              </Text>
            </TouchableOpacity>
          </View>

          {orderItems.length === 0 ? (
            <View style={styles.emptyItemsBox}>
              <Text style={styles.emptyItemsText}>
                Aucun plat dans votre commande. Veuillez en ajouter ci-dessous.
              </Text>
            </View>
          ) : (
            <View style={styles.dishList}>
              {orderItems.map((item) => (
                <View key={item.dish_id} style={styles.dishRowCard}>
                  {/* Visuel du plat */}
                  <View style={styles.dishThumbnailContainer}>
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.dishThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.dishThumbnailPlaceholder}>
                        <Ionicons
                          name="restaurant-outline"
                          size={20}
                          color="#1D6B45"
                        />
                      </View>
                    )}
                  </View>

                  {/* Infos Plat */}
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={styles.dishName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.dishPriceUnit}>
                      {item.price.toFixed(2)} € / unité
                    </Text>
                  </View>

                  {/* Stepper + Suppression */}
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateQuantity(item.dish_id, -1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={14} color="#1D6B45" />
                    </TouchableOpacity>

                    <Text style={styles.stepperQty}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateQuantity(item.dish_id, 1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={14} color="#1D6B45" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteDishBtn}
                      onPress={() => removeDish(item.dish_id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Section Ajouter d'autres plats avec Images Visuelles */}
          {showAddMenu && (
            <View style={styles.menuAccordion}>
              <Text style={styles.menuAccordionTitle}>
                Carte de {order?.traiteur?.name || "ce traiteur"}
              </Text>
              {availableDishes.length === 0 ? (
                <Text style={styles.noDishesText}>
                  Aucun autre plat disponible pour ce traiteur.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {availableDishes.map((dish) => {
                    const inOrder = orderItems.find(
                      (i) => i.dish_id === dish.id,
                    );
                    const dishImg = getDishImage(dish);
                    return (
                      <View key={dish.id} style={styles.availableDishRow}>
                        {/* Visuel du plat proposé */}
                        <View style={styles.dishThumbnailContainerSmall}>
                          {dishImg ? (
                            <Image
                              source={{ uri: dishImg }}
                              style={styles.dishThumbnailSmall}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.dishThumbnailPlaceholderSmall}>
                              <Ionicons
                                name="restaurant-outline"
                                size={16}
                                color="#1D6B45"
                              />
                            </View>
                          )}
                        </View>

                        <View style={{ flex: 1, paddingHorizontal: 8 }}>
                          <Text
                            style={styles.availableDishName}
                            numberOfLines={1}
                          >
                            {dish.name}
                          </Text>
                          <Text style={styles.availableDishPrice}>
                            {Number(dish.price).toFixed(2)} €
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.addDishPillBtn,
                            inOrder && styles.addDishPillBtnActive,
                          ]}
                          onPress={() => addDish(dish)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={inOrder ? "add" : "add-circle-outline"}
                            size={14}
                            color={inOrder ? "#1D6B45" : "#FFFFFF"}
                          />
                          <Text
                            style={[
                              styles.addDishPillText,
                              inOrder && styles.addDishPillTextActive,
                            ]}
                          >
                            {inOrder
                              ? `Ajouté (${inOrder.quantity})`
                              : "Ajouter"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Total révisé */}
          <View style={styles.revisedTotalBanner}>
            <View>
              <Text style={styles.revisedTotalLabel}>Montant total révisé</Text>
              <Text style={styles.revisedTotalValue}>
                {getTotalAmount().toFixed(2)} €
              </Text>
            </View>
            <View style={styles.itemsCountBadge}>
              <Text style={styles.itemsCountText}>
                {orderItems.reduce((acc, cur) => acc + cur.quantity, 0)}{" "}
                article(s)
              </Text>
            </View>
          </View>
        </View>

        {/* Adresse de livraison si applicable */}
        {deliveryType === "delivery" && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionLabel}>ADRESSE DE LIVRAISON</Text>
            <AddressAutocomplete
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              onSelectAddress={(item) => setDeliveryAddress(item.label)}
              placeholder="Ex: 15 Rue de Paris, 75001 Paris"
            />
          </View>
        )}

        {/* Instructions */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>INSTRUCTIONS & PRÉCISIONS</Text>
          <TextInput
            style={styles.multilineInput}
            value={orderNotes}
            onChangeText={setOrderNotes}
            placeholder="Digicode, heure souhaitée, allergies ou consignes particulières..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Bouton de sauvegarde centré - Actif uniquement en cas de modifications réelles */}
        <View style={styles.footerCentered}>
          <TouchableOpacity
            style={[
              styles.saveBtnCentered,
              (!hasChanges || isSaving || orderItems.length === 0) &&
                styles.saveBtnDisabled,
            ]}
            onPress={handleSaveClick}
            disabled={!hasChanges || isSaving || orderItems.length === 0}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Ionicons
                  name={hasChanges ? "checkmark-circle" : "lock-closed-outline"}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveBtnText}>
                  {hasChanges
                    ? "Enregistrer les modifications"
                    : "Aucune modification"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1D6B45",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#1D6B45",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1D6B45",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#E2E8F0",
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  modePillActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#1D6B45",
  },
  modePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  modePillTextActive: {
    color: "#1D6B45",
  },
  addMoreToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
  },
  addMoreToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
  emptyItemsBox: {
    padding: 16,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  emptyItemsText: {
    fontSize: 12,
    color: "#B45309",
    textAlign: "center",
  },
  dishList: {
    gap: 10,
  },
  dishRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dishThumbnailContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    marginRight: 10,
  },
  dishThumbnail: {
    width: "100%",
    height: "100%",
  },
  dishThumbnailPlaceholder: {
    flex: 1,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  dishThumbnailContainerSmall: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  dishThumbnailSmall: {
    width: "100%",
    height: "100%",
  },
  dishThumbnailPlaceholderSmall: {
    flex: 1,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  dishName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  dishPriceUnit: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperQty: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 18,
    textAlign: "center",
  },
  deleteDishBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 3,
  },
  menuAccordion: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.2)",
    gap: 10,
    marginTop: 4,
  },
  menuAccordionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D6B45",
  },
  noDishesText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 6,
  },
  availableDishRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  availableDishName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  availableDishPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D6B45",
  },
  addDishPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1D6B45",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addDishPillBtnActive: {
    backgroundColor: "#DCFCE7",
  },
  addDishPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  addDishPillTextActive: {
    color: "#1D6B45",
  },
  revisedTotalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.3)",
    marginTop: 4,
  },
  revisedTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#166534",
  },
  revisedTotalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1D6B45",
  },
  itemsCountBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(29, 107, 69, 0.2)",
  },
  itemsCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D6B45",
  },
  multilineInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 80,
    textAlignVertical: "top",
  },
  footerCentered: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  saveBtnCentered: {
    backgroundColor: "#1D6B45",
    width: "100%",
    maxWidth: 320,
    paddingVertical: 14,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.7,
  },
  saveBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
