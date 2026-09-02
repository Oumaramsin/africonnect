"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plane,
  PlaneTakeoff,
  Calendar,
  MapPin,
  Package,
  Scale,
  ArrowRight,
  X,
  Lock,
  PenLine,
} from "lucide-react";
import { useRouter } from "next/navigation";
import cookies from "js-cookie";
import { getValidToken, removeToken, authFetch } from "@/lib/auth";
import AddressAutocomplete, {
  getQuarterOrCityFromAddress,
} from "@/components/AddressAutocomplete";

interface Gp {
  id: string;
  departure_city: string;
  departure_country?: string;
  arrival_city: string;
  arrival_country?: string;
  departure_date: Date;
  available_kg: number;
  price_per_kg: number;
  flight_type?: "direct" | "escale";
  pickup_address?: string;
  pickup_city?: string;
  description?: string;
  is_active: boolean;
}

const CITIES_FR = [
  "Paris",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Toulouse",
  "Lille",
  "Bruxelles",
  "Genève",
];

const COUNTRIES_FR = ["France", "Belgique", "Suisse", "Canada"];

const COUNTRIES_AF = [
  "Sénégal",
  "Côte d'Ivoire",
  "Cameroun",
  "Congo",
  "Mali",
  "Guinée",
  "Burkina Faso",
  "Gabon",
  "Madagascar",
  "Maroc",
  "Algérie",
  "Tunisie",
];

