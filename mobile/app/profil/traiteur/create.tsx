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

const CUISINES_PROPOSITIONS = [
  "Ivoirienne",
  "Sénégalaise",
  "Camerounaise",
  "Congolaise",
  "Malienne",
  "Guinéenne",
  "Togolaise",
  "Béninoise",
];

const ZONES_PROPOSITIONS = [
  "Paris (75)",
  "Seine-Saint-Denis (93)",
  "Hauts-de-Seine (92)",
  "Val-de-Marne (94)",
  "Toute l'Île-de-France",
  "Lyon",
  "Marseille",
  "Bordeaux",
];

export default function CreateTraiteurScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([
    "Ivoirienne",
  ]);
  const [selectedZones, setSelectedZones] = useState<string[]>([
    "Toute l'Île-de-France",
  ]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (token: string): Promise<string | undefined> => {
    if (!imageUri) return undefined;
    setUploading(true);
    try {
      const filename = imageUri.split("/").pop() || "image.jpg";
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
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Veuillez entrer le nom de votre activité traiteur.");
      return;
    }
    if (!bio.trim()) {
      setError("Veuillez rédiger une courte présentation.");
      return;
    }
    if (selectedCuisines.length === 0) {
      setError("Veuillez sélectionner au moins une spécialité culinaire.");
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
        uploadedUrl = await uploadImage(token);
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
        setError(data.message || "Erreur lors de la création du profil.");
        setLoading(false);
        return;
      }

      Alert.alert(
        "Félicitations ! 🎉",
        "Votre Espace Traiteur a été créé avec succès !",
        [
          {
            text: "Accéder à mon espace",
            onPress: () => router.replace("/profil/traiteur"),
          },
        ],
      );
    } catch (err: any) {
      console.error(err);
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.topGreenWrapper, styles.centerLoader]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Header Bar */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/profil")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Retour Profil</Text>
          </TouchableOpacity>

          <View style={styles.heroRow}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="restaurant" size={28} color="#1D6B45" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Devenir Traiteur Partner</Text>
              <Text style={styles.heroSub}>
                Faites découvrir vos spécialités et recevez des commandes !
              </Text>
            </View>
          </View>
        </View>

        {/* Form Content */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>
              Créer mon Espace Traiteur
            </Text>
            <Text style={styles.cardHeaderSub}>
              Remplissez les informations principales de votre activité pour
              commencer.
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Photo de profil Traiteur */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                PHOTO DE PROFIL / LOGO ACTIVITÉ
              </Text>
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
                        size={26}
                        color="#1D6B45"
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
                    Formats JPG, PNG. Une photo attire plus de clients !
                  </Text>
                  <TouchableOpacity
                    style={styles.selectImageBtn}
                    onPress={pickImage}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image-outline" size={14} color="#1D6B45" />
                    <Text style={styles.selectImageBtnText}>
                      {imageUri ? "Changer la photo" : "Choisir une photo"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Nom de l'activité */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOM DE L'ACTIVITÉ *</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Délice d'Abidjan, Chez Fatou..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Presentation / Bio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PRÉSENTATION & BIO *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez vos spécialités, votre savoir-faire et vos plats phares..."
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
              <Text style={styles.fieldLabel}>SPÉCIALITÉS CULINAIRES *</Text>
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
                        name={
                          active ? "checkmark-circle" : "add-circle-outline"
                        }
                        size={14}
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
              <Text style={styles.fieldLabel}>ZONES DE LIVRAISON</Text>
              <View style={styles.pillsContainer}>
                {ZONES_PROPOSITIONS.map((zone) => {
                  const active = selectedZones.includes(zone);
                  return (
                    <TouchableOpacity
                      key={zone}
                      style={[
                        styles.chipPill,
                        active && styles.chipPillActiveGold,
                      ]}
                      onPress={() => toggleZone(zone)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={active ? "location" : "location-outline"}
                        size={14}
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

            {/* WhatsApp Professionnel */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NUMÉRO WHATSAPP (OPTIONNEL)</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: +33612345678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={whatsapp}
                onChangeText={setWhatsapp}
              />
            </View>

            {/* CTA Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    Créer mon Espace Traiteur
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
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
    backgroundColor: "#165034",
  },
  centerLoader: {
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 16,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 16,
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
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 18,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
    marginBottom: 8,
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

  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipPillActive: {
    backgroundColor: "#1D6B45",
    borderColor: "#1D6B45",
  },
  chipPillActiveGold: {
    backgroundColor: "#D4870A",
    borderColor: "#D4870A",
  },
  chipPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipPillTextActive: {
    color: "#FFFFFF",
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

  /* Avatar Photo Picker */
  avatarUploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarUploadCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: "relative",
  },
  avatarPreviewImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholderCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  cameraBadgeCircle: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1D6B45",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarUploadInfo: {
    flex: 1,
  },
  avatarUploadTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  avatarUploadSub: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 8,
    lineHeight: 15,
  },
  selectImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  selectImageBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D6B45",
  },
});
