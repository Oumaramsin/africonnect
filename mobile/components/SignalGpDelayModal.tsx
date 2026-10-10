import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../utils/api";

export interface SignalGpDelayTarget {
  id: string;
  currentArrivalDate?: string | null;
  departureDate?: string | null;
  routeLabel?: string;
  delayReason?: string | null;
  isListing?: boolean;
}

interface SignalGpDelayModalProps {
  visible: boolean;
  target: SignalGpDelayTarget | null;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_REASONS = [
  "Vol retardé par la compagnie aérienne",
  "Escale technique prolongée",
  "Conditions météo défavorables",
  "Modification des horaires de vol",
  "Contrôles douaniers renforcés",
];

export default function SignalGpDelayModal({
  visible,
  target,
  onClose,
  onSuccess,
}: SignalGpDelayModalProps) {
  const [newArrivalDate, setNewArrivalDate] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [initialValues, setInitialValues] = useState<{
    date: string;
    reason: string;
  }>({
    date: "",
    reason: "",
  });

  useEffect(() => {
    if (target && visible) {
      let dStr = "";
      if (target.currentArrivalDate) {
        try {
          dStr = new Date(target.currentArrivalDate).toISOString().split("T")[0];
        } catch {
          dStr = "";
        }
      } else {
        // Demain par défaut
        dStr = new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
      }
      const rStr = target.delayReason || "";
      setNewArrivalDate(dStr);
      setDelayReason(rStr);
      setInitialValues({ date: dStr, reason: rStr });
      setError(null);
    }
  }, [target, visible]);

  if (!visible || !target) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const minDate = target.departureDate
    ? new Date(target.departureDate).toISOString().split("T")[0]
    : todayStr;

  const hasChanges =
    newArrivalDate.trim() !== initialValues.date.trim() ||
    delayReason.trim() !== initialValues.reason.trim();

  const handleAddDays = (days: number) => {
    try {
      const base = newArrivalDate ? new Date(newArrivalDate) : new Date();
      base.setDate(base.getDate() + days);
      const formatted = base.toISOString().split("T")[0];
      setNewArrivalDate(formatted);
    } catch {
      // Ignorer
    }
  };

  const handleSubmit = async () => {
    if (!newArrivalDate.trim()) {
      setError("Veuillez renseigner la nouvelle date d'arrivée estimée (AAAA-MM-JJ).");
      return;
    }

    if (newArrivalDate < minDate) {
      setError(`La date ne peut pas être antérieure au départ (${minDate}).`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = target.isListing
        ? `/gp/${target.id}/delay`
        : `/commande/gp/${target.id}/delay`;

      const res = await apiFetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          arrival_date: newArrivalDate.trim(),
          delay_reason: delayReason.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de l'enregistrement du retard");
      }

      Alert.alert(
        "Retard enregistré",
        "L'estimation d'arrivée a été mise à jour. Les personnes concernées sont informées."
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdropOverlay}
      >
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            if (!loading) onClose();
          }}
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="warning" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Signaler un retard de vol</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {target.routeLabel || "Transport de colis GP"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Erreur */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Nouvelle Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nouvelle date d&apos;arrivée estimée (AAAA-MM-JJ) *
              </Text>
              <TextInput
                style={styles.input}
                value={newArrivalDate}
                onChangeText={setNewArrivalDate}
                placeholder="Ex: 2026-10-15"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              {/* Raccourcis +1j, +2j, +3j */}
              <View style={styles.quickOffsetRow}>
                <Text style={styles.quickOffsetLabel}>Ajuster :</Text>
                {[
                  { label: "+1 jour", days: 1 },
                  { label: "+2 jours", days: 2 },
                  { label: "+3 jours", days: 3 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.quickOffsetChip}
                    onPress={() => handleAddDays(item.days)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickOffsetChipText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Puces de motifs rapides */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Motif suggéré (cliquez pour remplir)</Text>
              <View style={styles.chipsContainer}>
                {QUICK_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.reasonChip,
                      delayReason === r && styles.reasonChipSelected,
                    ]}
                    onPress={() => setDelayReason(r)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        delayReason === r && styles.reasonChipTextSelected,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Texte libre du motif */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Précisions / Explication libre</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={delayReason}
                onChangeText={setDelayReason}
                placeholder="Expliquez la situation aux personnes concernées..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Boutons Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!hasChanges || loading) && styles.saveButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!hasChanges || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {hasChanges
                    ? "Enregistrer le retard"
                    : "Aucune modification"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 70,
  },
  quickOffsetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  quickOffsetLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  quickOffsetChip: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  quickOffsetChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  reasonChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reasonChipSelected: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  reasonChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  reasonChipTextSelected: {
    color: "#92400E",
    fontWeight: "800",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D97706",
  },
  saveButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
