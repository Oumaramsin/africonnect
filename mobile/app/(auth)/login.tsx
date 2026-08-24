import React, { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSecureToken, saveSecureToken } from "../../utils/storage";
import { apiFetch } from "../../utils/api";

export default function LoginScreen() {
  const router = useRouter();

  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getSecureToken("token");
        if (token) {
          router.replace("/accueil");
        }
      } catch (err) {
        console.warn("[Login] Erreur lors de la vérification de la session:", err);
      }
    }
    checkAuth();
  }, [router]);

  async function handleSubmit() {
    setError(null);
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
    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          email: email || phone,
          password: password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la connexion");
        return;
      }
      await saveSecureToken("token", data.token);
      router.replace("/accueil");
    } catch (err: any) {
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
              onPress={() => router.push("/")}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </TouchableOpacity>

            <View style={styles.logoRow}>
              <Image
                source={require("../../assets/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoTitle}>Dabari</Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          {/* Main Card (Identique au Web Auth) */}
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
                  setPhone("");
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
                  setEmail("");
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
            <Text style={styles.cardTitle}>Connexion</Text>

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
                      placeholder="nom@exemple.com"
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
                  <Text style={styles.fieldLabel}>NUMÉRO DE TÉLÉPHONE</Text>
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
                      onChangeText={(val) => {
                        let cleaned = val.replace(/[^0-9+]/g, "");
                        if (cleaned.startsWith("+")) {
                          cleaned = "+" + cleaned.slice(1).replace(/\+/g, "");
                        } else {
                          cleaned = cleaned.replace(/\+/g, "");
                        }
                        const maxLen = cleaned.startsWith("+") ? 16 : 15;
                        setPhone(cleaned.slice(0, maxLen));
                      }}
                      keyboardType="phone-pad"
                      maxLength={16}
                    />
                  </View>
                </View>
              )}

              {/* Password Field */}
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
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
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

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Se connecter</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Continuer sans compte */}
              <TouchableOpacity
                style={styles.guestBtn}
                onPress={() => router.push("/accueil")}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={18} color="#1D6B45" />
                <Text style={styles.guestBtnText}>
                  Continuer en tant qu'invité
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Register Link */}
            <View style={styles.bottomLinkRow}>
              <Text style={styles.bottomLinkText}>Pas encore de compte ? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.bottomLinkHighlight}>S'inscrire</Text>
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
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
  },

  /* Auth Card styled after Web Auth */
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

  /* Switcher Pill */
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

  guestBtn: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#1D6B45",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  guestBtnText: {
    color: "#1D6B45",
    fontSize: 14,
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
