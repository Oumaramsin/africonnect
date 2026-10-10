"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  User,
  Utensils,
  Eye,
  ImagePlus,
  X,
  ChefHat,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Store,
  Clock,
  ShieldCheck,
  Check,
  Share2,
} from "lucide-react";
import Link from "next/link";
import cookies from "js-cookie";
import { getValidToken, removeToken, authFetch } from "@/lib/auth";
import Image from "next/image";
import CountryFlag from "@/components/ui/CountryFlag";

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
  whatsapp?: string | null;
  rating?: number;
  review_count?: number;
};

const CUISINES = [
  "senegalais",
  "ivoirien",
  "camerounais",
  "congolais",
  "malien",
  "guineen",
  "burkinabe",
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
];

export default function TraiteurEspacePage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [traiteur, setTraiteur] = useState<TraiteurProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [view, setView] = useState<
    "profil" | "plats" | "nouveau_plat" | "setup"
  >("profil");

  const [setupData, setSetupData] = useState({
    name: "",
    bio: "",
    cuisine_type: [] as string[],
    delivery_zones: [] as string[],
    whatsapp: "",
    image_url: "",
  });
  const [savingSetup, setSavingSetup] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [newDish, setNewDish] = useState({
    name: "",
    description: "",
    price: "",
    cuisine_type: "",
    image_urls: [] as string[],
    is_available: true,
  });
  const [savingDish, setSavingDish] = useState(false);
  const [editDish, setEditDish] = useState<Dish | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dishToDelete, setDishToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  async function loadTraiteur() {
    const token = getValidToken() || cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/me`,
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
        setView("setup");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Erreur de chargement du profil traiteur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTraiteur();
  }, []);

  async function handleSetup() {
    if (
      !setupData.name ||
      !setupData.bio ||
      setupData.cuisine_type.length === 0
    ) {
      setError("Remplis tous les champs obligatoires");
      return;
    }
    setSavingSetup(true);
    setError(null);
    const token = getValidToken() || cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      let finalImageUrl = setupData.image_url;

      if (profileImageFile) {
        const formData = new FormData();
        formData.append("file", profileImageFile);
        formData.append("folder", "profiles");

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/upload/single`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok)
          throw new Error(uploadData.error || "Erreur upload photo de profil");
        finalImageUrl = uploadData.url;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/setup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: setupData.name,
            bio: setupData.bio,
            cuisine_type: setupData.cuisine_type,
            delivery_zones: setupData.delivery_zones,
            whatsapp: setupData.whatsapp || null,
            image_url: finalImageUrl || null,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || "Erreur lors de la création de l'espace traiteur",
        );
      }

      setTraiteur(data.data.traiteur);
      setView("profil");
      setProfileImageFile(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setSavingSetup(false);
    }
  }

  async function handleEditProfile() {
    if (
      !setupData.name ||
      !setupData.bio ||
      setupData.cuisine_type.length === 0
    ) {
      setError("Remplis tous les champs obligatoires");
      return;
    }
    setSavingSetup(true);
    setError(null);
    const token = getValidToken() || cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      let finalImageUrl = setupData.image_url;

      if (profileImageFile) {
        const formData = new FormData();
        formData.append("file", profileImageFile);
        formData.append("folder", "profiles");

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/upload/single`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok)
          throw new Error(uploadData.error || "Erreur upload photo de profil");
        finalImageUrl = uploadData.url;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: setupData.name,
            bio: setupData.bio,
            cuisine_type: setupData.cuisine_type,
            delivery_zones: setupData.delivery_zones,
            whatsapp: setupData.whatsapp || null,
            image_url: finalImageUrl || null,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || "Erreur lors de la modification du profil",
        );
      }

      setTraiteur(data.data.traiteur);
      setSuccess("Profil mis à jour avec succès !");
      setTimeout(() => setSuccess(null), 3000);
      setView("profil");
      setProfileImageFile(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setSavingSetup(false);
    }
  }

  async function handleAddDish() {
    if (
      !newDish.name ||
      !newDish.price ||
      !newDish.cuisine_type ||
      selectedFiles.length === 0
    ) {
      setError("Remplis tous les champs obligatoires");
      return;
    }

    if (parseFloat(newDish.price) < 0) {
      setError("Le prix ne peut pas être négatif");
      return;
    }
    setSavingDish(true);
    setError(null);
    const token = getValidToken() || cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      let uploadedUrls: string[] = [];

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("files", file));
        formData.append("folder", "dishes");

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/upload/multiple`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok)
          throw new Error(
            uploadData.error || "Erreur lors de l'upload des images",
          );
        uploadedUrls = uploadData.urls || [];
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/dishes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newDish.name,
            description: newDish.description,
            price: parseFloat(newDish.price),
            cuisine_type: newDish.cuisine_type,
            is_available: newDish.is_available,
            image_urls: uploadedUrls,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'ajout du plat");
      }

      const createdDish = data.data.dish;
      setDishes((prev) => [createdDish, ...prev]);
      setNewDish({
        name: "",
        description: "",
        price: "",
        cuisine_type: "",
        is_available: true,
        image_urls: [],
      });
      setSelectedFiles([]);

      setSuccess("Plat ajouté avec succès !");
      setTimeout(() => setSuccess(null), 3000);
      setView("plats");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setSavingDish(false);
    }
  }

  async function handleEditDish() {
    if (
      !newDish.name ||
      !newDish.price ||
      !newDish.cuisine_type ||
      (selectedFiles.length === 0 && newDish.image_urls.length === 0)
    ) {
      setError("Remplis tous les champs obligatoires");
      return;
    }

    if (parseFloat(newDish.price) < 0) {
      setError("Le prix ne peut pas être négatif");
      return;
    }
    setSavingDish(true);
    setError(null);
    const token = getValidToken() || cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      let uploadedUrls: string[] = [];

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("files", file));
        formData.append("folder", "dishes");

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/upload/multiple`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok)
          throw new Error(
            uploadData.error || "Erreur lors de l'upload des images",
          );
        uploadedUrls = uploadData.urls || [];
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/dishes/${editDish!.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newDish.name,
            description: newDish.description,
            price: parseFloat(newDish.price),
            cuisine_type: newDish.cuisine_type,
            is_available: newDish.is_available,
            image_urls: [...newDish.image_urls, ...uploadedUrls],
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la modification du plat");
      }

      const updatedDish = data.data.dish;
      setDishes((prev) =>
        prev.map((d) => (d.id === editDish!.id ? updatedDish : d)),
      );
      setNewDish({
        name: "",
        description: "",
        price: "",
        cuisine_type: "",
        is_available: true,
        image_urls: [],
      });
      setSelectedFiles([]);

      setSuccess("Plat modifié avec succès !");
      setTimeout(() => setSuccess(null), 3000);
      setView("plats");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setSavingDish(false);
    }
  }

  async function toggleDish(dishId: string, current: boolean) {
    const token = getValidToken() || cookies.get("token");
    if (token) {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/dishes/${dishId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_available: !current }),
        },
      );
    }
    setDishes((prev) =>
      prev.map((d) =>
        d.id === dishId ? { ...d, is_available: !current } : d,
      ),
    );
  }

  async function confirmDeleteDish() {
    if (!dishToDelete) return;
    setIsDeleting(true);
    const token = getValidToken() || cookies.get("token");
    try {
      if (token) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/traiteur/dishes/${dishToDelete}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      setDishes((prev) => prev.filter((d) => d.id !== dishToDelete));
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
    } finally {
      setIsDeleting(false);
      setDishToDelete(null);
    }
  }

  const toggleCuisine = (c: string) =>
    setSetupData((prev) => ({
      ...prev,
      cuisine_type: prev.cuisine_type.includes(c)
        ? prev.cuisine_type.filter((x) => x !== c)
        : [...prev.cuisine_type, c],
    }));

  const toggleZone = (z: string) =>
    setSetupData((prev) => ({
      ...prev,
      delivery_zones: prev.delivery_zones.includes(z)
        ? prev.delivery_zones.filter((x) => x !== z)
        : [...prev.delivery_zones, z],
    }));

  const isFormValid =
    newDish.name.trim() !== "" &&
    newDish.price !== "" &&
    newDish.cuisine_type !== "" &&
    (selectedFiles.length > 0 ||
      (newDish.image_urls && newDish.image_urls.length > 0));

  const copyPublicLink = () => {
    if (!traiteur) return;
    const url = `${window.location.origin}/traiteur/${traiteur.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-[#1D6B45] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-700">
          Chargement de votre espace traiteur...
        </p>
      </div>
    );
  }

  // --- VUE SETUP / MODIFICATION DU PROFIL TRAITEUR ---
  if (view === "setup" || !traiteur) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pb-24">
        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white border-b border-emerald-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <button
              onClick={() => {
                if (editProfile && traiteur) {
                  setEditProfile(false);
                  setView("profil");
                } else {
                  router.push("/profil");
                }
              }}
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold mb-4 bg-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-xs transition-colors"
            >
              <ArrowLeft size={14} />
              {editProfile && traiteur
                ? "Retour à mon espace traiteur"
                : "Retour à mon profil utilisateur"}
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <ChefHat size={26} className="text-[#D4870A]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {editProfile && traiteur
                    ? "Modifier mon enseigne traiteur"
                    : "Créer mon espace traiteur partenaire"}
                </h1>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                  {editProfile && traiteur
                    ? "Mettez à jour vos informations visibles par les clients"
                    : "Rejoignez le réseau Dabari et recevez des commandes de plats et des demandes de devis"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container 2 Colonnes */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulaire (8 colonnes) */}
            <div className="lg:col-span-8 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm flex items-center gap-3">
                  <AlertCircle size={18} className="shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                  {editProfile
                    ? "Paramètres de votre enseigne"
                    : "Informations de votre atelier"}
                </h2>

                {/* Photo de profil traiteur */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Photo / Logo de l'établissement
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {profileImageFile ? (
                        <Image
                          src={URL.createObjectURL(profileImageFile)}
                          alt="Preview"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : setupData.image_url ? (
                        <Image
                          src={setupData.image_url}
                          alt="Current profile"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <ChefHat className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left">
                      <label className="cursor-pointer bg-[#E8F5E9] text-[#1D6B45] hover:bg-[#C8E6C9] px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-colors inline-block shadow-2xs">
                        {profileImageFile || setupData.image_url
                          ? "Modifier la photo"
                          : "Téléverser une photo"}
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setProfileImageFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Format recommandé : JPG, PNG ou WEBP (carré 1:1)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Nom commercial ou Enseigne *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Saveurs de Dakar, Délices d'Abidjan, AfroGourmet..."
                    value={setupData.name}
                    onChange={(e) =>
                      setSetupData((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    required
                  />
                </div>

                {/* Présentation / Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Présentation de votre cuisine & histoire *
                  </label>
                  <textarea
                    placeholder="Racontez votre passion culinaire, vos spécialités, vos recettes traditionnelles transmises..."
                    rows={4}
                    value={setupData.bio}
                    onChange={(e) =>
                      setSetupData((p) => ({ ...p, bio: e.target.value }))
                    }
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none bg-white font-medium text-slate-800 leading-relaxed"
                    required
                  />
                </div>

                {/* Cuisines proposées */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Cuisines proposées *
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Sélectionnez au moins une spécialité culinaire.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {CUISINES.map((c) => {
                      const isSelected = setupData.cuisine_type.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCuisine(c)}
                          className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold capitalize transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#1D6B45] text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <CountryFlag country={c} size={16} />
                          {isSelected && (
                            <Check size={14} className="stroke-[3]" />
                          )}
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Zones de livraison */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Zones de livraison couvertes
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Indiquez les villes ou départements où vous pouvez livrer.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {ZONES.map((z) => {
                      const isSelected = setupData.delivery_zones.includes(z);
                      return (
                        <button
                          key={z}
                          type="button"
                          onClick={() => toggleZone(z)}
                          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#1D6B45] text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <MapPin size={13} />
                          {z}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Numéro WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Phone size={14} className="text-[#1D6B45]" /> Numéro
                    WhatsApp professionnel
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: +33 6 12 34 56 78"
                    value={setupData.whatsapp}
                    onChange={(e) =>
                      setSetupData((p) => ({ ...p, whatsapp: e.target.value }))
                    }
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Permet d'échanger directement avec vos clients pour ajuster
                    les détails de commande.
                  </p>
                </div>

                {/* Bouton de validation */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={editProfile ? handleEditProfile : handleSetup}
                    disabled={savingSetup}
                    className="w-full bg-[#1D6B45] text-white py-4 px-6 rounded-2xl font-bold text-sm sm:text-base hover:bg-[#155235] transition-all disabled:opacity-50 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {savingSetup ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enregistrement en cours...</span>
                      </div>
                    ) : editProfile ? (
                      "Enregistrer les modifications"
                    ) : (
                      "Activer mon espace traiteur Dabari"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Conseils & Reassurance (4 colonnes) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#D4870A]" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Rejoindre les Traiteurs Dabari
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  En publiant votre profil traiteur, vous bénéficiez de :
                </p>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="text-[#1D6B45] shrink-0 mt-0.5"
                    />
                    <span>
                      Une vitrine dédiée référencée auprès de la diaspora et des
                      amateurs de gastronomie africaine.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="text-[#1D6B45] shrink-0 mt-0.5"
                    />
                    <span>
                      La réception d'appels d'offres pour événements (mariages,
                      anniversaires, réceptions d'entreprises).
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="text-[#1D6B45] shrink-0 mt-0.5"
                    />
                    <span>
                      Paiements sécurisés et garantis via la plateforme.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VUE NOUVEAU / MODIFIER PLAT ---
  if (view === "nouveau_plat") {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pb-24">
        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white border-b border-emerald-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <button
              onClick={() => {
                setEditDish(null);
                setView("plats");
              }}
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold mb-4 bg-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-xs transition-colors"
            >
              <ArrowLeft size={14} /> Retour à mes plats
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Utensils size={26} className="text-[#D4870A]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {editDish ? "Modifier le plat" : "Ajouter un nouveau plat"}
                </h1>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                  {editDish
                    ? `Mise à jour de : ${editDish.name}`
                    : "Enrichissez votre carte avec de délicieuses recettes traditionnelles"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Studio 2 colonnes */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulaire (8 colonnes) */}
            <div className="lg:col-span-8 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm flex items-center gap-3">
                  <AlertCircle size={18} className="shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                {/* Upload Photos du plat */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Photos du plat *
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Téléchargez des photos nettes et lumineuses de votre plat
                    pour séduire les convives.
                  </p>

                  <div className="flex justify-center px-6 pt-7 pb-8 border-2 border-dashed border-slate-200 rounded-3xl hover:border-[#1D6B45] hover:bg-[#E8F5E9]/30 transition-all cursor-pointer relative group">
                    <div className="space-y-2 text-center">
                      <div className="w-14 h-14 bg-slate-100 group-hover:bg-[#E8F5E9] text-slate-400 group-hover:text-[#1D6B45] rounded-2xl flex items-center justify-center mx-auto transition-colors">
                        <ImagePlus size={28} />
                      </div>
                      <div className="text-sm font-bold text-[#1D6B45]">
                        Cliquez ou glissez-déposez vos photos
                      </div>
                      <p className="text-xs text-slate-400">
                        PNG, JPG, WEBP jusqu'à 2MB (sélection multiple
                        possible)
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg, image/png, image/webp"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files) {
                          setSelectedFiles(Array.from(e.target.files));
                        }
                      }}
                    />
                  </div>

                  {/* Previews Photos Existantes */}
                  {newDish.image_urls && newDish.image_urls.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        Photos actuelles :
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {newDish.image_urls.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-square shadow-2xs"
                          >
                            <Image
                              src={url}
                              alt={`existing-${idx}`}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setNewDish((prev) => ({
                                  ...prev,
                                  image_urls: prev.image_urls!.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }))
                              }
                              className="absolute top-1.5 right-1.5 bg-white/95 text-red-600 rounded-full p-1 shadow-sm opacity-90 hover:opacity-100 transition-opacity"
                              title="Retirer cette photo"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previews NOUVELLES photos sélectionnées */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        Nouvelles photos prêtes à être téléversées :
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {selectedFiles.map((file, idx) => (
                          <div
                            key={`new-${idx}`}
                            className="relative group rounded-2xl overflow-hidden border border-emerald-300 aspect-square shadow-2xs ring-2 ring-[#1D6B45]/20"
                          >
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={`preview-${idx}`}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedFiles((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                              className="absolute top-1.5 right-1.5 bg-white/95 text-red-600 rounded-full p-1 shadow-sm opacity-90 hover:opacity-100 transition-opacity"
                              title="Retirer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nom du plat */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Nom du plat *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Thieboudienne Penda Mbaye, Ndolé aux crevettes, Maffé..."
                    value={newDish.name}
                    onChange={(e) =>
                      setNewDish((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    required
                  />
                </div>

                {/* Description du plat */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Description & Ingrédients
                  </label>
                  <textarea
                    placeholder="Ingrédients clés, saveurs, épices, garniture (riz, aloco, plantain), allergènes..."
                    rows={3}
                    value={newDish.description}
                    onChange={(e) =>
                      setNewDish((p) => ({ ...p, description: e.target.value }))
                    }
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none bg-white font-medium text-slate-800 leading-relaxed"
                  />
                </div>

                {/* Prix et Cuisine */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Prix par portion (€) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="Ex: 14.50"
                        value={newDish.price}
                        onChange={(e) =>
                          setNewDish((p) => ({ ...p, price: e.target.value }))
                        }
                        className="w-full pl-4 pr-10 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-bold text-slate-800"
                        required
                      />
                      <span className="absolute right-4 top-3.5 text-xs text-slate-400 font-bold pointer-events-none">
                        €
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Origine culinaire *
                    </label>
                    <select
                      value={newDish.cuisine_type}
                      onChange={(e) =>
                        setNewDish((p) => ({
                          ...p,
                          cuisine_type: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800 capitalize"
                      required
                    >
                      <option value="">Sélectionner une origine</option>
                      {CUISINES.map((c) => (
                        <option key={c} value={c} className="capitalize">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Disponibilité immédiate */}
                <div className="pt-2">
                  <label className="flex items-center gap-3.5 p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={newDish.is_available}
                      onChange={(e) =>
                        setNewDish((p) => ({
                          ...p,
                          is_available: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 accent-[#1D6B45] rounded-md cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Disponible immédiatement à la commande
                      </span>
                      <span className="text-xs text-slate-500">
                        Si décoché, le plat apparaîtra comme "Épuisé / Momentanément
                        indisponible"
                      </span>
                    </div>
                  </label>
                </div>

                {/* Bouton validation */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={editDish ? handleEditDish : handleAddDish}
                    disabled={savingDish || !isFormValid}
                    className="w-full bg-[#1D6B45] text-white py-4 px-6 rounded-2xl font-bold text-sm sm:text-base hover:bg-[#155235] transition-all disabled:opacity-50 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {savingDish ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enregistrement du plat...</span>
                      </div>
                    ) : editDish ? (
                      "Mettre à jour le plat"
                    ) : (
                      "Ajouter le plat à ma carte"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview de la fiche plat (4 colonnes) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Aperçu sur la carte client
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      newDish.is_available
                        ? "bg-[#E8F5E9] text-[#1D6B45]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {newDish.is_available ? "En ligne" : "Masqué"}
                  </span>
                </div>

                {/* Card Dish Preview */}
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs">
                  <div className="relative aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                    {selectedFiles.length > 0 ? (
                      <Image
                        src={URL.createObjectURL(selectedFiles[0])}
                        alt="Preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : newDish.image_urls && newDish.image_urls.length > 0 ? (
                      <Image
                        src={newDish.image_urls[0]}
                        alt="Preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <Utensils className="w-12 h-12 text-slate-300" />
                    )}
                    {newDish.cuisine_type && (
                      <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg capitalize">
                        {newDish.cuisine_type}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">
                        {newDish.name || "Nom du plat"}
                      </h4>
                      <span className="font-black text-[#1D6B45] text-base shrink-0">
                        {newDish.price
                          ? `${Number(newDish.price).toFixed(2)} €`
                          : "0.00 €"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {newDish.description ||
                        "Description détaillée de la recette et des accompagnements..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VUE PRINCIPALE DASHBOARD PRO TRAITEUR ---
  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24">
      {/* Top Banner Hero Desktop & Mobile */}
      <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Breadcrumbs & Navigation */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <Link
              href="/profil"
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold bg-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-xs transition-colors"
            >
              <ArrowLeft size={14} /> Espace Mon Compte
            </Link>

            {/* Quick public page link */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyPublicLink}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl backdrop-blur-xs transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="text-emerald-300" />
                    <span>Lien copié !</span>
                  </>
                ) : (
                  <>
                    <Share2 size={14} />
                    <span>Partager ma boutique</span>
                  </>
                )}
              </button>

              <Link
                href={`/traiteur/${traiteur?.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#D4870A] hover:bg-[#b87408] text-white px-3.5 py-1.5 rounded-xl transition-all shadow-2xs"
              >
                <Eye size={14} />
                <span>Voir ma vitrine en direct</span>
              </Link>
            </div>
          </div>

          {/* Chef Identity Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {traiteur?.image_url ? (
                  <Image
                    src={traiteur.image_url}
                    alt={traiteur.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <ChefHat size={36} className="text-[#D4870A]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {traiteur?.name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      traiteur?.is_active
                        ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                        : "bg-white/20 text-white"
                    }`}
                  >
                    {traiteur?.is_active ? "● Enseigne Active" : "En pause"}
                  </span>
                </div>
                <p className="text-white/80 text-xs sm:text-sm mt-1">
                  Espace Gestionnaire Culinaire Dabari
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar Desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-white">
                  {dishes.length}
                </span>
                <span className="text-[11px] text-white/70">Plats au menu</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-amber-300">
                  {dishes.filter((d) => d.is_available).length}
                </span>
                <span className="text-[11px] text-white/70">Disponibles</span>
              </div>
              <div className="hidden sm:block bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-white">
                  {traiteur?.delivery_zones?.length || 0}
                </span>
                <span className="text-[11px] text-white/70">Zones couvertes</span>
              </div>
            </div>
          </div>

          {/* Segmented Tab Control */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => setView("profil")}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                view === "profil"
                  ? "bg-white text-[#1D6B45] shadow-sm"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <User size={15} />
              <span>Profil de l'atelier</span>
            </button>
            <button
              onClick={() => setView("plats")}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                view === "plats"
                  ? "bg-white text-[#1D6B45] shadow-sm"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Utensils size={15} />
              <span>Gestion de la carte ({dishes.length})</span>
            </button>
            <button
              onClick={() => {
                setEditDish(null);
                setNewDish({
                  name: "",
                  description: "",
                  price: "",
                  cuisine_type: "",
                  is_available: true,
                  image_urls: [],
                });
                setSelectedFiles([]);
                setView("nouveau_plat");
              }}
              className="ml-auto bg-[#D4870A] hover:bg-[#b87408] text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Ajouter un plat</span>
              <span className="sm:hidden">Plat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6">
        {success && (
          <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 text-[#1D6B45] rounded-2xl px-5 py-3.5 mb-6 text-sm font-semibold flex items-center gap-2 shadow-xs">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* --- ONGLET PROFIL ATELIER --- */}
        {view === "profil" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Colonne Gauche (8 colonnes) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Informations Atelier */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Fiche de l'enseigne
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Coordonnées et spécialités affichées aux convives
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSetupData({
                        name: traiteur!.name,
                        bio: traiteur!.bio,
                        cuisine_type: traiteur!.cuisine_type,
                        delivery_zones: traiteur!.delivery_zones,
                        whatsapp: traiteur!.whatsapp || "",
                        image_url: traiteur!.image_url || "",
                      });
                      setProfileImageFile(null);
                      setEditProfile(true);
                      setView("setup");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1D6B45] bg-[#E8F5E9] hover:bg-[#C8E6C9] px-4 py-2 rounded-2xl transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Modifier</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Nom commercial
                    </span>
                    <p className="font-extrabold text-slate-900 text-base">
                      {traiteur?.name}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      WhatsApp direct
                    </span>
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Phone size={14} className="text-[#1D6B45]" />
                      {traiteur?.whatsapp || "Non renseigné"}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Histoire & Savoir-faire
                    </span>
                    <p className="text-slate-700 leading-relaxed bg-[#FAF7F2] p-4 rounded-2xl border border-slate-200/60 font-medium text-xs sm:text-sm">
                      {traiteur?.bio}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Cuisines proposées
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {traiteur?.cuisine_type?.map((c) => (
                        <span
                          key={c}
                          className="bg-[#E8F5E9] text-[#1D6B45] text-xs font-bold px-3 py-1 rounded-full capitalize inline-flex items-center gap-1.5"
                        >
                          <CountryFlag country={c} size={15} />
                          <span>{c}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Zones de livraison assurées
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {traiteur?.delivery_zones?.map((z) => (
                        <span
                          key={z}
                          className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1"
                        >
                          <MapPin size={12} className="text-[#1D6B45]" /> {z}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Aperçu des 3 derniers plats */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Aperçu de vos plats récents
                  </h3>
                  <button
                    onClick={() => setView("plats")}
                    className="text-xs font-bold text-[#1D6B45] hover:underline"
                  >
                    Voir toute la carte ({dishes.length}) →
                  </button>
                </div>

                {dishes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Vous n'avez pas encore ajouté de plat à votre menu.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {dishes.slice(0, 3).map((dish) => (
                      <div
                        key={dish.id}
                        className="rounded-2xl border border-slate-100 p-3 bg-slate-50/50 flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-video rounded-xl bg-slate-200 overflow-hidden mb-2">
                            {dish.image_urls && dish.image_urls.length > 0 ? (
                              <Image
                                src={dish.image_urls[0]}
                                alt={dish.name}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Utensils size={18} />
                              </div>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {dish.name}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                          <span className="text-[11px] font-bold text-[#1D6B45]">
                            {Number(dish.price).toFixed(2)} €
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              dish.is_available
                                ? "bg-[#E8F5E9] text-[#1D6B45]"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {dish.is_available ? "Dispo" : "Épuisé"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Colonne Droite (4 colonnes) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
              {/* Carte Statut & Visibilité */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Visibilité publique
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Statut de référencement
                    </p>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      traiteur?.is_active
                        ? "bg-[#E8F5E9] text-[#1D6B45]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {traiteur?.is_active ? (
                      <>
                        <Check size={13} className="stroke-[3]" />
                        <span>En ligne</span>
                      </>
                    ) : (
                      "Inactif"
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Votre enseigne est active et visible par tous les clients
                  recherchant un traiteur dans vos zones d'intervention.
                </p>

                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  <Link
                    href={`/traiteur/${traiteur?.id}`}
                    target="_blank"
                    className="w-full bg-[#1D6B45] text-white py-3 px-4 rounded-2xl font-bold text-xs hover:bg-[#155234] transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <ExternalLink size={14} />
                    <span>Ouvrir ma vitrine client</span>
                  </Link>

                  <Link
                    href="/commandes"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Consulter les commandes reçues</span>
                  </Link>
                </div>
              </div>

              {/* Raccourci Ajout de Plat */}
              <div className="bg-[#FAF7F2] rounded-3xl border border-amber-200/70 p-6 sm:p-7 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#D4870A]" />
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Développez vos ventes
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Les traiteurs ayant au moins 5 plats au menu reçoivent 3x plus
                  de commandes en moyenne.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditDish(null);
                    setNewDish({
                      name: "",
                      description: "",
                      price: "",
                      cuisine_type: "",
                      is_available: true,
                      image_urls: [],
                    });
                    setSelectedFiles([]);
                    setView("nouveau_plat");
                  }}
                  className="w-full bg-[#D4870A] hover:bg-[#b87408] text-white py-3 rounded-2xl font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  + Ajouter une recette maintenant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- ONGLET GESTION DE LA CARTE DES PLATS --- */}
        {view === "plats" && (
          <div className="space-y-6">
            {/* Top Bar Plats */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Votre carte des plats ({dishes.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gérez la disponibilité, modifiez vos tarifs ou ajoutez de
                  nouvelles recettes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditDish(null);
                  setNewDish({
                    name: "",
                    description: "",
                    price: "",
                    cuisine_type: "",
                    is_available: true,
                    image_urls: [],
                  });
                  setSelectedFiles([]);
                  setView("nouveau_plat");
                }}
                className="bg-[#1D6B45] hover:bg-[#155235] text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Ajouter un plat</span>
              </button>
            </div>

            {/* Grille responsive des plats (3 colonnes Desktop) */}
            {dishes.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto shadow-xs">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Utensils size={32} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Aucun plat dans votre menu
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Commencez dès maintenant en publiant votre premier plat
                  traditionnel avec photos et tarifs.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditDish(null);
                    setView("nouveau_plat");
                  }}
                  className="bg-[#1D6B45] text-white px-6 py-3 rounded-2xl font-bold text-xs hover:bg-[#155235] transition-colors shadow-xs"
                >
                  + Ajouter mon premier plat
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo et Badges */}
                      <div className="relative aspect-video bg-slate-100 overflow-hidden">
                        {dish.image_urls && dish.image_urls.length > 0 ? (
                          <Image
                            src={dish.image_urls[0]}
                            alt={dish.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Utensils size={28} />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-xl capitalize">
                          {dish.cuisine_type}
                        </span>
                        <span
                          className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-xl backdrop-blur-xs ${
                            dish.is_available
                              ? "bg-emerald-600/90 text-white shadow-xs"
                              : "bg-slate-800/80 text-slate-200"
                          }`}
                        >
                          {dish.is_available ? "En ligne" : "Épuisé"}
                        </span>
                      </div>

                      {/* Corps de la carte */}
                      <div className="p-5 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-extrabold text-slate-900 text-base line-clamp-1">
                            {dish.name}
                          </h3>
                          <span className="font-black text-[#1D6B45] text-lg shrink-0">
                            {Number(dish.price).toFixed(2)} €
                          </span>
                        </div>
                        {dish.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {dish.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Barre d'actions */}
                    <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleDish(dish.id, dish.is_available)}
                        className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                          dish.is_available
                            ? "bg-[#E8F5E9] text-[#1D6B45] hover:bg-[#C8E6C9]"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {dish.is_available ? (
                          <span className="inline-flex items-center gap-1">
                            <Check size={13} className="stroke-[3]" />
                            <span>Disponible</span>
                          </span>
                        ) : (
                          "Marquer dispo"
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditDish(dish);
                            setNewDish({
                              name: dish.name,
                              description: dish.description || "",
                              price: dish.price.toString(),
                              cuisine_type: dish.cuisine_type,
                              is_available: dish.is_available,
                              image_urls: dish.image_urls || [],
                            });
                            setView("nouveau_plat");
                          }}
                          className="p-2 text-slate-600 hover:text-[#1D6B45] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDishToDelete(dish.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal confirmation suppression de plat */}
      {dishToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              Supprimer ce plat ?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Ce plat sera définitivement retiré de votre menu en ligne.
              L'historique de vos commandes passées reste préservé.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDishToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-2xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteDish}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
