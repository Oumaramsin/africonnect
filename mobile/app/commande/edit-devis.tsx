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
import AddressAutocomplete from "../../components/AddressAutocomplete";
import {
  showConfirmAlert,
  showSuccessAlert,
  showErrorAlert,
} from "../../utils/alerts";

const EVENT_TYPES = [
  "Mariage",
  "Anniversaire",
  "Baptême",
  "Entreprise",
  "Autre",
];

export default function EditDevisScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [commande, setCommande] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Valeurs initiales
  const [initialData, setInitialData] = useState<{
    dateEvenement: string;
    nbPersonnes: string;
    typeEvenement: string;
    adresse: string;
    notes: string;
  } | null>(null);

  const [dateEvenement, setDateEvenement] = useState("");
  const [nbPersonnes, setNbPersonnes] = useState("1");
  const [typeEvenement, setTypeEvenement] = useState("Mariage");
  const [adresse, setAdresse] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    loadCommandeDetails();
  }, [id]);

  const loadCommandeDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/commande/traiteur/${id}`);
      if (!res.ok) {
        throw new Error("Impossible de charger la demande de devis.");
      }
      const data = await res.json();
      const cmd = data.data?.commande;
      if (!cmd) {
        throw new Error("Demande de devis introuvable.");
      }

      if (cmd.statut !== "en_attente") {
        showErrorAlert(
          "Action impossible",
          "Cette demande a déjà été traitée et ne peut plus être modifiée.",
          () => router.replace("/commandes"),
        );
        return;
      }

      setCommande(cmd);
      const initDate = cmd.date_evenement
        ? cmd.date_evenement.split("T")[0]
        : "";
      const initNb = cmd.nb_personnes ? String(cmd.nb_personnes) : "1";
      const initType = cmd.type_evenement || "Mariage";
      const initAdr = cmd.adresse || "";
      const initNotes = cmd.notes || "";

      setDateEvenement(initDate);
      setNbPersonnes(initNb);
      setTypeEvenement(initType);
      setAdresse(initAdr);
      setNotes(initNotes);

      setInitialData({
        dateEvenement: initDate,
        nbPersonnes: initNb,
        typeEvenement: initType,
        adresse: initAdr,
        notes: initNotes,
      });
    } catch (e: any) {
      showErrorAlert(
        "Erreur",
        e.message || "Erreur de chargement",
        () => router.replace("/commandes"),
      );
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    if (dateEvenement.trim() !== initialData.dateEvenement.trim()) return true;
    if (nbPersonnes.trim() !== initialData.nbPersonnes.trim()) return true;
    if (typeEvenement !== initialData.typeEvenement) return true;
    if (adresse.trim() !== initialData.adresse.trim()) return true;
    if (notes.trim() !== initialData.notes.trim()) return true;
    return false;
  }, [initialData, dateEvenement, nbPersonnes, typeEvenement, adresse, notes]);

  const handleSaveClick = () => {
    const parsedNb = parseInt(nbPersonnes, 10);
    if (!parsedNb || parsedNb <= 0) {
      showErrorAlert("Erreur", "Le nombre de personnes doit être supérieur à 0.");
      return;
    }

    if (!dateEvenement.trim()) {
      showErrorAlert(
        "Date manquante",
        "Veuillez renseigner la date de l'événement.",
      );
      return;
    }

    if (!adresse.trim()) {
      showErrorAlert(
        "Adresse manquante",
        "Veuillez renseigner l'adresse de l'événement.",
      );
      return;
    }

    showConfirmAlert(
      "Confirmer les modifications",
      "Êtes-vous sûr(e) de vouloir enregistrer les modifications pour cette demande de devis ?",
      performSave,
    );
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        date_evenement: dateEvenement,
        nb_personnes: parseInt(nbPersonnes, 10),
        type_evenement: typeEvenement,
        adresse: adresse,
        notes: notes,
      };

      const res = await apiFetch(`/commande/traiteur/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la modification");
      }

      showSuccessAlert(
        "Succès 🎉",
        "Votre demande de devis a été mise à jour avec succès !",
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
        <ActivityIndicator size="large" color="#1D6B45" />
        <Text style={styles.loadingText}>Chargement de la demande...</Text>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Modifier la demande de devis</Text>
          <Text style={styles.headerSubtitle}>
            {commande?.traiteur?.name || "Traiteur Dabari"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date de l'événement */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>DATE DE L'ÉVÉNEMENT</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="calendar-outline" size={18} color="#1D6B45" />
            <TextInput
              style={styles.inlineInput}
              value={dateEvenement}
              onChangeText={setDateEvenement}
              placeholder="AAAA-MM-JJ (ex: 2026-09-20)"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Nombre de personnes */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>NOMBRE DE CONVIVES</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => {
                const cur = parseInt(nbPersonnes, 10) || 1;
                if (cur > 1) setNbPersonnes(String(cur - 1));
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color="#1D6B45" />
            </TouchableOpacity>

            <TextInput
              style={styles.counterInput}
              value={nbPersonnes}
              onChangeText={(val) => setNbPersonnes(val.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => {
                const cur = parseInt(nbPersonnes, 10) || 1;
                setNbPersonnes(String(cur + 1));
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color="#1D6B45" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Type d'événement */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>TYPE D'ÉVÉNEMENT</Text>
          <View style={styles.pillsWrap}>
            {EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.eventPill,
                  typeEvenement === type && styles.eventPillActive,
                ]}
                onPress={() => setTypeEvenement(type)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.eventPillText,
                    typeEvenement === type && styles.eventPillTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Adresse de l'événement */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>ADRESSE DE L'ÉVÉNEMENT</Text>
          <AddressAutocomplete
            value={adresse}
            onChangeText={setAdresse}
            onSelectAddress={(item) => setAdresse(item.label)}
            placeholder="Rechercher le lieu de l'événement..."
          />
        </View>

        {/* Remarques et consignes */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            NOTES & CONSIGNES PARTICULIÈRES
          </Text>
          <TextInput
            style={styles.multilineInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Précisez votre menu souhaité, vos contraintes d'horaires ou de matériel..."
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
    backgroundColor: "#1D6B45",
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
    color: "#1D6B45",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1D6B45",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    color: "#E2E8F0",
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
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  inlineInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
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
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#1D6B45",
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
  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  eventPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  eventPillActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#1D6B45",
  },
  eventPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  eventPillTextActive: {
    color: "#1D6B45",
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
    backgroundColor: "#1D6B45",
    width: "100%",
    maxWidth: 320,
    paddingVertical: 14,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1D6B45",
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
