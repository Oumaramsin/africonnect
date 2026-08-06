import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getSecureToken } from "../../../utils/storage";

const CUISINES = [
  "sénégalais",
  "ivoirien",
  "camerounais",
  "congolais",
  "malien",
  "guinéen",
  "burkinabé",
];

const ZONES = [
  "Paris",
  "Saint-Denis",
  "Aubervilliers",
  "Montreuil",
  "Créteil",
  "Vitry-sur-Seine",
  "Lyon",
  "Marseille",
];


export default function EditTraiteurProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [name, setName] = useState((params.name as string) || "");
  const [bio, setBio] = useState((params.bio as string) || "");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    params.cuisines ? JSON.parse(params.cuisines as string) : [],
  );
  const [selectedZones, setSelectedZones] = useState<string[]>(
    params.zones ? JSON.parse(params.zones as string) : [],
  );
  const [whatsapp, setWhatsapp] = useState((params.whatsapp as string) || "");
  const [imageUri, setImageUri] = useState<string | null>((params.image_url as string) || null);

  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      alert("Permission d'accéder à la galerie refusée !");
      return;
    }
    // Ouvrir la galerie système
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const selectedUri = result.assets[0].uri;
      setImageUri(selectedUri);
    }
  };

  const uploadImage = async () => {
    const token = await getSecureToken("token");
    if (!token) {
      router.push("/login");
      return;
    }
    if (!imageUri) return;
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("file", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/upload/single`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );
      const data = await response.json();
      console.log("URL de la photo enregistrée sur le serveur :", data.url);
      return data.url;
    } catch (error) {
      console.error("Erreur upload:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      let finalImageUrl = imageUri;
      if (imageUri) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) {
          setError("Échec de l'envoi de la photo de profil.");
          setSaving(false);
          return;
        }
        finalImageUrl = uploadedUrl;
      }
      const token = await getSecureToken("token");
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/traiteur/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            bio,
            cuisine_type: selectedCuisines,
            delivery_zones: selectedZones,
            whatsapp,
            image_url: finalImageUrl,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la sauvegarde du profil");
        return;
      }
      router.push("/profil/traiteur");
    } catch (err: any) {
      setError("Erreur de connexion au serveur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.topGreenWrapper}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />

        {/* Top Header Card Vert Émeraude */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/profil/traiteur")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Modifier mon profil</Text>
          <Text style={styles.headerSubtitle}>
            Mets à jour tes informations d'activité traiteur
          </Text>
        </View>

        {/* ScrollView Principal */}
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* CARTE FORMULAIRE */}
          <View style={styles.card}>
            <Text style={styles.cardSectionHeader}>Mes informations</Text>

            {/* Bannière d'erreur */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#B91C1C"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Photo de profil */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Photo de profil</Text>
              <View style={styles.photoRow}>
                <View style={styles.avatarPreviewCircle}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.avatarImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="camera-outline" size={28} color="#94A3B8" />
                  )}

                  {/* Overlay Spinner pendant l'upload */}
                  {uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.changePhotoBtn,
                    (uploading || saving) && { opacity: 0.6 },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => pickImage()}
                  disabled={uploading || saving}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#1D6B45" />
                  ) : (
                    <Ionicons name="image-outline" size={16} color="#1D6B45" />
                  )}
                  <Text style={styles.changePhotoBtnText}>
                    {uploading
                      ? "Envoi en cours..."
                      : imageUri
                        ? "Changer la photo"
                        : "Ajouter une photo"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nom de l'activité */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Nom de ton activité <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Chez Mariama, Les Saveurs d'Abidjan..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Présentation */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Présentation <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Décris ton activité, tes spécialités, ton expérience..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Cuisines proposées (Pills multi-sélection) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Cuisines proposées <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.pillsGrid}>
                {CUISINES.map((cuisine) => {
                  const isSelected = selectedCuisines.includes(cuisine);
                  return (
                    <TouchableOpacity
                      key={cuisine}
                      style={[
                        styles.pillBtn,
                        isSelected
                          ? styles.pillBtnActive
                          : styles.pillBtnInactive,
                      ]}
                      onPress={() => toggleCuisine(cuisine)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.pillBtnText,
                          isSelected
                            ? styles.pillBtnTextActive
                            : styles.pillBtnTextInactive,
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
              <Text style={styles.fieldLabel}>Zones de livraison</Text>
              <View style={styles.pillsGrid}>
                {ZONES.map((zone) => {
                  const isSelected = selectedZones.includes(zone);
                  return (
                    <TouchableOpacity
                      key={zone}
                      style={[
                        styles.pillBtn,
                        isSelected
                          ? styles.pillBtnActive
                          : styles.pillBtnInactive,
                      ]}
                      onPress={() => toggleZone(zone)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.pillBtnText,
                          isSelected
                            ? styles.pillBtnTextActive
                            : styles.pillBtnTextInactive,
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
              <Text style={styles.fieldLabel}>Numéro WhatsApp</Text>
              <TextInput
                style={styles.textInput}
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="+33612345678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldSubtext}>
                Tu recevras les commandes directement sur WhatsApp
              </Text>
            </View>
          </View>

          {/* Bouton de Sauvegarde */}
          <TouchableOpacity
            style={[styles.submitBtn, saving && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={() => setConfirmAction(true)}
          >
            <Text style={styles.submitBtnText}>
              {saving ? "Modification..." : "Enregistrer les modifications"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal de Confirmation */}
        <Modal
          visible={confirmation}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmAction(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setConfirmAction(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalIconCircle}>
                <Ionicons
                  name="help-circle-outline"
                  size={32}
                  color="#1D6B45"
                />
              </View>

              <Text style={styles.modalTitle}>
                Confirmer les modifications ?
              </Text>
              <Text style={styles.modalDesc}>
                Êtes-vous sûr de vouloir enregistrer les modifications de votre
                profil traiteur ?
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmAction(false)}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={() => {
                    setConfirmAction(false);
                    handleSubmit();
                  }}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
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

  /* Header Card Vert Émeraude */
  headerCard: {
    backgroundColor: "#165034",
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  backBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },

  /* ScrollView */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 36,
  },

  /* Form Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  cardSectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  /* Field Groups */
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  requiredStar: {
    color: "#EF4444",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  textAreaInput: {
    height: 84,
    textAlignVertical: "top",
  },
  fieldSubtext: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },

  /* Photo Row */
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  avatarPreviewCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  changePhotoBtnText: {
    color: "#1D6B45",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Pills Multi-Selection */
  pillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  pillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillBtnActive: {
    backgroundColor: "#1D6B45",
  },
  pillBtnInactive: {
    backgroundColor: "#F1F5F9",
  },
  pillBtnText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  pillBtnTextActive: {
    color: "#FFFFFF",
  },
  pillBtnTextInactive: {
    color: "#475569",
  },

  /* Submit Button */
  submitBtn: {
    backgroundColor: "#1D6B45",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#1D6B45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* Modal de Confirmation */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(29, 107, 69, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#1D6B45",
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Bannière d'erreur */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 6,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
