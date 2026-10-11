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
  Alert,
  DeviceEventEmitter,
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
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      // Fetch du compteur de notifications
      try {
        const notifRes = await apiFetch("/notifications");
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setUnreadNotifCount(notifData.unread_count || 0);
        }
      } catch (e) {
        // Silencieux
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

      const sub1 = DeviceEventEmitter.addListener(
        "dabari_orders_updated",
        () => loadProfile(),
      );
      const sub2 = DeviceEventEmitter.addListener(
        "dabari_notifications_updated",
        () => loadProfile(),
      );

      return () => {
        sub1.remove();
        sub2.remove();
      };
    }, []),
  );

  async function disconnect() {
    await deleteSecureToken("token");
    router.replace("/login");
  }

  async function confirmDeleteAccount() {
    if (!userId) return;
    setDeleting(true);
    try {
      const response = await apiFetch(`/auth/${userId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await deleteSecureToken("token");
        setShowDeleteModal(false);
        router.replace("/login");
      } else {
        const data = await response.json();
        Alert.alert(
          "Erreur",
          data.message || "Impossible de supprimer le compte.",
        );
      }
    } catch (err: any) {
      Alert.alert("Erreur", "Erreur lors de la suppression du compte.");
    } finally {
      setDeleting(false);
    }
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
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        {/* ── 1. HEADER HERO BANNER (STYLE WEB DABARI) ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push("/accueil")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.backBtnText}>Accueil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={15} color="#FFFFFF" />
              <Text style={styles.headerLogoutText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>

          {/* Profil Carte Identité */}
          <View style={styles.profileIdentityRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
            </View>

            <View style={styles.identityDetails}>
              <View style={styles.nameAndBadgeRow}>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {fullName || "Membre Dabari"}
                </Text>
              </View>

              <View style={styles.roleBadgeWrapper}>
                <View
                  style={[
                    styles.roleBadge,
                    userRole === "traiteur" || (userRole !== "admin" && isTraiteur)
                      ? styles.roleBadgeGold
                      : userRole === "gp"
                        ? styles.roleBadgeSky
                        : userRole === "admin"
                          ? styles.roleBadgePurple
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
                    size={12}
                    color="#FFFFFF"
                  />
                  <Text style={styles.roleBadgeText}>
                    {userRole === "admin"
                      ? "Administrateur"
                      : userRole === "traiteur" || isTraiteur
                        ? "Traiteur Partenaire"
                        : userRole === "gp"
                          ? "Transporteur GP"
                          : "Membre Client"}
                  </Text>
                </View>
              </View>

              <Text style={styles.userEmailText} numberOfLines={1}>
                {userEmail || "Compte utilisateur"}
              </Text>

              <View style={styles.securityCheckRow}>
                <Ionicons name="checkmark-circle" size={12} color="#6EE7B7" />
                <Text style={styles.securityCheckText}>
                  Profil vérifié • Compte sécurisé
                </Text>
              </View>
            </View>
          </View>

          {/* Raccourcis Directs Commandes & Notifications */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={[styles.quickOrderBtn, { flex: 1 }]}
              onPress={() => router.push("/commandes")}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="cube-outline" size={15} color="#0B3B24" />
                <Text style={styles.quickOrderBtnText}>Commandes</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#0B3B24" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickOrderBtn, { flex: 1 }]}
              onPress={() => router.push("/notifications" as any)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="notifications-outline" size={15} color="#0B3B24" />
                <Text style={styles.quickOrderBtnText}>Alertes</Text>
              </View>
              {unreadNotifCount > 0 ? (
                <View style={styles.quickNotifBadge}>
                  <Text style={styles.quickNotifBadgeText}>
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={14} color="#0B3B24" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. CONTENU PRINCIPAL (FOND CLAIR DOUX #F8FAFC) ── */}
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

          {/* ── SECTION 1 : MES ESPACES MÉTIERS (STYLE WEB) ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Mes espaces métiers</Text>
              <View style={styles.servicesPill}>
                <Text style={styles.servicesPillText}>SERVICES</Text>
              </View>
            </View>

            <View style={styles.servicesList}>
              {/* Espace Commandes */}
              <TouchableOpacity
                style={styles.serviceRow}
                onPress={() => router.push("/commandes")}
                activeOpacity={0.7}
              >
                <View style={styles.serviceLeft}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: "#ECFDF5" }]}>
                    <Ionicons name="cube-outline" size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Mes commandes</Text>
                    <Text style={styles.serviceSubtitle}>
                      Suivi traiteur & expéditions GP
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.dividerLine} />

              {/* Centre de Notifications */}
              <TouchableOpacity
                style={styles.serviceRow}
                onPress={() => router.push("/notifications" as any)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceLeft}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: "#FDF2F8" }]}>
                    <Ionicons name="notifications-outline" size={20} color="#DB2777" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.serviceTitle}>Centre de notifications</Text>
                      {unreadNotifCount > 0 && (
                        <View style={styles.serviceUnreadBadge}>
                          <Text style={styles.serviceUnreadBadgeText}>
                            {unreadNotifCount} {unreadNotifCount > 1 ? "nouvelles" : "nouvelle"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.serviceSubtitle}>
                      Alertes devis, acomptes, plats & vols GP
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.dividerLine} />

              {/* Espace Traiteur */}
              <TouchableOpacity
                style={styles.serviceRow}
                onPress={() => router.push("/profil/traiteur" as any)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceLeft}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="restaurant-outline" size={20} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Espace Traiteur</Text>
                    <Text style={styles.serviceSubtitle}>
                      {isTraiteur || userRole === "traiteur"
                        ? "Gérer ma carte, plats & devis"
                        : "Devenir traiteur partenaire"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.dividerLine} />

              {/* Espace GP */}
              <TouchableOpacity
                style={styles.serviceRow}
                onPress={() => router.push("/profil/gp" as any)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceLeft}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: "#E0F2FE" }]}>
                    <Ionicons name="airplane-outline" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Espace GP Colis</Text>
                    <Text style={styles.serviceSubtitle}>
                      {userRole === "gp"
                        ? "Gérer mes vols & réservations"
                        : "Proposer des kilos sur un vol"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* Espace Administration si Admin */}
              {userRole === "admin" && (
                <>
                  <View style={styles.dividerLine} />
                  <TouchableOpacity
                    style={styles.serviceRow}
                    onPress={() => router.push("/admin" as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.serviceLeft}>
                      <View style={[styles.serviceIconCircle, { backgroundColor: "#F3E8FF" }]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#7E22CE" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceTitle}>Console Administration</Text>
                        <Text style={styles.serviceSubtitle}>
                          Gestion globale, modération & utilisateurs
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* ── SECTION 2 : INFORMATIONS PERSONNELLES (FORMULAIRE MODERNE) ── */}
          <View style={styles.sectionCard}>
            <View style={styles.formHeaderRow}>
              <View style={styles.formHeaderLeft}>
                <View style={styles.iconCircleGreen}>
                  <Ionicons name="create-outline" size={18} color="#1D6B45" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Informations personnelles</Text>
                  <Text style={styles.sectionSubtitle}>
                    Mettez à jour vos coordonnées pour vos commandes et livraisons.
                  </Text>
                </View>
              </View>
            </View>

            {success && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#1D6B45" />
                <Text style={styles.successBannerText}>
                  Modifications enregistrées avec succès !
                </Text>
              </View>
            )}

            <View style={styles.formFields}>
              {/* Email (Lecture seule) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Adresse Email</Text>
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={10} color="#64748B" />
                    <Text style={styles.lockBadgeText}>Non modifiable</Text>
                  </View>
                </View>
                <View style={styles.disabledInput}>
                  <Ionicons name="mail-outline" size={16} color="#94A3B8" />
                  <Text style={styles.disabledInputText}>{userEmail}</Text>
                </View>
              </View>

              {/* Nom complet */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom complet *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={16} color="#1D6B45" />
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Aminata Diallo"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Téléphone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Numéro de téléphone <Text style={styles.optionalText}>(optionnel)</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={16} color="#1D6B45" />
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
              </View>

              {/* Ville ou Adresse de livraison principale */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Ville ou Adresse de livraison principale <Text style={styles.optionalText}>(optionnel)</Text>
                </Text>
                <AddressAutocomplete
                  value={city}
                  onChangeText={setCity}
                  onSelectAddress={(item) => {
                    setCity(item.label);
                  }}
                  placeholder="Rechercher une adresse ou une ville (ex: Paris, Dakar...)"
                />
              </View>

              {/* Bouton de Sauvegarde */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                disabled={saving}
                activeOpacity={0.85}
                onPress={updateProfil}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Sauvegarder les modifications</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SECTION 3 : GARANTIE DE SÉCURITÉ DABARI (STYLE WEB) ── */}
          <View style={styles.securityBox}>
            <View style={styles.securityIconBox}>
              <Ionicons name="shield-checkmark" size={20} color="#1D6B45" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityBoxTitle}>Garantie de Sécurité Dabari</Text>
              <Text style={styles.securityBoxSub}>
                Vos informations personnelles et adresses de livraison sont protégées. Aucune donnée sensible n'est partagée sans votre accord.
              </Text>
            </View>
          </View>

          {/* ── SECTION CADRE LÉGAL & CGU ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.dangerSectionTitle}>Cadre Légal & Confiance</Text>

            <TouchableOpacity
              style={styles.accountActionRow}
              activeOpacity={0.7}
              onPress={() => router.push("/cgu" as any)}
            >
              <View style={styles.accountActionLeft}>
                <View style={[styles.actionIconCircle, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="document-text-outline" size={17} color="#166534" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountActionText}>Conditions Générales (CGU)</Text>
                  <Text style={{ fontSize: 11, color: "#64748B", fontWeight: "500" }}>
                    Cotransportage GP, séquestre Dabari & règles officielles
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* ── SECTION 4 : GESTION DU COMPTE & DANGER ZONE ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.dangerSectionTitle}>Gestion du compte</Text>

            <TouchableOpacity
              style={styles.accountActionRow}
              activeOpacity={0.7}
              onPress={() => setShowLogoutModal(true)}
            >
              <View style={styles.accountActionLeft}>
                <View style={[styles.actionIconCircle, { backgroundColor: "#F1F5F9" }]}>
                  <Ionicons name="log-out-outline" size={17} color="#475569" />
                </View>
                <Text style={styles.accountActionText}>Se déconnecter de la session</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.dividerLine} />

            <TouchableOpacity
              style={[styles.accountActionRow, { backgroundColor: "#FEF2F2" }]}
              activeOpacity={0.7}
              onPress={() => setShowDeleteModal(true)}
            >
              <View style={styles.accountActionLeft}>
                <View style={[styles.actionIconCircle, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                </View>
                <Text style={[styles.accountActionText, { color: "#DC2626", fontWeight: "700" }]}>
                  Supprimer mon compte définitivement
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>

          <Text style={styles.versionFooter}>Dabari Mobile • Version 1.0 Sécurisée</Text>
        </ScrollView>

        {/* ── MODALE DE CONFIRMATION DE DÉCONNEXION ── */}
        <Modal
          visible={showLogoutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogIconContainer}>
                <Ionicons name="log-out-outline" size={30} color="#0B3B24" />
              </View>

              <Text style={styles.dialogTitle}>Se déconnecter ?</Text>
              <Text style={styles.dialogSubtext}>
                Êtes-vous sûr(e) de vouloir vous déconnecter de votre compte Dabari ?
              </Text>

              <View style={styles.dialogButtonsRow}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setShowLogoutModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dialogCancelText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogConfirmLogoutBtn}
                  onPress={disconnect}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dialogConfirmLogoutText}>Oui, me déconnecter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODALE DE CONFIRMATION DE SUPPRESSION DE COMPTE ── */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!deleting) setShowDeleteModal(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <View style={[styles.dialogIconContainer, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="warning-outline" size={32} color="#DC2626" />
              </View>

              <Text style={styles.dialogTitle}>Supprimer votre compte ?</Text>
              <Text style={styles.dialogSubtext}>
                Cette action est irréversible et supprimera l'ensemble de vos données, commandes et annonces Dabari.
              </Text>

              <View style={styles.dialogButtonsRow}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dialogCancelText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogConfirmDeleteBtn}
                  onPress={confirmDeleteAccount}
                  disabled={deleting}
                  activeOpacity={0.85}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogConfirmDeleteText}>Oui, supprimer</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#0B3B24",
    fontWeight: "700",
  },

  /* ── Header Hero Banner ── */
  headerCard: {
    backgroundColor: "#0B3B24",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  headerLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 14,
  },
  headerLogoutText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "600",
  },

  profileIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#D4870A",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  identityDetails: {
    flex: 1,
    gap: 3,
  },
  nameAndBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userNameText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  roleBadgeWrapper: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeGold: {
    backgroundColor: "#D4870A",
  },
  roleBadgeSky: {
    backgroundColor: "#0284C7",
  },
  roleBadgePurple: {
    backgroundColor: "#9333EA",
  },
  roleBadgeTranslucent: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  userEmailText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.82)",
    fontWeight: "500",
  },
  securityCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  securityCheckText: {
    fontSize: 10.5,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "600",
  },

  quickOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  quickOrderBtnText: {
    color: "#0B3B24",
    fontSize: 12.5,
    fontWeight: "800",
  },
  quickNotifBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  quickNotifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  serviceUnreadBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  serviceUnreadBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },

  /* ── Main ScrollView ── */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
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
    fontSize: 12.5,
    fontWeight: "600",
    color: "#B91C1C",
  },

  /* ── Section Cards ── */
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  servicesPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  servicesPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },

  servicesList: {
    gap: 2,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  serviceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  serviceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  serviceSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },

  /* ── Formulaire Informations ── */
  formHeaderRow: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  formHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconCircleGreen: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  successBannerText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#166534",
  },

  formFields: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },

  disabledInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  disabledInputText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
    padding: 0,
  },

  saveBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },

  /* ── Reassurance Box ── */
  securityBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 16,
  },
  securityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  securityBoxTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  securityBoxSub: {
    fontSize: 11.5,
    color: "#15803D",
    marginTop: 2,
    lineHeight: 16,
  },

  /* ── Danger Zone ── */
  dangerSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#94A3B8",
    marginBottom: 8,
  },
  accountActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  accountActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  accountActionText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
  },

  versionFooter: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },

  /* ── Dialog Modals ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  dialogSubtext: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  dialogButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dialogCancelText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  dialogConfirmLogoutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#0B3B24",
    alignItems: "center",
    justifyContent: "center",
  },
  dialogConfirmLogoutText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  dialogConfirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  dialogConfirmDeleteText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
