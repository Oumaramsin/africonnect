"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, User, Utensils, Eye, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import cookies from "js-cookie";

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

  async function loadTraiteur() {
    const token = cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/me`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.message || "Erreur lors de la récupération du profil");
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
    } catch (err: any) {
      console.error(err);
      setError("Erreur de chargement du profil traiteur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const load = async () => {
      await loadTraiteur();
    };
    load();
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
    const token = cookies.get("token");
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
        throw new Error(data.error || "Erreur lors de la création de l'espace traiteur");
      }

      setTraiteur(data.data.traiteur);
      setView("profil");
      setProfileImageFile(null);
    } catch (err: any) {
      setError(err.message);
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
    const token = cookies.get("token");
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
        throw new Error(data.error || "Erreur lors de la modification du profil");
      }

      setTraiteur(data.data.traiteur);
      setSuccess("Profil mis à jour avec succès !");
      setTimeout(() => setSuccess(null), 3000);
      setView("profil");
      setProfileImageFile(null);
    } catch (err: any) {
      setError(err.message);
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
    const token = cookies.get("token");
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
          throw new Error(uploadData.error || "Erreur lors de l'upload des images");
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
    } catch (err: any) {
      setError(err.message);
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
    const token = cookies.get("token");
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
          throw new Error(uploadData.error || "Erreur lors de l'upload des images");
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingDish(false);
    }
  }

  async function toggleDish(dishId: string, current: boolean) {
    const token = cookies.get("token");
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
      prev.map((d) => (d.id === dishId ? { ...d, is_available: !current } : d)),
    );
  }

  async function confirmDeleteDish() {
    if (!dishToDelete) return;
    setIsDeleting(true);
    const token = cookies.get("token");
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

  if (loading)
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-[#1D6B45]">Chargement...</div>
      </div>
    );

  if (view === "setup")
    return (
      <div className="min-h-screen bg-[#FAF7F2] pb-36">
        <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
          <button
            onClick={() => setView("profil")}
            className="text-white/70 text-sm mb-4 inline-block hover:text-white transition-colors"
          >
            ← {editProfile ? "Retour" : "Profil"}
          </button>
          <h1 className="text-2xl font-bold text-white">
            {editProfile ? "Modifier mon profil" : "Devenir Traiteur"}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {editProfile
              ? "Mets à jour tes informations"
              : "Configure ton espace traiteur"}
          </p>
        </div>
        <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              {editProfile ? "Mes informations" : "Ton profil traiteur"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo de profil
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                    {profileImageFile ? (
                      <img
                        src={URL.createObjectURL(profileImageFile)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : setupData.image_url ? (
                      <img
                        src={setupData.image_url}
                        alt="Current profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer bg-[#E8F5E9] text-[#1D6B45] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#C8E6C9] transition-colors inline-block">
                      {profileImageFile || setupData.image_url
                        ? "Changer la photo"
                        : "Ajouter une photo"}
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
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de ton activité *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chez Mariama, Les Saveurs d'Abidjan..."
                  value={setupData.name}
                  onChange={(e) =>
                    setSetupData((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Présentation *
                </label>
                <textarea
                  placeholder="Décris ton activité, ta spécialité, ton expérience..."
                  rows={3}
                  value={setupData.bio}
                  onChange={(e) =>
                    setSetupData((p) => ({ ...p, bio: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuisines proposées *
                </label>
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCuisine(c)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                        setupData.cuisine_type.includes(c)
                          ? "bg-[#1D6B45] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zones de livraison
                </label>
                <div className="flex flex-wrap gap-2">
                  {ZONES.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => toggleZone(z)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        setupData.delivery_zones.includes(z)
                          ? "bg-[#1D6B45] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="+33612345678"
                  value={setupData.whatsapp}
                  onChange={(e) =>
                    setSetupData((p) => ({ ...p, whatsapp: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Tu recevras les commandes directement sur WhatsApp
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={editProfile ? handleEditProfile : handleSetup}
            disabled={savingSetup}
            className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
          >
            {savingSetup
              ? editProfile
                ? "Modification..."
                : "Création..."
              : editProfile
                ? "Enregistrer les modifications"
                : "Créer mon espace traiteur"}
          </button>
        </div>
      </div>
    );

  if (view === "nouveau_plat")
    return (
      <div className="min-h-screen bg-[#FAF7F2] pb-36">
        <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
          <button
            onClick={() => setView("plats")}
            className="text-white/70 text-sm mb-4 inline-block"
          >
            ← Mes plats
          </button>
          <h1 className="text-2xl font-bold text-white">
            {editDish ? "Modifier le Plat" : "Ajouter un plat"}
          </h1>
        </div>
        <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            {/* Upload Image (Visuel) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photos du plat *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-2xl hover:border-[#1D6B45] hover:bg-[#E8F5E9]/50 transition-colors cursor-pointer relative group">
                <div className="space-y-2 text-center">
                  <ImagePlus className="mx-auto h-10 w-10 text-gray-400 group-hover:text-[#1D6B45] transition-colors" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-[#1D6B45] hover:text-[#0F4A30]">
                      <span>Ajouter des images</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, WEBP jusqu'à 2MB (plusieurs possibles)
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
                    console.log("Fichiers sélectionnés :", e.target.files);
                  }}
                />
              </div>

              {/* Prévisualisation des images */}
              {newDish.image_urls && newDish.image_urls.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {newDish.image_urls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square"
                    >
                      <img
                        src={url}
                        alt={`existing-${idx}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Bouton pour retirer cette ancienne image de la liste */}
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
                        className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Prévisualisation des NOUVELLES images sélectionnées */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`new-${idx}`}
                      className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview-${idx}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFiles((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du plat *
              </label>
              <input
                type="text"
                placeholder="Ex: Thiéboudienne, Ndolé au bœuf..."
                value={newDish.name}
                onChange={(e) =>
                  setNewDish((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="Décris les ingrédients, la quantité, les allergènes..."
                rows={2}
                value={newDish.description}
                onChange={(e) =>
                  setNewDish((p) => ({ ...p, description: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix (€) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  placeholder="Ex: 15"
                  value={newDish.price}
                  onChange={(e) =>
                    setNewDish((p) => ({ ...p, price: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuisine *
                </label>
                <select
                  value={newDish.cuisine_type}
                  onChange={(e) =>
                    setNewDish((p) => ({ ...p, cuisine_type: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                >
                  <option value="">Choisir</option>
                  {CUISINES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newDish.is_available}
                onChange={(e) =>
                  setNewDish((p) => ({ ...p, is_available: e.target.checked }))
                }
                className="w-4 h-4 accent-[#1D6B45]"
              />
              <span className="text-sm text-gray-700">
                Disponible immédiatement
              </span>
            </label>
          </div>
          <div>
            <button
              onClick={editDish ? handleEditDish : handleAddDish}
              disabled={savingDish || !isFormValid}
              className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
            >
              {savingDish
                ? editDish
                  ? "Modification en cours..."
                  : "Ajout en cours..."
                : editDish
                  ? "Mettre à jour le plat"
                  : "Ajouter le plat"}
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-10">
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link
          href="/profil"
          className="text-white/70 text-sm mb-4 inline-block"
        >
          ← Profil
        </Link>
        <div className="flex items-center gap-3">
          {traiteur?.image_url && (
            <img
              src={traiteur.image_url}
              alt="Profil traiteur"
              className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{traiteur?.name}</h1>
            <p className="text-white/70 text-sm mt-1">Espace traiteur</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {(["profil", "plats"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                view === v
                  ? "bg-white text-[#1D6B45]"
                  : "bg-white/20 text-white"
              }`}
            >
              {v === "profil" ? (
                <>
                  <User size={16} className="inline mr-1" /> Mon profil
                </>
              ) : (
                <>
                  <Utensils size={16} className="inline mr-1" /> Mes plats (
                  {dishes.length})
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {success && (
          <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 text-[#1D6B45] rounded-xl px-4 py-3 mb-4 text-sm font-medium">
            ✓ {success}
          </div>
        )}

        {view === "profil" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Informations</h2>
                <button
                  onClick={() => {
                    setSetupData({
                      name: traiteur!.name,
                      bio: traiteur!.bio,
                      cuisine_type: traiteur!.cuisine_type,
                      delivery_zones: traiteur!.delivery_zones,
                      whatsapp: (traiteur as any).whatsapp || "",
                      image_url: traiteur!.image_url || "",
                    });
                    setProfileImageFile(null);
                    setEditProfile(true);
                    setView("setup");
                  }}
                  className="text-xs font-medium text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
                >
                  Modifier mon profil
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Nom</p>
                  <p className="text-gray-800 font-medium">{traiteur?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Présentation</p>
                  <p className="text-gray-600 text-sm">{traiteur?.bio}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Cuisines</p>
                  <div className="flex flex-wrap gap-1">
                    {traiteur?.cuisine_type?.map((c) => (
                      <span
                        key={c}
                        className="bg-[#E8F5E9] text-[#1D6B45] text-xs px-2 py-1 rounded-full capitalize"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Zones de livraison
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {traiteur?.delivery_zones?.map((z) => (
                      <span
                        key={z}
                        className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full flex items-center"
                      >
                        <MapPin size={12} className="inline mr-1" /> {z}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Statut</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Visible sur la plateforme
                  </p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    traiteur?.is_active
                      ? "bg-[#E8F5E9] text-[#1D6B45]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {traiteur?.is_active ? "✓ Actif" : "Inactif"}
                </div>
              </div>
            </div>

            <Link
              href={`/traiteur/${traiteur?.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye size={20} className="text-[#1D6B45]" />
                  <span className="text-sm font-medium text-gray-700">
                    Voir ma page publique
                  </span>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>
          </div>
        )}

        {view === "plats" && (
          <div className="space-y-4">
            <button
              onClick={() => setView("nouveau_plat")}
              className="w-full bg-[#1D6B45] text-white py-3 rounded-2xl font-medium hover:bg-[#0F4A30] transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>Ajouter un plat
            </button>

            {dishes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="flex justify-center mb-3">
                  <Utensils size={48} className="text-gray-300" />
                </div>
                <p>Aucun plat encore</p>
                <p className="text-sm mt-1">Ajoute ton premier plat !</p>
              </div>
            ) : (
              dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{dish.name}</h3>
                      {dish.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {dish.description}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-[#1D6B45] ml-3">
                      {Number(dish.price).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-1 rounded-full">
                      {dish.cuisine_type}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleDish(dish.id, dish.is_available)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                          dish.is_available
                            ? "bg-[#E8F5E9] text-[#1D6B45]"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {dish.is_available ? "✓ Disponible" : "Indisponible"}
                      </button>
                      <button
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
                        className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1.5 transition-colors font-medium"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setDishToDelete(dish.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 transition-colors font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {dishToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Supprimer ce plat ?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Ce plat sera retiré de ton menu. L'historique des commandes
              passées sera conservé.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDishToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteDish}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
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
