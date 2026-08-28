"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChefHat, Plane, User, Package, LogOut, Lock, ChevronDown, ChevronUp, Edit3, Phone, MapPin, Mail, Trash2, AlertTriangle, X } from "lucide-react";
import cookies from "js-cookie";
import AddressAutocomplete from "@/components/AddressAutocomplete";

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
  const [showInfo, setShowInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      const token = cookies.get("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const payloadBase64 = token.split(".")[1];
      const decodedPayload = JSON.parse(
        Buffer.from(payloadBase64, "base64").toString("utf-8"),
      );
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/user/${decodedPayload.userId}`,{
        headers:{
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })
      const data = await response.json()
      if(!response.ok){
        setError(data.message || "Errueur lors de la récupération du profil utilisateur");
        return;
      }
      setUserEmail(data.foundUser.email)
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

    const token = cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const payloadBase64 = token.split(".")[1];
      const decodedPayload = JSON.parse(
        Buffer.from(payloadBase64, "base64").toString("utf-8"),
      );
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/${decodedPayload.userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erreur lors de la mise à jour");
        setSaving(false);
        return;
      }
      setSuccess(true);
      setSaving(false);
      setShowInfo(false);
    } catch (err) {
      setError("Impossible de mettre à jour le profil");
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    cookies.remove("token");
    router.push("/login");
  };

  const confirmDeleteAccount = async () => {
    const token = cookies.get("token");
    if (!token) return;
    setDeleting(true);
    try {
      const payloadBase64 = token.split(".")[1];
      const decodedPayload = JSON.parse(
        Buffer.from(payloadBase64, "base64").toString("utf-8"),
      );
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/${decodedPayload.userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        cookies.remove("token");
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
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-[#1D6B45]">Chargement...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-10">
      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-10">
        <Link
          href="/dashboard"
          className="text-white/70 text-sm mb-6 inline-block"
        >
          ← Accueil
        </Link>

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-3">
            <span className="text-white text-2xl font-bold">
              {getInitials("A")}
            </span>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              userRole === "traiteur"
                ? "bg-[#D4870A] text-white"
                : userRole === "gp"
                  ? "bg-white/20 text-white"
                  : "bg-white/20 text-white"
            }`}
          >
            {userRole === "traiteur" ? (
              <>
                <ChefHat size={16} className="inline mr-1" /> Traiteur
              </>
            ) : userRole === "gp" ? (
              <>
                <Plane size={16} className="inline mr-1" /> GP
              </>
            ) : userRole === "admin" ? (
              <>
                <Lock size={16} className="inline mr-1" /> Admin
              </>) : (
              <>
                <User size={16} className="inline mr-1" /> Client
              </>
            )}
          </span>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50/80 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1D6B45]/10 flex items-center justify-center text-[#1D6B45]">
                <Edit3 size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 text-base">Mes informations</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {showInfo ? "Cliquez pour fermer l'édition" : "Consulter et modifier votre profil"}
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
              {showInfo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {showInfo && (
            <div className="p-5 pt-0 border-t border-gray-50 space-y-4">
              {success && (
                <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 text-[#1D6B45] rounded-xl px-4 py-3 text-sm font-medium mt-4">
                  ✓ Profil mis à jour avec succès
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mt-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                {/* Email (non modifiable) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Mail size={14} className="text-[#1D6B45]" /> Email
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 text-sm font-medium">
                    {userEmail}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    L&apos;email ne peut pas être modifié
                  </p>
                </div>

                {/* Nom complet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <User size={14} className="text-[#1D6B45]" /> Nom complet
                  </label>
                  <input
                    {...register("full_name")}
                    type="text"
                    placeholder="Aminata Diallo"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                  />
                  {errors.full_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Phone size={14} className="text-[#1D6B45]" /> Téléphone
                    <span className="text-gray-400 font-normal ml-1">
                      (optionnel)
                    </span>
                  </label>
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="06 12 34 56 78"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                  />
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#1D6B45]" /> Ville ou Adresse
                    <span className="text-gray-400 font-normal ml-1">
                      (optionnel)
                    </span>
                  </label>
                  <AddressAutocomplete
                    value={watch("city") || ""}
                    onChange={(val) => setValue("city", val, { shouldDirty: true })}
                    onSelectAddress={(item) => {
                      setValue("city", item.label, { shouldDirty: true });
                    }}
                    placeholder="Rechercher une adresse ou une ville (ex: Paris, 10 rue de...)"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Liens rapides */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <h2 className="font-semibold text-gray-800 p-5 pb-3">
            Mes activités
          </h2>

          <Link
            href="/commandes"
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <div className="flex items-center gap-3">
              <Package size={20} className="text-[#1D6B45]" />
              <span className="text-sm text-gray-700">Mes commandes</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </Link>

          <Link
            href="/profil/traiteur"
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <div className="flex items-center gap-3">
              <ChefHat size={20} className="text-[#D4870A]" />
              <div>
                <span className="text-sm text-gray-700 block">
                  Espace Traiteur
                </span>
                <span className="text-xs text-gray-400">
                  {userRole === "traiteur"
                    ? "Gérer mes plats"
                    : "Devenir traiteur"}
                </span>
              </div>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </Link>

          <Link
            href="profil/gp"
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <div className="flex items-center gap-3">
              <Plane size={20} className="text-[#3B82F6]" />
              <div>
                <span className="text-sm text-gray-700 block">Espace GP</span>
                <span className="text-xs text-gray-400">
                  Publier une annonce
                </span>
              </div>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </Link>
        </div>

        {/* Déconnexion & Suppression */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-gray-700 rounded-t-2xl"
          >
            <div className="flex items-center gap-3">
              <LogOut size={20} className="text-gray-500" />
              <span className="text-sm font-medium">Se déconnecter</span>
            </div>
            <span className="text-sm text-gray-400">→</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50 transition-colors text-red-600 rounded-b-2xl"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-red-500" />
              <span className="text-sm font-semibold">Supprimer mon compte</span>
            </div>
            <span className="text-sm text-red-400">→</span>
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-gray-300 pb-4">
          Dabari v1.0 — MVP
        </p>
      </div>

      {/* Pop-up de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1.5">
              Supprimer votre compte ?
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte Dabari ? Cette action est irréversible et supprimera l&apos;ensemble de vos données.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteAccount}
                disabled={deleting}
                className="flex-1 py-3 px-4 rounded-2xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {deleting ? "Suppression..." : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
