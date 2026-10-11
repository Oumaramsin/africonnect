import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getSecureToken } from "../../../utils/storage";
import { apiFetch } from "../../../utils/api";

import { CUISINES } from "../../../utils/constants";

export default function TraiteurDishFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const isEditing = Boolean(params?.id);

  const [name, setName] = useState(
    typeof params?.name === "string" ? params.name : "",
  );
  const [description, setDescription] = useState(
    typeof params?.description === "string" ? params.description : "",
  );
  const [price, setPrice] = useState(
    typeof params?.price === "string" ? params.price : "",
  );
  const [cuisineType, setCuisineType] = useState(
    typeof params?.cuisine_type === "string" ? params.cuisine_type : "Sénégalais",
  );
  const [isAvailable, setIsAvailable] = useState(
    params?.is_available === "false" ? false : true,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [imageUris, setImageUris] = useState<string[]>(() => {
    if (typeof params?.image_urls === "string") {
      try {
        return JSON.parse(params.image_urls);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const pickImages = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission requise",
          "Veuillez autoriser l'accès à vos photos pour illustrer vos plats.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((asset) => asset.uri);
        setImageUris((prev) => [...prev, ...newUris]);
      }
    } catch (err) {
      console.warn("Erreur sélection photos:", err);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageUris((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Veuillez indiquer le nom du plat.");
      return;
    }

    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError("Veuillez renseigner un prix valide (supérieur à 0 €).");
      return;
    }

    if (!cuisineType) {
      setError("Veuillez choisir une spécialité culinaire.");
      return;
    }

    if (imageUris.length === 0) {
      setError("Veuillez ajouter au moins une photo pour illustrer votre plat.");
      return;
    }

    setSaving(true);

    try {
      const token = await getSecureToken("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Distinguer images déjà distantes (URL commençant par http) des fichiers locaux
      const remoteUrls = imageUris.filter((u) => u.startsWith("http"));
      const localUris = imageUris.filter((u) => !u.startsWith("http"));

      let uploadedNewUrls: string[] = [];

      if (localUris.length > 0) {
        const formData = new FormData();
        localUris.forEach((uri) => {
          const filename = uri.split("/").pop() || "dish_photo.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          formData.append("files", {
            uri,
            name: filename,
            type,
          } as any);
        });
        formData.append("folder", "dishes");

        const uploadRes = await apiFetch("/upload/multiple", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(
            uploadData.error ||
              uploadData.message ||
              "Échec du téléchargement des photos.",
          );
        }
        uploadedNewUrls = uploadData.urls || [];
      }

      const finalImageUrls = [...remoteUrls, ...uploadedNewUrls];

      if (!isEditing) {
        const response = await apiFetch("/traiteur/dishes", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            cuisine_type: cuisineType,
            is_available: isAvailable,
            image_urls: finalImageUrls,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.error || data.message || "Erreur lors de l'ajout du plat.",
          );
        }

        setSuccess("Plat ajouté à votre carte avec succès !");
        setTimeout(() => {
          router.replace("/profil/traiteur");
        }, 1200);
      } else {
        const response = await apiFetch(`/traiteur/dishes/${params.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            cuisine_type: cuisineType,
            is_available: isAvailable,
            image_urls: finalImageUrls,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Erreur lors de la modification du plat.",
          );
        }

        setSuccess("Plat mis à jour avec succès !");
        setTimeout(() => {
          router.replace("/profil/traiteur");
        }, 1200);
      }
    } catch (err: any) {
      console.error("Erreur enregistrement plat:", err);
      setError(err.message || "Erreur lors de l'enregistrement du plat.");
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
            <Text style={styles.backBtnText}>Carte & Plats</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {isEditing ? "Modifier le Plat" : "Nouveau Plat"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEditing
              ? "Ajustez les recettes, visuels ou prix de votre plat."
              : "Enrichissez votre carte avec de délicieuses recettes traditionnelles."}
          </Text>
        </View>

        {/* ── FORMULAIRE SCROLLABLE (#F8FAFC) ── */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            {/* 1. Photos du plat */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Photos du plat *</Text>
                <Text style={styles.fieldHint}>
                  {imageUris.length} sélectionnée(s)
                </Text>
              </View>

              <TouchableOpacity
                style={styles.dropZone}
                onPress={pickImages}
                activeOpacity={0.8}
              >
                <View style={styles.dropZoneIconCircle}>
                  <Ionicons name="camera-outline" size={26} color="#0B3B24" />
                </View>
                <Text style={styles.dropZoneTitle}>
                  Ajouter des photos du plat
                </Text>
                <Text style={styles.dropZoneSubtext}>
                  Photos nettes et appétissantes (PNG, JPG, WEBP)
                </Text>
              </TouchableOpacity>

              {/* Thumbnails list */}
              {imageUris.length > 0 && (
                <View style={styles.imageGrid}>
                  {imageUris.map((uri, index) => (
                    <View key={index} style={styles.thumbnailWrapper}>
                      <Image source={{ uri }} style={styles.thumbnailImage} />
                      <TouchableOpacity
                        style={styles.removeImageBadge}
                        onPress={() => removeImage(index)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 2. Nom du plat */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nom du plat *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex : Thiéboudienne Rouge Penda Mbaye, Ndolé..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* 3. Spécialité culinaire */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Spécialité culinaire *</Text>
              <View style={styles.cuisineGridContainer}>
                {CUISINES.map((c) => {
                  const active = cuisineType === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.cuisineChipPill,
                        active && styles.cuisineChipPillActive,
                      ]}
                      onPress={() => setCuisineType(c)}
                      activeOpacity={0.8}
                    >
                      {active && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="#FFFFFF"
                          style={{ marginRight: 2 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.cuisineChipText,
                          active && styles.cuisineChipTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Description détaillée */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description détaillée</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ingrédients clés, garnitures, épices, nombre de portions ou allergènes..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* 5. Prix en € */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Prix de la portion (€) *</Text>
              <View style={styles.inputWithIconRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ex : 14.50"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>€ EUR</Text>
                </View>
              </View>
            </View>

            {/* 6. Disponibilité immédiate */}
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityTextGroup}>
                <Text style={styles.availabilityTitle}>
                  Disponible à la commande
                </Text>
                <Text style={styles.availabilitySub}>
                  Afficher ce plat immédiatement commandable sur Dabari
                </Text>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={setIsAvailable}
                trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                thumbColor={isAvailable ? "#15803D" : "#94A3B8"}
              />
            </View>

            {/* Message d'erreur */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Message de succès */}
            {Boolean(success) && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            {/* Bouton de validation */}
            <TouchableOpacity
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Enregistrement en cours...</Text>
                </View>
              ) : (
                <View style={styles.savingRow}>
                  <Ionicons
                    name={isEditing ? "save-outline" : "add-circle-outline"}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitBtnText}>
                    {isEditing
                      ? "Enregistrer les modifications"
                      : "Ajouter ce plat au menu"}
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

  /* Drop Zone */
  dropZone: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    gap: 6,
  },
  dropZoneIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dropZoneTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0B3B24",
  },
  dropZoneSubtext: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },

  /* Image Grid */
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  thumbnailWrapper: {
    position: "relative",
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  removeImageBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Text Inputs */
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
  inputWithIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyBadge: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  currencyBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },

  /* Cuisine Chips */
  cuisineGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  cuisineChipPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cuisineChipPillActive: {
    backgroundColor: "#0B3B24",
    borderColor: "#0B3B24",
  },
  cuisineChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  cuisineChipTextActive: {
    color: "#FFFFFF",
  },

  /* Availability Card */
  availabilityCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  availabilityTextGroup: {
    flex: 1,
  },
  availabilityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  availabilitySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
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
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },

  /* Submit Button */
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
    marginTop: 4,
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
