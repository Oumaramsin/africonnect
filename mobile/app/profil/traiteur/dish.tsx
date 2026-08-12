import React, { useEffect, useState } from "react";
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getSecureToken } from "../../../utils/storage";

const CUISINES = [
  "Sénégalais",
  "Ivoirien",
  "Camerounais",
  "Congolais",
  "Malien",
  "Guinéen",
  "Burkinabé",
  "Togolais",
];

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
    typeof params?.cuisine_type === "string" ? params.cuisine_type : "Ivoirien",
  );
  const [isAvailable, setIsAvailable] = useState(
    params?.is_available === "false" ? false : true,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission refusée",
        "Permission d'accéder à la galerie refusée !",
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
  };

  const removeImage = (indexToRemove: number) => {
    setImageUris((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    try {
      const token = await getSecureToken("token");
      if (!token) {
        router.push("/login");
        return;
      }
      if (!name || !price || !cuisineType || imageUris.length === 0) {
        setError("Remplis tous les champs obligatoires (*)");
        return;
      }

      if (parseFloat(price) < 0) {
        setError("Le prix ne peut pas être négatif");
        return;
      }

      let uploadedUrls: string[] = [];

      if (imageUris.length > 0) {
        const formData = new FormData();
        imageUris.forEach((uri) => {
          const filename = uri.split("/").pop() || "photo.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          formData.append("files", {
            uri,
            name: filename,
            type,
          } as any);
        });
        formData.append("folder", "dishes");

        const uploadRes = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/upload/multiple`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(
            uploadData.error || uploadData.message || "Erreur lors de l'upload des images",
          );
        }
        uploadedUrls = uploadData.urls || [];
      }

      if (!isEditing) {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/traiteur/dishes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: name,
              description: description,
              price: parseFloat(price),
              cuisine_type: cuisineType,
              is_available: isAvailable,
              image_urls: uploadedUrls,
            }),
          },
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Erreur lors de l'ajout du plat");
        }

        setSuccess("Plat ajouté avec succès !");
        setTimeout(() => {
          setSuccess("");
          router.back();
        }, 1500);
      } else {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/traiteur/dishes/${params.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: name,
              description: description,
              price: parseFloat(price),
              cuisine_type: cuisineType,
              is_available: isAvailable,
              image_urls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
            }),
          },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Erreur lors de la modification du plat");
        }

        setSuccess("Plat modifié avec succès !");
        setTimeout(() => {
          setSuccess("");
          router.back();
        }, 1500);
      }
    } catch (err: any) {
      console.error("Erreur enregistrement plat:", err);
      setError(err.message || "Erreur lors de l'enregistrement du plat");
    }
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push('/profil/traiteur')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Mes plats</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {isEditing ? "Modifier le Plat" : "Ajouter un plat"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEditing
              ? "Mettez à jour les informations et visuels de votre plat."
              : "Ajoutez un nouveau plat savoureux à votre menu."}
          </Text>
        </View>

        {/* Formulaire */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            {/* Upload photo */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PHOTOS DU PLAT *</Text>

              <TouchableOpacity
                style={styles.dropZone}
                onPress={pickImages}
                activeOpacity={0.8}
              >
                <View style={styles.dropZoneIconCircle}>
                  <Ionicons name="images-outline" size={26} color="#1D6B45" />
                </View>
                <Text style={styles.dropZoneTitle}>Ajouter des images</Text>
                <Text style={styles.dropZoneSubtext}>
                  PNG, JPG, WEBP (plusieurs images possibles)
                </Text>
              </TouchableOpacity>

              {/* Image select */}
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
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOM DU PLAT *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Thiéboudienne, Ndolé au bœuf..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                SPÉCIALITÉ CULINAIRE / CUISINE *
              </Text>
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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez les ingrédients, la quantité, les allergènes..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PRIX (€) *</Text>
              <View style={styles.inputWithIconRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ex: 15"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
                <Text style={styles.currencySymbol}>€</Text>
              </View>
            </View>

            {/* DISPONIBILITÉ IMMÉDIATE */}
            <View style={styles.availabilityRow}>
              <View style={styles.availabilityTextGroup}>
                <Text style={styles.availabilityTitle}>
                  Disponible immédiatement
                </Text>
                <Text style={styles.availabilitySub}>
                  Afficher ce plat comme commandable par les clients
                </Text>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={setIsAvailable}
                trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
                thumbColor={isAvailable ? "#1D6B45" : "#94A3B8"}
              />
            </View>

            {/* MESSAGE D'ERREUR */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/*  MESSAGE DE SUCCÈS */}
            {Boolean(success) && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isEditing ? "checkmark-circle" : "add-circle"}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.submitBtnText}>
                {isEditing
                  ? "Enregistrer les modifications"
                  : "Ajouter le plat"}
              </Text>
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
    backgroundColor: "#165034",
  },
  container: {
    flex: 1,
    backgroundColor: "#165034",
  },

  headerCard: {
    backgroundColor: "#165034",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },

  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: 18,
  },

  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 80,
  },

  rowTwoCols: {
    flexDirection: "row",
    gap: 12,
  },
  inputWithIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1D6B45",
  },

  dropZone: {
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 20,
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
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  dropZoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D6B45",
  },
  dropZoneSubtext: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },

  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  thumbnailWrapper: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  removeImageBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  cuisineGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  cuisineChipPill: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cuisineChipPillActive: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  cuisineChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  cuisineChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  availabilityTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  availabilityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  availabilitySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  submitBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#B91C1C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
  },
});
