"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  ChefHat,
  Plane,
  User,
  Package,
  LogOut,
  Lock,
  Edit3,
  Phone,
  MapPin,
  Mail,
  Trash2,
  AlertTriangle,
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BadgeCheck,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { getValidToken, decodeToken, removeToken, authFetch } from "@/lib/auth";

const schema = z.object({
  full_name: z.string().min(2, "Nom requis"),
  phone: z.string().optional(),
  city: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("client");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    async function loadProfile() {
      const token = getValidToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const decodedPayload = decodeToken(token);
      if (!decodedPayload || !decodedPayload.userId) {
        removeToken();
        router.push("/login");
        return;
      }
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/user/${decodedPayload.userId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (response.status === 401) {
        removeToken();
        router.push("/login");
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la récupération du profil utilisateur");
        return;
      }
      setUserEmail(data.foundUser.email);
      setUserRole(data.foundUser.role || "client");
      reset({
        full_name: data.foundUser.full_name || "",
        phone: data.foundUser.phone || "",
        city: data.foundUser.city || "",
      });
      setLoading(false);
    }
    loadProfile();
  }, [router, reset]);

  const onSubmit = async (formData: FormData) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const token = getValidToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const decodedPayload = decodeToken(token);
      if (!decodedPayload || !decodedPayload.userId) {
        removeToken();
        router.push("/login");
        return;
      }
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/${decodedPayload.userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );
      if (res.status === 401) {
        removeToken();
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erreur lors de la mise à jour");
        setSaving(false);
        return;
      }
      setSuccess(true);
      setSaving(false);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError("Impossible de mettre à jour le profil");
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    removeToken();
    router.push("/login");
  };

  const confirmDeleteAccount = async () => {
    const token = getValidToken();
    if (!token) return;
    setDeleting(true);
    try {
      const decodedPayload = decodeToken(token);
      if (!decodedPayload || !decodedPayload.userId) {
        removeToken();
        router.push("/login");
        return;
      }
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/${decodedPayload.userId}`,
        {
          method: "DELETE",
        },
      );
      if (res.status === 401) {
        removeToken();
        router.push("/login");
        return;
      }
      if (res.ok) {
        removeToken();
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.message || "Impossible de supprimer le compte.");
        setDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (err) {
      setError("Erreur lors de la suppression du compte.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name || !name.trim()) return "D";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading)
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-[#1D6B45] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 text-sm mt-4 font-semibold">Chargement de votre profil...</p>
      </div>
    );

  const currentFullName = watch("full_name") || "Membre Dabari";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      {/* ── 1. BREADCRUMB NAVIGATION ── */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/dashboard" className="hover:text-[#1D6B45] transition-colors">
          Accueil
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">Mon Espace Profil</span>
      </div>

      {/* ── 2. HERO BANNER PROFIL UTILISATEUR ── */}
      <section className="relative overflow-hidden rounded-3xl md:rounded-[36px] bg-gradient-to-br from-[#0F4A30] via-[#1D6B45] to-[#155234] text-white shadow-xl shadow-[#1D6B45]/10 p-6 sm:p-8 md:p-12">
        {/* Cercles décoratifs d'ambiance */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            {/* Avatar Stylisé avec Initiales */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#D4870A] to-[#b87405] border-2 border-white/30 backdrop-blur-md flex items-center justify-center shrink-0 shadow-lg text-white font-black text-2xl sm:text-3xl tracking-tight">
              {getInitials(currentFullName)}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {currentFullName}
                </h1>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    userRole === "traiteur"
                      ? "bg-[#D4870A] text-white shadow-xs"
                      : userRole === "gp"
                        ? "bg-sky-500 text-white shadow-xs"
                        : userRole === "admin"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-white/20 text-white border border-white/25"
                  }`}
                >
                  {userRole === "traiteur" ? (
                    <>
                      <ChefHat size={14} /> Traiteur Partenaire
                    </>
                  ) : userRole === "gp" ? (
                    <>
                      <Plane size={14} /> Transporteur GP
                    </>
                  ) : userRole === "admin" ? (
                    <>
                      <Lock size={14} /> Administrateur
                    </>
                  ) : (
                    <>
                      <BadgeCheck size={14} className="text-[#D4870A]" /> Membre Client
                    </>
                  )}
                </span>
              </div>

              <p className="text-white/80 text-xs sm:text-sm font-normal">
                {userEmail || "Compte utilisateur Dabari"}
              </p>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-white/70">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-300" /> Profil sécurisé
                </span>
                <span>•</span>
                <span>Membre vérifié</span>
              </div>
            </div>
          </div>

          {/* Raccourcis directs de l'en-tête */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              href="/commandes"
              className="inline-flex items-center gap-2 bg-white text-[#1D6B45] hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-102"
            >
              <Package size={16} />
              <span>Mes commandes</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all"
            >
              <LogOut size={16} />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. INFORMATIONS PERSONNELLES (MENU DÉROULANT / ACCORDÉON) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <button
          type="button"
          onClick={() => setIsPersonalInfoOpen(!isPersonalInfoOpen)}
          className="w-full flex items-center justify-between text-left group transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#1D6B45]/10 text-[#1D6B45] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Edit3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Informations personnelles
                </h2>
                {isDirty && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Modifié
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPersonalInfoOpen
                  ? "Mettez à jour vos coordonnées pour vos commandes et livraisons."
                  : "Modifier nom, téléphone et adresse principale"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-bold text-[#1D6B45]">
              {isPersonalInfoOpen ? "Masquer" : "Modifier mes coordonnées"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-[#1D6B45] flex items-center justify-center transition-colors">
              {isPersonalInfoOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </button>

        {isPersonalInfoOpen && (
          <div className="pt-6 mt-6 border-t border-slate-100 space-y-6 animate-in fade-in duration-200">
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 size={18} className="text-[#1D6B45] shrink-0" />
                <span>Votre profil a été mis à jour avec succès !</span>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email (Lecture seule avec cadenas) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} className="text-[#1D6B45]" /> Adresse email
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                      <Lock size={11} /> Non modifiable
                    </span>
                  </label>
                  <div className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 text-xs sm:text-sm font-medium flex items-center justify-between">
                    <span className="truncate">{userEmail || "Non renseigné"}</span>
                    <Lock size={15} className="text-slate-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    L&apos;adresse email est verrouillée pour des raisons de sécurité du compte.
                  </p>
                </div>

                {/* Nom complet */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User size={14} className="text-[#1D6B45]" /> Nom et prénom complet *
                  </label>
                  <input
                    {...register("full_name")}
                    type="text"
                    placeholder="Aminata Diallo"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] text-xs sm:text-sm transition-all shadow-2xs"
                  />
                  {errors.full_name && (
                    <p className="text-rose-500 text-xs font-medium">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Téléphone */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Phone size={14} className="text-[#1D6B45]" /> Numéro de téléphone / WhatsApp
                  </label>
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] text-xs sm:text-sm transition-all shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400">
                    Utile pour convenir des retraits et livraisons par WhatsApp.
                  </p>
                </div>

                {/* Ville ou Adresse avec Autocomplétion BAN */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#1D6B45]" /> Ville ou adresse principale
                  </label>
                  <AddressAutocomplete
                    value={watch("city") || ""}
                    onChange={(val) => setValue("city", val, { shouldDirty: true })}
                    onSelectAddress={(item) => {
                      setValue("city", item.label, { shouldDirty: true });
                    }}
                    placeholder="Rechercher une adresse (ex: Paris, Rue de...)"
                  />
                  <p className="text-[11px] text-slate-400">
                    Autocomplétion certifiée par l&apos;API Adresse Nationale (BAN).
                  </p>
                </div>
              </div>

              {/* Bouton d'action */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-slate-400">
                  {isDirty
                    ? "N'oubliez pas d'enregistrer vos changements."
                    : "Votre profil est à jour."}
                </span>

                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#1D6B45] hover:bg-[#155234] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#1D6B45]/20 hover:shadow-lg active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <span>Sauvegarder les modifications</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── 4. GRILLE DES SERVICES ET GESTION DU COMPTE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── COLONNE GAUCHE (7 colonnes) : MES ESPACES MÉTIERS ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Carte Espaces & Activités */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900 text-base">
                Mes espaces métiers
              </h2>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Services
              </span>
            </div>

            <div className="space-y-3">
              {/* Espace Commandes */}
              <Link
                href="/commandes"
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/60 hover:border-[#1D6B45]/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1D6B45]/10 text-[#1D6B45] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#1D6B45] transition-colors">
                      Mes commandes
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Suivi traiteur & colis GP
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-[#1D6B45] group-hover:translate-x-1 transition-all" />
              </Link>

              {/* Espace Traiteur */}
              <Link
                href="/profil/traiteur"
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/60 hover:border-[#D4870A]/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4870A]/10 text-[#D4870A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ChefHat size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#D4870A] transition-colors">
                      Espace Traiteur
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {userRole === "traiteur"
                        ? "Gérer ma carte & plats"
                        : "Devenir traiteur partenaire"}
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-[#D4870A] group-hover:translate-x-1 transition-all" />
              </Link>

              {/* Espace GP */}
              <Link
                href="/profil/gp"
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50/60 border border-slate-200/60 hover:border-sky-500/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Plane size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      Espace GP Colis
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {userRole === "gp"
                        ? "Gérer mes vols & annonces"
                        : "Proposer des kilos sur un vol"}
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
              </Link>

              {/* Conditions Générales d'Utilisation (CGU) */}
              <Link
                href="/cgu"
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/60 hover:border-[#1D6B45]/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1D6B45]/10 text-[#1D6B45] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#1D6B45] transition-colors">
                      Conditions Générales (CGU)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cadre légal, cotransportage & séquestre
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-[#1D6B45] group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE (5 colonnes) : SÉCURITÉ & GESTION DU COMPTE ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Carte Confiance & Sécurité Dabari */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/70 rounded-3xl border border-[#1D6B45]/20 p-6 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2.5 text-[#1D6B45]">
              <div className="w-9 h-9 rounded-xl bg-[#1D6B45]/10 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Garantie & Sécurité Dabari
                </h3>
                <p className="text-[11px] text-slate-500">
                  Protection des données & des paiements
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vos informations personnelles et adresses de livraison sont protégées. Aucune donnée sensible n&apos;est partagée sans votre accord.
            </p>
            <div className="pt-2 border-t border-[#1D6B45]/15 flex items-center justify-between">
              <Link
                href="/cgu"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1D6B45] hover:text-[#0F4A30] transition-colors"
              >
                <FileText size={14} />
                <span>Lire les CGU complètes</span>
                <ArrowRight size={13} />
              </Link>
              <a
                href="/CGU-DABARI.pdf"
                download="CGU-DABARI.pdf"
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                title="Télécharger le document PDF officiel"
              >
                PDF officiel
              </a>
            </div>
          </div>

          {/* Zone de Danger (Déconnexion & Suppression) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Gestion du compte
            </h3>
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-slate-700 transition-colors font-medium text-xs sm:text-sm border border-slate-100"
              >
                <span className="flex items-center gap-2.5">
                  <LogOut size={16} className="text-slate-500" />
                  Se déconnecter de la session
                </span>
                <ArrowRight size={14} className="text-slate-400" />
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-rose-50 text-rose-600 transition-colors font-semibold text-xs sm:text-sm border border-rose-100"
              >
                <span className="flex items-center gap-2.5">
                  <Trash2 size={16} className="text-rose-500" />
                  Supprimer mon compte définitivement
                </span>
                <ArrowRight size={14} className="text-rose-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALE DE CONFIRMATION DE SUPPRESSION DE COMPTE ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <AlertTriangle size={32} />
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2">
              Supprimer définitivement votre compte ?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              Êtes-vous certain de vouloir supprimer votre compte Dabari ? Cette opération est irréversible et supprimera l&apos;ensemble de vos commandes, annonces et historique.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteAccount}
                disabled={deleting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 text-white font-bold text-xs sm:text-sm hover:bg-rose-700 transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {deleting ? "Suppression en cours..." : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

