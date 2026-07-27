"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChefHat, Plane, User, Package, LogOut, Lock, ChevronDown, ChevronUp, Edit3, Phone, MapPin, Mail } from "lucide-react";
import cookies from "js-cookie";

const schema = z.object({
  full_name: z.string().min(2, "Nom requis"),
  phone: z.string().optional(),
  city: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

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

export default function ProfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("client");
  const [showInfo, setShowInfo] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/${decodedPayload.userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            phone: formData.phone,
            city: formData.city,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la sauvegarde");
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Erreur mise à jour profil:", err);
      setError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    cookies.remove('token')
    router.push("/login");
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
                    <MapPin size={14} className="text-[#1D6B45]" /> Ville
                    <span className="text-gray-400 font-normal ml-1">
                      (optionnel)
                    </span>
                  </label>
                  <select
                    {...register("city")}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  >
                    <option value="">Sélectionne ta ville</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
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

        {/* Déconnexion */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50 transition-colors text-red-500 rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <LogOut size={20} className="text-red-500" />
              <span className="text-sm font-medium">Se déconnecter</span>
            </div>
            <span className="text-sm">→</span>
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-gray-300 pb-4">
          Dabari v1.0 — MVP
        </p>
      </div>
    </div>
  );
}
