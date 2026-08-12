import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deleteSecureToken, getSecureToken } from "../../utils/storage";

const CITIES = [
  "Paris",
  "Saint-Denis",
  "Aubervilliers",
  "Montreuil",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Toulouse",
  "Lille",
  "Créteil",
  "Vitry-sur-Seine",
  "Évry",
  "Bruxelles",
];

export default function ProfilScreen() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<
    "client" | "traiteur" | "gp" | "admin"
  >("client");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  // UI Accordéon & Modals
  const [showInfo, setShowInfo] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [saving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getInitials = (name: string) => {
    if (!name.trim()) return "U";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const load = async () => {
      const token = await getSecureToken("token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        );
        const decodedPayload = JSON.parse(jsonPayload);

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/auth/user/${decodedPayload.userId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await response.json();
        if (!response.ok) {
          await deleteSecureToken("token"); 
          router.push("/login");
          return;
        }

        if (data.foundUser) {
          setUserEmail(data.foundUser.email || "");
          setUserRole(data.foundUser.role || "client");
          setFullName(data.foundUser.full_name || "");
          setPhone(data.foundUser.phone || "");
          setCity(data.foundUser.city || "");
          setLoading(false);
        }
      } catch (err) {
        console.error("Erreur décodage token profil:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function disconnect() {
    await deleteSecureToken("token");
    router.push("/login");
  }

  async function updateProfil() {
    const token = await getSecureToken("token");
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      const decodedPayload = JSON.parse(jsonPayload);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/${decodedPayload.userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            phone: phone,
            city: city,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la sauvegarde");
        return;
      }
      console.log(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur de modification du profil:", err);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D6B45" />
        <Text style={styles.loadingText}>Chargement de votre profil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Top Header Vert */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/accueil")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.backBtnText}>Accueil</Text>
          </TouchableOpacity>

          {/* Avatar & Role Badge */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
            </View>

            <View
              style={[
                styles.roleBadge,
                userRole === "traiteur"
                  ? styles.roleBadgeGold
                  : styles.roleBadgeTranslucent,
              ]}
            >
              <Ionicons
                name={
                  userRole === "traiteur"
                    ? "restaurant"
                    : userRole === "gp"
                      ? "airplane"
                      : userRole === "admin"
                        ? "shield-checkmark"
                        : "person"
                }
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.roleBadgeText}>
                {userRole === "traiteur"
                  ? "Traiteur"
                  : userRole === "gp"
                    ? "GP Voyageur"
                    : userRole === "admin"
                      ? "Admin"
                      : "Client"}
              </Text>
            </View>
          </View>
        </View>

        {/* ScrollView Principal */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* CARTE 1: MES INFORMATIONS (Accordéon) */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setShowInfo(!showInfo)}
              activeOpacity={0.8}
            >
              <View style={styles.accordionTitleRow}>
                <View style={styles.iconCircleGreen}>
                  <Ionicons name="create-outline" size={18} color="#1D6B45" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Mes informations</Text>
                  <Text style={styles.cardSubtext}>
                    {showInfo
                      ? "Masquer les champs d'édition"
                      : "Consulter et modifier votre profil"}
                  </Text>
                </View>
              </View>

              <View style={styles.chevronCircle}>
                <Ionicons
                  name={showInfo ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#64748B"
                />
              </View>
            </TouchableOpacity>

            {showInfo && (
              <View style={styles.accordionBody}>
                {success && (
                  <View style={styles.successBanner}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#1D6B45"
                    />
                    <Text style={styles.successBannerText}>
                      Profil mis à jour avec succès
                    </Text>
                  </View>
                )}

                {error && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                )}

                {/* Champ Email (Lecture seule) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="mail-outline" size={14} color="#1D6B45" />{" "}
                    Email
                  </Text>
                  <View style={styles.disabledInput}>
                    <Text style={styles.disabledInputText}>{userEmail}</Text>
                  </View>
                  <Text style={styles.fieldNote}>
                    L'email ne peut pas être modifié
                  </Text>
                </View>

                {/* Champ Nom complet */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="person-outline" size={14} color="#1D6B45" />{" "}
                    Nom complet
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Aminata Diallo"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Champ Téléphone */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="call-outline" size={14} color="#1D6B45" />{" "}
                    Téléphone{" "}
                    <Text style={styles.optionalText}>(optionnel)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="06 12 34 56 78"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Champ Ville */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#1D6B45"
                    />{" "}
                    Ville <Text style={styles.optionalText}>(optionnel)</Text>
                  </Text>

                  <TouchableOpacity
                    style={styles.cityPickerBtn}
                    onPress={() => setShowCityPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.cityPickerBtnText,
                        !city && { color: "#94A3B8" },
                      ]}
                    >
                      {city || "Sélectionne ta ville"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Bouton de Sauvegarde */}
                <TouchableOpacity
                  style={styles.saveBtn}
                  activeOpacity={0.85}
                  onPress={() => updateProfil()}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* CARTE 2: MES ACTIVITÉS */}
          <View style={styles.card}>
            <Text style={styles.cardSectionHeader}>Mes activités</Text>

            {/* Mes commandes */}
            <TouchableOpacity
              style={styles.activityRow}
              onPress={() => router.push("/commandes")}
              activeOpacity={0.7}
            >
              <View style={styles.activityLeft}>
                <View style={styles.activityIconCircleGreen}>
                  <Ionicons name="cube-outline" size={18} color="#1D6B45" />
                </View>
                <Text style={styles.activityText}>Mes commandes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Espace Traiteur */}
            <TouchableOpacity
              style={styles.activityRow}
              onPress={() =>
                router.push(
                  (userRole === "traiteur"
                    ? "/profil/traiteur"
                    : "/profil/traiteur/create") as any,
                )
              }
              activeOpacity={0.7}
            >
              <View style={styles.activityLeft}>
                <View style={styles.activityIconCircleGold}>
                  <Ionicons
                    name="restaurant-outline"
                    size={18}
                    color="#D4870A"
                  />
                </View>
                <View>
                  <Text style={styles.activityText}>Espace Traiteur</Text>
                  <Text style={styles.activitySubtext}>
                    {userRole === "traiteur"
                      ? "Gérer mes plats & devis"
                      : "Devenir traiteur partner"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Espace GP */}
            <TouchableOpacity
              style={styles.activityRow}
              onPress={() => router.push("/services")}
              activeOpacity={0.7}
            >
              <View style={styles.activityLeft}>
                <View style={styles.activityIconCircleBlue}>
                  <Ionicons name="airplane-outline" size={18} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.activityText}>Espace GP Colis</Text>
                  <Text style={styles.activitySubtext}>
                    Publier une annonce de transport
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* CARTE 3: DÉCONNEXION */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.logoutRow}
              activeOpacity={0.7}
              onPress={() => disconnect()}
            >
              <View style={styles.activityLeft}>
                <View style={styles.logoutIconCircle}>
                  <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
                </View>
                <Text style={styles.logoutText}>Se déconnecter</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B91C1C" />
            </TouchableOpacity>
          </View>

          {/* Version Footer */}
          <Text style={styles.versionFooter}>Dabari v1.0 — MVP Mobile</Text>
        </ScrollView>

        {/* MODAL SÉLECTION DE VILLE */}
        <Modal
          visible={showCityPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCityPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCityPicker(false)}
          >
            <View style={styles.cityModalCard}>
              <View style={styles.cityModalHeader}>
                <Text style={styles.cityModalTitle}>Sélectionne ta ville</Text>
                <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={CITIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.cityOption,
                      city === item && styles.cityOptionSelected,
                    ]}
                    onPress={() => {
                      setCity(item);
                      setShowCityPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.cityOptionText,
                        city === item && styles.cityOptionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {city === item && (
                      <Ionicons name="checkmark" size={18} color="#1D6B45" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
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

  /* Header Vert */
  headerCard: {
    backgroundColor: "#165034",
    paddingTop: 12,
    paddingBottom: 28,
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
  avatarSection: {
    alignItems: "center",
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  roleBadgeGold: {
    backgroundColor: "#D4870A",
  },
  roleBadgeTranslucent: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* ScrollView */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 30,
  },

  /* Cartes générales */
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

  /* Accordéon Informations */
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconCircleGreen: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(29, 107, 69, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  cardSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Accordion Body Form */
  accordionBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 14,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderColor: "rgba(29, 107, 69, 0.2)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  successBannerText: {
    color: "#1D6B45",
    fontSize: 13,
    fontWeight: "700",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  errorBannerText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Inputs Form */
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  optionalText: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  disabledInput: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabledInputText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
  fieldNote: {
    fontSize: 11,
    color: "#94A3B8",
  },

  /* City Picker */
  cityPickerBtn: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cityPickerBtnText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },

  /* Save Button */
  saveBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Carte Mes Activités */
  cardSectionHeader: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityIconCircleGreen: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(29, 107, 69, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityIconCircleGold: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(212, 135, 10, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityIconCircleBlue: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  activitySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 6,
  },

  /* Carte Déconnexion */
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#B91C1C",
  },

  /* Footer */
  versionFooter: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 8,
  },

  /* Modal Overlay Ville */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  cityModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    padding: 20,
  },
  cityModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cityModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  cityOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cityOptionSelected: {
    backgroundColor: "rgba(29, 107, 69, 0.08)",
  },
  cityOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  cityOptionTextSelected: {
    color: "#1D6B45",
    fontWeight: "800",
  },
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
});
