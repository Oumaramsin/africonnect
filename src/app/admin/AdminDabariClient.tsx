"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChefHat,
  Plane,
  Users,
  Smartphone,
  MapPin,
  User,
  Trash2,
  Lightbulb,
  ShieldCheck,
  Calendar,
  Scale,
  Banknote,
  FileText,
  Info,
  ShieldAlert,
  Check,
  Search,
  ArrowLeft,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { decodeToken, authFetch, getValidToken } from "@/lib/auth";

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
  profiles?: {
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
  arrival_date?: string | null;
  pickup_city?: string | null;
  dropoff_city?: string | null;
  available_kg: number;
  price_per_kg: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  profiles?: {
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

export default function AdminDabariClient({
  traiteurs: initialTraiteurs,
  gpListings: initialGpListings,
  profiles: initialProfiles,
}: {
  traiteurs: Traiteur[];
  gpListings: GpListing[];
  profiles: Profile[];
}) {
  const [tab, setTab] = useState<Tab>("traiteurs");
  const [traiteurs, setTraiteurs] = useState(initialTraiteurs);
  const [gpListings, setGpListings] = useState(initialGpListings);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"liste" | "nouveau">("liste");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const token = getValidToken();
  const currentUserId = token ? decodeToken(token)?.userId : null;

  const [roleModal, setRoleModal] = useState<{
    profile: Profile;
    targetIsAdmin: boolean;
  } | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  // Modal de suppression personnalisé
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

  useEffect(() => {
    if (!deleteModal.isOpen && !roleModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteModal.isOpen) {
          setDeleteModal({ isOpen: false, type: null, id: null, name: "" });
        }
        if (roleModal) {
          setRoleModal(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteModal.isOpen, roleModal]);

  // Formulaire traiteur
  const [traiteurForm, setTraiteurForm] = useState({
    user_id: "",
    name: "",
    bio: "",
    cuisine_type: [] as string[],
    delivery_zones: [] as string[],
    whatsapp: "",
    is_active: true,
  });

  // Formulaire GP
  const [gpForm, setGpForm] = useState({
    gp_id: "",
    departure_city: "",
    departure_country: "",
    arrival_city: "",
    arrival_country: "",
    departure_date: "",
    available_kg: "",
    price_per_kg: "",
    description: "",
    is_active: true,
  });

  // Formulaire utilisateur
  const [userForm, setUserForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleToggleAdmin = async () => {
    if (!roleModal) return;
    setRoleLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/admin`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: roleModal.profile.id,
            is_admin: roleModal.targetIsAdmin,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(
          data.error ||
            data.message ||
            "Erreur lors de la modification du rôle.",
        );
        return;
      }

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === roleModal.profile.id ? { ...p, role: data.data.role } : p,
        ),
      );
      showSuccess(data.message || "Rôle utilisateur mis à jour avec succès.");
      setRoleModal(null);
    } catch {
      setError("Erreur de communication avec le serveur.");
    } finally {
      setRoleLoading(false);
    }
  };

  const toggleCuisine = (c: string) => {
    setTraiteurForm((prev) => ({
      ...prev,
      cuisine_type: prev.cuisine_type.includes(c)
        ? prev.cuisine_type.filter((x) => x !== c)
        : [...prev.cuisine_type, c],
    }));
  };

  const toggleZone = (z: string) => {
    setTraiteurForm((prev) => ({
      ...prev,
      delivery_zones: prev.delivery_zones.includes(z)
        ? prev.delivery_zones.filter((x) => x !== z)
        : [...prev.delivery_zones, z],
    }));
  };

  // ── CRÉER UTILISATEUR ──
  const handleCreateUser = async () => {
    if (!userForm.full_name || (!userForm.phone && !userForm.email)) {
      setError("Nom et téléphone ou email requis");
      return;
    }
    setLoading(true);
    setError(null);
    setTempPassword(null);

    const authEmail =
      userForm.email ||
      `${userForm.phone.replace(/\+/g, "").replace(/\s/g, "")}@dabari.app`;

    const pwd = Math.random().toString(36).slice(-8) + "A1!";
    const nameParts = userForm.full_name.trim().split(" ");
    const firstname = nameParts[0] || userForm.full_name;
    const lastname = nameParts.slice(1).join(" ") || " ";

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstname,
            lastname,
            email: authEmail,
            phone: userForm.phone || null,
            password: pwd,
            passwordConfirmation: pwd,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Erreur création utilisateur");
        setLoading(false);
        return;
      }

      const newProfile: Profile = {
        id: data.user?.id || data.id,
        full_name: userForm.full_name,
        phone: userForm.phone || null,
        whatsapp: userForm.phone || null,
        email: authEmail,
        role: "client",
      };

      setProfiles((prev) => [newProfile, ...prev]);
      setTempPassword(pwd);
      showSuccess(`Utilisateur ${userForm.full_name} créé !`);
      setUserForm({ full_name: "", phone: "", email: "" });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // ── CRÉER TRAITEUR ──
  const handleCreateTraiteur = async () => {
    if (!traiteurForm.user_id || !traiteurForm.name || !traiteurForm.bio) {
      setError("Utilisateur, nom et bio requis");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: traiteurForm.user_id,
            name: traiteurForm.name,
            bio: traiteurForm.bio,
            cuisine_type: traiteurForm.cuisine_type,
            delivery_zones: traiteurForm.delivery_zones,
            whatsapp: traiteurForm.whatsapp || null,
            is_active: traiteurForm.is_active,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la création d'un traiteur");
        setLoading(false);
        return;
      }
      setTraiteurs((prev) => [data.data.traiteur, ...prev]);

      showSuccess("Traiteur créé et publié !");
      setView("liste");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // ── TOGGLE TRAITEUR ──
  const handleToggleTraiteur = async (id: string, current: boolean) => {
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            traiteur_id: id,
            is_active: !current,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Erreur lors du changement d'état du traiteur",
        );
      }

      setTraiteurs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t)),
      );
      showSuccess(!current ? "Traiteur activé !" : "Traiteur désactivé !");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    }
  };

  const openDeleteModal = (
    type: "traiteur" | "gp",
    id: string,
    name: string,
  ) => {
    setDeleteModal({ isOpen: true, type, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;
    setLoading(true);
    setError(null);
    try {
      if (deleteModal.type === "traiteur") {
        const response = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ traiteur_id: deleteModal.id }),
          },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Erreur lors de la suppression du traiteur",
          );
        }
        setTraiteurs((prev) => prev.filter((t) => t.id !== deleteModal.id));
        showSuccess("Traiteur supprimé avec succès !");
      } else if (deleteModal.type === "gp") {
        const response = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/gp`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ gp_id: deleteModal.id }),
          },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Erreur lors de la suppression de l'annonce GP",
          );
        }
        setGpListings((prev) => prev.filter((g) => g.id !== deleteModal.id));
        showSuccess("Annonce GP supprimée avec succès !");
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
      setDeleteModal({ isOpen: false, type: null, id: null, name: "" });
    }
  };

  // ── CRÉER GP ──
  const handleCreateGp = async () => {
    if (
      !gpForm.gp_id ||
      !gpForm.departure_city ||
      !gpForm.arrival_city ||
      !gpForm.departure_date
    ) {
      setError("Utilisateur, villes et date requis");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/gp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Erreur lors de la création de l'annonce GP",
        );
      }

      setGpListings((prev) => [data.data.gp, ...prev]);
      setGpForm({
        gp_id: "",
        departure_city: "",
        departure_country: "",
        arrival_city: "",
        arrival_country: "",
        departure_date: "",
        available_kg: "",
        price_per_kg: "",
        description: "",
        is_active: true,
      });
      showSuccess("Annonce GP créée et publiée !");
      setView("liste");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // ── TOGGLE GP ──
  const handleToggleGp = async (id: string, current: boolean) => {
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/gp`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gp_id: id,
            is_active: !current,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Erreur lors du changement d'état de l'annonce GP",
        );
      }

      setGpListings((prev) =>
        prev.map((g) => (g.id === id ? { ...g, is_active: !current } : g)),
      );
      showSuccess(!current ? "Annonce GP activée !" : "Annonce GP désactivée !");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // Filtrage selon recherche
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q),
    );
  }, [profiles, searchQuery]);

  const filteredTraiteurs = useMemo(() => {
    if (!searchQuery.trim()) return traiteurs;
    const q = searchQuery.toLowerCase();
    return traiteurs.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.bio?.toLowerCase().includes(q) ||
        t.cuisine_type?.some((c) => c.toLowerCase().includes(q)) ||
        t.profiles?.full_name?.toLowerCase().includes(q),
    );
  }, [traiteurs, searchQuery]);

  const filteredGpListings = useMemo(() => {
    if (!searchQuery.trim()) return gpListings;
    const q = searchQuery.toLowerCase();
    return gpListings.filter(
      (g) =>
        g.departure_city?.toLowerCase().includes(q) ||
        g.arrival_city?.toLowerCase().includes(q) ||
        g.departure_country?.toLowerCase().includes(q) ||
        g.arrival_country?.toLowerCase().includes(q) ||
        g.profiles?.full_name?.toLowerCase().includes(q),
    );
  }, [gpListings, searchQuery]);

  const adminCount = useMemo(
    () => profiles.filter((p) => p.role === "admin").length,
    [profiles],
  );

  const inputClass =
    "w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800";
  const selectClass =
    "w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800";
  const labelClass =
    "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Executive Hero Banner Desktop & Mobile */}
      <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold mb-4 bg-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-xs transition-colors"
          >
            <ArrowLeft size={14} /> Retour au Dashboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck size={38} className="text-[#D4870A]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Console d&apos;Administration Dabari
                  </h1>
                  <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    Accès Privilégié
                  </span>
                </div>
                <p className="text-white/80 text-xs sm:text-sm mt-1">
                  Gestion centralisée des traiteurs, annonces GP et comptes
                  utilisateurs
                </p>
              </div>
            </div>

            {/* KPI Cards Desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-white">
                  {traiteurs.length}
                </span>
                <span className="text-[11px] text-white/70">Traiteurs</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-white">
                  {gpListings.length}
                </span>
                <span className="text-[11px] text-white/70">Annonces GP</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-amber-300">
                  {profiles.length}
                </span>
                <span className="text-[11px] text-white/70">Utilisateurs</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-emerald-300">
                  {adminCount}
                </span>
                <span className="text-[11px] text-white/70">Admins</span>
              </div>
            </div>
          </div>

          {/* Onglets Segmentés */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 flex-wrap">
            {(["traiteurs", "gp", "utilisateurs"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setView("liste");
                  setError(null);
                  setTempPassword(null);
                  setSearchQuery("");
                }}
                className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  tab === t
                    ? "bg-white text-[#1D6B45] shadow-sm"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {t === "traiteurs" ? (
                  <>
                    <ChefHat size={16} />
                    <span>Traiteurs ({traiteurs.length})</span>
                  </>
                ) : t === "gp" ? (
                  <>
                    <Plane size={16} />
                    <span>GP Colis ({gpListings.length})</span>
                  </>
                ) : (
                  <>
                    <Users size={16} />
                    <span>Utilisateurs ({profiles.length})</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6 space-y-6">
        {/* Messages d'alerte / succès */}
        {success && (
          <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 text-[#1D6B45] rounded-2xl px-5 py-3.5 text-sm font-semibold flex items-center gap-2 shadow-xs">
            <Check size={18} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3.5 text-sm font-medium flex items-center gap-2 shadow-xs">
            <ShieldAlert size={18} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Mot de passe temporaire généré */}
        {tempPassword && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 mb-1">
                <Sparkles size={14} className="text-[#D4870A]" /> Mot de passe
                temporaire généré
              </p>
              <p className="text-xl font-mono font-black text-amber-950">
                {tempPassword}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Transmettez ce mot de passe au nouvel utilisateur. Il pourra le
                modifier depuis son profil.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                showSuccess("Mot de passe copié dans le presse-papier !");
              }}
              className="bg-[#D4870A] hover:bg-[#b87408] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              Copier les identifiants
            </button>
          </div>
        )}

        {/* ── ONGLET UTILISATEURS (Layout 12 Colonnes) ── */}
        {tab === "utilisateurs" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulaire Création Utilisateur (5 colonnes) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <User size={18} className="text-[#1D6B45]" />
                    Créer un compte utilisateur
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Génère automatiquement les accès Dabari
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nom complet *</label>
                    <input
                      type="text"
                      placeholder="Ex: Aminata Diallo"
                      value={userForm.full_name}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          full_name: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Numéro de téléphone</label>
                    <input
                      type="tel"
                      placeholder="Ex: +33 6 12 34 56 78"
                      value={userForm.phone}
                      onChange={(e) =>
                        setUserForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Email (optionnel)</label>
                    <input
                      type="email"
                      placeholder="aminata@example.com"
                      value={userForm.email}
                      onChange={(e) =>
                        setUserForm((p) => ({ ...p, email: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <Info size={14} className="inline mr-1 text-blue-600" />{" "}
                      Un mot de passe sécurisé est généré automatiquement. Si
                      aucun email n&apos;est fourni, un identifiant technique est
                      créé via le numéro de téléphone.
                    </p>
                  </div>

                  <button
                    onClick={handleCreateUser}
                    disabled={loading}
                    className="w-full bg-[#1D6B45] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#155235] transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Création en cours...</span>
                      </div>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Créer le compte</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Annuaire des Utilisateurs (7 colonnes) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Barre de recherche utilisateurs */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-3.5 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer par nom, téléphone, email ou rôle..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-xs sm:text-sm bg-white"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  {filteredProfiles.length} résultat
                  {filteredProfiles.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Liste scrollable stylée */}
              <div className="space-y-3">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {profile.full_name}
                        </p>
                        {currentUserId === profile.id && (
                          <span className="text-[10px] bg-emerald-50 text-[#1D6B45] font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            Vous
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {profile.phone || profile.email || "Pas de contact"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold ${
                          profile.role === "admin"
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : profile.role === "traiteur"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : profile.role === "gp"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {profile.role === "admin"
                          ? "Admin"
                          : profile.role === "traiteur"
                            ? "Traiteur"
                            : profile.role === "gp"
                              ? "GP"
                              : "Client"}
                      </span>

                      {currentUserId !== profile.id && (
                        profile.role === "admin" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setRoleModal({ profile, targetIsAdmin: false })
                            }
                            className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Retirer les droits administrateur"
                          >
                            <ShieldAlert size={13} />
                            <span className="hidden sm:inline">
                              Retirer admin
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setRoleModal({ profile, targetIsAdmin: true })
                            }
                            className="text-xs px-3 py-1.5 rounded-xl border border-emerald-200 text-[#1D6B45] bg-emerald-50 hover:bg-emerald-100 font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Promouvoir en administrateur"
                          >
                            <ShieldCheck size={13} />
                            <span className="hidden sm:inline">
                              Nommer admin
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ONGLET TRAITEURS (Grille 3 Colonnes) ── */}
        {tab === "traiteurs" && (
          <>
            {view === "liste" && (
              <div className="space-y-6">
                {/* Header Traiteurs */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 max-w-md relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-3.5 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filtrer par nom, cuisine ou gérant..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-xs sm:text-sm bg-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setView("nouveau");
                      setError(null);
                    }}
                    className="bg-[#1D6B45] text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm hover:bg-[#155235] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Ajouter un traiteur</span>
                  </button>
                </div>

                {/* Grille Traiteurs Responsive */}
                {filteredTraiteurs.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto shadow-xs">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <ChefHat size={32} />
                    </div>
                    <p className="font-extrabold text-slate-800 text-base mb-1">
                      Aucun traiteur trouvé
                    </p>
                    <p className="text-xs text-slate-400">
                      Modifiez votre recherche ou ajoutez un nouveau traiteur.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTraiteurs.map((traiteur) => (
                      <div
                        key={traiteur.id}
                        className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h3 className="font-extrabold text-slate-900 text-base">
                                {traiteur.name}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                                <User size={13} className="text-[#1D6B45]" />
                                {traiteur.profiles?.full_name || "Gérant non lié"}
                              </p>
                            </div>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                traiteur.is_active
                                  ? "bg-[#E8F5E9] text-[#1D6B45]"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {traiteur.is_active ? "● Actif" : "Inactif"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                            {traiteur.bio}
                          </p>

                          {/* Cuisines */}
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {traiteur.cuisine_type?.map((c) => (
                              <span
                                key={c}
                                className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold capitalize"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleToggleTraiteur(
                                traiteur.id,
                                traiteur.is_active,
                              )
                            }
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              traiteur.is_active
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                : "bg-[#E8F5E9] text-[#1D6B45] hover:bg-[#C8E6C9]"
                            }`}
                          >
                            {traiteur.is_active ? "Désactiver" : "Activer"}
                          </button>
                          <button
                            onClick={() =>
                              openDeleteModal(
                                "traiteur",
                                traiteur.id,
                                traiteur.name,
                              )
                            }
                            className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vue Formulaire Nouveau Traiteur */}
            {view === "nouveau" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 max-w-3xl mx-auto shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setView("liste")}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-lg font-bold text-slate-900">
                      Nouveau traiteur partenaire
                    </h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      Compte utilisateur gestionnaire *
                    </label>
                    <select
                      value={traiteurForm.user_id}
                      onChange={(e) =>
                        setTraiteurForm((p) => ({
                          ...p,
                          user_id: e.target.value,
                        }))
                      }
                      className={selectClass}
                    >
                      <option value="">Sélectionner un utilisateur</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} {p.phone ? `— ${p.phone}` : ""}{" "}
                          {p.email && !p.email.includes("@dabari.app")
                            ? `— ${p.email}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Nom de l&apos;enseigne *</label>
                    <input
                      type="text"
                      placeholder="Ex: Saveurs de Dakar, Les Délices d'Abidjan..."
                      value={traiteurForm.name}
                      onChange={(e) =>
                        setTraiteurForm((p) => ({ ...p, name: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Histoire & Description *</label>
                    <textarea
                      rows={3}
                      placeholder="Spécialités culinaires, prestations pour réceptions, expérience..."
                      value={traiteurForm.bio}
                      onChange={(e) =>
                        setTraiteurForm((p) => ({ ...p, bio: e.target.value }))
                      }
                      className={inputClass + " resize-none"}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Numéro WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="Ex: +33 6 12 34 56 78"
                      value={traiteurForm.whatsapp}
                      onChange={(e) =>
                        setTraiteurForm((p) => ({
                          ...p,
                          whatsapp: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Cuisines proposées</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {CUISINES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCuisine(c)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize cursor-pointer ${
                            traiteurForm.cuisine_type.includes(c)
                              ? "bg-[#1D6B45] text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Zones de livraison</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {ZONES.map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => toggleZone(z)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            traiteurForm.delivery_zones.includes(z)
                              ? "bg-[#1D6B45] text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={traiteurForm.is_active}
                        onChange={(e) =>
                          setTraiteurForm((p) => ({
                            ...p,
                            is_active: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-[#1D6B45]"
                      />
                      <span className="text-sm font-bold text-slate-800">
                        Publier immédiatement
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={handleCreateTraiteur}
                    disabled={loading}
                    className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#155235] transition-all disabled:opacity-50 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? "Création..." : "Enregistrer et activer le traiteur"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── ONGLET GP COLIS (Grille 3 Colonnes) ── */}
        {tab === "gp" && (
          <>
            {view === "liste" && (
              <div className="space-y-6">
                {/* Header GP */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 max-w-md relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-3.5 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filtrer par ville, pays ou voyageur..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-xs sm:text-sm bg-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setView("nouveau");
                      setError(null);
                    }}
                    className="bg-[#D4870A] text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm hover:bg-[#B8740A] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Publier une annonce GP</span>
                  </button>
                </div>

                {/* Grille GP Responsive */}
                {filteredGpListings.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto shadow-xs">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Plane size={32} />
                    </div>
                    <p className="font-extrabold text-slate-800 text-base mb-1">
                      Aucune annonce GP trouvée
                    </p>
                    <p className="text-xs text-slate-400">
                      Modifiez votre recherche ou ajoutez un nouveau vol.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGpListings.map((gp) => (
                      <div
                        key={gp.id}
                        className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h3 className="font-extrabold text-slate-900 text-base">
                                {gp.departure_city} → {gp.arrival_city}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                                <User size={13} className="text-[#1D6B45]" />
                                {gp.profiles?.full_name || "Voyageur"}
                              </p>
                            </div>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                gp.is_active
                                  ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {gp.is_active ? "● Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600 mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-[#1D6B45]" />
                              <span>
                                <strong>Départ :</strong> {formatDate(gp.departure_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Scale size={13} className="text-[#1D6B45]" />
                              <span>{gp.available_kg} kg disponibles</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Banknote size={13} className="text-[#1D6B45]" />
                              <span className="font-bold text-[#1D6B45]">
                                {gp.price_per_kg} €/kg
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                          <button
                            onClick={() => handleToggleGp(gp.id, gp.is_active)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              gp.is_active
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                            }`}
                          >
                            {gp.is_active ? "Désactiver" : "Activer"}
                          </button>
                          <button
                            onClick={() =>
                              openDeleteModal(
                                "gp",
                                gp.id,
                                `${gp.departure_city} → ${gp.arrival_city}`,
                              )
                            }
                            className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vue Formulaire Nouveau GP */}
            {view === "nouveau" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 max-w-3xl mx-auto shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setView("liste")}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-lg font-bold text-slate-900">
                      Nouvelle annonce de vol GP
                    </h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Voyageur GP (Compte) *</label>
                    <select
                      value={gpForm.gp_id}
                      onChange={(e) =>
                        setGpForm((p) => ({ ...p, gp_id: e.target.value }))
                      }
                      className={selectClass}
                    >
                      <option value="">Sélectionner un utilisateur</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} {p.phone ? `— ${p.phone}` : ""}{" "}
                          {p.email && !p.email.includes("@dabari.app")
                            ? `— ${p.email}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Ville de départ *</label>
                      <input
                        type="text"
                        placeholder="Ex: Paris"
                        value={gpForm.departure_city}
                        onChange={(e) =>
                          setGpForm((p) => ({
                            ...p,
                            departure_city: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Pays de départ *</label>
                      <input
                        type="text"
                        placeholder="Ex: France"
                        value={gpForm.departure_country}
                        onChange={(e) =>
                          setGpForm((p) => ({
                            ...p,
                            departure_country: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Ville d&apos;arrivée *</label>
                      <input
                        type="text"
                        placeholder="Ex: Dakar"
                        value={gpForm.arrival_city}
                        onChange={(e) =>
                          setGpForm((p) => ({
                            ...p,
                            arrival_city: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Pays d&apos;arrivée *</label>
                      <input
                        type="text"
                        placeholder="Ex: Sénégal"
                        value={gpForm.arrival_country}
                        onChange={(e) =>
                          setGpForm((p) => ({
                            ...p,
                            arrival_country: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Date de départ *</label>
                    <input
                      type="date"
                      value={gpForm.departure_date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) =>
                        setGpForm((p) => ({
                          ...p,
                          departure_date: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Kilos disponibles *</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 20"
                        value={gpForm.available_kg}
                        onChange={(e) =>
                          setGpForm((p) => ({
                            ...p,
                            available_kg: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Prix au kilo (€) *</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 8"
                        value={gpForm.price_per_kg}
                        onChange={(e) =>
                          setGpForm((p) => ({
                            ...p,
                            price_per_kg: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Description / Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Restrictions, points de rencontre, informations..."
                      value={gpForm.description}
                      onChange={(e) =>
                        setGpForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      className={inputClass + " resize-none"}
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gpForm.is_active}
                        onChange={(e) =>
                          setGpForm((p) => ({
                            ...p,
                            is_active: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-[#1D6B45]"
                      />
                      <span className="text-sm font-bold text-slate-800">
                        Publier immédiatement
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={handleCreateGp}
                    disabled={loading}
                    className="w-full bg-[#D4870A] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#B8740A] transition-all disabled:opacity-50 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? "Publication..." : "Publier l'annonce de vol GP"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {deleteModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setDeleteModal({
              isOpen: false,
              type: null,
              id: null,
              name: "",
            })
          }
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Confirmer la suppression
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Voulez-vous vraiment supprimer{" "}
                <span className="font-bold text-slate-800">
                  &ldquo;{deleteModal.name}&rdquo;
                </span>{" "}
                ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    type: null,
                    id: null,
                    name: "",
                  })
                }
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de rôle administrateur */}
      {roleModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setRoleModal(null)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4"
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                roleModal.targetIsAdmin
                  ? "bg-emerald-50 text-[#1D6B45]"
                  : "bg-red-50 text-red-500"
              }`}
            >
              {roleModal.targetIsAdmin ? (
                <ShieldCheck size={26} />
              ) : (
                <ShieldAlert size={26} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {roleModal.targetIsAdmin
                  ? "Nommer administrateur ?"
                  : "Retirer les droits administrateur ?"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {roleModal.targetIsAdmin ? (
                  <>
                    Voulez-vous accorder les privilèges d&apos;administration à{" "}
                    <strong className="text-slate-800">
                      {roleModal.profile.full_name}
                    </strong>{" "}
                    ? Cet utilisateur aura un accès complet à la console de
                    gestion.
                  </>
                ) : (
                  <>
                    Voulez-vous révoquer les privilèges de{" "}
                    <strong className="text-slate-800">
                      {roleModal.profile.full_name}
                    </strong>{" "}
                    ? Son rôle d&apos;origine sera automatiquement restauré.
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoleModal(null)}
                disabled={roleLoading}
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleToggleAdmin}
                disabled={roleLoading}
                className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-md disabled:opacity-50 cursor-pointer ${
                  roleModal.targetIsAdmin
                    ? "bg-[#1D6B45] hover:bg-[#155235]"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {roleLoading
                  ? "En cours..."
                  : roleModal.targetIsAdmin
                    ? "Confirmer"
                    : "Retirer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
