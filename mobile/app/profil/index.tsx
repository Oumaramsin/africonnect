import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deleteSecureToken, getSecureToken } from "../../utils/storage";
import { apiFetch } from "../../utils/api";
import AddressAutocomplete from "../../components/AddressAutocomplete";

export default function ProfilScreen() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<
    "client" | "traiteur" | "gp" | "admin"
  >("client");
  const [isTraiteur, setIsTraiteur] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [showInfo, setShowInfo] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const loadProfile = async () => {
    setLoading(true);
    const token = await getSecureToken("token");
    if (!token) {
      router.replace("/login");
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
      setUserId(decodedPayload.userId || "");

      const response = await apiFetch(`/auth/user/${decodedPayload.userId}`);
      const data = await response.json();
      if (response.ok && data.foundUser) {
        setUserEmail(data.foundUser.email || "");
        setUserRole(data.foundUser.role || decodedPayload.role || "client");
        setFullName(data.foundUser.full_name || "");
        setPhone(data.foundUser.phone || "");
        setCity(data.foundUser.city || "");
      }

      // Détecte si l'utilisateur possède déjà une fiche traiteur
      try {
        const traiteurRes = await apiFetch("/traiteur/me");
        if (traiteurRes.ok) {
          const traiteurData = await traiteurRes.json();
          setIsTraiteur(
            Boolean(traiteurData.isTraiteur && traiteurData.traiteur),
          );
        }
      } catch (e) {
        console.warn("Vérification statut traiteur échouée :", e);
      }
    } catch (err) {
      console.error("Erreur chargement profil:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  async function disconnect() {
    await deleteSecureToken("token");
    router.replace("/login");
  }

  async function updateProfil() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiFetch(`/auth/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          phone: phone,
          city: city,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la sauvegarde");
        return;
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Erreur de modification du profil");
    } finally {
      setSaving(false);
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

          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
            </View>

            <View
              style={[
                styles.roleBadge,
                userRole === "traiteur" || (userRole !== "admin" && isTraiteur)
                  ? styles.roleBadgeGold
                  : styles.roleBadgeTranslucent,
              ]}
            >
              <Ionicons
                name={
                  userRole === "admin"
                    ? "shield-checkmark"
                    : userRole === "traiteur" || isTraiteur
                      ? "restaurant"
                      : userRole === "gp"
                        ? "airplane"
                        : "person"
                }
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.roleBadgeText}>
                {userRole === "admin"
                  ? "Admin"
                  : userRole === "traiteur" || isTraiteur
                    ? "Traiteur"
                    : userRole === "gp"
                      ? "GP Voyageur"
                      : "Client"}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Boolean(error) && (
            <View style={styles.errorGlobalBox}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorGlobalText}>{error}</Text>
            </View>
          )}

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

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="call-outline" size={14} color="#1D6B45" />{" "}
                    Téléphone{" "}
                    <Text style={styles.optionalText}>(optionnel)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={(val) => {
                      let cleaned = val.replace(/[^0-9+]/g, "");
                      if (cleaned.startsWith("+")) {
                        cleaned = "+" + cleaned.slice(1).replace(/\+/g, "");
                      } else {
                        cleaned = cleaned.replace(/\+/g, "");
                      }
                      const maxLen = cleaned.startsWith("+") ? 16 : 15;
                      setPhone(cleaned.slice(0, maxLen));
                    }}
                    placeholder="+33612345678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={16}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#1D6B45"
                    />{" "}
                    Ville ou Adresse{" "}
                    <Text style={styles.optionalText}>(optionnel)</Text>
                  </Text>

                  <AddressAutocomplete
                    value={city}
                    onChangeText={setCity}
                    onSelectAddress={(item) => {
                      setCity(item.label);
                    }}
                    placeholder="Rechercher une adresse ou une ville (ex: Paris, 10 rue de...)"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.btnDisabled]}
                  disabled={saving}
                  activeOpacity={0.85}
                  onPress={() => updateProfil()}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      Sauvegarder les modifications
                    </Text>
                  )}
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
              onPress={() => router.push("/profil/traiteur" as any)}
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
                    {isTraiteur || userRole === "traiteur"
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
              onPress={() => router.push("/profil/gp" as any)}
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

            {/* Espace Administration (Visible UNIQUEMENT si Admin) */}
            {userRole === "admin" && (
              <>
                <View style={styles.rowDivider} />
                <TouchableOpacity
                  style={styles.activityRow}
                  onPress={() => router.push("/admin" as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityLeft}>
                    <View style={styles.activityIconCircleDark}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color="#FBBF24"
                      />
                    </View>
                    <View>
                      <Text style={styles.activityText}>
                        Espace Administration
                      </Text>
                      <Text style={styles.activitySubtext}>
                        Gestion globale des modules & modération
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </>
            )}
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

          <Text style={styles.versionFooter}>Dabari v1.0 — MVP Mobile</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topGreenWrapper: {
    flex: 1,
    backgroundColor: "#1D6B45",
  },
  container: {
    flex: 1,
    backgroundColor: "#1D6B45",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#1D6B45",
    fontWeight: "600",
  },

  headerCard: {
    backgroundColor: "#1D6B45",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "600",
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
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeGold: {
    backgroundColor: "#D4870A",
  },
  roleBadgeTranslucent: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  mainScrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  errorGlobalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    padding: 12,
  },
  errorGlobalText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#B91C1C",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
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
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardSubtext: {
    fontSize: 11,
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

  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 14,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 10,
  },
  successBannerText: {
    fontSize: 13,
    color: "#1D6B45",
    fontWeight: "600",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  optionalText: {
    fontSize: 11,
    fontWeight: "400",
    color: "#94A3B8",
  },
  disabledInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabledInputText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  fieldNote: {
    fontSize: 11,
    color: "#94A3B8",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: "#0F172A",
  },
  cityPickerBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cityPickerBtnText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  saveBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },

  cardSectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  activityIconCircleGreen: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(29, 107, 69, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityIconCircleGold: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(212, 135, 10, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityIconCircleBlue: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityIconCircleDark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#165034",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  activityText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  activitySubtext: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },

  versionFooter: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cityModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
  },
  cityModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cityModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cityOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  cityOptionSelected: {
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
  },
  cityOptionText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  cityOptionTextSelected: {
    color: "#1D6B45",
    fontWeight: "800",
  },
});
