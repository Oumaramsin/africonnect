import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getApiErrorMessage, getErrorMessage } from "../utils/api";

interface EmailVerificationStepProps {
  /** Adresse à vérifier ; vide quand elle est inconnue (connexion par téléphone) : un champ la demande. */
  email: string;
  /** Message affiché à l'arrivée sur l'étape. */
  initialInfo?: string | null;
  /** Code accepté : `token` est fourni quand l'API ouvre directement la session. */
  onVerified: (token: string | undefined, message: string | undefined) => void | Promise<void>;
  /** Retour à l'étape précédente (formulaire d'inscription ou de connexion). */
  onBack: () => void;
  backLabel: string;
}

/**
 * Étape de validation de l'adresse e-mail par code à 6 chiffres, commune à l'inscription et à la
 * connexion d'un compte pas encore vérifié : saisie du code, renvoi d'un nouveau code, erreurs lisibles.
 */
export default function EmailVerificationStep({
  email: knownEmail,
  initialInfo,
  onVerified,
  onBack,
  backLabel,
}: EmailVerificationStepProps) {
  const askEmail = !knownEmail.trim();
  const [email, setEmail] = useState(knownEmail);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(initialInfo ?? null);
  // Verrous synchrones : un double appui ne doit pas envoyer deux requêtes
  const verifyingRef = useRef(false);
  const resendingRef = useRef(false);

  async function handleVerifyOtp() {
    if (verifyingRef.current) return;
    setError(null);
    setInfoMessage(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Veuillez saisir l'adresse e-mail de votre compte.");
      return;
    }
    if (otpCode.trim().length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres reçu par e-mail.");
      return;
    }

    verifyingRef.current = true;
    setVerifying(true);
    let result: { token?: string; message?: string } | null = null;
    try {
      const response = await apiFetch("/auth/verify-email", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          email: cleanEmail,
          code: otpCode.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(getApiErrorMessage(data, "Code de vérification incorrect."));
        return;
      }
      result = {
        token: typeof data.token === "string" && data.token ? data.token : undefined,
        message: typeof data.message === "string" ? data.message : undefined,
      };
    } catch (err) {
      setError(getErrorMessage(err, "Impossible de vérifier le code. Réessayez."));
    } finally {
      // Après un succès, l'écran parent navigue : le bouton reste désactivé jusque-là
      if (!result) {
        verifyingRef.current = false;
        setVerifying(false);
      }
    }

    if (!result) return;
    try {
      await onVerified(result.token, result.message);
    } catch (err) {
      console.warn("[EmailVerificationStep] Erreur après validation du code:", err);
      setError("Votre adresse est vérifiée : connectez-vous pour continuer.");
      verifyingRef.current = false;
      setVerifying(false);
    }
  }

  async function handleResendCode() {
    if (resendingRef.current) return;
    setError(null);
    setInfoMessage(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Veuillez saisir l'adresse e-mail de votre compte.");
      return;
    }

    resendingRef.current = true;
    setResending(true);
    try {
      const response = await apiFetch("/auth/resend-code", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          email: cleanEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(getApiErrorMessage(data, "Impossible de renvoyer le code."));
        return;
      }
      // L'ancien code n'est plus valable : la saisie est vidée
      setOtpCode("");
      setInfoMessage(
        typeof data.message === "string" && data.message
          ? data.message
          : "Un nouveau code a été envoyé à votre adresse e-mail.",
      );
    } catch (err) {
      setError(getErrorMessage(err, "Impossible de renvoyer le code. Réessayez."));
    } finally {
      resendingRef.current = false;
      setResending(false);
    }
  }

  return (
    <View>
      <View style={styles.verifyHeaderRow}>
        <View style={styles.verifyIconWrapper}>
          <Ionicons name="mail-unread-outline" size={26} color="#1D6B45" />
        </View>
        <Text style={styles.cardTitle}>Validation du compte</Text>
        {askEmail ? (
          <Text style={styles.verifySubtitle}>
            Saisissez l'adresse e-mail de votre compte{"\n"}et le code à 6 chiffres reçu par e-mail.
          </Text>
        ) : (
          <Text style={styles.verifySubtitle}>
            Un code à 6 chiffres a été envoyé à{"\n"}
            <Text style={{ fontWeight: "700", color: "#111827" }}>{knownEmail}</Text>
          </Text>
        )}
      </View>

      {infoMessage && (
        <View style={styles.infoBox}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#1D6B45" />
          <Text style={styles.infoText}>{infoMessage}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.formContainer}>
        {askEmail && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ADRESSE EMAIL DU COMPTE</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#9CA3AF"
                style={styles.leftIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="nom@exemple.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>CODE À 6 CHIFFRES</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#9CA3AF"
              style={styles.leftIcon}
            />
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="123456"
              placeholderTextColor="#9CA3AF"
              value={otpCode}
              onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerifyOtp}
            />
          </View>
          <Text style={styles.helperText}>Code valable pendant 15 minutes.</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, verifying && styles.submitBtnDisabled]}
          onPress={handleVerifyOtp}
          disabled={verifying}
          activeOpacity={0.85}
        >
          {verifying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Confirmer mon compte</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResendCode}
          disabled={resending}
          activeOpacity={0.7}
        >
          {resending ? (
            <ActivityIndicator size="small" color="#1D6B45" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={15} color="#1D6B45" />
              <Text style={styles.resendBtnText}>Renvoyer un nouveau code</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.editInfoBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.editInfoBtnText}>{backLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  verifyHeaderRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  verifyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  verifySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    color: "#1D6B45",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  formContainer: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  helperText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  leftIcon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingLeft: 42,
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
  },
  codeInput: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 6,
    textAlign: "center",
    paddingLeft: 16,
  },
  submitBtn: {
    backgroundColor: "#1D6B45",
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resendBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    marginTop: 4,
  },
  resendBtnText: {
    color: "#1D6B45",
    fontSize: 13,
    fontWeight: "700",
  },
  editInfoBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  editInfoBtnText: {
    color: "#6B7280",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
