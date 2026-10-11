import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getSecureToken } from "../../../utils/storage";
import { apiFetch } from "../../../utils/api";
import { CUISINES, ZONES } from "../../../utils/constants";

export default function EditTraiteurProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [name, setName] = useState((params.name as string) || "");
  const [bio, setBio] = useState((params.bio as string) || "");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(() => {
    if (params.cuisines) {
      try {
        return JSON.parse(params.cuisines as string);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [selectedZones, setSelectedZones] = useState<string[]>(() => {
    if (params.zones) {
      try {
        return JSON.parse(params.zones as string);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [whatsapp, setWhatsapp] = useState((params.whatsapp as string) || "");
  const [imageUri, setImageUri] = useState<string | null>(
    (params.image_url as string) || null,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          "Veuillez autoriser l'accès à vos photos pour changer la photo de profil.",
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

  const uploadLocalImage = async (localUri: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      const filename = localUri.split("/").pop() || "workshop_logo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("file", {
        uri: localUri,
        name: filename,
        type: type,
      } as any);

      const response = await apiFetch("/upload/single", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      return data.url || null;
    } catch (err) {
      console.error("Erreur upload photo profil:", err);
      return null;
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Veuillez indiquer le nom de votre enseigne / atelier.");
      return;
    }

    if (selectedCuisines.length === 0) {
      setError("Sélectionnez au moins une spécialité culinaire.");
      return;
    }

    setSaving(true);

    try {
      const token = await getSecureToken("token");
      if (!token) {
        router.push("/login");
        return;
      }

      let finalImageUrl = imageUri;

      // Télécharger uniquement si l'image est un nouveau fichier local
      if (imageUri && !imageUri.startsWith("http")) {
        const uploadedUrl = await uploadLocalImage(imageUri);
        if (!uploadedUrl) {
          setError("Échec de l'envoi de la photo de l'atelier.");
          setSaving(false);
          return;
        }
        finalImageUrl = uploadedUrl;
      }

      const response = await apiFetch("/traiteur/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          cuisine_type: selectedCuisines,
          delivery_zones: selectedZones,
          whatsapp: whatsapp.trim(),
          image_url: finalImageUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error ||
            data.message ||
            "Erreur lors de la sauvegarde du profil traiteur.",
        );
        return;
      }

      router.replace("/profil/traiteur");
    } catch (err: any) {
      console.error("Erreur sauvegarde:", err);
      setError("Erreur de connexion avec le serveur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B24" />

        {/* ── HEADER FOREST GREEN (#0B3B24) ── */}
        <View style={styles.headerHero}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/profil/traiteur")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Mon atelier</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Modifier mon enseigne</Text>
          <Text style={styles.headerSubtitle}>
            Mettez à jour les coordonnées et informations publiques de votre atelier.
          </Text>
        </View>

        {/* ── CONTENU DU FORMULAIRE (#F8FAFC) ── */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            {/* Bannière d'erreur */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* 1. Photo de l'atelier */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Logo ou Photo de l'atelier</Text>
              <View style={styles.photoRow}>
                <View style={styles.avatarPreviewCircle}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.avatarImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="restaurant" size={32} color="#0B3B24" />
                  )}
                </View>

                <TouchableOpacity
                  style={styles.changePhotoBtn}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={16} color="#0B3B24" />
                  <Text style={styles.changePhotoBtnText}>
                    {imageUri ? "Changer la photo" : "Ajouter une photo"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Nom de l'activité */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nom de l'activité / Atelier *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex : Délices de Dakar, Chez Mama Africa..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* 3. Histoire & Bio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Histoire & Présentation</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Partagez votre passion, votre parcours et vos spécialités culinaires..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={bio}
                onChangeText={setBio}
              />
            </View>

            {/* 4. Spécialités culinaires (Multi-select) */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Spécialités culinaires *</Text>
                <Text style={styles.fieldHint}>
                  {selectedCuisines.length} sélectionnée(s)
                </Text>
              </View>
              <View style={styles.chipsCloud}>
                {CUISINES.map((c) => {
                  const isSelected = selectedCuisines.includes(c);
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.chipBtn,
                        isSelected && styles.chipBtnActive,
                      ]}
                      onPress={() => toggleCuisine(c)}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color="#FFFFFF"
                          style={{ marginRight: 3 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.chipBtnText,
                          isSelected && styles.chipBtnTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 5. Zones de livraison (Multi-select) */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Zones de livraison desservies</Text>
                <Text style={styles.fieldHint}>
                  {selectedZones.length} sélectionnée(s)
                </Text>
              </View>
              <View style={styles.chipsCloud}>
                {ZONES.map((z) => {
                  const isSelected = selectedZones.includes(z);
                  return (
                    <TouchableOpacity
                      key={z}
                      style={[
                        styles.chipBtn,
                        isSelected && styles.chipBtnActiveGreen,
                      ]}
                      onPress={() => toggleZone(z)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={isSelected ? "#FFFFFF" : "#64748B"}
                        style={{ marginRight: 3 }}
                      />
                      <Text
                        style={[
                          styles.chipBtnText,
                          isSelected && styles.chipBtnTextActive,
                        ]}
                      >
                        {z}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 6. Numéro WhatsApp */}
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
                Permet d'échanger directement avec vos clients pour ajuster les
                détails de leurs commandes et devis.
              </Text>
            </View>

            {/* Bouton de validation */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    Enregistrement en cours...
                  </Text>
                </View>
              ) : (
                <View style={styles.savingRow}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    Enregistrer les modifications
                  </Text>
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
    marginBottom: 12,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 4,
    lineHeight: 18,
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

  /* Feedback */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },

  /* Fields */
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

  /* Photo Section */
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  avatarPreviewCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#D4870A",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  changePhotoBtnText: {
    fontSize: 13,
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
    minHeight: 90,
    paddingTop: 12,
  },

  /* Chips */
  chipsCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chipBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipBtnActive: {
    backgroundColor: "#0B3B24",
    borderColor: "#0B3B24",
  },
  chipBtnActiveGreen: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  chipBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  chipBtnTextActive: {
    color: "#FFFFFF",
  },

  /* WhatsApp Input */
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

  /* Save CTA */
  saveBtn: {
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
  saveBtnDisabled: {
    opacity: 0.65,
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
