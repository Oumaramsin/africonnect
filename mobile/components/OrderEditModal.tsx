import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type DetailRowItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isHighlight?: boolean;
};

type Props = {
  visible: boolean;
  type: "confirm" | "success";
  service: "plat" | "devis" | "gp";
  title: string;
  subtitle?: string;
  details?: DetailRowItem[];
  noticeText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

const { width } = Dimensions.get("window");

export default function OrderEditModal({
  visible,
  type,
  service,
  title,
  subtitle,
  details = [],
  noticeText,
  confirmLabel,
  cancelLabel = "Continuer d'éditer",
  isLoading = false,
  onConfirm,
  onCancel,
}: Props) {
  const isGold = service === "gp";
  const primaryColor = isGold ? "#D4870A" : "#1D6B45";
  const primaryBgLight = isGold ? "#FEF3C7" : "#DCFCE7";
  const primaryBorderLight = isGold
    ? "rgba(212, 135, 10, 0.25)"
    : "rgba(29, 107, 69, 0.25)";

  const isSuccess = type === "success";

  // Icon par service et type
  const getHeaderIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isSuccess) return "checkmark-circle";
    if (service === "plat") return "fast-food";
    if (service === "devis") return "calendar";
    return "airplane";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdropOverlay}>
        <View style={styles.modalCard}>
          {/* Badge Icon Rond Supérieur */}
          <View
            style={[
              styles.iconWrapperOuter,
              { backgroundColor: primaryBgLight },
            ]}
          >
            <View
              style={[
                styles.iconWrapperInner,
                { backgroundColor: primaryColor },
              ]}
            >
              <Ionicons
                name={getHeaderIcon()}
                size={34}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Titre & Sous-titre */}
          <Text style={styles.modalTitle}>{title}</Text>
          {Boolean(subtitle) && (
            <Text style={styles.modalSubtitle}>{subtitle}</Text>
          )}

          {/* Récapitulatif des modifications */}
          {details.length > 0 && (
            <View
              style={[
                styles.recapContainer,
                { borderColor: primaryBorderLight },
              ]}
            >
              <Text
                style={[
                  styles.recapHeaderLabel,
                  { color: primaryColor },
                ]}
              >
                RÉCAPITULATIF DES CHANGEMENTS
              </Text>

              <View style={styles.recapList}>
                {details.map((item, index) => (
                  <View key={index} style={styles.detailRow}>
                    <View
                      style={[
                        styles.detailIconBox,
                        { backgroundColor: primaryBgLight },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={15}
                        color={primaryColor}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>{item.label}</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          item.isHighlight && {
                            color: primaryColor,
                            fontWeight: "800",
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {item.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Notice informative */}
          {Boolean(noticeText) && (
            <View style={styles.noticeBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#64748B"
              />
              <Text style={styles.noticeText}>{noticeText}</Text>
            </View>
          )}

          {/* Boutons d'action */}
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: primaryColor },
                isLoading && styles.btnDisabled,
              ]}
              onPress={onConfirm}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Ionicons
                    name={isSuccess ? "arrow-forward" : "checkmark-circle"}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryBtnText}>
                    {confirmLabel ||
                      (isSuccess
                        ? "Voir mes commandes"
                        : "Confirmer la modification")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {!isSuccess && onCancel && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onCancel}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 32,
    paddingBottom: 24,
    width: "100%",
    maxWidth: Math.min(width - 36, 380),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrapperOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconWrapperInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  recapContainer: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  recapHeaderLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  recapList: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
    marginTop: 1,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 18,
    width: "100%",
  },
  noticeText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
    flex: 1,
    lineHeight: 15,
  },
  actionsColumn: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
  },
});
