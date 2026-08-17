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
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { getSecureToken } from "../../utils/storage";
import { apiFetch } from "../../utils/api";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  role: string;
};

type Traiteur = {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  cuisine_type: string[];
  delivery_zones: string[];
  whatsapp: string | null;
  is_active: boolean;
  created_at: string;
  profile?: {
    full_name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
};

type GpListing = {
  id: string;
  gp_id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  available_kg: number;
  price_per_kg: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  gp?: {
    full_name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
};

type Tab = "traiteurs" | "gp" | "utilisateurs";

const CUISINES = [
  "senegalais",
  "ivoirien",
  "camerounais",
  "congolais",
  "malien",
  "guineen",
  "burkinabe",
  "togolais",
  "beninois",
];

const ZONES = [
  "Paris",
  "Saint-Denis",
  "Aubervilliers",
  "Montreuil",
  "Créteil",
  "Vitry-sur-Seine",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Toulouse",
];

export default function AdminScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("traiteurs");
  const [view, setView] = useState<"liste" | "nouveau">("liste");

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [traiteurs, setTraiteurs] = useState<Traiteur[]>([]);
  const [gpListings, setGpListings] = useState<GpListing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [userForm, setUserForm] = useState({
    firstname: "",
    lastname: "",
    phone: "",
    email: "",
  });

  const [traiteurForm, setTraiteurForm] = useState({
    user_id: "",
    name: "",
    bio: "",
    cuisine_type: [] as string[],
    delivery_zones: [] as string[],
    whatsapp: "",
    is_active: true,
  });

  const [gpForm, setGpForm] = useState({
    gp_id: "",
    departure_city: "",
    departure_country: "France",
    arrival_city: "",
    arrival_country: "",
    departure_date: "",
    available_kg: "",
    price_per_kg: "",
    description: "",
    is_active: true,
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "traiteur" | "gp" | null;
    id: string | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: "",
  });

  const [userPickerConfig, setUserPickerConfig] = useState<{
    visible: boolean;
    title: string;
    onSelect: (user: Profile) => void;
  }>({
    visible: false,
    title: "",
    onSelect: () => {},
  });

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Vérification de sécurité (rôle admin) et chargement initial des données
  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    const token = await getSecureToken("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      // Décodage du payload JWT pour valider le rôle admin
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      const decodedPayload = JSON.parse(jsonPayload);

      if (decodedPayload.role !== "admin") {
        router.replace("/accueil");
        return;
      }
      setIsAuthorized(true);

      const response = await apiFetch("/admin");
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur de chargement des données");
        return;
      }

      setTraiteurs(data.data.traiteurs || []);
      setGpListings(data.data.gpListings || []);
      setProfiles(data.data.profiles || []);
    } catch (err: any) {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, []),
  );

  const handleCreateUser = async () => {
    if (!userForm.firstname.trim() || !userForm.lastname.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }
    if (!userForm.phone && !userForm.email) {
      setError("Numéro de téléphone ou email requis.");
      return;
    }
    setActionLoading(true);
    setError(null);
    setTempPassword(null);
    setCopiedPassword(false);

    const firstname = userForm.firstname.trim();
    const lastname = userForm.lastname.trim();
    const full_name = `${firstname} ${lastname}`;

    const pwd = Math.random().toString(36).slice(-8) + "A1!";
    const authEmail =
      userForm.email ||
      (userForm.phone
        ? `${userForm.phone.replace(/[^0-9]/g, "")}@dabari.app`
        : `user_${Date.now()}@dabari.app`);

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          firstname,
          lastname,
          email: authEmail,
          phone: userForm.phone || null,
          password: pwd,
          passwordConfirmation: pwd,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Erreur création utilisateur");
        setActionLoading(false);
        return;
      }

      const newProfile: Profile = {
        id: data.user?.id || data.id,
        full_name,
        phone: userForm.phone || null,
        whatsapp: userForm.phone || null,
        email: authEmail,
        role: "client",
      };

      setProfiles((prev) => [newProfile, ...prev]);
      setTempPassword(pwd);
      showSuccessMsg(`Utilisateur ${full_name} créé avec succès !`);
      setUserForm({ firstname: "", lastname: "", phone: "", email: "" });
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTraiteur = async () => {
    if (!traiteurForm.user_id || !traiteurForm.name || !traiteurForm.bio) {
      setError("Utilisateur, nom et bio requis.");
      return;
    }
    setActionLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/admin", {
        method: "POST",
        body: JSON.stringify({
          user_id: traiteurForm.user_id,
          name: traiteurForm.name,
          bio: traiteurForm.bio,
          cuisine_type: traiteurForm.cuisine_type,
          delivery_zones: traiteurForm.delivery_zones,
          whatsapp: traiteurForm.whatsapp || null,
          is_active: traiteurForm.is_active,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la création du traiteur");
        setActionLoading(false);
        return;
      }
      setTraiteurs((prev) => [data.data.traiteur, ...prev]);
      setTraiteurForm({
        user_id: "",
        name: "",
        bio: "",
        cuisine_type: [],
        delivery_zones: [],
        whatsapp: "",
        is_active: true,
      });
      showSuccessMsg("Traiteur créé et publié !");
      setView("liste");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTraiteur = async (id: string, current: boolean) => {
    setTraiteurs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t)),
    );

    try {
      const response = await apiFetch("/admin", {
        method: "PATCH",
        body: JSON.stringify({
          traiteur_id: id,
          is_active: !current,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setTraiteurs((prev) =>
          prev.map((t) => (t.id === id ? { ...t, is_active: current } : t)),
        );
        setError(data.error || "Erreur lors du changement de statut");
        return;
      }

      showSuccessMsg(!current ? "Traiteur activé !" : "Traiteur désactivé !");
    } catch (err: any) {
      setTraiteurs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: current } : t)),
      );
      setError(err.message);
    }
  };

  const handleCreateGp = async () => {
    if (
      !gpForm.gp_id ||
      !gpForm.departure_city ||
      !gpForm.arrival_city ||
      !gpForm.departure_date
    ) {
      setError("Utilisateur, villes et date requis.");
      return;
    }
    setActionLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/admin/gp", {
        method: "POST",
        body: JSON.stringify({
          user_id: gpForm.gp_id,
          departure_city: gpForm.departure_city,
          departure_country: gpForm.departure_country,
          arrival_city: gpForm.arrival_city,
          arrival_country: gpForm.arrival_country,
          departure_date: gpForm.departure_date,
          available_kg: parseFloat(gpForm.available_kg) || 0,
          price_per_kg: parseFloat(gpForm.price_per_kg) || 0,
          description: gpForm.description || null,
          is_active: gpForm.is_active,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Erreur création annonce GP",
        );
      }

      setGpListings((prev) => [data.data.gp, ...prev]);
      setGpForm({
        gp_id: "",
        departure_city: "",
        departure_country: "France",
        arrival_city: "",
        arrival_country: "",
        departure_date: "",
        available_kg: "",
        price_per_kg: "",
        description: "",
        is_active: true,
      });
      showSuccessMsg("Annonce GP créée et publiée !");
      setView("liste");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleGp = async (id: string, current: boolean) => {
    setGpListings((prev) =>
      prev.map((g) => (g.id === id ? { ...g, is_active: !current } : g)),
    );

    try {
      const response = await apiFetch("/admin/gp", {
        method: "PATCH",
        body: JSON.stringify({
          gp_id: id,
          is_active: !current,
        }),
      });

      if (!response.ok) {
        setGpListings((prev) =>
          prev.map((g) => (g.id === id ? { ...g, is_active: current } : g)),
        );
        const data = await response.json();
        setError(data.error || "Erreur de mise à jour");
        return;
      }

      showSuccessMsg(
        !current ? "Annonce GP activée !" : "Annonce GP désactivée !",
      );
    } catch (err: any) {
      setGpListings((prev) =>
        prev.map((g) => (g.id === id ? { ...g, is_active: current } : g)),
      );
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;
    setActionLoading(true);
    setError(null);

    try {
      if (deleteModal.type === "traiteur") {
        const response = await apiFetch("/admin", {
          method: "DELETE",
          body: JSON.stringify({ traiteur_id: deleteModal.id }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erreur lors de la suppression");
        }
        setTraiteurs((prev) => prev.filter((t) => t.id !== deleteModal.id));
        showSuccessMsg("Traiteur supprimé avec succès !");
      } else if (deleteModal.type === "gp") {
        const response = await apiFetch("/admin/gp", {
          method: "DELETE",
          body: JSON.stringify({ gp_id: deleteModal.id }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erreur lors de la suppression");
        }
        setGpListings((prev) => prev.filter((g) => g.id !== deleteModal.id));
        showSuccessMsg("Annonce GP supprimée avec succès !");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setDeleteModal({ isOpen: false, type: null, id: null, name: "" });
    }
  };

  const toggleCuisine = (c: string) => {
    setTraiteurForm((prev) => ({
      ...prev,
      cuisine_type: prev.cuisine_type.includes(c)
        ? prev.cuisine_type.filter((item) => item !== c)
        : [...prev.cuisine_type, c],
    }));
  };

  const toggleZone = (z: string) => {
    setTraiteurForm((prev) => ({
      ...prev,
      delivery_zones: prev.delivery_zones.includes(z)
        ? prev.delivery_zones.filter((item) => item !== z)
        : [...prev.delivery_zones, z],
    }));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  const selectedTraiteurUser = profiles.find(
    (p) => p.id === traiteurForm.user_id,
  );
  const selectedGpUser = profiles.find((p) => p.id === gpForm.gp_id);

  if (loading && !isAuthorized) {
    return (
      <View style={[styles.topGreenWrapper, styles.centerLoader]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.initialLoadingText}>Vérification des accès...</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return null;
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
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Dashboard</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleRow}>
            <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Admin Dabari</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Gérer les traiteurs, GP et utilisateurs
          </Text>

          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.8}
              onPress={() => {
                setTab("traiteurs");
                setView("liste");
              }}
            >
              <Text style={styles.statNumber}>{traiteurs.length}</Text>
              <Text style={styles.statLabel}>Traiteurs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.8}
              onPress={() => {
                setTab("gp");
                setView("liste");
              }}
            >
              <Text style={styles.statNumber}>{gpListings.length}</Text>
              <Text style={styles.statLabel}>Annonces GP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.8}
              onPress={() => {
                setTab("utilisateurs");
                setView("liste");
              }}
            >
              <Text style={styles.statNumber}>{profiles.length}</Text>
              <Text style={styles.statLabel}>Utilisateurs</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === "traiteurs" && styles.tabBtnActive,
              ]}
              onPress={() => {
                setTab("traiteurs");
                setView("liste");
                setError(null);
                setTempPassword(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="restaurant-outline"
                size={14}
                color={tab === "traiteurs" ? "#165034" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "traiteurs" && styles.tabBtnTextActive,
                ]}
              >
                Traiteurs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === "gp" && styles.tabBtnActive]}
              onPress={() => {
                setTab("gp");
                setView("liste");
                setError(null);
                setTempPassword(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="airplane-outline"
                size={14}
                color={tab === "gp" ? "#165034" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "gp" && styles.tabBtnTextActive,
                ]}
              >
                GP Colis
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === "utilisateurs" && styles.tabBtnActive,
              ]}
              onPress={() => {
                setTab("utilisateurs");
                setView("liste");
                setError(null);
                setTempPassword(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people-outline"
                size={14}
                color={tab === "utilisateurs" ? "#165034" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "utilisateurs" && styles.tabBtnTextActive,
                ]}
              >
                Utilisateurs
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Boolean(success) && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={18} color="#1D6B45" />
              <Text style={styles.successBoxText}>{success}</Text>
            </View>
          )}

          {Boolean(error) && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          {Boolean(tempPassword) && (
            <View style={styles.tempPwdBox}>
              <View style={styles.tempPwdHeader}>
                <Ionicons name="key-outline" size={16} color="#92400E" />
                <Text style={styles.tempPwdTitle}>
                  Mot de passe temporaire généré
                </Text>
              </View>
              <View style={styles.tempPwdRow}>
                <Text style={styles.tempPwdValue} selectable={true}>
                  {tempPassword}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.copyBtn,
                    copiedPassword && styles.copyBtnSuccess,
                  ]}
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (tempPassword) {
                      await Clipboard.setStringAsync(tempPassword);
                      setCopiedPassword(true);
                      setTimeout(() => setCopiedPassword(false), 2500);
                    }
                  }}
                >
                  <Ionicons
                    name={copiedPassword ? "checkmark-circle" : "copy-outline"}
                    size={14}
                    color={copiedPassword ? "#FFFFFF" : "#92400E"}
                  />
                  <Text
                    style={[
                      styles.copyBtnText,
                      copiedPassword && styles.copyBtnTextSuccess,
                    ]}
                  >
                    {copiedPassword ? "Copié !" : "Copier"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.tempPwdSub}>
                Communique ce mot de passe à l'utilisateur. Il pourra le changer
                depuis son profil.
              </Text>
            </View>
          )}

          {/* ── 1️⃣ ONGLET TRAITEURS ── */}
          {tab === "traiteurs" && (
            <View style={styles.tabContentContainer}>
              {view === "liste" ? (
                <>
                  <TouchableOpacity
                    style={styles.addPrimaryBtn}
                    onPress={() => setView("nouveau")}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.addPrimaryBtnText}>
                      + Ajouter un traiteur
                    </Text>
                  </TouchableOpacity>

                  {traiteurs.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Ionicons
                        name="restaurant-outline"
                        size={48}
                        color="#D4870A"
                      />
                      <Text style={styles.emptyText}>
                        Aucun traiteur enregistré
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.listGap}>
                      {traiteurs.map((item) => (
                        <View key={item.id} style={styles.itemCard}>
                          <View style={styles.cardHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemCardTitle}>
                                {item.name}
                              </Text>
                              <View style={styles.itemCardSubRow}>
                                <Ionicons
                                  name="person-outline"
                                  size={13}
                                  color="#165034"
                                />
                                <Text style={styles.itemCardSub}>
                                  {item.profile?.full_name || "Utilisateur"}
                                </Text>
                              </View>
                              {Boolean(item.whatsapp) && (
                                <View style={styles.itemCardSubRow}>
                                  <Ionicons
                                    name="logo-whatsapp"
                                    size={13}
                                    color="#25D366"
                                  />
                                  <Text style={styles.itemCardSub}>
                                    {item.whatsapp}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View
                              style={[
                                styles.activeBadge,
                                item.is_active
                                  ? styles.activeBadgeOn
                                  : styles.activeBadgeOff,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.activeBadgeText,
                                  item.is_active
                                    ? styles.activeBadgeTextOn
                                    : styles.activeBadgeTextOff,
                                ]}
                              >
                                {item.is_active ? "✓ Actif" : "Inactif"}
                              </Text>
                            </View>
                          </View>

                          {Boolean(item.bio) && (
                            <Text style={styles.itemBioText} numberOfLines={2}>
                              {item.bio}
                            </Text>
                          )}

                          <View style={styles.chipsRow}>
                            {item.cuisine_type?.map((c) => (
                              <View key={c} style={styles.cuisineChip}>
                                <Text style={styles.cuisineChipText}>{c}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.itemActionsRow}>
                            <TouchableOpacity
                              style={[
                                styles.toggleBtn,
                                item.is_active
                                  ? styles.toggleBtnOff
                                  : styles.toggleBtnOn,
                              ]}
                              onPress={() =>
                                handleToggleTraiteur(item.id, item.is_active)
                              }
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.toggleBtnText,
                                  item.is_active
                                    ? styles.toggleBtnTextOff
                                    : styles.toggleBtnTextOn,
                                ]}
                              >
                                {item.is_active ? "Désactiver" : "Activer"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteIconBtn}
                              onPress={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: "traiteur",
                                  id: item.id,
                                  name: item.name,
                                })
                              }
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color="#DC2626"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => setView("liste")}
                  >
                    <Ionicons name="arrow-back" size={16} color="#64748B" />
                    <Text style={styles.backLinkText}>Retour à la liste</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>Nouveau traiteur</Text>

                  <View style={styles.infoBannerBlue}>
                    <Ionicons name="bulb-outline" size={18} color="#1D4ED8" />
                    <Text style={styles.infoBannerBlueText}>
                      Si l'utilisateur n'existe pas encore, crée-le d'abord dans
                      l'onglet{" "}
                      <Text style={{ fontWeight: "800" }}>Utilisateurs</Text>.
                    </Text>
                  </View>

                  <View style={styles.cardForm}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Utilisateur propriétaire *
                      </Text>
                      <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() =>
                          setUserPickerConfig({
                            visible: true,
                            title: "Sélectionner un propriétaire",
                            onSelect: (u) =>
                              setTraiteurForm((p) => ({ ...p, user_id: u.id })),
                          })
                        }
                      >
                        <Text style={styles.selectBtnText}>
                          {selectedTraiteurUser
                            ? `${selectedTraiteurUser.full_name} (${selectedTraiteurUser.phone || selectedTraiteurUser.email})`
                            : "Choisir un utilisateur"}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Nom du traiteur *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: Chez Mariama, Les Saveurs d'Abidjan..."
                        placeholderTextColor="#94A3B8"
                        value={traiteurForm.name}
                        onChangeText={(val) =>
                          setTraiteurForm((p) => ({ ...p, name: val }))
                        }
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Bio / Description *</Text>
                      <TextInput
                        style={[styles.input, styles.multilineInput]}
                        multiline
                        numberOfLines={3}
                        placeholder="Décris l'activité, la spécialité..."
                        placeholderTextColor="#94A3B8"
                        value={traiteurForm.bio}
                        onChangeText={(val) =>
                          setTraiteurForm((p) => ({ ...p, bio: val }))
                        }
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Numéro WhatsApp</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="+33612345678"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        maxLength={16}
                        value={traiteurForm.whatsapp}
                        onChangeText={(val) => {
                          let cleaned = val.replace(/[^0-9+]/g, "");
                          if (cleaned.startsWith("+")) {
                            cleaned = "+" + cleaned.slice(1).replace(/\+/g, "");
                          } else {
                            cleaned = cleaned.replace(/\+/g, "");
                          }
                          const maxLen = cleaned.startsWith("+") ? 16 : 15;
                          setTraiteurForm((p) => ({
                            ...p,
                            whatsapp: cleaned.slice(0, maxLen),
                          }));
                        }}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Cuisines proposées</Text>
                      <View style={styles.chipsWrap}>
                        {CUISINES.map((c) => {
                          const active = traiteurForm.cuisine_type.includes(c);
                          return (
                            <TouchableOpacity
                              key={c}
                              style={[
                                styles.multiChip,
                                active && styles.multiChipActive,
                              ]}
                              onPress={() => toggleCuisine(c)}
                            >
                              <Text
                                style={[
                                  styles.multiChipText,
                                  active && styles.multiChipTextActive,
                                ]}
                              >
                                {c}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Zones de livraison</Text>
                      <View style={styles.chipsWrap}>
                        {ZONES.map((z) => {
                          const active =
                            traiteurForm.delivery_zones.includes(z);
                          return (
                            <TouchableOpacity
                              key={z}
                              style={[
                                styles.multiChip,
                                active && styles.multiChipActive,
                              ]}
                              onPress={() => toggleZone(z)}
                            >
                              <Text
                                style={[
                                  styles.multiChipText,
                                  active && styles.multiChipTextActive,
                                ]}
                              >
                                {z}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.checkboxRow}>
                      <Switch
                        value={traiteurForm.is_active}
                        onValueChange={(val) =>
                          setTraiteurForm((p) => ({ ...p, is_active: val }))
                        }
                        trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
                        thumbColor={
                          traiteurForm.is_active ? "#1D6B45" : "#94A3B8"
                        }
                      />
                      <Text style={styles.checkboxLabel}>
                        Publier immédiatement
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        actionLoading && styles.btnDisabled,
                      ]}
                      disabled={actionLoading}
                      onPress={handleCreateTraiteur}
                      activeOpacity={0.85}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>
                          Créer et publier le traiteur
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── 2️⃣ ONGLET GP COLIS ── */}
          {tab === "gp" && (
            <View style={styles.tabContentContainer}>
              {view === "liste" ? (
                <>
                  <TouchableOpacity
                    style={styles.addGoldBtn}
                    onPress={() => setView("nouveau")}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.addGoldBtnText}>
                      + Publier une annonce GP
                    </Text>
                  </TouchableOpacity>

                  {gpListings.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Ionicons
                        name="airplane-outline"
                        size={48}
                        color="#1D6B45"
                      />
                      <Text style={styles.emptyText}>Aucune annonce GP</Text>
                    </View>
                  ) : (
                    <View style={styles.listGap}>
                      {gpListings.map((gp) => (
                        <View key={gp.id} style={styles.itemCard}>
                          <View style={styles.cardHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.gpRouteRow}>
                                <Ionicons
                                  name="airplane-outline"
                                  size={15}
                                  color="#165034"
                                />
                                <Text style={styles.itemCardTitle}>
                                  {gp.departure_city} ({gp.departure_country}) →{" "}
                                  {gp.arrival_city} ({gp.arrival_country})
                                </Text>
                              </View>
                              <View style={styles.itemCardSubRow}>
                                <Ionicons
                                  name="person-outline"
                                  size={13}
                                  color="#165034"
                                />
                                <Text style={styles.itemCardSub}>
                                  {gp.gp?.full_name || "Utilisateur"}
                                </Text>
                              </View>
                            </View>

                            <View
                              style={[
                                styles.activeBadge,
                                gp.is_active
                                  ? styles.activeBadgeGold
                                  : styles.activeBadgeOff,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.activeBadgeText,
                                  gp.is_active
                                    ? styles.activeBadgeGoldText
                                    : styles.activeBadgeTextOff,
                                ]}
                              >
                                {gp.is_active ? "✓ Active" : "Inactive"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.detailsBox}>
                            <View style={styles.detailItemRow}>
                              <Ionicons
                                name="calendar-outline"
                                size={13}
                                color="#165034"
                              />
                              <Text style={styles.detailLine}>
                                Départ : {formatDate(gp.departure_date)}
                              </Text>
                            </View>
                            <View style={styles.detailItemRow}>
                              <Ionicons
                                name="cube-outline"
                                size={13}
                                color="#165034"
                              />
                              <Text style={styles.detailLine}>
                                {Number(gp.available_kg)} kg disponibles
                              </Text>
                            </View>
                            <View style={styles.detailItemRow}>
                              <Ionicons
                                name="cash-outline"
                                size={13}
                                color="#165034"
                              />
                              <Text style={styles.detailLine}>
                                {Number(gp.price_per_kg)} €/kg
                              </Text>
                            </View>
                            {Boolean(gp.description) && (
                              <View style={styles.detailItemRow}>
                                <Ionicons
                                  name="document-text-outline"
                                  size={13}
                                  color="#165034"
                                />
                                <Text style={styles.detailLine}>
                                  {gp.description}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.itemActionsRow}>
                            <TouchableOpacity
                              style={[
                                styles.toggleBtn,
                                gp.is_active
                                  ? styles.toggleBtnOff
                                  : styles.toggleBtnOn,
                              ]}
                              onPress={() =>
                                handleToggleGp(gp.id, gp.is_active)
                              }
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.toggleBtnText,
                                  gp.is_active
                                    ? styles.toggleBtnTextOff
                                    : styles.toggleBtnTextOn,
                                ]}
                              >
                                {gp.is_active ? "Désactiver" : "Activer"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteIconBtn}
                              onPress={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: "gp",
                                  id: gp.id,
                                  name: `${gp.departure_city} -> ${gp.arrival_city}`,
                                })
                              }
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color="#DC2626"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => setView("liste")}
                  >
                    <Ionicons name="arrow-back" size={16} color="#64748B" />
                    <Text style={styles.backLinkText}>Retour à la liste</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>Nouveau trajet GP</Text>

                  <View style={styles.cardForm}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>GP Transporteur *</Text>
                      <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() =>
                          setUserPickerConfig({
                            visible: true,
                            title: "Sélectionner un transporteur GP",
                            onSelect: (u) =>
                              setGpForm((p) => ({ ...p, gp_id: u.id })),
                          })
                        }
                      >
                        <Text style={styles.selectBtnText}>
                          {selectedGpUser
                            ? `${selectedGpUser.full_name} (${selectedGpUser.phone || selectedGpUser.email})`
                            : "Choisir un transporteur"}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputGridRow}>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Ville départ *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Paris"
                          placeholderTextColor="#94A3B8"
                          value={gpForm.departure_city}
                          onChangeText={(val) =>
                            setGpForm((p) => ({ ...p, departure_city: val }))
                          }
                        />
                      </View>

                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Pays départ *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: France"
                          placeholderTextColor="#94A3B8"
                          value={gpForm.departure_country}
                          onChangeText={(val) =>
                            setGpForm((p) => ({ ...p, departure_country: val }))
                          }
                        />
                      </View>
                    </View>

                    <View style={styles.inputGridRow}>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Ville arrivée *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Dakar"
                          placeholderTextColor="#94A3B8"
                          value={gpForm.arrival_city}
                          onChangeText={(val) =>
                            setGpForm((p) => ({ ...p, arrival_city: val }))
                          }
                        />
                      </View>

                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Pays arrivée *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Sénégal"
                          placeholderTextColor="#94A3B8"
                          value={gpForm.arrival_country}
                          onChangeText={(val) =>
                            setGpForm((p) => ({ ...p, arrival_country: val }))
                          }
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Date de départ *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="AAAA-MM-JJ"
                        placeholderTextColor="#94A3B8"
                        value={gpForm.departure_date}
                        onChangeText={(val) =>
                          setGpForm((p) => ({ ...p, departure_date: val }))
                        }
                      />
                    </View>

                    <View style={styles.inputGridRow}>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>
                          Kilos disponibles *
                        </Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="decimal-pad"
                          placeholder="Ex: 10"
                          placeholderTextColor="#94A3B8"
                          value={gpForm.available_kg}
                          onChangeText={(val) =>
                            setGpForm((p) => ({
                              ...p,
                              available_kg: val.replace(/[^0-9.,]/g, ""),
                            }))
                          }
                        />
                      </View>

                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Prix par kg (€) *</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="decimal-pad"
                          placeholder="Ex: 8"
                          placeholderTextColor="#94A3B8"
                          value={gpForm.price_per_kg}
                          onChangeText={(val) =>
                            setGpForm((p) => ({
                              ...p,
                              price_per_kg: val.replace(/[^0-9.,]/g, ""),
                            }))
                          }
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Description</Text>
                      <TextInput
                        style={[styles.input, styles.multilineInput]}
                        multiline
                        numberOfLines={3}
                        placeholder="Précision sur le vol..."
                        placeholderTextColor="#94A3B8"
                        value={gpForm.description}
                        onChangeText={(val) =>
                          setGpForm((p) => ({ ...p, description: val }))
                        }
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        actionLoading && styles.btnDisabled,
                      ]}
                      disabled={actionLoading}
                      onPress={handleCreateGp}
                      activeOpacity={0.85}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>
                          Publier le trajet GP
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── 3️⃣ ONGLET UTILISATEURS ── */}
          {tab === "utilisateurs" && (
            <View style={styles.tabContentContainer}>
              <Text style={styles.sectionTitle}>
                Créer un nouvel utilisateur
              </Text>

              <View style={styles.cardForm}>
                <View style={styles.inputGridRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>Prénom *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Aminata"
                      placeholderTextColor="#94A3B8"
                      value={userForm.firstname}
                      onChangeText={(val) =>
                        setUserForm((p) => ({ ...p, firstname: val }))
                      }
                    />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>Nom *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Diallo"
                      placeholderTextColor="#94A3B8"
                      value={userForm.lastname}
                      onChangeText={(val) =>
                        setUserForm((p) => ({ ...p, lastname: val }))
                      }
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+33612345678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={16}
                    value={userForm.phone}
                    onChangeText={(val) => {
                      let cleaned = val.replace(/[^0-9+]/g, "");
                      if (cleaned.startsWith("+")) {
                        cleaned = "+" + cleaned.slice(1).replace(/\+/g, "");
                      } else {
                        cleaned = cleaned.replace(/\+/g, "");
                      }
                      const maxLen = cleaned.startsWith("+") ? 16 : 15;
                      setUserForm((p) => ({
                        ...p,
                        phone: cleaned.slice(0, maxLen),
                      }));
                    }}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="aminata@email.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    value={userForm.email}
                    onChangeText={(val) =>
                      setUserForm((p) => ({ ...p, email: val }))
                    }
                  />
                </View>

                <View style={styles.infoBannerBlue}>
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color="#1D4ED8"
                  />
                  <Text style={styles.infoBannerBlueText}>
                    Un mot de passe temporaire sera généré automatiquement. Si
                    pas d'email, un email fictif sera créé avec le téléphone.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    actionLoading && styles.btnDisabled,
                  ]}
                  disabled={actionLoading}
                  onPress={handleCreateUser}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Créer le compte</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>
                Tous les utilisateurs ({profiles.length})
              </Text>
              <View style={styles.listGap}>
                {profiles.map((profile) => (
                  <View key={profile.id} style={styles.userRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userRowName}>
                        {profile.full_name}
                      </Text>
                      <Text style={styles.userRowSub}>
                        {profile.phone || profile.email || "Pas de contact"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.roleTag,
                        profile.role === "admin"
                          ? styles.roleAdmin
                          : profile.role === "traiteur"
                            ? styles.roleTraiteur
                            : profile.role === "gp"
                              ? styles.roleGp
                              : styles.roleClient,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleTagText,
                          profile.role === "admin"
                            ? styles.roleAdminText
                            : profile.role === "traiteur"
                              ? styles.roleTraiteurText
                              : profile.role === "gp"
                                ? styles.roleGpText
                                : styles.roleClientText,
                        ]}
                      >
                        {profile.role}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <Modal
          transparent
          animationType="slide"
          visible={userPickerConfig.visible}
          onRequestClose={() =>
            setUserPickerConfig((prev) => ({ ...prev, visible: false }))
          }
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() =>
              setUserPickerConfig((prev) => ({ ...prev, visible: false }))
            }
          >
            <View style={styles.pickerModalCard}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>
                  {userPickerConfig.title}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setUserPickerConfig((prev) => ({ ...prev, visible: false }))
                  }
                >
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }}>
                {profiles.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.pickerOptionItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      userPickerConfig.onSelect(user);
                      setUserPickerConfig((prev) => ({
                        ...prev,
                        visible: false,
                      }));
                    }}
                  >
                    <View>
                      <Text style={styles.pickerOptionText}>
                        {user.full_name}
                      </Text>
                      <Text style={styles.pickerOptionSub}>
                        {user.phone || user.email || "Pas de contact"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={deleteModal.isOpen}
          onRequestClose={() =>
            !actionLoading &&
            setDeleteModal({ isOpen: false, type: null, id: null, name: "" })
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash-outline" size={28} color="#DC2626" />
              </View>

              <Text style={styles.modalTitle}>
                Supprimer {deleteModal.name} ?
              </Text>
              <Text style={styles.modalSub}>
                Cette action est irréversible. L'élément sera définitivement
                effacé.
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  disabled={actionLoading}
                  onPress={() =>
                    setDeleteModal({
                      isOpen: false,
                      type: null,
                      id: null,
                      name: "",
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  disabled={actionLoading}
                  onPress={confirmDelete}
                  activeOpacity={0.8}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalDeleteBtnText}>
                      Oui, supprimer
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
    backgroundColor: "#165034",
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
    backgroundColor: "#165034",
  },

  headerCard: {
    backgroundColor: "#165034",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
  },

  tabsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabBtnTextActive: {
    color: "#165034",
  },

  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 12,
  },
  successBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#165034",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    padding: 12,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#B91C1C",
  },

  tempPwdBox: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 14,
  },
  tempPwdHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  tempPwdTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  tempPwdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FDE68A",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  tempPwdValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#78350F",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  copyBtnSuccess: {
    backgroundColor: "#165034",
    borderColor: "#165034",
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  copyBtnTextSuccess: {
    color: "#FFFFFF",
  },
  tempPwdSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 6,
    lineHeight: 15,
  },

  tabContentContainer: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  cardForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  inputGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexField: {
    flex: 1,
  },

  selectBtn: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },

  infoBannerBlue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 10,
  },
  infoBannerBlueText: {
    flex: 1,
    fontSize: 11,
    color: "#1E40AF",
    lineHeight: 15,
  },

  submitBtn: {
    backgroundColor: "#165034",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  multiChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  multiChipActive: {
    backgroundColor: "#165034",
  },
  multiChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "capitalize",
  },
  multiChipTextActive: {
    color: "#FFFFFF",
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  addPrimaryBtn: {
    backgroundColor: "#165034",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  addPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  addGoldBtn: {
    backgroundColor: "#D4870A",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  addGoldBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  backLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  listGap: {
    gap: 10,
  },
  userRowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  userRowName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  userRowSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  roleAdmin: { backgroundColor: "#FEF2F2" },
  roleAdminText: { color: "#DC2626" },
  roleTraiteur: { backgroundColor: "#F3E8FF" },
  roleTraiteurText: { color: "#7E22CE" },
  roleGp: { backgroundColor: "#FFEDD5" },
  roleGpText: { color: "#C2410C" },
  roleClient: { backgroundColor: "#F1F5F9" },
  roleClientText: { color: "#64748B" },

  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  gpRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  itemCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  itemCardSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  itemCardSub: {
    fontSize: 12,
    color: "#475569",
  },

  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeOn: { backgroundColor: "#E8F5E9" },
  activeBadgeTextOn: { color: "#165034" },
  activeBadgeGold: { backgroundColor: "#FEF3C7" },
  activeBadgeGoldText: { color: "#D4870A" },
  activeBadgeOff: { backgroundColor: "#F1F5F9" },
  activeBadgeTextOff: { color: "#94A3B8" },
  activeBadgeText: { fontSize: 10, fontWeight: "800" },

  itemBioText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  cuisineChip: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cuisineChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#165034",
    textTransform: "capitalize",
  },

  detailsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLine: {
    fontSize: 11,
    color: "#475569",
  },

  itemActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnOn: { backgroundColor: "#E8F5E9" },
  toggleBtnTextOn: { color: "#165034" },
  toggleBtnOff: { backgroundColor: "#F1F5F9" },
  toggleBtnTextOff: { color: "#64748B" },
  toggleBtnText: { fontSize: 12, fontWeight: "700" },

  deleteIconBtn: {
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 10,
  },

  emptyBox: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  pickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  pickerOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  pickerOptionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  deleteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  modalDeleteBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
