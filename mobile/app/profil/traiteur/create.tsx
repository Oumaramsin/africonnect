import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getSecureToken } from "../../../utils/storage";
import { apiFetch } from "../../../utils/api";
import { CUISINES as CUISINES_PROPOSITIONS, ZONES as ZONES_PROPOSITIONS } from "../../../utils/constants";

export default function CreateTraiteurScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([
    "Sénégalaise",
  ]);
  const [selectedZones, setSelectedZones] = useState<string[]>([
    "Toute l'Île-de-France",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function checkExistingTraiteur() {
        const token = await getSecureToken("token");
        if (!token) {
          router.replace("/login");
          return;
        }
        try {
          const res = await apiFetch("/traiteur/me");
          if (res.ok) {
            const data = await res.json();
            if (data.isTraiteur && data.traiteur) {
              router.replace("/profil/traiteur" as any);
              return;
            }
          }
        } catch (e) {
          console.warn("Vérification statut traiteur échouée :", e);
        } finally {
          setChecking(false);
        }
      }
      checkExistingTraiteur();
    }, []),
  );

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine)
        ? prev.filter((c) => c !== cuisine)
        : [...prev, cuisine],
    );
  };

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone],
    );
  };

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission requise",
          "Veuillez autoriser l'accès à votre galerie pour ajouter une photo de profil.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Erreur sélection photo:", err);
    }
  };

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageUri) return undefined;
    try {
      const filename = imageUri.split("/").pop() || "workshop_logo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      const response = await apiFetch("/upload/single", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      return data.url || data.fileUrl;
    } catch (err) {
      console.error("Erreur upload image traiteur:", err);
      return undefined;
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Veuillez indiquer le nom de votre atelier traiteur.");
      return;
    }
    if (!bio.trim()) {
      setError("Veuillez rédiger une présentation de votre savoir-faire.");
      return;
    }
    if (selectedCuisines.length === 0) {
      setError("Sélectionnez au moins une spécialité culinaire.");
      return;
    }

    setLoading(true);
    const token = await getSecureToken("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      let uploadedUrl: string | undefined = undefined;
      if (imageUri) {
        uploadedUrl = await uploadImage();
      }

      const response = await apiFetch("/traiteur/setup", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          cuisine_type: selectedCuisines,
          delivery_zones: selectedZones,
          whatsapp: whatsapp.trim() || undefined,
          image_url: uploadedUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Erreur lors de la création du profil traiteur.");
        setLoading(false);
        return;
      }

      Alert.alert(
        "Félicitations !",
        "Votre Atelier Traiteur Dabari a été créé avec succès !",
        [
          {
            text: "Accéder à mon espace",
            onPress: () => router.replace("/profil/traiteur"),
          },
        ],
      );
    } catch (err: any) {
      console.error(err);
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.topGreenWrapper, styles.centerLoader]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.checkingText}>Vérification de votre compte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        {/* ── HEADER FOREST GREEN (#0B3B24) ── */}
        <View style={styles.headerHero}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/profil")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Mon compte</Text>
          </TouchableOpacity>

          <View style={styles.heroRow}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="restaurant" size={26} color="#0B3B24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Devenir Traiteur Partner</Text>
              <Text style={styles.heroSub}>
                Rejoignez Dabari pour valoriser votre cuisine et recevoir des commandes.
              </Text>
            </View>
          </View>
        </View>

        {/* ── FORMULAIRE SCROLLABLE (#F8FAFC) ── */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Activer mon Atelier Traiteur</Text>
            <Text style={styles.cardHeaderSub}>
              Renseignez les informations de base de votre activité gastronomique.
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Photo / Logo */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Logo ou Photo de l'atelier</Text>
              <View style={styles.avatarUploadRow}>
                <TouchableOpacity
                  style={styles.avatarUploadCircle}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.avatarPreviewImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholderCircle}>
                      <Ionicons
                        name="camera-outline"
                        size={28}
                        color="#0B3B24"
                      />
                    </View>
                  )}
                  <View style={styles.cameraBadgeCircle}>
                    <Ionicons name="camera" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <View style={styles.avatarUploadInfo}>
                  <Text style={styles.avatarUploadTitle}>
                    {imageUri
                      ? "Photo sélectionnée"
                      : "Ajouter une photo de profil"}
                  </Text>
                  <Text style={styles.avatarUploadSub}>
                    Une photo soignée donne confiance et augmente les demandes !
                  </Text>
                  <TouchableOpacity
                    style={styles.selectImageBtn}
                    onPress={pickImage}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image-outline" size={14} color="#0B3B24" />
                    <Text style={styles.selectImageBtnText}>
                      {imageUri ? "Changer la photo" : "Choisir une photo"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Nom de l'activité */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nom de l'activité *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex : Délices de Dakar, Saveurs d'Abidjan..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Présentation / Bio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Présentation & Histoire *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez votre savoir-faire, vos spécialités culinaires et vos engagements..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={bio}
                onChangeText={setBio}
              />
            </View>

            {/* Spécialités Culinaires */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Spécialités culinaires *</Text>
                <Text style={styles.fieldHint}>
                  {selectedCuisines.length} sélectionnée(s)
                </Text>
              </View>
              <View style={styles.pillsContainer}>
                {CUISINES_PROPOSITIONS.map((cuisine) => {
                  const active = selectedCuisines.includes(cuisine);
                  return (
                    <TouchableOpacity
                      key={cuisine}
                      style={[styles.chipPill, active && styles.chipPillActive]}
                      onPress={() => toggleCuisine(cuisine)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={active ? "checkmark" : "add"}
                        size={13}
                        color={active ? "#FFFFFF" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.chipPillText,
                          active && styles.chipPillTextActive,
                        ]}
                      >
                        {cuisine}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Zones de livraison */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Zones de livraison</Text>
                <Text style={styles.fieldHint}>
                  {selectedZones.length} sélectionnée(s)
                </Text>
              </View>
              <View style={styles.pillsContainer}>
                {ZONES_PROPOSITIONS.map((zone) => {
                  const active = selectedZones.includes(zone);
                  return (
                    <TouchableOpacity
                      key={zone}
                      style={[
                        styles.chipPill,
                        active && styles.chipPillActiveGreen,
                      ]}
                      onPress={() => toggleZone(zone)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={active ? "#FFFFFF" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.chipPillText,
                          active && styles.chipPillTextActive,
                        ]}
                      >
                        {zone}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Numéro WhatsApp */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Numéro WhatsApp professionnel</Text>
              <View style={styles.whatsappInputWrapper}>
                <Ionicons
                  name="logo-whatsapp"
                  size={18}
                  color="#25D366"
                  style={{ marginLeft: 14 }}
                />
                <TextInput
                  style={styles.whatsappInput}
                  placeholder="Ex : +33 6 12 34 56 78"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                />
              </View>
              <Text style={styles.fieldHelper}>
                Utilisé pour échanger avec vos clients et valider les détails de devis.
              </Text>
            </View>

            {/* Bouton de validation */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitBtnText}>Création en cours...</Text>
                </View>
              ) : (
                <View style={styles.savingRow}>
                  <Text style={styles.submitBtnText}>
                    Activer mon atelier traiteur
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topGreenWrapper: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },
  centerLoader: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  checkingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B3B24",
  },

  /* Header Hero */
  headerHero: {
    backgroundColor: "#0B3B24",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D4870A",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
    lineHeight: 16,
  },

  /* Scrollable Form */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 18,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardHeaderSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: -12,
    marginBottom: 4,
    lineHeight: 17,
  },

  /* Error */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  /* Field groups */
  fieldGroup: {
    gap: 6,
  },
  fieldHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  fieldHelper: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 15,
    marginTop: 2,
  },

  /* Avatar upload */
  avatarUploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 4,
  },
  avatarUploadCircle: {
    position: "relative",
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: "visible",
  },
  avatarPreviewImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#D4870A",
  },
  avatarPlaceholderCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D4870A",
  },
  cameraBadgeCircle: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#0B3B24",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarUploadInfo: {
    flex: 1,
    gap: 3,
  },
  avatarUploadTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  avatarUploadSub: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  selectImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  selectImageBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0B3B24",
  },

  /* Inputs */
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },

  /* Pills */
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipPillActive: {
    backgroundColor: "#0B3B24",
    borderColor: "#0B3B24",
  },
  chipPillActiveGreen: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  chipPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  chipPillTextActive: {
    color: "#FFFFFF",
  },

  /* WhatsApp */
  whatsappInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
  },
  whatsappInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },

  /* Submit CTA */
  submitBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
