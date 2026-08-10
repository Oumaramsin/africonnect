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

  if (verifyStep) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-8 border border-gray-100 shadow-xl text-center">
          <div className="w-16 h-16 bg-[#E8F5E9] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#1D6B45]">
            <KeyRound size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            Vérification de l&apos;e-mail
          </h2>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Un code de vérification à 6 chiffres a été envoyé à{" "}
            <strong className="text-gray-900">{email}</strong>.
          </p>

          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[11px] font-semibold px-3 py-1 rounded-full mb-6 border border-amber-200/60">
            <Clock size={13} /> Le code expire dans 15 minutes.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-4 text-xs font-medium">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl px-4 py-3 mb-4 text-xs font-medium">
              {infoMessage}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                className="w-full text-center tracking-[12px] font-mono text-2xl py-3.5 rounded-2xl border-2 border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D6B45] focus:border-[#1D6B45] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full bg-gradient-to-r from-[#1D6B45] to-[#165637] text-white py-3.5 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {verifying ? "Vérification..." : "Confirmer le code"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="text-xs font-semibold text-[#1D6B45] hover:underline flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
              {resending ? "Envoi..." : "Renvoyer un nouveau code"}
            </button>

            <button
              type="button"
              onClick={() => setVerifyStep(false)}
              className="text-xs font-medium text-gray-400 hover:text-gray-600"
            >
              Changer d&apos;adresse e-mail
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center">
          <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-4 text-[#1D6B45]">
            <PartyPopper size={36} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            Bienvenue sur Dabari 🎉
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Votre compte a été vérifié et créé avec succès !
          </p>
          <Link
            href="/dashboard"
            className="w-full bg-gradient-to-r from-[#1D6B45] to-[#165637] text-white py-3.5 rounded-2xl font-bold text-sm hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            Accéder à Dabari <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header Marque Dabari */}
        <div className="text-center mb-7">
          <Image
            src="/dabari_logo.png"
            alt="Dabari Logo"
            width={72}
            height={72}
            style={{ width: "auto", height: "auto" }}
            className="mx-auto mb-3 drop-shadow-lg max-h-20"
            priority
          />
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Dabari
          </h1>
          <div className="h-1 w-10 bg-[#D4870A] rounded-full mx-auto mt-2 opacity-90"></div>
        </div>

        {/* Carte d'Inscription */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-7 sm:p-8">
          {/* Switcher Méthode Inscription */}
          <div className="bg-gray-100/90 p-1.5 rounded-2xl flex gap-1 mb-6 border border-gray-200/60">
            {(["email", "phone"] as Method[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMethod(m);
                  setError(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  method === m
                    ? "bg-white text-[#1D6B45] shadow-xs font-bold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "email" ? (
                  <>
                    <Mail size={16} /> Email
                  </>
                ) : (
                  <>
                    <Smartphone size={16} /> Téléphone
                  </>
                )}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-5">
            Inscription
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-sm flex items-center gap-2">
              <span className="font-medium">{error}</span>
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ex: Aminata Diallo"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {method === "email" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: aminata@email.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Numéro WhatsApp / Téléphone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Smartphone size={18} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33612345678"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-sm transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Format international — ex: +33612345678
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Répète ton mot de passe"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1D6B45] to-[#165637] text-white py-3.5 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                "Création du compte..."
              ) : (
                <>
                  Créer mon compte <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-sm">
            <p className="text-gray-500">
              Déjà un compte ?{" "}
              <Link
                href="/login"
                className="text-[#1D6B45] font-bold hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
