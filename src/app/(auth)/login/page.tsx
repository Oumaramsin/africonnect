"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Smartphone, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header Marque Dabari */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white shadow-lg shadow-[#1D6B45]/20 mb-3 border border-[#1D6B45]/30">
            <span className="font-extrabold text-2xl tracking-wider text-white">D</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Dabari
          </h1>
          <div className="h-1 w-10 bg-[#D4870A] rounded-full mx-auto mt-2 opacity-90"></div>
        </div>

        {/* Carte de Connexion */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-7 sm:p-8">
          {/* Switcher Méthode Connexion */}
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
            Connexion
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
                  Numéro de téléphone
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
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1D6B45] to-[#165637] text-white py-3.5 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                "Connexion..."
              ) : (
                <>
                  Se connecter <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-3 text-center text-sm">
            <p className="text-gray-500">
              Pas encore de compte ?{" "}
              <Link
                href="/register"
                className="text-[#1D6B45] font-bold hover:underline"
              >
                S&apos;inscrire gratuitement
              </Link>
            </p>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center text-xs font-semibold text-gray-500 hover:text-[#1D6B45] transition-colors py-1"
            >
              Continuer en tant qu&apos;invité →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
