"use client";

import { useRef, useState } from "react";
import { ArrowRight, Clock, KeyRound, RefreshCw } from "lucide-react";
import {
  apiErrorCode,
  apiErrorMessage,
  authFetch,
  hasSession,
  invalidateCurrentUser,
  loadErrorMessage,
} from "@/lib/auth";

type Props = {
  /** Adresse e-mail du compte à vérifier (affichée et envoyée à l'API). */
  email: string;
  /** Message affiché à l'ouverture de l'étape (ex. : connexion refusée faute de vérification). */
  intro?: string;
  /** Mention de validité du code. */
  expiryNotice?: string;
  /** Lien de retour vers l'étape précédente. */
  backLabel: string;
  onBack: () => void;
  /**
   * Code accepté. `sessionOpened` est vrai si l'API a ouvert la session (code valide) ; faux si
   * l'adresse était déjà vérifiée (il faut alors se connecter). `message` : réponse de l'API.
   */
  onVerified: (sessionOpened: boolean, message: string | null) => void;
  /** Code expiré : sans ce rappel, le message s'affiche ici et un nouveau code peut être demandé. */
  onExpired?: (message: string) => void;
};

/**
 * Étape de saisie du code à 6 chiffres envoyé par e-mail (POST /auth/verify-email), avec renvoi
 * d'un nouveau code (POST /auth/resend-code). Partagée par l'inscription et la connexion.
 */
export default function EmailVerificationStep({
  email,
  intro,
  expiryNotice = "Ce code expire dans 15 minutes.",
  backLabel,
  onBack,
  onVerified,
  onExpired,
}: Props) {
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(intro ?? null);
  // Verrou commun : une seule requête (vérification ou renvoi) à la fois
  const busyRef = useRef(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busyRef.current) return;
    setError(null);
    setInfoMessage(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres.");
      return;
    }

    busyRef.current = true;
    setVerifying(true);

    try {
      // Un code valide ouvre la session : cookie httpOnly posé par l'API
      const response = await authFetch(`${apiUrl}/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otpCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = apiErrorMessage(data, "Code de vérification incorrect.");
        // Code expiré (> 15 min) : l'écran appelant décide de la suite
        if (apiErrorCode(data) === "EXPIRED_CODE" && onExpired) {
          onExpired(message);
          return;
        }
        setError(message);
        return;
      }

      invalidateCurrentUser();
      onVerified(hasSession(), typeof data.message === "string" ? data.message : null);
    } catch (err) {
      setError(loadErrorMessage(err, "Erreur de connexion au serveur."));
    } finally {
      busyRef.current = false;
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    setInfoMessage(null);
    setResending(true);

    try {
      const response = await authFetch(`${apiUrl}/auth/resend-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = apiErrorMessage(data, "Impossible de renvoyer le code.");
        if (apiErrorCode(data) === "EXPIRED_CODE" && onExpired) {
          onExpired(message);
          return;
        }
        setError(message);
        return;
      }

      setInfoMessage("Nouveau code envoyé par e-mail !");
    } catch (err) {
      setError(loadErrorMessage(err, "Erreur de connexion."));
    } finally {
      busyRef.current = false;
      setResending(false);
    }
  };

  return (
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
        <Clock size={13} className="text-amber-600" /> {expiryNotice}
      </div>

      {error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3.5 text-xs font-medium text-left"
        >
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
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            autoFocus
            required
            aria-label="Code de vérification à 6 chiffres"
            className="w-full text-center tracking-[12px] font-mono text-2xl py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1D6B45] focus:border-[#1D6B45] transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={verifying || resending}
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
          disabled={resending || verifying}
          className="text-xs font-bold text-[#1D6B45] hover:underline flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
          {resending ? "Envoi en cours..." : "Renvoyer un nouveau code"}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={verifying}
          className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}