export default function GpEspacePage() {
  const [view, setView] = useState<"annonces" | "nouvelle" | "edit">(
    "annonces",
  );
  const router = useRouter();
  const [gp, setGP] = useState<Gp[] | null>([]);
  const [editGpId, setEditGpId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    departure_city: "",
    departure_country: "France",
    arrival_city: "",
    arrival_country: "",
    departure_date: "",
    available_kg: "",
    price_per_kg: "",
    flight_type: "direct",
    pickup_address: "",
    pickup_city: "",
    description: "",
    is_active: true,
  });
  const [deleteGpId, setDeleteGpId] = useState<string | null>(null);

  function startEdit(annonce: Gp) {
    setEditGpId(annonce.id);
    setFormData({
      departure_city: annonce.departure_city || "",
      departure_country: annonce.departure_country || "France",
      arrival_city: annonce.arrival_city || "",
      arrival_country: annonce.arrival_country || "",
      departure_date: annonce.departure_date
        ? new Date(annonce.departure_date).toISOString().split("T")[0]
        : "",
      available_kg: (annonce.available_kg ?? "").toString(),
      price_per_kg: (annonce.price_per_kg ?? "").toString(),
      flight_type: annonce.flight_type || "direct",
      pickup_address: annonce.pickup_address || "",
      pickup_city: annonce.pickup_city || "",
      description: annonce.description || "",
      is_active: annonce.is_active ?? true,
    });
  }

  async function handleDeleteGp() {
    try {
      const token = cookies.get("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gp/${deleteGpId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error || "Erreur lors de la suppression");
      }

      setGP((prev) =>
        prev ? prev.filter((item) => item.id !== deleteGpId) : [],
      );
      setDeleteGpId(null);
    } catch (error: any) {
      console.error("Erreur lors de la suppression :", error);
      alert("Une erreur est survenue : " + error.message);
    }
  }

  async function handleEditGp() {
    try {
      const token = cookies.get("token");
      const payload = {
        departure_city: formData.departure_city,
        departure_country: formData.departure_country,
        arrival_city: formData.arrival_city,
        arrival_country: formData.arrival_country,
        departure_date: formData.departure_date,
        available_kg: parseFloat(formData.available_kg),
        price_per_kg: parseFloat(formData.price_per_kg),
        flight_type: formData.flight_type,
        pickup_address: formData.pickup_address,
        pickup_city: formData.pickup_city,
        description: formData.description,
        is_active: formData.is_active,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gp/${editGpId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.error || "Erreur lors de la mise à jour");
      }

      const updatedGp = res.data.gp;
      setGP((prev) =>
        prev
          ? prev.map((item) => (item.id === editGpId ? updatedGp : item))
          : [],
      );

      setView("annonces");
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour :", error);
      alert("Une erreur est survenue : " + error.message);
    }
  }

  useEffect(() => {
    async function loadGP() {
      const token = getValidToken();
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/gp/me`,
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
        const res = await response.json();
        if (!response.ok) {
          console.error(res.error || "Erreur de chargement des trajets");
          return;
        }
        setGP(res.data.gp || []);
      } catch (err) {
        console.error("Erreur récupération GP me:", err);
      }
    }
    loadGP();
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-32">
      {/* Header Vert */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link
          href="/profil"
          className="text-white/70 text-sm mb-4 inline-block hover:text-white transition-colors"
        >
          ← Profil
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-2xl">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Espace GP</h1>
            <p className="text-white/70 text-sm mt-1">
              Gère tes envois et trajets
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setView("annonces")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              view === "annonces"
                ? "bg-white text-[#1D6B45]"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <Package size={16} className="inline mr-1" /> Mes annonces
          </button>
          <Link
            href="/gp/nouvelle"
            className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-white/20 text-white hover:bg-white/30"
          >
            <Plane size={16} className="inline mr-1" /> Publier
          </Link>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {view === "annonces" && (
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <h2 className="font-bold text-gray-800 text-lg">
                Trajets en cours
              </h2>
              <span className="text-sm font-medium text-[#1D6B45] bg-[#E8F5E9] px-2 py-1 rounded-lg">
                {gp?.length == 0 ? "0" : gp?.length} annonces
              </span>
            </div>

            {gp?.map((annonce) => (
              <div
                key={annonce.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Liseré de statut */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${annonce.is_active ? "bg-[#1D6B45]" : "bg-gray-300"}`}
                />

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="font-bold text-gray-800">
                        {annonce.departure_city}
                      </p>
                      <p className="text-xs text-gray-400">
                        {annonce.departure_country || "France"}
                      </p>
                    </div>
                    <ArrowRight className="text-gray-300" size={20} />
                    <div className="text-center">
                      <p className="font-bold text-[#1D6B45]">
                        {annonce.arrival_city}
                      </p>
                      <p className="text-xs text-[#1D6B45]/60">
                        {annonce.arrival_country || ""}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      annonce.is_active
                        ? "bg-[#E8F5E9] text-[#1D6B45]"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {annonce.is_active ? "Actif" : "Terminé"}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#F3F4F6] p-3 rounded-xl mb-4">
                  <div className="flex flex-col items-center justify-center border-r border-gray-200">
                    <Calendar size={14} className="text-gray-400 mb-1" />
                    <span className="text-xs font-medium text-gray-700">
                      {new Date(annonce.departure_date).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "short" },
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-r border-gray-200">
                    <Scale size={14} className="text-gray-400 mb-1" />
                    <span className="text-xs font-medium text-gray-700">
                      {annonce.available_kg} kg
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400 mb-1">Prix/kg</span>
                    <span className="text-xs font-bold text-[#1D6B45]">
                      {annonce.price_per_kg} €
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                  <button
                    onClick={() => {
                      startEdit(annonce);
                      setView("edit");
                    }}
                    className="text-xs font-medium text-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => setDeleteGpId(annonce.id)}
                    className="text-xs font-medium text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de suppression */}
        {deleteGpId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Supprimer ce trajet ?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Cette action est irréversible. Le trajet sera définitivement
                effacé.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteGpId(null)}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    handleDeleteGp();
                    setDeleteGpId(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                >
                  Oui, supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "edit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-800 text-lg">
                Modifier le trajet
              </h2>
              <button
                onClick={() => setView("annonces")}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 bg-white px-3 py-1 rounded-full shadow-sm"
              >
                Annuler
              </button>
            </div>

            {/* Route card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
                <PlaneTakeoff size={16} className="inline mr-1" /> Itinéraire
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Ville de départ
                  </label>
                  <select
                    value={formData.departure_city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        departure_city: e.target.value,
                      })
                    }
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  >
                    <option value="">Choisir</option>
                    {CITIES_FR.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Pays de départ
                  </label>
                  <select
                    value={formData.departure_country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        departure_country: e.target.value,
                      })
                    }
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  >
                    {COUNTRIES_FR.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-center my-2">
                <span className="text-[#1D6B45] text-xl font-bold">↓</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Ville d'arrivée
                  </label>
                  <input
                    type="text"
                    value={formData.arrival_city}
                    onChange={(e) =>
                      setFormData({ ...formData, arrival_city: e.target.value })
                    }
                    placeholder="Ex: Dakar"
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Pays d'arrivée
                  </label>
                  <select
                    value={formData.arrival_country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        arrival_country: e.target.value,
                      })
                    }
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  >
                    <option value="">Choisir</option>
                    {COUNTRIES_AF.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Vol card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Plane size={16} className="inline mr-1" /> Détails du vol
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Date de départ
                  </label>
                  <input
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        departure_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Statut
                  </label>
                  <select
                    value={formData.is_active ? "actif" : "termine"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.value === "actif",
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  >
                    <option value="actif">Actif (En cours)</option>
                    <option value="termine">Terminé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Type de vol
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["direct", "escale"] as const).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-[#1D6B45] transition-colors"
                    >
                      <input
                        type="radio"
                        name="flight_type"
                        value={type}
                        checked={formData.flight_type === type}
                        onChange={() =>
                          setFormData({ ...formData, flight_type: type })
                        }
                        className="accent-[#1D6B45]"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Colis card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Package size={16} className="inline mr-1" /> Capacité & tarif
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Kilos disponibles
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="30"
                    value={formData.available_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, available_kg: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Prix par kg (€)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={formData.price_per_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_kg: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Point de remise card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-1 flex items-center">
                <MapPin size={16} className="inline mr-1" /> Point de remise
              </h2>
              <p className="text-xs text-gray-600 mb-4">
                Où les expéditeurs peuvent déposer leur colis
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Quartier / arrondissement
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_city}
                    onChange={(e) =>
                      setFormData({ ...formData, pickup_city: e.target.value })
                    }
                    placeholder="Ex: Paris 10e, Aubervilliers..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Adresse précise
                    <span className="text-gray-400 ml-1">
                      (optionnel — partagée après accord)
                    </span>
                  </label>
                  <AddressAutocomplete
                    value={formData.pickup_address}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        pickup_address: val,
                      })
                    }
                    onSelectAddress={(item) =>
                      setFormData({
                        ...formData,
                        pickup_address: item.label,
                        pickup_city: getQuarterOrCityFromAddress(item),
                      })
                    }
                    placeholder="Ex: Gare du Nord, 18 Rue de Dunkerque..."
                  />
                </div>
              </div>
            </div>

            {/* Description card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-1 flex items-center">
                <PenLine size={16} className="inline mr-1" /> Présentation
              </h2>
              <p className="text-xs text-gray-600 mb-4">
                Décris-toi et tes conditions pour rassurer les expéditeurs
              </p>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Ex: Voyageur régulier Paris-Dakar depuis 3 ans. Sérieux et ponctuel. Colis remis en main propre à destination. Pas de liquides ni produits périssables."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
              />
            </div>

            <button
              onClick={handleEditGp}
              className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold text-base hover:bg-[#0F4A30] transition-colors shadow-lg shadow-[#1D6B45]/20"
            >
              Mettre à jour le trajet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
