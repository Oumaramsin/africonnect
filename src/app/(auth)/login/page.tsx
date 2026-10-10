"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ChefHat,
  Plane,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import cookies from "js-cookie";

type Method = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Si le champ honeypot est rempli par un robot, rejet immédiat
    if (honeypot.trim() !== "") {
      setError("Requête invalide.");
      return;
    }

    setLoading(true);

    const authEmail =
      method === "email"
        ? email
        : `${phone.replace(/\+/g, "").replace(/\s/g, "")}@dabari.app`;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify({
            email: authEmail,
            password: password,
            honeypot: honeypot,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Identifiants incorrects");
        setLoading(false);
        return;
      }
      cookies.set("token", data.token, {
        expires: 7,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#FAF7F2] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl md:rounded-[36px] shadow-2xl shadow-slate-900/5 border border-slate-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* ── PANNEAU GAUCHE : STORYTELLING & IDENTITÉ DABARI (VISIBLE SUR TABLETTE & DESKTOP) ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0F4A30] via-[#1D6B45] to-[#155234] text-white p-8 sm:p-10 lg:p-12 lg:col-span-5 flex flex-col justify-between">
          {/* Cercles décoratifs d'ambiance */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

          {/* En-tête / Logo */}
          <div className="relative z-10 space-y-4">
            <Link href="/dashboard" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Image
                  src="/dabari_logo.png"
                  alt="Dabari Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain drop-shadow-md"
                  priority
                />
              </div>
              <div>
                <span className="text-2xl font-black text-white tracking-tight block">
                  Dabari
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4870A] block -mt-1">
                  Diaspora & Services
                </span>
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-100 border border-white/15 mt-2">
              <Sparkles size={13} className="text-[#D4870A]" />
              <span>Plateforme certifiée pour la diaspora</span>
            </div>
          </div>

          {/* Message central & Avantages */}
          <div className="relative z-10 my-8 lg:my-0 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                Retrouvez les saveurs et la confiance du pays.
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-2 leading-relaxed">
                Connectez-vous pour suivre vos commandes de traiteurs faits maison ou vos expéditions de colis GP en temps réel.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-[#D4870A]">
                  <ChefHat size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Traiteurs & Chefs Passionnés</h4>
                  <p className="text-[11px] text-white/75 mt-0.5">Tiep, Mafé, Yassa, Alloco préparés à la commande.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-[#D4870A]">
                  <Plane size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Transport GP de Confiance</h4>
                  <p className="text-[11px] text-white/75 mt-0.5">Expéditions sécurisées Europe ⇄ Afrique avec suivi.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-[#D4870A]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Paiement & Contact Direct</h4>
                  <p className="text-[11px] text-white/75 mt-0.5">Garantie sous séquestre et liaisons WhatsApp directes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Témoignage / Footer panneau gauche */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-emerald-300" /> +5 000 membres actifs
            </span>
            <span className="text-[11px] text-white/60">Dabari v1.0</span>
          </div>
        </div>

        {/* ── PANNEAU DROIT : FORMULAIRE DE CONNEXION ── */}
        <div className="p-6 sm:p-10 lg:p-14 lg:col-span-7 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1D6B45]">
                Espace Membre
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Connexion à votre compte
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                Heureux de vous revoir ! Saisissez vos identifiants pour continuer.
              </p>
            </div>

            {/* Switcher Méthode Connexion */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border border-slate-200/80">
              {(["email", "phone"] as Method[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod(m);
                    setError(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    method === m
                      ? "bg-white text-[#1D6B45] shadow-xs ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {m === "email" ? (
                    <>
                      <Mail size={15} /> Par Email
                    </>
                  ) : (
                    <>
                      <Smartphone size={15} /> Par Téléphone
                    </>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Faux champ Honeypot anti-bot (invisible pour les humains) */}
              <div style={{ display: "none" }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {method === "email" ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={17} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ex: aminata.diallo@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Numéro WhatsApp / Téléphone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Smartphone size={17} />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+33612345678"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Format international obligatoire avec indicatif (ex: +33, +221, +225...)
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Mot de passe
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1D6B45] hover:bg-[#155234] text-white py-3.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-[#1D6B45]/20 hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 pt-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3 text-center text-xs">
              <p className="text-slate-500">
                Vous n&apos;avez pas encore de compte ?{" "}
                <Link
                  href="/register"
                  className="text-[#1D6B45] font-extrabold hover:underline"
                >
                  Créer un compte gratuitement
                </Link>
              </p>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center font-semibold text-slate-400 hover:text-[#1D6B45] transition-colors py-1"
              >
                Continuer en tant qu&apos;invité →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

