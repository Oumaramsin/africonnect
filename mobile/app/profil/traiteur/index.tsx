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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken } from "../../../utils/storage";

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
  whatsapp: string;
};

export default function TraiteurEspaceScreen() {
  const router = useRouter();

  const [view, setView] = useState<"profil" | "plats" | "setup">("profil");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [traiteur, setTraiteur] = useState<TraiteurProfile | null>(null);

  const [dishes, setDishes] = useState<Dish[]>([]);

  useEffect(() => {
    const load = async () => {
      await loadTraiteur();
    };
    load();
  }, []);

  async function loadTraiteur() {
    const token = await getSecureToken("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/traiteur/me`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      console.log(data);
      if (!response.ok) {
        setError(
          data.error ||
            data.message ||
            "Erreur lors de la récupération du profil",
        );
        setLoading(false);
        return;
      }
      if (data.isTraiteur && data.traiteur) {
        setTraiteur(data.traiteur);
        setView("profil");
        setDishes(data.traiteur.dishes || []);
      } else {
        router.replace("/profil/traiteur/create" as any);
      }
    } catch (err: any) {
      console.error(err);
      setError("Erreur de chargement du profil traiteur");
    } finally {
      setLoading(false);
    }
  }

  const toggleAvailability = (id: string) => {
    setDishes((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, is_available: !d.is_available } : d,
      ),
    );
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Card Vert */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/profil")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Profil</Text>
          </TouchableOpacity>

          <View style={styles.profileHeaderRow}>
            {traiteur?.image_url ? (
              <Image
                source={{ uri: traiteur?.image_url }}
                style={styles.headerAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.headerAvatarCircle}>
                <Ionicons name="restaurant" size={24} color="#1D6B45" />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{traiteur?.name}</Text>
              <Text style={styles.headerSubtitle}>Espace traiteur partner</Text>
            </View>
          </View>

          {/* Switcher d'onglets (Mon profil / Mes plats) */}
          <View style={styles.tabSwitcherRow}>
            <TouchableOpacity
              style={[
                styles.tabPill,
                view === "profil"
                  ? styles.tabPillActive
                  : styles.tabPillInactive,
              ]}
              onPress={() => setView("profil")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person"
                size={15}
                color={view === "profil" ? "#1D6B45" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabPillText,
                  view === "profil"
                    ? styles.tabPillTextActive
                    : styles.tabPillTextInactive,
                ]}
              >
                Mon profil
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabPill,
                view === "plats"
                  ? styles.tabPillActive
                  : styles.tabPillInactive,
              ]}
              onPress={() => setView("plats")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="restaurant"
                size={15}
                color={view === "plats" ? "#1D6B45" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabPillText,
                  view === "plats"
                    ? styles.tabPillTextActive
                    : styles.tabPillTextInactive,
                ]}
              >
                Mes plats ({dishes.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenu Principal */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── VUE 1 : MON PROFIL ── */}
          {view === "profil" && (
            <View style={styles.cardsContainer}>
              {/* Carte Informations Traiteur */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Informations</Text>
                  <TouchableOpacity
                    style={styles.editProfileBtn}
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
                    <Text style={styles.editProfileBtnText}>
                      Modifier mon profil
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.infoFieldsList}>
                  {/* Nom */}
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Nom de l'activité</Text>
                    <Text style={styles.infoValueBold}>{traiteur?.name}</Text>
                  </View>

                  {/* Présentation */}
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Présentation</Text>
                    <Text style={styles.infoValueText}>{traiteur?.bio}</Text>
                  </View>

                  {/* Cuisines */}
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Cuisines proposées</Text>
                    <View style={styles.pillsWrapRow}>
                      {traiteur?.cuisine_type.map((c) => (
                        <View key={c} style={styles.cuisinePillGreen}>
                          <Text style={styles.cuisinePillGreenText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Zones de livraison */}
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Zones de livraison</Text>
                    <View style={styles.pillsWrapRow}>
                      {traiteur?.delivery_zones.map((z) => (
                        <View key={z} style={styles.zonePillGray}>
                          <Ionicons name="location" size={12} color="#64748B" />
                          <Text style={styles.zonePillGrayText}>{z}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Carte Statut Activité */}
              <View style={styles.card}>
                <View style={styles.statusRow}>
                  <View>
                    <Text style={styles.cardTitle}>Statut de l'activité</Text>
                    <Text style={styles.cardSubtext}>
                      Visible sur la plateforme par les clients
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      traiteur?.is_active
                        ? styles.statusBadgeActive
                        : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        traiteur?.is_active
                          ? styles.statusBadgeTextActive
                          : styles.statusBadgeTextInactive,
                      ]}
                    >
                      {traiteur?.is_active ? "✓ Actif" : "Inactif"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Carte Lien Page Publique */}
              <TouchableOpacity
                style={styles.publicPageCard}
                onPress={() => router.push(`/traiteur/${traiteur.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.publicPageLeft}>
                  <View style={styles.eyeIconCircle}>
                    <Ionicons name="eye-outline" size={20} color="#1D6B45" />
                  </View>
                  <Text style={styles.publicPageText}>
                    Voir ma page publique
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── VUE 2 : MES PLATS ── */}
          {view === "plats" && (
            <View style={styles.cardsContainer}>
              {/* Bouton Ajouter un Plat */}
              <TouchableOpacity
                style={styles.addDishMainBtn}
                onPress={() =>
                  router.push("/profil/traiteur/addOrEditDish" as any)
                }
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addDishMainBtnText}>Ajouter un plat</Text>
              </TouchableOpacity>

              {/* Liste des Plats */}
              {dishes.length === 0 ? (
                <View style={styles.emptyDishesBox}>
                  <Ionicons
                    name="restaurant-outline"
                    size={48}
                    color="#CBD5E1"
                  />
                  <Text style={styles.emptyDishesTitle}>Aucun plat encore</Text>
                  <Text style={styles.emptyDishesSubtext}>
                    Ajoute ton premier plat pour commencer à recevoir des
                    commandes !
                  </Text>
                </View>
              ) : (
                dishes.map((dish) => (
                  <View key={dish.id} style={styles.dishCardItem}>
                    <View style={styles.dishTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dishNameText}>{dish.name}</Text>
                        <Text style={styles.dishDescText} numberOfLines={2}>
                          {dish.description}
                        </Text>
                      </View>
                      <Text style={styles.dishPriceText}>
                        {Number(dish.price).toFixed(2)} €
                      </Text>
                    </View>

                    <View style={styles.dishBottomRow}>
                      <View style={styles.cuisineTagPill}>
                        <Text style={styles.cuisineTagText}>
                          {dish.cuisine_type}
                        </Text>
                      </View>

                      <View style={styles.dishActionsRow}>
                        {/* Bouton Disponibilité */}
                        <TouchableOpacity
                          style={[
                            styles.availBadgeBtn,
                            dish.is_available
                              ? styles.availBadgeBtnActive
                              : styles.availBadgeBtnInactive,
                          ]}
                          onPress={() => toggleAvailability(dish.id)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.availBadgeBtnText,
                              dish.is_available
                                ? styles.availBadgeBtnTextActive
                                : styles.availBadgeBtnTextInactive,
                            ]}
                          >
                            {dish.is_available
                              ? "✓ Disponible"
                              : "Indisponible"}
                          </Text>
                        </TouchableOpacity>

                        {/* Bouton Modifier */}
                        <TouchableOpacity
                          style={styles.actionTextBtn}
                          onPress={() =>
                            router.push("/profil/traiteur/addOrEditDish" as any)
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={styles.editActionText}>Modifier</Text>
                        </TouchableOpacity>

                        {/* Bouton Supprimer */}
                        <TouchableOpacity
                          style={styles.actionTextBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.deleteActionText}>Supprimer</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
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

  /* Header Card Vert Émeraude */
  headerCard: {
    backgroundColor: "#165034",
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "700",
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  headerAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  headerAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },

  /* Tab Switcher */
  tabSwitcherRow: {
    flexDirection: "row",
    gap: 10,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: "#FFFFFF",
  },
  tabPillInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabPillTextActive: {
    color: "#1D6B45",
  },
  tabPillTextInactive: {
    color: "#FFFFFF",
  },

  /* ScrollView Main */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardsContainer: {
    gap: 14,
  },

  /* Cards Générales */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  cardSubtext: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  editProfileBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  editProfileBtnText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Info Fields */
  infoFieldsList: {
    gap: 14,
  },
  infoGroup: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  infoValueBold: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
  },
  infoValueText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
  },
  pillsWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  cuisinePillGreen: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cuisinePillGreenText: {
    color: "#1D6B45",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  zonePillGray: {
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  zonePillGrayText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Statut Card */
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusBadgeActive: {
    backgroundColor: "#E8F5E9",
  },
  statusBadgeInactive: {
    backgroundColor: "#F1F5F9",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusBadgeTextActive: {
    color: "#1D6B45",
  },
  statusBadgeTextInactive: {
    color: "#64748B",
  },

  /* Public Page Link Card */
  publicPageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  publicPageLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eyeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(29, 107, 69, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  publicPageText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },

  /* Vue Plats */
  addDishMainBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addDishMainBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyDishesBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyDishesTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#475569",
    marginTop: 12,
  },
  emptyDishesSubtext: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },

  /* Dish Card Item */
  dishCardItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  dishTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  dishNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  dishDescText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 18,
  },
  dishPriceText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1D6B45",
  },
  dishBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cuisineTagPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cuisineTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "capitalize",
  },
  dishActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  availBadgeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  availBadgeBtnActive: {
    backgroundColor: "#E8F5E9",
  },
  availBadgeBtnInactive: {
    backgroundColor: "#F1F5F9",
  },
  availBadgeBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  availBadgeBtnTextActive: {
    color: "#1D6B45",
  },
  availBadgeBtnTextInactive: {
    color: "#64748B",
  },
  actionTextBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  editActionText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteActionText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
});
