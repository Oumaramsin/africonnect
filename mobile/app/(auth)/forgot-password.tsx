import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { saveSecureToken } from "../../utils/storage";
import { apiFetch } from "../../utils/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Étape 1 : Demande de code | Étape 2 : Saisie du code + nouveau mot de passe
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Étape 1 : Demande de code par e-mail ──
  const handleRequestCode = async () => {
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail }),
        skipAuth: true,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Erreur lors de la demande.");
        setLoading(false);
        return;
      }

      setStep(2);
      Alert.alert(
        "Code envoyé",
        `Un code de sécurité à 6 chiffres a été envoyé à ${trimmedEmail}. Vérifiez également vos courriers indésirables (spams).`,
      );
    } catch (err: any) {
      setError(err.message || "Impossible de contacter le serveur Dabari.");
    } finally {
      setLoading(false);
    }
  };

  // ── Étape 2 : Réinitialisation du mot de passe ──
  const handleResetPassword = async () => {
    setError(null);

    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres reçu par e-mail.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: trimmedCode,
          newPassword,
        }),
        skipAuth: true,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Le code est incorrect ou a expiré.");
        setLoading(false);
        return;
      }

      // Connexion automatique après réinitialisation
      if (data.token) {
        await saveSecureToken("token", data.token);
      }

      Alert.alert(
        "Mot de passe modifié",
        "Votre mot de passe a été réinitialisé avec succès ! Vous êtes maintenant connecté.",
        [
          {
            text: "Continuer",
            onPress: () => router.replace("/accueil"),
          },
        ],
      );
    } catch (err: any) {
      setError(err.message || "Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row avec bouton retour */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#1F2937" />
            </TouchableOpacity>

            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                {step === 1 ? "Étape 1/2" : "Étape 2/2"}
              </Text>
            </View>
          </View>

          {/* Logo & Titre */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Dabari</Text>
            <Text style={styles.appTagline}>
              {step === 1
                ? "Récupération sécurisée de votre compte"
                : "Définition de votre nouveau mot de passe"}
            </Text>
          </View>

          {/* Carte Principale */}
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={step === 1 ? "key-outline" : "lock-closed-outline"}
                  size={22}
                  color="#1D6B45"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {step === 1 ? "Mot de passe oublié ?" : "Nouveau mot de passe"}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {step === 1
                    ? "Saisissez votre e-mail pour recevoir un code à 6 chiffres."
                    : `Code de sécurité envoyé à :\n${email}`}
                </Text>
              </View>
            </View>

            {/* Message d'erreur */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#B91C1C"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── FORMULAIRE ÉTAPE 1 ── */}
            {step === 1 ? (
              <View style={styles.formContainer}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>ADRESSE EMAIL</Text>
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
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleRequestCode}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Envoyer le code</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ── FORMULAIRE ÉTAPE 2 ── */
              <View style={styles.formContainer}>
                {/* Code 6 chiffres */}
                <View style={styles.fieldGroup}>
                  <View style={styles.codeHeaderRow}>
                    <Text style={styles.fieldLabel}>CODE À 6 CHIFFRES</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setStep(1);
                        setError(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.changeEmailText}>Changer d'email</Text>
                    </TouchableOpacity>
                  </View>

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
                      value={code}
                      onChangeText={(val) =>
                        setCode(val.replace(/[^0-9]/g, "").slice(0, 6))
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                {/* Nouveau Mot de passe */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>NOUVEAU MOT DE PASSE</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={[styles.input, { paddingRight: 44 }]}
                      placeholder="Minimum 6 caractères"
                      placeholderTextColor="#9CA3AF"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.rightIconBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirmation Mot de passe */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CONFIRMER LE MOT DE PASSE</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={[styles.input, { paddingRight: 44 }]}
                      placeholder="Retapez votre mot de passe"
                      placeholderTextColor="#9CA3AF"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </View>

                {/* Bouton Valider */}
                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>
                        Réinitialiser le mot de passe
                      </Text>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Renvoyer un code */}
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleRequestCode}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={15} color="#1D6B45" />
                  <Text style={styles.resendBtnText}>Renvoyer un nouveau code</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Lien retour connexion */}
            <View style={styles.bottomLinkRow}>
              <Text style={styles.bottomLinkText}>
                Vous vous souvenez de votre mot de passe ?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.bottomLinkHighlight}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
  },

  header: {
    alignItems: "center",
    marginVertical: 16,
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logoImage: {
    width: 42,
    height: 42,
  },
  appName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0B3B24",
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
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
  codeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  changeEmailText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D6B45",
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
  rightIconBtn: {
    position: "absolute",
    right: 14,
    zIndex: 1,
    padding: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 14,
    paddingLeft: 42,
    paddingRight: 14,
    fontSize: 15,
    color: "#111827",
  },
  codeInput: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
  },

  submitBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D6B45",
  },

  bottomLinkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  bottomLinkText: {
    fontSize: 13,
    color: "#6B7280",
  },
  bottomLinkHighlight: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D6B45",
  },
});
