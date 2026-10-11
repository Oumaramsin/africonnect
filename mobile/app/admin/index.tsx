import React, { useCallback, useMemo, useState } from "react";
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
  "Sénégalais",
  "Ivoirien",
  "Camerounais",
  "Congolais",
  "Malien",
  "Guinéen",
  "Burkinabé",
  "Togolais",
  "Béninois",
  "Afro-Fusion",
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
  const [searchQuery, setSearchQuery] = useState("");

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
    arrival_country: "Sénégal",
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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Chargement et validation du rôle admin
  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
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

      if (decodedPayload.role !== "admin") {
        router.replace("/profil");
        return;
      }
      setIsAuthorized(true);
      setCurrentUserId(decodedPayload.userId || null);

      const response = await apiFetch("/admin");
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur de chargement des données.");
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

  // Filtres de recherche
  const filteredTraiteurs = useMemo(() => {
    if (!searchQuery.trim()) return traiteurs;
    const q = searchQuery.toLowerCase();
    return traiteurs.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.profile?.full_name || "").toLowerCase().includes(q) ||
        (t.whatsapp || "").toLowerCase().includes(q) ||
        t.cuisine_type.some((c) => c.toLowerCase().includes(q)),
    );
  }, [traiteurs, searchQuery]);

  const filteredGpListings = useMemo(() => {
    if (!searchQuery.trim()) return gpListings;
    const q = searchQuery.toLowerCase();
    return gpListings.filter(
      (g) =>
        g.departure_city.toLowerCase().includes(q) ||
        g.arrival_city.toLowerCase().includes(q) ||
        (g.gp?.full_name || "").toLowerCase().includes(q),
    );
  }, [gpListings, searchQuery]);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q),
    );
  }, [profiles, searchQuery]);

  const handleToggleAdminRole = (profile: Profile) => {
    if (profile.id === currentUserId) {
      Alert.alert(
        "Action impossible",
        "Vous ne pouvez pas modifier vos propres droits d'administrateur.",
      );
      return;
    }

    const isCurrentlyAdmin = profile.role === "admin";
    const title = isCurrentlyAdmin
      ? "Retirer les droits admin ?"
      : "Nommer administrateur ?";
    const message = isCurrentlyAdmin
      ? `Voulez-vous retirer les droits administrateur de ${profile.full_name} ? Son rôle d'origine sera restauré.`
      : `Voulez-vous accorder les droits administrateur à ${profile.full_name} ? Cet utilisateur aura accès à l'ensemble du panneau d'administration.`;

    Alert.alert(title, message, [
      { text: "Annuler", style: "cancel" },
      {
        text: isCurrentlyAdmin ? "Retirer" : "Confirmer",
        style: isCurrentlyAdmin ? "destructive" : "default",
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await apiFetch("/admin/admin", {
              method: "PATCH",
              body: JSON.stringify({
                id: profile.id,
                is_admin: !isCurrentlyAdmin,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              Alert.alert(
                "Erreur",
                data.error || data.message || "Échec de l'opération.",
              );
              return;
            }
            setProfiles((prev) =>
              prev.map((p) =>
                p.id === profile.id ? { ...p, role: data.data.role } : p,
              ),
            );
            showSuccessMsg(data.message || "Rôle mis à jour avec succès.");
          } catch (err: any) {
            Alert.alert("Erreur", "Impossible de joindre le serveur.");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

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
        setError(data.error || data.message || "Erreur création utilisateur.");
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
      setError(err.message || "Erreur réseau.");
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
          name: traiteurForm.name.trim(),
          bio: traiteurForm.bio.trim(),
          cuisine_type: traiteurForm.cuisine_type,
          delivery_zones: traiteurForm.delivery_zones,
          whatsapp: traiteurForm.whatsapp.trim() || null,
          is_active: traiteurForm.is_active,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la création du traiteur.");
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
        setError(data.error || "Erreur lors du changement de statut.");
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
          departure_city: gpForm.departure_city.trim(),
          departure_country: gpForm.departure_country.trim(),
          arrival_city: gpForm.arrival_city.trim(),
          arrival_country: gpForm.arrival_country.trim(),
          departure_date: gpForm.departure_date,
          available_kg: parseFloat(gpForm.available_kg) || 0,
          price_per_kg: parseFloat(gpForm.price_per_kg) || 0,
          description: gpForm.description.trim() || null,
          is_active: gpForm.is_active,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Erreur création annonce GP.",
        );
      }

      setGpListings((prev) => [data.data.gp, ...prev]);
      setGpForm({
        gp_id: "",
        departure_city: "",
        departure_country: "France",
        arrival_city: "",
        arrival_country: "Sénégal",
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
        setError(data.error || "Erreur de mise à jour.");
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
          throw new Error(data.error || "Erreur lors de la suppression.");
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
          throw new Error(data.error || "Erreur lors de la suppression.");
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
      year: "numeric",
    });
  };

  const selectedTraiteurUser = profiles.find(
    (p) => p.id === traiteurForm.user_id,
  );
  const selectedGpUser = profiles.find((p) => p.id === gpForm.gp_id);

  if (loading && !isAuthorized) {
    return (
      <View style={[styles.topGreenWrapper, styles.centerLoader]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.initialLoadingText}>Vérification des accès administrateur...</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        {/* ── HEADER FOREST GREEN (#0B3B24) ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push("/profil")}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.backBtnText}>Mon compte</Text>
            </TouchableOpacity>

            <View style={styles.adminBadgeTop}>
              <Ionicons name="shield-checkmark" size={14} color="#D4870A" />
              <Text style={styles.adminBadgeTopText}>Super Admin</Text>
            </View>
          </View>

          <View style={styles.headerTitleRow}>
            <View style={styles.shieldIconCircle}>
              <Ionicons name="shield-checkmark" size={24} color="#0B3B24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Console d'Administration</Text>
              <Text style={styles.headerSubtitle}>
                Supervision globale, gestion des traiteurs, GP et comptes
              </Text>
            </View>
          </View>

          {/* KPIs Bar */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[
                styles.statBox,
                tab === "traiteurs" && styles.statBoxActive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setTab("traiteurs");
                setView("liste");
                setSearchQuery("");
              }}
            >
              <Text style={styles.statNumber}>{traiteurs.length}</Text>
              <Text style={styles.statLabel}>Traiteurs</Text>
              <Text style={styles.statSubLabel}>
                {traiteurs.filter((t) => t.is_active).length} actifs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statBox, tab === "gp" && styles.statBoxActive]}
              activeOpacity={0.8}
              onPress={() => {
                setTab("gp");
                setView("liste");
                setSearchQuery("");
              }}
            >
              <Text style={styles.statNumber}>{gpListings.length}</Text>
              <Text style={styles.statLabel}>GP Colis</Text>
              <Text style={styles.statSubLabel}>
                {gpListings.filter((g) => g.is_active).length} actifs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statBox,
                tab === "utilisateurs" && styles.statBoxActive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setTab("utilisateurs");
                setView("liste");
                setSearchQuery("");
              }}
            >
              <Text style={styles.statNumber}>{profiles.length}</Text>
              <Text style={styles.statLabel}>Comptes</Text>
              <Text style={styles.statSubLabel}>
                {profiles.filter((p) => p.role === "admin").length} admins
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabs Navigation */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === "traiteurs" && styles.tabBtnActive]}
              onPress={() => {
                setTab("traiteurs");
                setView("liste");
                setError(null);
                setTempPassword(null);
                setSearchQuery("");
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="restaurant-outline"
                size={14}
                color={tab === "traiteurs" ? "#0B3B24" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "traiteurs" && styles.tabBtnTextActive,
                ]}
              >
                Traiteurs ({traiteurs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === "gp" && styles.tabBtnActive]}
              onPress={() => {
                setTab("gp");
                setView("liste");
                setError(null);
                setTempPassword(null);
                setSearchQuery("");
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="airplane-outline"
                size={14}
                color={tab === "gp" ? "#0B3B24" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "gp" && styles.tabBtnTextActive,
                ]}
              >
                GP Colis ({gpListings.length})
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
                setSearchQuery("");
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people-outline"
                size={14}
                color={tab === "utilisateurs" ? "#0B3B24" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "utilisateurs" && styles.tabBtnTextActive,
                ]}
              >
                Comptes ({profiles.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CORPS SCROLLABLE (#F8FAFC) ── */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Boolean(success) && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <Text style={styles.successBoxText}>{success}</Text>
            </View>
          )}

          {Boolean(error) && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          {/* Mot de passe temporaire généré */}
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
                Communiquez ce mot de passe à l'utilisateur. Il pourra le changer
                depuis son espace profil.
              </Text>
            </View>
          )}

          {/* ══════════════════════════════════════════
              1️⃣ ONGLET TRAITEURS
             ══════════════════════════════════════════ */}
          {tab === "traiteurs" && (
            <View style={styles.tabContentContainer}>
              {view === "liste" ? (
                <>
                  <View style={styles.listHeaderActionsRow}>
                    {/* Barre de recherche */}
                    <View style={styles.searchBarWrapper}>
                      <Ionicons name="search" size={16} color="#94A3B8" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un atelier, chef..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                      {Boolean(searchQuery) && (
                        <TouchableOpacity
                          onPress={() => setSearchQuery("")}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.addPrimaryBtn}
                      onPress={() => setView("nouveau")}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.addPrimaryBtnText}>Créer</Text>
                    </TouchableOpacity>
                  </View>

                  {filteredTraiteurs.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Ionicons
                        name="restaurant-outline"
                        size={44}
                        color="#CBD5E1"
                      />
                      <Text style={styles.emptyText}>
                        {searchQuery
                          ? "Aucun traiteur ne correspond à votre recherche"
                          : "Aucun traiteur enregistré"}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.listGap}>
                      {filteredTraiteurs.map((item) => (
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
                                  color="#0B3B24"
                                />
                                <Text style={styles.itemCardSub}>
                                  {item.profile?.full_name || "Propriétaire"}
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
                              <View
                                style={[
                                  styles.activeDot,
                                  item.is_active
                                    ? styles.activeDotOn
                                    : styles.activeDotOff,
                                ]}
                              />
                              <Text
                                style={[
                                  styles.activeBadgeText,
                                  item.is_active
                                    ? styles.activeBadgeTextOn
                                    : styles.activeBadgeTextOff,
                                ]}
                              >
                                {item.is_active ? "Actif" : "Inactif"}
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
                                size={17}
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

                  <Text style={styles.sectionTitle}>Nouveau Traiteur</Text>

                  <View style={styles.infoBannerBlue}>
                    <Ionicons name="bulb-outline" size={18} color="#1D4ED8" />
                    <Text style={styles.infoBannerBlueText}>
                      Si l'utilisateur n'existe pas encore, créez-le d'abord dans
                      l'onglet <Text style={{ fontWeight: "800" }}>Comptes</Text>.
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
                        <Ionicons name="chevron-down" size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Nom de l'atelier *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: Délices de Dakar"
                        placeholderTextColor="#94A3B8"
                        value={traiteurForm.name}
                        onChangeText={(val) =>
                          setTraiteurForm((p) => ({ ...p, name: val }))
                        }
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Bio & Description *</Text>
                      <TextInput
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Histoire, spécialités et engagements culinaires..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={3}
                        value={traiteurForm.bio}
                        onChangeText={(val) =>
                          setTraiteurForm((p) => ({ ...p, bio: val }))
                        }
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Spécialités culinaires</Text>
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
                          const active = traiteurForm.delivery_zones.includes(z);
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

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Numéro WhatsApp</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: +33 6 12 34 56 78"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={traiteurForm.whatsapp}
                        onChangeText={(val) =>
                          setTraiteurForm((p) => ({ ...p, whatsapp: val }))
                        }
                      />
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
                        <Text style={styles.submitBtnText}>Créer le traiteur</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════
              2️⃣ ONGLET GP COLIS
             ══════════════════════════════════════════ */}
          {tab === "gp" && (
            <View style={styles.tabContentContainer}>
              {view === "liste" ? (
                <>
                  <View style={styles.listHeaderActionsRow}>
                    <View style={styles.searchBarWrapper}>
                      <Ionicons name="search" size={16} color="#94A3B8" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher une ville, GP..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                      {Boolean(searchQuery) && (
                        <TouchableOpacity
                          onPress={() => setSearchQuery("")}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.addGoldBtn}
                      onPress={() => setView("nouveau")}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.addGoldBtnText}>Créer</Text>
                    </TouchableOpacity>
                  </View>

                  {filteredGpListings.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Ionicons
                        name="airplane-outline"
                        size={44}
                        color="#CBD5E1"
                      />
                      <Text style={styles.emptyText}>
                        {searchQuery
                          ? "Aucun vol ne correspond à votre recherche"
                          : "Aucune annonce GP enregistrée"}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.listGap}>
                      {filteredGpListings.map((gp) => (
                        <View key={gp.id} style={styles.itemCard}>
                          <View style={styles.cardHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.gpRouteRow}>
                                <Ionicons
                                  name="airplane"
                                  size={15}
                                  color="#0B3B24"
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
                                  color="#0B3B24"
                                />
                                <Text style={styles.itemCardSub}>
                                  {gp.gp?.full_name || "Transporteur GP"}
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
                              <View
                                style={[
                                  styles.activeDot,
                                  gp.is_active
                                    ? styles.activeDotGold
                                    : styles.activeDotOff,
                                ]}
                              />
                              <Text
                                style={[
                                  styles.activeBadgeText,
                                  gp.is_active
                                    ? styles.activeBadgeGoldText
                                    : styles.activeBadgeTextOff,
                                ]}
                              >
                                {gp.is_active ? "Actif" : "Inactif"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.detailsBox}>
                            <View style={styles.detailItemRow}>
                              <Ionicons
                                name="calendar-outline"
                                size={13}
                                color="#0B3B24"
                              />
                              <Text style={styles.detailLine}>
                                Départ : {formatDate(gp.departure_date)}
                              </Text>
                            </View>
                            <View style={styles.detailItemRow}>
                              <Ionicons
                                name="cube-outline"
                                size={13}
                                color="#0B3B24"
                              />
                              <Text style={styles.detailLine}>
                                {Number(gp.available_kg)} kg disponibles
                              </Text>
                            </View>
                            <View style={styles.detailItemRow}>
                              <Ionicons
                                name="cash-outline"
                                size={13}
                                color="#0B3B24"
                              />
                              <Text style={styles.detailLine}>
                                {Number(gp.price_per_kg)} €/kg
                              </Text>
                            </View>
                          </View>

                          <View style={styles.itemActionsRow}>
                            <TouchableOpacity
                              style={[
                                styles.toggleBtn,
                                gp.is_active
                                  ? styles.toggleBtnOff
                                  : styles.toggleBtnOn,
                              ]}
                              onPress={() => handleToggleGp(gp.id, gp.is_active)}
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
                                size={17}
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

                  <Text style={styles.sectionTitle}>Nouveau Trajet GP</Text>

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
                        <Ionicons name="chevron-down" size={16} color="#64748B" />
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
                        placeholder="AAAA-MM-JJ (Ex: 2026-11-20)"
                        placeholderTextColor="#94A3B8"
                        value={gpForm.departure_date}
                        onChangeText={(val) =>
                          setGpForm((p) => ({ ...p, departure_date: val }))
                        }
                      />
                    </View>

                    <View style={styles.inputGridRow}>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Kilos dispo *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: 23"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={gpForm.available_kg}
                          onChangeText={(val) =>
                            setGpForm((p) => ({ ...p, available_kg: val }))
                          }
                        />
                      </View>

                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Prix au kilo (€) *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: 10"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={gpForm.price_per_kg}
                          onChangeText={(val) =>
                            setGpForm((p) => ({ ...p, price_per_kg: val }))
                          }
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        styles.submitBtnGold,
                        actionLoading && styles.btnDisabled,
                      ]}
                      disabled={actionLoading}
                      onPress={handleCreateGp}
                      activeOpacity={0.85}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Publier le trajet GP</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════
              3️⃣ ONGLET COMPTES & UTILISATEURS
             ══════════════════════════════════════════ */}
          {tab === "utilisateurs" && (
            <View style={styles.tabContentContainer}>
              {/* Création rapide d'utilisateur */}
              <View style={styles.cardForm}>
                <Text style={styles.cardFormTitle}>Créer un nouvel utilisateur</Text>

                <View style={styles.inputGridRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>Prénom *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Prénom"
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
                      placeholder="Nom"
                      placeholderTextColor="#94A3B8"
                      value={userForm.lastname}
                      onChangeText={(val) =>
                        setUserForm((p) => ({ ...p, lastname: val }))
                      }
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Téléphone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: +33 6 12 34 56 78"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={userForm.phone}
                    onChangeText={(val) =>
                      setUserForm((p) => ({ ...p, phone: val }))
                    }
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="utilisateur@domaine.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={userForm.email}
                    onChangeText={(val) =>
                      setUserForm((p) => ({ ...p, email: val }))
                    }
                  />
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

              {/* Liste des utilisateurs */}
              <View style={styles.listHeaderActionsRow}>
                <View style={[styles.searchBarWrapper, { flex: 1 }]}>
                  <Ionicons name="search" size={16} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher par nom, email, rôle..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {Boolean(searchQuery) && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery("")}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.sectionTitle}>
                Comptes utilisateurs ({filteredProfiles.length})
              </Text>

              <View style={styles.listGap}>
                {filteredProfiles.map((profile) => (
                  <View key={profile.id} style={styles.userRowCard}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.userRowHeaderLine}>
                        <Text style={styles.userRowName}>
                          {profile.full_name}
                        </Text>
                        {currentUserId === profile.id && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>Vous</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userRowSub}>
                        {profile.phone || profile.email || "Pas de contact"}
                      </Text>
                    </View>

                    <View style={styles.userRowRightActions}>
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

                      {currentUserId !== profile.id && (
                        <TouchableOpacity
                          style={[
                            styles.adminActionBtn,
                            profile.role === "admin"
                              ? styles.adminActionBtnRemove
                              : styles.adminActionBtnAdd,
                          ]}
                          onPress={() => handleToggleAdminRole(profile)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={
                              profile.role === "admin"
                                ? "shield-outline"
                                : "shield-checkmark-outline"
                            }
                            size={13}
                            color={
                              profile.role === "admin" ? "#DC2626" : "#0B3B24"
                            }
                          />
                          <Text
                            style={[
                              styles.adminActionBtnText,
                              profile.role === "admin"
                                ? styles.adminActionBtnRemoveText
                                : styles.adminActionBtnAddText,
                            ]}
                          >
                            {profile.role === "admin" ? "Retirer" : "+ Admin"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── MODALE SÉLECTION UTILISATEUR ── */}
        <Modal
          transparent
          animationType="fade"
          visible={userPickerConfig.visible}
          onRequestClose={() =>
            setUserPickerConfig((prev) => ({ ...prev, visible: false }))
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalCard}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>
                  {userPickerConfig.title}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setUserPickerConfig((prev) => ({ ...prev, visible: false }))
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
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
                      color="#CBD5E1"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODALE DE CONFIRMATION DE SUPPRESSION ── */}
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
                Cette action est irréversible. L'élément sera définitivement effacé
                de la plateforme.
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
                    <Text style={styles.modalDeleteBtnText}>Supprimer</Text>
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
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },

  /* Header Card */
  headerCard: {
    backgroundColor: "#0B3B24",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  adminBadgeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(212, 135, 10, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.4)",
  },
  adminBadgeTopText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "800",
  },

  /* Header Title Row */
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  shieldIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D4870A",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
    lineHeight: 16,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  statBoxActive: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 1,
  },
  statSubLabel: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },

  /* Tabs Row */
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  tabBtnTextActive: {
    color: "#0B3B24",
    fontWeight: "800",
  },

  /* Main ScrollView */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContentContainer: {
    gap: 14,
  },

  /* Search & Actions Header */
  listHeaderActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  addPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0B3B24",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  addPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  addGoldBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D4870A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  addGoldBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Feedbacks */
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  successBoxText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },

  /* Temp Password Box */
  tempPwdBox: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 6,
  },
  tempPwdHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  tempPwdValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyBtnSuccess: {
    backgroundColor: "#15803D",
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E",
  },
  copyBtnTextSuccess: {
    color: "#FFFFFF",
  },
  tempPwdSub: {
    fontSize: 11,
    color: "#B45309",
    lineHeight: 15,
  },

  /* Lists */
  listGap: {
    gap: 12,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },

  /* Item Cards */
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
    color: "#64748B",
  },

  /* Badges */
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeOn: { backgroundColor: "#DCFCE7" },
  activeBadgeGold: { backgroundColor: "#FEF3C7" },
  activeBadgeOff: { backgroundColor: "#F1F5F9" },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeDotOn: { backgroundColor: "#15803D" },
  activeDotGold: { backgroundColor: "#D4870A" },
  activeDotOff: { backgroundColor: "#94A3B8" },
  activeBadgeText: { fontSize: 10, fontWeight: "800" },
  activeBadgeTextOn: { color: "#15803D" },
  activeBadgeGoldText: { color: "#B45309" },
  activeBadgeTextOff: { color: "#64748B" },

  itemBioText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cuisineChip: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  cuisineChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },

  /* Details Box */
  detailsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLine: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },

  /* Actions Row */
  itemActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnOn: { backgroundColor: "#DCFCE7" },
  toggleBtnTextOn: { color: "#15803D" },
  toggleBtnOff: { backgroundColor: "#F1F5F9" },
  toggleBtnTextOff: { color: "#64748B" },
  toggleBtnText: { fontSize: 12, fontWeight: "800" },

  deleteIconBtn: {
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* GP Route Row */
  gpRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },

  /* User Cards */
  userRowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  userRowHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  youBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803D",
  },
  userRowRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  roleAdmin: { backgroundColor: "#FEE2E2" },
  roleAdminText: { color: "#DC2626" },
  roleTraiteur: { backgroundColor: "#F3E8FF" },
  roleTraiteurText: { color: "#7E22CE" },
  roleGp: { backgroundColor: "#FFEDD5" },
  roleGpText: { color: "#C2410C" },
  roleClient: { backgroundColor: "#F1F5F9" },
  roleClientText: { color: "#64748B" },

  adminActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  adminActionBtnText: {
    fontSize: 10,
    fontWeight: "800",
  },
  adminActionBtnAdd: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  adminActionBtnAddText: {
    color: "#0B3B24",
  },
  adminActionBtnRemove: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  adminActionBtnRemoveText: {
    color: "#DC2626",
  },

  /* Forms */
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
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
  cardForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardFormTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "600",
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
    borderRadius: 12,
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
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  multiChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  multiChipActive: {
    backgroundColor: "#0B3B24",
  },
  multiChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  multiChipTextActive: {
    color: "#FFFFFF",
  },
  submitBtn: {
    backgroundColor: "#0B3B24",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#0B3B24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnGold: {
    backgroundColor: "#D4870A",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
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
    backgroundColor: "#FEE2E2",
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
    justifyContent: "center",
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
    justifyContent: "center",
  },
  modalDeleteBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
