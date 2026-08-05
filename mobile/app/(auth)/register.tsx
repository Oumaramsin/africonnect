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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen() {
  const router = useRouter();

  const [method, setMethod] = useState<"email" | "phone">("email");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Veuillez saisir votre prénom et votre nom.");
      return;
    }
    const identifier = method === "email" ? email : phone;
    if (!identifier) {
      setError(
        `Veuillez saisir votre ${method === "email" ? "adresse email" : "numéro de téléphone"}.`,
      );
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au minimum 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      const baseUrl =
        process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api";
      const authEmail =
        method === "email"
          ? email
          : `${phone.replace(/\+/g, "").replace(/\s/g, "")}@dabari.app`;

      const response = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstname: firstName.trim(),
          lastname: lastName.trim(),
          email: authEmail,
          phone: method === "phone" ? phone : undefined,
          password: password,
          passwordConfirmation: confirm,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de l'inscription");
        return;
      }
      console.log("Inscription réussie:", data);
      router.replace("/login");
    } catch (err: any) {
      console.error("Erreur fetch détaillée:", err);
      setError(
        `Impossible de contacter le serveur (${err.message || "Erreur réseau"}).`,
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push('/')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </TouchableOpacity>

            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="restaurant-sharp" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.logoTitle}>Dabari</Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          {/* Main Auth Card */}
          <View style={styles.authCard}>
            {/* Pill Switcher Email / Téléphone */}
            <View style={styles.switcherContainer}>
              <TouchableOpacity
                style={[
                  styles.switcherBtn,
                  method === "email" && styles.switcherBtnActive,
                ]}
                onPress={() => {
                  setMethod("email");
                  setError(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="mail-outline"
                  size={15}
                  color={method === "email" ? "#1D6B45" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.switcherText,
                    method === "email" && styles.switcherTextActive,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.switcherBtn,
                  method === "phone" && styles.switcherBtnActive,
                ]}
                onPress={() => {
                  setMethod("phone");
                  setError(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={15}
                  color={method === "phone" ? "#1D6B45" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.switcherText,
                    method === "phone" && styles.switcherTextActive,
                  ]}
                >
                  Téléphone
                </Text>
              </TouchableOpacity>
            </View>

            {/* Card Title */}
            <Text style={styles.cardTitle}>Inscription</Text>

            {/* Error Box (si présent) */}
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

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Prénom */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PRÉNOM</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#9CA3AF"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="ex: Aminata"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
              </View>

              {/* Nom */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NOM</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#9CA3AF"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="ex: Diallo"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              {/* Email ou Téléphone selon méthode */}
              {method === "email" ? (
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
                      placeholder="ex: aminata@email.com"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    NUMÉRO WHATSAPP / TÉLÉPHONE
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="+33612345678"
                      placeholderTextColor="#9CA3AF"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Format international — ex: +33612345678
                  </Text>
                </View>
              )}

              {/* Mot de passe */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>MOT DE PASSE</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#9CA3AF"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={[styles.input, { paddingRight: 44 }]}
                    placeholder="Minimum 8 caractères"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
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

              {/* Confirmer le mot de passe */}
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
                    placeholder="Répète ton mot de passe"
                    placeholderTextColor="#9CA3AF"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity
                    style={styles.rightIconBtn}
                    onPress={() => setShowConfirm(!showConfirm)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Créer mon compte</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Bottom Login Link */}
            <View style={styles.bottomLinkRow}>
              <Text style={styles.bottomLinkText}>Déjà un compte ? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.bottomLinkHighlight}>Se connecter</Text>
                </TouchableOpacity>
              </Link>
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
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#1D6B45",
    justifyContent: "center",
    alignItems: "center",
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
  },

  authCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  switcherContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  switcherBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  switcherText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  switcherTextActive: {
    color: "#1D6B45",
    fontWeight: "700",
  },

  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
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
  rightIconBtn: {
    position: "absolute",
    right: 14,
    zIndex: 1,
    padding: 4,
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
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  bottomLinkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  bottomLinkText: {
    color: "#6B7280",
    fontSize: 13,
  },
  bottomLinkHighlight: {
    color: "#1D6B45",
    fontSize: 13,
    fontWeight: "700",
  },
});
