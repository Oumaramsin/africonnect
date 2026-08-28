import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../utils/api";
import {
  showConfirmAlert,
  showSuccessAlert,
  showErrorAlert,
} from "../../utils/alerts";

export default function EditGpScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Valeurs initiales
  const [initialData, setInitialData] = useState<{
    weightKg: string;
    contentDesc: string;
    declaredValue: string;
    notes: string;
  } | null>(null);

  const [weightKg, setWeightKg] = useState("1");
  const [contentDesc, setContentDesc] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    loadGpRequest();
  }, [id]);

  const loadGpRequest = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/commande/gp/${id}`);
      if (!res.ok) {
        throw new Error("Impossible de charger la demande GP.");
      }
      const data = await res.json();
      const req = data.data?.request;
      if (!req) {
        throw new Error("Demande GP introuvable.");
      }

      if (req.status !== "pending") {
        showErrorAlert(
          "Action impossible",
          "Cette demande a déjà été traitée et ne peut plus être modifiée.",
          () => router.replace("/commandes"),
        );
        return;
      }

      setRequest(req);
      const initWeight = req.weight_kg ? String(req.weight_kg) : "1";
      const initDesc = req.content_desc || "";
      const initVal = req.declared_value ? String(req.declared_value) : "";
      const initNotes = req.notes || "";

      setWeightKg(initWeight);
      setContentDesc(initDesc);
      setDeclaredValue(initVal);
      setNotes(initNotes);

      setInitialData({
        weightKg: initWeight,
        contentDesc: initDesc,
        declaredValue: initVal,
        notes: initNotes,
      });
    } catch (e: any) {
      showErrorAlert(
        "Erreur",
        e.message || "Erreur de chargement de la demande GP.",
        () => router.replace("/commandes"),
      );
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    if (weightKg.trim() !== initialData.weightKg.trim()) return true;
    if (contentDesc.trim() !== initialData.contentDesc.trim()) return true;
    if (declaredValue.trim() !== initialData.declaredValue.trim()) return true;
    if (notes.trim() !== initialData.notes.trim()) return true;
    return false;
  }, [initialData, weightKg, contentDesc, declaredValue, notes]);

  const getPricePerKg = () => {
    const listing = request?.listing || request?.gp_listings;
    return Number(listing?.price_per_kg || 0);
  };

  const getEstimatedTotal = () => {
    const w = parseFloat(weightKg) || 0;
    const price = getPricePerKg();
    return (w * price).toFixed(2);
  };

  const handleSaveClick = () => {
    const parsedWeight = parseFloat(weightKg);
    if (!parsedWeight || parsedWeight <= 0) {
      showErrorAlert("Erreur", "Le poids du colis doit être supérieur à 0 kg.");
      return;
    }

    if (!contentDesc.trim()) {
      showErrorAlert(
        "Description manquante",
        "Veuillez décrire le contenu du colis.",
      );
      return;
    }

    showConfirmAlert(
      "Confirmer les modifications",
      "Êtes-vous sûr(e) de vouloir enregistrer les modifications pour cette demande GP ?",
      performSave,
    );
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        weight_kg: parseFloat(weightKg),
        content_desc: contentDesc,
        declared_value: parseFloat(declaredValue) || undefined,
        notes: notes,
      };

      const res = await apiFetch(`/commande/gp/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la modification");
      }

      showSuccessAlert(
        "Succès 🎉",
        "Votre demande de colis GP a été mise à jour avec succès !",
        () => router.replace("/commandes"),
      );
    } catch (e: any) {
      showErrorAlert(
        "Erreur",
        e.message || "Impossible de sauvegarder la demande.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D4870A" />
        <Text style={styles.loadingText}>Chargement de la demande GP...</Text>
      </SafeAreaView>
    );
  }

  const listing = request?.listing || request?.gp_listings;
  const depCity = request?.departure_city || listing?.departure_city;
  const arrCity = request?.arrival_city || listing?.arrival_city;
  const pricePerKg = getPricePerKg();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/commandes")}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Modifier la demande GP</Text>
          <Text style={styles.headerSubtitle}>
            {depCity && arrCity
              ? `${depCity} ➔ ${arrCity}`
              : "Transport de colis GP"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Résumé du trajet */}
        {Boolean(depCity && arrCity) && (
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <Ionicons name="airplane" size={18} color="#D4870A" />
              <Text style={styles.routeText}>
                {depCity} ➔ {arrCity}
              </Text>
            </View>
            {Boolean(pricePerKg > 0) && (
              <Text style={styles.pricePerKgText}>
                Tarif : {pricePerKg.toFixed(2)} € / kg
              </Text>
            )}
          </View>
        )}

        {/* Poids du colis */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>POIDS ESTIMÉ DU COLIS (KG)</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => {
                const cur = parseFloat(weightKg) || 1;
                if (cur > 0.5) setWeightKg(String((cur - 0.5).toFixed(1)));
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color="#D4870A" />
            </TouchableOpacity>

            <TextInput
              style={styles.counterInput}
              value={weightKg}
              onChangeText={(val) => setWeightKg(val.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => {
                const cur = parseFloat(weightKg) || 1;
                setWeightKg(String((cur + 0.5).toFixed(1)));
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color="#D4870A" />
            </TouchableOpacity>
          </View>

          {/* Bannière Total GP Estimé */}
          {Boolean(pricePerKg > 0) && (
            <View style={styles.revisedTotalBanner}>
              <View>
                <Text style={styles.revisedTotalLabel}>
                  Nouveau montant estimé
                </Text>
                <Text style={styles.revisedTotalValue}>
                  {getEstimatedTotal()} €
                </Text>
              </View>
              <View style={styles.weightBadge}>
                <Text style={styles.weightBadgeText}>{weightKg || 0} kg</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description du contenu */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>DESCRIPTION DU CONTENU</Text>
          <TextInput
            style={styles.textInput}
            value={contentDesc}
            onChangeText={setContentDesc}
            placeholder="Ex: Vêtements, documents administratifs, denrées sèches..."
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Valeur déclarée */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            VALEUR DÉCLARÉE (€ - OPTIONNEL)
          </Text>
          <TextInput
            style={styles.textInput}
            value={declaredValue}
            onChangeText={(val) =>
              setDeclaredValue(val.replace(/[^0-9.]/g, ""))
            }
            placeholder="Ex: 50"
            keyboardType="decimal-pad"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Notes pour le GP */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            NOTES & CONSIGNES PARTICULIÈRES
          </Text>
          <TextInput
            style={styles.multilineInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Point de rendez-vous souhaité, flexibilité d'horaire, emballage..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Bouton Enregistrer Centré */}
        <View style={styles.footerCentered}>
          <TouchableOpacity
            style={[
              styles.saveBtnCentered,
              (!hasChanges || isSaving) && styles.saveBtnDisabled,
            ]}
            onPress={handleSaveClick}
            disabled={!hasChanges || isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Ionicons
                  name={hasChanges ? "checkmark-circle" : "lock-closed-outline"}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveBtnText}>
                  {hasChanges
                    ? "Enregistrer les modifications"
                    : "Aucune modification"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#D4870A",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#D4870A",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#D4870A",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#FFF8E7",
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  routeCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.3)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D4870A",
  },
  pricePerKgText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF8E7",
    borderWidth: 1.5,
    borderColor: "#D4870A",
    justifyContent: "center",
    alignItems: "center",
  },
  counterInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  revisedTotalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF8E7",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.3)",
    marginTop: 4,
  },
  revisedTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  revisedTotalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#D4870A",
  },
  weightBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212, 135, 10, 0.2)",
  },
  weightBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D4870A",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  multilineInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 80,
    textAlignVertical: "top",
  },
  footerCentered: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  saveBtnCentered: {
    backgroundColor: "#D4870A",
    width: "100%",
    maxWidth: 320,
    paddingVertical: 14,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D4870A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.7,
  },
  saveBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
