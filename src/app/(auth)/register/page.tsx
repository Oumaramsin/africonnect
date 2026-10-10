"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Mail,
  Smartphone,
  PartyPopper,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  RefreshCw,
  Clock,
  ChefHat,
  Plane,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import cookies from "js-cookie";

type Method = "email" | "phone";

export default function RegisterPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [verifyStep, setVerifyStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    // Si le champ honeypot est rempli par un robot, rejet immédiat
    if (honeypot.trim() !== "") {
      setError("Requête invalide.");
      return;
    }

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Minimum 8 caractères requis");
      return;
    }
    if (method === "phone" && !phone.startsWith("+")) {
      setError("Le numéro doit commencer par + (ex: +33612345678)");
      return;
    }

    setLoading(true);

    const authEmail =
      method === "email"
        ? email
        : `${phone.replace(/\+/g, "").replace(/\s/g, "")}@dabari.app`;

    const nameParts = fullName.trim().split(" ");
    const firstname = nameParts[0] || "";
    const lastname = nameParts.slice(1).join(" ") || "";

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstname,
            lastname,
            email: authEmail,
            phone: method === "phone" ? phone : undefined,
            password: password,
            passwordConfirmation: confirm,
            honeypot: honeypot,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Une erreur est survenue lors de l'inscription.");
        setLoading(false);
        return;
      }

      setLoading(false);

      if (method === "email" && data.requiresVerification) {
        setVerifyStep(true);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres.");
      return;
    }

    setVerifying(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code: otpCode.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Code de vérification incorrect.");
        setVerifying(false);

        // Si le code a expiré (> 15 min), revenir au formulaire d'inscription
        if (data.code === "EXPIRED_CODE") {
          setVerifyStep(false);
        }
        return;
      }

      setVerifying(false);
      if (data.token) {
        cookies.set("token", data.token, {
          expires: 7,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
      setSuccess(true);
    } catch (err) {
      setError("Erreur de connexion au serveur.");
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setInfoMessage(null);
    setResending(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/resend-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Impossible de renvoyer le code.");
        setResending(false);
        if (data.code === "EXPIRED_CODE") {
          setVerifyStep(false);
        }
        return;
      }

      setInfoMessage("Nouveau code envoyé par e-mail !");
      setResending(false);
    } catch (err) {
      setError("Erreur de connexion.");
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#FAF7F2] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl md:rounded-[36px] shadow-2xl shadow-slate-900/5 border border-slate-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
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
              <span>Rejoignez la communauté Dabari</span>
            </div>
          </div>

          {/* Message central & Avantages */}
          <div className="relative z-10 my-8 lg:my-0 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                Une seule inscription, tous vos services diaspora.
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-2 leading-relaxed">
                Créez votre profil en 1 minute pour commander des plats faits maison, demander des devis ou expédier vos colis GP.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-[#D4870A]">
                  <ChefHat size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Carte Traiteurs & Plats</h4>
                  <p className="text-[11px] text-white/75 mt-0.5">Accès direct aux menus faits maison des chefs du pays.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-[#D4870A]">
                  <Plane size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Réseau GP Aérien Sécurisé</h4>
                  <p className="text-[11px] text-white/75 mt-0.5">Expédiez ou proposez des kilos sur vos prochains vols.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-[#D4870A]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Compte Vérifié & Gratuit</h4>
                  <p className="text-[11px] text-white/75 mt-0.5">Aucun frais d&apos;inscription, transparence totale.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Témoignage / Footer panneau gauche */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-emerald-300" /> Sécurité & Séquestre Garanti
            </span>
            <span className="text-[11px] text-white/60">Dabari v1.0</span>
          </div>
        </div>

        {/* ── PANNEAU DROIT : FORMULAIRE OU ÉTAPE CODE OTP OU SUCCÈS ── */}
        <div className="p-6 sm:p-10 lg:p-12 lg:col-span-7 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto">
            {/* 1. ÉCRAN DE SUCCÈS APRÈS CRÉATION DE COMPTE */}
            {success ? (
              <div className="text-center space-y-5 animate-in fade-in zoom-in duration-300 py-6">
                <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-100 rounded-3xl flex items-center justify-center mx-auto text-[#1D6B45] shadow-sm">
                  <PartyPopper size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
                    <span>Bienvenue sur Dabari</span>
                    <Sparkles size={24} className="text-[#D4870A]" />
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                    Votre compte a été créé avec succès ! Vous pouvez désormais vous connecter pour profiter de tous nos services.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="w-full bg-[#1D6B45] hover:bg-[#155234] text-white py-3.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-[#1D6B45]/20 hover:shadow-lg active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2"
                  >
                    <span>Se connecter maintenant</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ) : verifyStep ? (
              /* 2. ÉTAPE DE VÉRIFICATION OTP EMAIL */
              <div className="text-center space-y-5 animate-in fade-in duration-300 py-4">
                <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-[#1D6B45] shadow-xs">
                  <KeyRound size={30} />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Vérification de l&apos;adresse email
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Un code de validation à 6 chiffres a été envoyé à{" "}
                    <strong className="text-slate-900 font-bold">{email}</strong>.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-[11px] font-bold px-3.5 py-1 rounded-full border border-amber-200">
                  <Clock size={13} className="text-amber-600" /> Ce code expire dans 15 minutes.
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3.5 text-xs font-medium text-left">
                    {error}
                  </div>
                )}

                {infoMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3.5 text-xs font-medium text-left">
                    {infoMessage}
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      autoFocus
                      required
                      className="w-full text-center tracking-[12px] font-mono text-2xl py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-[#1D6B45] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifying}
                    className="w-full bg-[#1D6B45] hover:bg-[#155234] text-white py-3.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-[#1D6B45]/20 hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {verifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Vérification en cours...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirmer mon code</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="text-xs font-bold text-[#1D6B45] hover:underline flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
                    {resending ? "Envoi en cours..." : "Renvoyer un nouveau code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerifyStep(false)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    Modifier l&apos;adresse email saisie
                  </button>
                </div>
              </div>
            ) : (
              /* 3. FORMULAIRE D'INSCRIPTION STANDARD */
              <div className="space-y-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1D6B45]">
                    Nouveau Membre
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                    Créer votre compte gratuit
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Accédez aux traiteurs et au réseau GP en toute sérénité.
                  </p>
                </div>

                {/* Switcher Méthode Inscription */}
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

                <form onSubmit={handleSubmit} className="space-y-3.5">
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

                  {/* Nom complet */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Nom et prénom complet *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User size={17} />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="ex: Aminata Diallo"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                      />
                    </div>
                  </div>

                  {method === "email" ? (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Adresse email *
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
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Numéro WhatsApp / Téléphone *
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
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Format international avec indicatif (ex: +33, +221, +225...)
                      </p>
                    </div>
                  )}

                  {/* Mot de passe & Confirmation en grille sur tablette/desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Mot de passe *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock size={17} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="8 caractères min"
                          required
                          className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Confirmation *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock size={17} />
                        </div>
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          placeholder="Répéter mot de passe"
                          required
                          className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-xs sm:text-sm transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
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
                        <span>Création du compte...</span>
                      </>
                    ) : (
                      <>
                        <span>Créer mon compte</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-100 text-center text-xs">
                  <p className="text-slate-500">
                    Vous avez déjà un compte ?{" "}
                    <Link
                      href="/login"
                      className="text-[#1D6B45] font-extrabold hover:underline"
                    >
                      Se connecter
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

