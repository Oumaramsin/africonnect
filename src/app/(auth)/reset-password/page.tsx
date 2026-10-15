"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import cookies from "js-cookie";

export default function ResetPasswordPage() {
  const router = useRouter();

  // Étape 1 : Demande de code par email | Étape 2 : Saisie du code et nouveau mot de passe | Étape 3 : Succès
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Étape 1 : Envoi du code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (honeypot.trim() !== "") {
      setError("Requête invalide.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Veuillez renseigner une adresse e-mail valide.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            honeypot,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Erreur lors de la demande de réinitialisation.");
        setLoading(false);
        return;
      }

      setSuccessMsg(
        "Un code de sécurité à 6 chiffres a été envoyé à votre adresse e-mail.",
      );
      setStep(2);
      setLoading(false);
    } catch {
      setError("Impossible de contacter le serveur Dabari.");
      setLoading(false);
    }
  };

  // Étape 2 : Réinitialisation du mot de passe
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (honeypot.trim() !== "") {
      setError("Requête invalide.");
      return;
    }

    if (!code || code.trim().length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres reçu par e-mail.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            code: code.trim(),
            newPassword,
            honeypot,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Le code est incorrect ou a expiré.");
        setLoading(false);
        return;
      }

      // Connexion automatique après réinitialisation
      if (data.token) {
        cookies.set("token", data.token, {
          expires: 7,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }

      setSuccessMsg("Mot de passe réinitialisé avec succès ! Redirection en cours...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch {
      setError("Impossible de contacter le serveur Dabari.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#FAF7F2] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl md:rounded-[36px] shadow-2xl shadow-slate-900/5 border border-slate-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* ── PANNEAU GAUCHE : SÉCURITÉ & BRANDING DABARI ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0F4A30] via-[#1D6B45] to-[#155234] text-white p-8 sm:p-10 lg:p-12 lg:col-span-5 flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

          {/* Logo Dabari */}
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
              <span>Récupération de compte sécurisée</span>
            </div>
          </div>

          {/* Message & Piliers Sécurité */}
          <div className="relative z-10 my-8 lg:my-0 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                Accédez à nouveau à votre espace en toute sécurité.
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-2 leading-relaxed">
                Un code de vérification à usage unique vous est transmis par e-mail afin de protéger vos commandes et vos données personnelles.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-[#D4870A]">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Code Temporaire (15 min)</h4>
                  <p className="text-[11px] text-white/75 mt-0.5">Code à 6 chiffres sécurisé et à usage unique.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-[#D4870A]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Chiffrement bcrypt</h4>
                  <p className="text-[11px] text-white/75 mt-0.5">Votre nouveau mot de passe est chiffré selon les normes bancaires.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-emerald-300" /> Protection Dabari Shield
            </span>
            <span className="text-[11px] text-white/60">Dabari v1.0</span>
          </div>
        </div>

        {/* ── PANNEAU DROIT : FORMULAIRE EN 2 ÉTAPES ── */}
        <div className="p-6 sm:p-10 lg:p-14 lg:col-span-7 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto space-y-6">
            <div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1D6B45] transition-colors mb-3"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>

              <span className="text-xs font-bold uppercase tracking-wider text-[#1D6B45] block">
                {step === 1 ? "Étape 1 sur 2" : "Étape 2 sur 2"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                {step === 1
                  ? "Mot de passe oublié ?"
                  : "Nouveau mot de passe"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                {step === 1
                  ? "Indiquez l'adresse e-mail de votre compte pour recevoir votre code."
                  : `Saisissez le code à 6 chiffres envoyé à ${email}`}
              </p>
            </div>

            {/* Message de succès */}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Message d'erreur */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── FORMULAIRE ÉTAPE 1 : DEMANDE DE CODE ── */}
            {step === 1 ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                {/* Honeypot anti-bot */}
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

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Votre adresse e-mail
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1D6B45] hover:bg-[#155234] text-white py-3.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-[#1D6B45]/20 hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 pt-3"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Recevoir le code</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ── FORMULAIRE ÉTAPE 2 : CODE + NOUVEAU MOT DE PASSE ── */
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Honeypot */}
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

                {/* Champ Code 6 chiffres */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Code à 6 chiffres
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-bold text-[#1D6B45] hover:underline"
                    >
                      Changer d&apos;email
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={17} />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="123456"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-sm font-black tracking-widest text-slate-800 transition-all text-center"
                    />
                  </div>
                </div>

                {/* Nouveau Mot de passe */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={17} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      required
                      minLength={6}
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

                {/* Confirmation Mot de passe */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={17} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retapez le mot de passe"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                    />
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
                      <span>Réinitialisation en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Changer le mot de passe</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1D6B45] transition-colors"
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    Renvoyer un nouveau code
                  </button>
                </div>
              </form>
            )}

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Vous vous souvenez de votre mot de passe ?{" "}
              <Link
                href="/login"
                className="text-[#1D6B45] font-extrabold hover:underline"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
